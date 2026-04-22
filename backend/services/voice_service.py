"""Voice service: audio decoding, VoicePipeline factory, TTS synthesis."""

import io
import logging
import os
import subprocess
import tempfile
import wave
from typing import Any, AsyncIterator

import numpy as np
from agents.voice import VoicePipeline, VoicePipelineConfig, TTSModelSettings

from services.groq_providers import GroqVoiceModelProvider

logger = logging.getLogger(__name__)


class VoiceService:
    """Shared voice utilities used by the public voice WebSocket."""

    def __init__(self):
        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY environment variable is required")

        tts_model = os.environ.get("TTS_MODEL", "canopylabs/orpheus-v1-english")
        tts_voice = os.environ.get("TTS_VOICE", "troy")
        stt_model = os.environ.get("STT_MODEL", "whisper-large-v3")

        self._provider = GroqVoiceModelProvider(
            groq_api_key=api_key,
            stt_model=stt_model,
            tts_model=tts_model,
            tts_voice=tts_voice,
        )
        logger.info("VoiceService initialized (tts=%s voice=%s stt=%s)", tts_model, tts_voice, stt_model)

    def create_voice_pipeline(self, workflow: Any) -> VoicePipeline:
        """Wrap a workflow in a VoicePipeline backed by Groq STT + TTS."""
        config = VoicePipelineConfig(model_provider=self._provider)
        return VoicePipeline(workflow=workflow, config=config)

    async def synthesize_speech(self, text: str) -> AsyncIterator[bytes]:
        """TTS-only: stream raw int16 PCM at 24 kHz for the given text."""
        tts = self._provider.get_tts_model(None)
        async for chunk in tts.run(text, TTSModelSettings()):
            if chunk:
                yield chunk

    def audio_bytes_to_int16_24k(self, audio_data: bytes) -> np.ndarray:
        """Decode WebM/WAV bytes to mono int16 numpy array at 24 kHz."""
        def _safe_int16(raw: bytes) -> np.ndarray:
            n = (len(raw) // 2) * 2
            return np.frombuffer(raw[:n], dtype=np.int16)

        sample_rate = 24000
        audio_array = None

        # Try WAV first
        try:
            with wave.open(io.BytesIO(audio_data), "rb") as wf:
                sample_rate = wf.getframerate()
                audio_array = _safe_int16(wf.readframes(wf.getnframes()))
        except Exception:
            pass

        # Fall back to WebM via ffmpeg
        if audio_array is None:
            try:
                wav_data = self._webm_to_wav(audio_data)
                with wave.open(io.BytesIO(wav_data), "rb") as wf:
                    sample_rate = wf.getframerate()
                    audio_array = _safe_int16(wf.readframes(wf.getnframes()))
            except Exception as e:
                logger.warning("WebM conversion failed, treating as raw PCM: %s", e)
                audio_array = _safe_int16(audio_data)

        if audio_array is None or len(audio_array) == 0:
            raise ValueError("Empty or undecodable audio buffer")

        audio_array = audio_array.flatten()

        if sample_rate != 24000:
            from scipy import signal
            n = int(len(audio_array) * 24000 / sample_rate)
            audio_array = signal.resample(audio_array, n).astype(np.int16)

        return audio_array

    def _webm_to_wav(self, data: bytes) -> bytes:
        try:
            subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            raise RuntimeError("ffmpeg not available")

        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(data)
            webm_path = f.name
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            wav_path = f.name

        try:
            subprocess.run(
                ["ffmpeg", "-i", webm_path, "-ar", "24000", "-ac", "1", "-f", "wav", "-y", wav_path],
                check=True, capture_output=True,
            )
            with open(wav_path, "rb") as f:
                return f.read()
        finally:
            import os as _os
            _os.unlink(webm_path)
            _os.unlink(wav_path)
