"""Public runtime routes for anonymous consumers (chat + voice).

Uses the agentic form engine (OpenAI Agents SDK) for conversation.
"""

from __future__ import annotations

import base64
import json
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db, SessionLocal
from ..deps import extract_public_session_token
from ..models import Form, Message, RespondentSession, Submission
from ..schemas import (
    CompleteSessionResponse,
    MessageItem,
    MessagesListResponse,
    PublicMessageRequest,
    PublicMessageResponse,
    PublicSessionCreateRequest,
    PublicSessionCreateResponse,
)
from ..security import create_public_session_token, decode_token
from ..services.agent_engine import generate_initial_greeting, process_agent_message, stream_agent_message
from ..services.gpt_audio_service import chat_with_audio as gpt_audio_chat_with_audio, is_placeholder_transcript
from backend.config import BackendSettings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public", tags=["v1-public"])


# ---------------------------------------------------------------------------
# Create session
# ---------------------------------------------------------------------------

@router.post("/f/{slug}/sessions", response_model=PublicSessionCreateResponse)
async def create_public_session(
    slug: str,
    payload: PublicSessionCreateRequest,
    db: Session = Depends(get_db),
):
    """Create a new consumer session for an agentic form."""
    form = db.execute(
        select(Form).where(Form.slug == slug, Form.status == "published")
    ).scalar_one_or_none()

    if not form:
        raise HTTPException(status_code=404, detail="Form is not available")

    # Validate form has agentic configuration
    if not form.system_prompt and not form.fields_schema:
        raise HTTPException(status_code=400, detail="Form is not configured")

    respondent_session = RespondentSession(
        form_id=form.id,
        form_version_id=None,  # Agentic forms don't use form versions
        channel=payload.channel,
        locale=payload.locale,
        status="active",
        current_node_id=None,  # No graph nodes in agentic mode
        metadata_json=payload.metadata,
    )
    db.add(respondent_session)
    db.flush()

    token = create_public_session_token(respondent_session.id)

    # Generate initial greeting via the agent
    greeting = await generate_initial_greeting(db, respondent_session)
    db.commit()

    return PublicSessionCreateResponse(
        session_id=respondent_session.id,
        session_token=token,
        state="active",
        assistant_message=greeting,
    )


# ---------------------------------------------------------------------------
# Send message (chat)
# ---------------------------------------------------------------------------

