"""VoicePipeline workflow for agentic forms: DB-backed session + streamed LLM text."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator, Callable
from typing import Any

from agents import Runner
from agents.stream_events import RawResponsesStreamEvent
from agents.voice import VoiceWorkflowBase
from sqlalchemy.orm import Session

from ..models import Form, Message, RespondentSession
from .agent_engine import (
    FormSessionContext,
    _load_collected_answers,
    _load_history,
    build_form_agent,
)

logger = logging.getLogger(__name__)


class FormAgentVoiceWorkflow(VoiceWorkflowBase):
    """Runs the form agent on each STT transcript; persists messages; yields text for TTS."""

    def __init__(
        self,
        db_factory: Callable[[], Session],
        session_id: str,
        form_id: str,
    ):
        self._db_factory = db_factory
        self.session_id = session_id
        self.form_id = form_id
        self.last_result: dict[str, Any] | None = None

    async def run(self, transcription: str) -> AsyncIterator[str]:
        db = self._db_factory()
        text = (transcription or "").strip()
        logger.info("[VoiceWorkflow] STT transcription: %r (session=%s)", text, self.session_id)
        try:
            respondent_session = db.get(RespondentSession, self.session_id)
            form = db.get(Form, self.form_id)

            if not respondent_session or not form:
                msg = "Session or form not found."
                self.last_result = {
                    "transcription": text,
                    "response": msg,
                    "state": "error",
                    "accepted": False,
                }
                yield msg
                return

            if respondent_session.status != "active":
                msg = "This session is no longer active."
                self.last_result = {
                    "transcription": text,
                    "response": msg,
                    "state": respondent_session.status,
                    "accepted": False,
                }
                yield msg
                return

            collected = _load_collected_answers(db, self.session_id)
            voice_mode = getattr(respondent_session, "channel", None) == "voice"
            agent = build_form_agent(form, collected_answers=collected, voice_mode=voice_mode)
            context = FormSessionContext(
                db=db,
                respondent_session=respondent_session,
                form=form,
                collected_answers=collected,
            )

            history = _load_history(db, self.session_id, max_messages=10)
            input_items = list(history)
            input_items.append({"role": "user", "content": text})

            db.add(Message(session_id=self.session_id, role="user", content=text))
            db.flush()

            streamed_text = ""
            final_output = ""
            try:
                result = Runner.run_streamed(
                    starting_agent=agent,
                    input=input_items,
                    context=context,
                    max_turns=5,
                )
                async for event in result.stream_events():
                    if isinstance(event, RawResponsesStreamEvent):
                        data = event.data
                        event_type = getattr(data, "type", "")
                        if event_type == "response.output_text.delta":
                            delta = getattr(data, "delta", "")
                            if delta:
                                streamed_text += delta
                                yield delta

                final = await result.get_final_result()
                final_output = str(final.final_output).strip() if final.final_output else ""

                if not streamed_text and final_output:
                    streamed_text = final_output
                    yield final_output

            except Exception as exc:
                logger.exception("FormAgentVoiceWorkflow streaming failed: %s", exc)
                if not streamed_text:
                    streamed_text = "I'm having trouble processing that. Please try again."
                    yield streamed_text

            if not streamed_text:
                streamed_text = "Could you repeat that?"
                yield streamed_text

            saved_message = final_output or streamed_text
            logger.info(
                "[VoiceWorkflow] Agent response: %r (session=%s)",
                saved_message[:200] if saved_message else "",
                self.session_id,
            )

            db.add(
                Message(
                    session_id=self.session_id,
                    role="assistant",
                    content=saved_message,
                )
            )
            db.commit()

            db.refresh(respondent_session)
            self.last_result = {
                "transcription": text,
                "response": saved_message,
                "state": respondent_session.status,
                "accepted": True,
            }
        finally:
            db.close()
