"""Groq STT + TTS model providers for the OpenAI Agents SDK VoicePipeline."""

from __future__ import annotations

import io
import logging
import os
import wave
from typing import AsyncIterator

import httpx
import numpy as np
from groq import Groq
from agents.voice import (
    AudioInput,
    STTModel,
    STTModelSettings,
    StreamedAudioInput,
    StreamedTranscriptionSession,
    TTSModel,
    TTSModelSettings,
    VoiceModelProvider,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# TTS voice lists
# ---------------------------------------------------------------------------

_PLAYAI_VOICES = frozenset({
    "Arista-PlayAI", "Atlas-PlayAI", "Basil-PlayAI", "Briggs-PlayAI",
    "Calum-PlayAI", "Celeste-PlayAI", "Cheyenne-PlayAI", "Chip-PlayAI",
    "Cillian-PlayAI", "Deedee-PlayAI", "Fritz-PlayAI", "Gail-PlayAI",
    "Indigo-PlayAI", "Mamaw-PlayAI", "Mason-PlayAI", "Mikail-PlayAI",
    "Mitch-PlayAI", "Quinn-PlayAI", "Thunder-PlayAI", "Ahmad-PlayAI",
    "Amira-PlayAI", "Khalid-PlayAI", "Nasser-PlayAI",
})
_ORPHEUS_VOICES = frozenset({
    "autumn", "diana", "hannah", "austin", "daniel", "troy",
    "fahad", "sultan", "lulwa", "noura",
})

_TARGET_SR = 24000
_ORPHEUS_MAX_CHARS = 200


def all_supported_voices_for_model(model: str) -> frozenset[str]:
    return _ORPHEUS_VOICES if _is_orpheus(model) else _PLAYAI_VOICES


def _is_orpheus(model: str) -> bool:
    m = (model or "").lower()
    return "orpheus" in m or m.startswith("canopylabs/")


def _resolve_voice(model: str, voice: str) -> str:
    v = (voice or "").strip()
    if _is_orpheus(model):
        return v.lower() if v.lower() in _ORPHEUS_VOICES else "troy"
    return v if v in _PLAYAI_VOICES else "Fritz-PlayAI"


def _chunk_orpheus(text: str) -> list[str]:
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= _ORPHEUS_MAX_CHARS:
        return [text]
    chunks: list[str] = []
    while text:
        if len(text) <= _ORPHEUS_MAX_CHARS:
            chunks.append(text.strip())
            break
        window = text[: _ORPHEUS_MAX_CHARS + 1]
        cut = -1
        for sep in (". ", "? ", "! ", "\n"):
            idx = window.rfind(sep)
            if 0 < idx + len(sep) <= _ORPHEUS_MAX_CHARS:
                cut = idx + len(sep)
                break
        if cut == -1:
            cut = window.rfind(" ", 0, _ORPHEUS_MAX_CHARS) or _ORPHEUS_MAX_CHARS
        chunks.append(text[:cut].strip())
        text = text[cut:].lstrip()
    return [c for c in chunks if c]


def _wav_to_pcm_int16_24k(wav_bytes: bytes) -> bytes:
    bio = io.BytesIO(wav_bytes)
    with wave.open(bio, "rb") as wf:
        n_ch = wf.getnchannels()
        sr = wf.getframerate()
        sw = wf.getsampwidth()
        raw = wf.readframes(wf.getnframes())
    if sw != 2:
        raise ValueError(f"Expected 16-bit WAV, got sampwidth={sw}")
    audio = np.frombuffer(raw, dtype=np.int16)
    if n_ch > 1:
        audio = audio.reshape(-1, n_ch)[:, 0]
    if sr != _TARGET_SR:
        from scipy import signal
        audio = signal.resample(audio.astype(np.float64), int(len(audio) * _TARGET_SR / sr)).astype(np.int16)
    return audio.tobytes()


# ---------------------------------------------------------------------------
# STT
# ---------------------------------------------------------------------------

class GroqSTTModel(STTModel):
    def __init__(self, api_key: str, model: str = "whisper-large-v3"):
        self._client = Groq(api_key=api_key)
        self._model = model

    @property
    def model_name(self) -> str:
        return self._model

    async def transcribe(
        self,
        input: AudioInput,
        settings: STTModelSettings,
        trace_include_sensitive_data: bool,
        trace_include_sensitive_audio_data: bool,
    ) -> str:
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(24000)
            wf.writeframes(input.buffer.tobytes())
        buf.seek(0)
        buf.name = "audio.wav"
        result = self._client.audio.transcriptions.create(
            file=buf, model=self._model,
            language=settings.language or "en", response_format="text",
        )
        return (result if isinstance(result, str) else result.text).strip()

    async def create_session(
        self, input: StreamedAudioInput, settings: STTModelSettings,
        trace_include_sensitive_data: bool, trace_include_sensitive_audio_data: bool,
    ) -> StreamedTranscriptionSession:
        raise NotImplementedError("Groq Whisper does not support streaming transcription")


# ---------------------------------------------------------------------------
# TTS
# ---------------------------------------------------------------------------

class GroqTTSModel(TTSModel):
    def __init__(
        self,
        api_key: str | None = None,
        *,
        model: str = "canopylabs/orpheus-v1-english",
        voice: str = "troy",
        base_url: str = "https://api.groq.com/openai/v1",
        timeout: float = 120.0,
    ):
        self._api_key = (api_key or os.getenv("GROQ_API_KEY", "")).strip()
        if not self._api_key:
            raise ValueError("GROQ_API_KEY is required")
        self._model = model
        self._voice = _resolve_voice(model, voice)
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    @property
    def model_name(self) -> str:
        return self._model

    async def run(self, text: str, settings: TTSModelSettings) -> AsyncIterator[bytes]:
        if not (text or "").strip():
            return
        segments = _chunk_orpheus(text.strip()) if _is_orpheus(self._model) else [text.strip()]
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            for seg in segments:
                if not seg:
                    continue
                resp = await client.post(
                    f"{self._base_url}/audio/speech",
                    headers={"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"},
                    json={"model": self._model, "input": seg, "voice": self._voice, "response_format": "wav"},
                )
                if resp.is_error:
                    logger.error("Groq TTS error %d: %s", resp.status_code, resp.text[:200])
                    resp.raise_for_status()
                pcm = _wav_to_pcm_int16_24k(resp.content)
                for i in range(0, len(pcm), 4096):
                    yield pcm[i: i + 4096]


# ---------------------------------------------------------------------------
# Provider
# ---------------------------------------------------------------------------

class GroqVoiceModelProvider(VoiceModelProvider):
    def __init__(
        self,
        groq_api_key: str,
        stt_model: str = "whisper-large-v3",
        tts_model: str = "canopylabs/orpheus-v1-english",
        tts_voice: str = "troy",
    ):
        self._stt = GroqSTTModel(api_key=groq_api_key, model=stt_model)
        self._tts = GroqTTSModel(api_key=groq_api_key, model=tts_model, voice=tts_voice)

    def get_stt_model(self, model_name: str | None) -> STTModel:
        return self._stt

    def get_tts_model(self, model_name: str | None) -> TTSModel:
        return self._tts
