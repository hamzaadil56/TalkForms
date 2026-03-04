"""OpenRouter gpt-audio-mini service: audio-in → text-out for voice assistant.

Uses OpenRouter's openai/gpt-audio-mini model via /v1/chat/completions with
input_audio content type. Responses are stored in DB like chat; TTS is used for playback.
"""

from __future__ import annotations

import logging
import os
import re
from typing import TYPE_CHECKING, Any

import httpx

from ..models import Form, RespondentSession
from .agent_engine import _build_instructions, _load_collected_answers, _load_history

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

OPENROUTER_BASE = "https://openrouter.ai/api/v1"
GPT_AUDIO_MODEL = "openai/gpt-audio-mini"

# Optional: ask model to prefix transcript so we can store user message
TRANSCRIPT_PREFIX = "TRANSCRIPT:"

# Placeholder patterns that must NOT be used as transcript or saved as answers
_PLACEHOLDER_PATTERN = re.compile(
    r"\[user'?s\s+[^\]]+\]|\[[^\]]*user[^\]]*\]",
    re.IGNORECASE,
)


def _get_api_key() -> str:
    return os.getenv("OPEN_ROUTER_API_KEY", "") or os.getenv("OPENROUTER_API_KEY", "")


def _parse_transcript_and_reply(content: str) -> tuple[str, str]:
    """If content starts with TRANSCRIPT: ..., return (transcript, reply); else ("", content)."""
    if not content or TRANSCRIPT_PREFIX not in content:
        return "", content.strip() if content else ""
    first_line, _, rest = content.partition("\n")
    match = re.match(r"TRANSCRIPT:\s*(.+)", first_line.strip(), re.IGNORECASE)
    if match:
        return match.group(1).strip(), rest.strip() if rest else ""
    return "", content.strip()


def is_placeholder_transcript(transcript: str) -> bool:
    """True if transcript looks like a placeholder (e.g. [user's full name]) and must not be saved as an answer."""
    if not (transcript or transcript.strip()):
        return True
    t = transcript.strip()
    if _PLACEHOLDER_PATTERN.search(t):
        return True
    if t.startswith("[") and t.endswith("]"):
        return True
    return False


async def chat_with_audio(
    audio_wav_base64: str,
    session_id: str,
    respondent_session: RespondentSession,
    form: Form,
    db: "Session",
    *,
    max_history: int = 10,
) -> tuple[str, str]:
    """
    Send user audio to gpt-audio-mini and return (user_transcript, assistant_text).

    Builds system prompt from form (same as agent_engine voice mode). Uses conversation
    history from Message table. If the model prefixes its reply with TRANSCRIPT: <user words>,
    we use that as the stored user message; otherwise we use a placeholder.
    """
    api_key = _get_api_key()
    if not api_key:
        raise ValueError("OPEN_ROUTER_API_KEY (or OPENROUTER_API_KEY) is required for gpt-audio-mini")

    collected = _load_collected_answers(db, session_id)
    instructions = _build_instructions(form, collected_answers=collected, voice_mode=True)
    # Ask for transcript so we can persist user message; forbid placeholders
    instructions += f"""

When the user speaks, your response MUST start with exactly: {TRANSCRIPT_PREFIX} <what the user literally said in the audio, in their own words>.
Then a blank line, then your reply. Keep your reply short (1-2 sentences).
CRITICAL: In the TRANSCRIPT line, write only the actual words you heard (e.g. "Muhammad Hamza", "hamza at gmail dot com"). Never use placeholders like [user's full name], [user's email], or any text in square brackets. If you cannot make out the words, write "unclear"."""

    history = _load_history(db, session_id, max_messages=max_history)
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": instructions},
    ]
    for m in history:
        messages.append({"role": m["role"], "content": m["content"]})
    messages.append({
        "role": "user",
        "content": [
            {"type": "text", "text": "Respond to the user's voice message. Remember to start with TRANSCRIPT: then your reply."},
            {"type": "input_audio", "input_audio": {"data": audio_wav_base64, "format": "wav"}},
        ],
    })

    payload = {
        "model": GPT_AUDIO_MODEL,
        "messages": messages,
        "max_tokens": 500,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{OPENROUTER_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    choice = (data.get("choices") or [None])[0]
    if not choice:
        raise ValueError("No choices in gpt-audio-mini response")
    content = (choice.get("message") or {}).get("content") or ""
    transcript, assistant_text = _parse_transcript_and_reply(content)
    if not assistant_text:
        assistant_text = "Could you repeat that?"
    return transcript or "[voice]", assistant_text