@router.post("/sessions/{session_id}/message", response_model=PublicMessageResponse)
async def public_message(
    session_id: str,
    payload: PublicMessageRequest,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Process a user message through the agentic form engine."""
    token = extract_public_session_token(authorization)
    claims = decode_token(token)
    if claims.get("type") != "public_session" or claims.get("sid") != session_id:
        raise HTTPException(status_code=401, detail="Invalid session token")

    respondent_session = db.get(RespondentSession, session_id)
    if not respondent_session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await process_agent_message(db, respondent_session, payload.message)
    db.commit()

    return PublicMessageResponse(
        session_id=session_id,
        state=result.state,
        accepted=result.accepted,
        assistant_message=result.assistant_message,
    )


# ---------------------------------------------------------------------------
# Send message (chat) — streaming SSE
# ---------------------------------------------------------------------------

@router.post("/sessions/{session_id}/message/stream")
async def public_message_stream(
    session_id: str,
    payload: PublicMessageRequest,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Stream the agent's response token-by-token via SSE."""
    token = extract_public_session_token(authorization)
    claims = decode_token(token)
    if claims.get("type") != "public_session" or claims.get("sid") != session_id:
        raise HTTPException(status_code=401, detail="Invalid session token")

    respondent_session = db.get(RespondentSession, session_id)
    if not respondent_session:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        try:
            async for event_type, data in stream_agent_message(db, respondent_session, payload.message):
                yield f"data: {json.dumps({'type': event_type, **data})}\n\n"
        except Exception as exc:
            logger.exception("SSE stream error: %s", exc)
            yield f"data: {json.dumps({'type': 'error', 'content': 'Stream failed'})}\n\n"
        finally:
            db.commit()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# Get messages (for reconnect/resume)
# ---------------------------------------------------------------------------

@router.get("/sessions/{session_id}/messages", response_model=MessagesListResponse)
def list_session_messages(
    session_id: str,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Get chat history for a session."""
    token = extract_public_session_token(authorization)
    claims = decode_token(token)
    if claims.get("type") != "public_session" or claims.get("sid") != session_id:
        raise HTTPException(status_code=401, detail="Invalid session token")

    respondent_session = db.get(RespondentSession, session_id)
    if not respondent_session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
    ).scalars().all()

    return MessagesListResponse(
        session_id=session_id,
        messages=[
            MessageItem(
                id=m.id,
                role=m.role,
                content=m.content,
                created_at=m.created_at.isoformat(),
            )
            for m in messages
        ],
    )


# ---------------------------------------------------------------------------
# Complete session manually
# ---------------------------------------------------------------------------

@router.post("/sessions/{session_id}/complete", response_model=CompleteSessionResponse)
def complete_session(
    session_id: str,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = extract_public_session_token(authorization)
    claims = decode_token(token)
    if claims.get("type") != "public_session" or claims.get("sid") != session_id:
        raise HTTPException(status_code=401, detail="Invalid session token")

    respondent_session = db.get(RespondentSession, session_id)
    if not respondent_session:
        raise HTTPException(status_code=404, detail="Session not found")

    respondent_session.status = "completed"
    respondent_session.current_node_id = None

    submission = db.execute(
        select(Submission).where(Submission.session_id == session_id)
    ).scalar_one_or_none()
    if not submission:
        submission = Submission(form_id=respondent_session.form_id, session_id=session_id, status="completed")
        db.add(submission)
        db.flush()

    db.commit()

    return CompleteSessionResponse(session_id=session_id, status="completed", submission_id=submission.id)


# ---------------------------------------------------------------------------
# Voice WebSocket
# ---------------------------------------------------------------------------

@router.websocket("/sessions/{session_id}/voice")
async def public_voice_session(websocket: WebSocket, session_id: str):
    """Voice websocket for session-bound runtime using the agent engine.

    Protocol:
    - client sends JSON {type:"auth", token:"..."}
    - client streams {type:"audio_chunk", data:"base64"} and then {type:"stop"}
    - server responds with transcription + assistant_message + audio
    """

    await websocket.accept()
    db = SessionLocal()
    audio_chunks: list[bytes] = []
    authed = False

    try:
        voice_service = websocket.app.state.voice_service if hasattr(websocket.app.state, "voice_service") else None

        while True:
            payload = await websocket.receive_json()
            msg_type = payload.get("type")

            if msg_type == "auth":
                token = payload.get("token", "")
                claims = decode_token(token)
                if claims.get("type") != "public_session" or claims.get("sid") != session_id:
                    await websocket.send_json({"type": "error", "data": "Invalid session token"})
                    await websocket.close(code=4401)
                    return
                authed = True

                # Send initial prompt via agent engine
                respondent_session = db.get(RespondentSession, session_id)
                if respondent_session and respondent_session.status == "active":
                    # Check if greeting already exists (from session creation)
                    existing_msgs = db.execute(
                        select(Message).where(Message.session_id == session_id)
                    ).scalars().all()

                    if existing_msgs:
                        # Use the last assistant message as the greeting
                        last_assistant = [m for m in existing_msgs if m.role == "assistant"]
                        prompt = last_assistant[-1].content if last_assistant else "Welcome! Let's get started."
                    else:
                        prompt = await generate_initial_greeting(db, respondent_session)
                        db.commit()

                    await websocket.send_json({"type": "state", "data": "connected"})
                    await websocket.send_json({
                        "type": "assistant_message",
                        "data": prompt,
                        "state": "active",
                    })

                    # Synthesize greeting as audio (TTS only — do not run through voice agent LLM)
                    if voice_service:
                        try:
                            async for pcm_chunk in voice_service.synthesize_speech(prompt):
                                encoded = base64.b64encode(pcm_chunk).decode("ascii")
                                await websocket.send_json({"type": "audio_chunk", "data": encoded})
                            await websocket.send_json({"type": "audio_end"})
                        except Exception:
                            pass

                else:
                    await websocket.send_json({"type": "state", "data": "connected"})
                continue

            if not authed:
                await websocket.send_json({"type": "error", "data": "Authenticate first"})
                continue

            if msg_type == "audio_chunk":
                try:
                    audio_chunks.append(base64.b64decode(payload.get("data", "")))
                except Exception:
                    await websocket.send_json({"type": "error", "data": "Invalid audio chunk"})
                continue

            if msg_type == "stop":
                transcript = payload.get("transcript", "")
                respondent_session = db.get(RespondentSession, session_id)
                if not respondent_session:
                    await websocket.send_json({"type": "error", "data": "Session not found"})
                    await websocket.close(code=4404)
                    return

                form = db.get(Form, respondent_session.form_id)
                use_gpt_audio = (
                    BackendSettings().use_gpt_audio_mini_voice
                    and audio_chunks
                    and form
                    and voice_service
                )

                if use_gpt_audio:
                    # gpt-audio-mini: audio in → model returns transcript + reply; we persist and run form agent for save_answer
                    combined_audio = b"".join(audio_chunks)
                    wav_bytes = None
                    try:
                        wav_bytes = voice_service._convert_webm_to_wav(combined_audio)
                    except Exception:
                        pass
                    if wav_bytes:
                        try:
                            audio_b64 = base64.b64encode(wav_bytes).decode("ascii")
                            user_text, assistant_text = await gpt_audio_chat_with_audio(
                                audio_b64,
                                session_id,
                                respondent_session,
                                form,
                                db,
                            )
                            # Don't pass placeholder transcripts to the form agent (would save "[user's full name]" etc.)
                            text_for_form_agent = "[voice input unclear]" if is_placeholder_transcript(user_text) else user_text
                            # Run form agent for save_answer/state only (no extra messages)
                            await process_agent_message(
                                db, respondent_session, text_for_form_agent, persist_messages=False
                            )
                            db.add(Message(session_id=session_id, role="user", content=user_text))
                            db.add(Message(session_id=session_id, role="assistant", content=assistant_text))
                            db.commit()
                            audio_chunks = []
                            await websocket.send_json({"type": "transcription", "data": user_text})
                            await websocket.send_json({
                                "type": "assistant_message",
                                "data": assistant_text,
                                "state": respondent_session.status,
                                "accepted": True,
                            })
                            if voice_service:
                                try:
                                    async for pcm_chunk in voice_service.synthesize_speech(assistant_text):
                                        encoded = base64.b64encode(pcm_chunk).decode("ascii")
                                        await websocket.send_json({"type": "audio_chunk", "data": encoded})
                                    await websocket.send_json({"type": "audio_end"})
                                except Exception:
                                    pass
                            continue
                        except Exception as e:
                            logger.exception("gpt-audio-mini voice turn failed: %s", e)
                            await websocket.send_json({
                                "type": "error",
                                "data": f"Voice processing failed: {e}",
                            })
                            audio_chunks = []
                            continue

                # Fallback: STT then form agent (original flow)
                user_text = transcript.strip()
                if audio_chunks and voice_service and not user_text:
                    try:
                        combined_audio = b"".join(audio_chunks)
                        user_text, _ = await voice_service.process_audio_chunk(combined_audio)
                    except Exception as stt_err:
                        await websocket.send_json({
                            "type": "error",
                            "data": f"Speech recognition failed: {stt_err}",
                        })
                        audio_chunks = []
                        continue

                if not user_text:
                    user_text = "[voice-input-received]"

                result = await process_agent_message(db, respondent_session, user_text)
                db.commit()
                audio_chunks = []

                await websocket.send_json({"type": "transcription", "data": user_text})
                await websocket.send_json({
                    "type": "assistant_message",
                    "data": result.assistant_message,
                    "state": result.state,
                    "accepted": result.accepted,
                })

                if voice_service:
                    try:
                        async for pcm_chunk in voice_service.synthesize_speech(
                            result.assistant_message
                        ):
                            encoded = base64.b64encode(pcm_chunk).decode("ascii")
                            await websocket.send_json({"type": "audio_chunk", "data": encoded})
                        await websocket.send_json({"type": "audio_end"})
                    except Exception:
                        pass
                continue

            await websocket.send_json({"type": "error", "data": f"Unknown message type: {msg_type}"})

    except WebSocketDisconnect:
        return
    finally:
        db.close()
