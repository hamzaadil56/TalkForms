/** Hook for managing a voice session WebSocket connection */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../../../shared/types/api";

export type VoiceState =
	| "disconnected"
	| "connecting"
	| "connected"
	| "listening"
	| "processing"
	| "speaking"
	| "completed"
	| "error";

interface UseVoiceSessionOptions {
	sessionId: string;
	sessionToken: string;
	onMessage?: (msg: ChatMessage) => void;
}

interface UseVoiceSessionReturn {
	state: VoiceState;
	messages: ChatMessage[];
	error: string | null;
	audioLevel: number;
	/** After first server `audio_end` (greeting or first TTS turn); mic may be enabled. */
	initialAgentPlaybackDone: boolean;
	connect: () => void;
	disconnect: () => void;
	startRecording: () => void;
	stopRecording: () => void;
}

function getSupportedMimeType(): string {
	const candidates = [
		"audio/webm;codecs=opus",
		"audio/webm",
		"audio/ogg;codecs=opus",
		"audio/mp4",
	];
	for (const mime of candidates) {
		if (MediaRecorder.isTypeSupported(mime)) return mime;
	}
	return "";
}

export function useVoiceSession({
	sessionId,
	sessionToken,
	onMessage,
}: UseVoiceSessionOptions): UseVoiceSessionReturn {
	const [state, setState] = useState<VoiceState>("disconnected");
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [audioLevel, setAudioLevel] = useState(0);
	const [initialAgentPlaybackDone, setInitialAgentPlaybackDone] = useState(false);

	const wsRef = useRef<WebSocket | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const animFrameRef = useRef<number>(0);
	const audioQueueRef = useRef<ArrayBuffer[]>([]);
	const isPlayingRef = useRef(false);
	const stateRef = useRef<VoiceState>("disconnected");
	const pendingAudioEndRef = useRef(false);
	const onPlaybackDoneRef = useRef<(() => void) | null>(null);
	const firstServerAudioTurnDoneRef = useRef(false);
	/** In-flight FileReader conversions for audio chunks; stop must wait for these. */
	const pendingFileReadsRef = useRef(0);

	const markFirstServerAudioTurnDone = useCallback(() => {
		if (!firstServerAudioTurnDoneRef.current) {
			firstServerAudioTurnDoneRef.current = true;
			setInitialAgentPlaybackDone(true);
		}
	}, []);

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	const addMessage = useCallback(
		(msg: ChatMessage) => {
			setMessages((prev) => [...prev, msg]);
			onMessage?.(msg);
		},
		[onMessage],
	);

	const playAudioQueue = useCallback(async () => {
		if (isPlayingRef.current) return;
		isPlayingRef.current = true;

		try {
			const ctx = audioContextRef.current || new AudioContext({ sampleRate: 24000 });
			audioContextRef.current = ctx;

			while (audioQueueRef.current.length > 0) {
				const buffer = audioQueueRef.current.shift();
				if (!buffer) continue;

				const int16Array = new Int16Array(buffer);
				const float32Array = new Float32Array(int16Array.length);
				for (let i = 0; i < int16Array.length; i++) {
					float32Array[i] = int16Array[i] / 32768;
				}

				const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
				audioBuffer.getChannelData(0).set(float32Array);

				const source = ctx.createBufferSource();
				source.buffer = audioBuffer;
				source.connect(ctx.destination);
				source.start();

				await new Promise<void>((resolve) => {
					source.onended = () => resolve();
				});
			}
		} catch (err) {
			console.warn("Audio playback error:", err);
		} finally {
			isPlayingRef.current = false;
			// When playback finishes, if server already sent audio_end, transition to connected
			if (pendingAudioEndRef.current && audioQueueRef.current.length === 0) {
				pendingAudioEndRef.current = false;
				onPlaybackDoneRef.current?.();
			}
		}
	}, []);

	const connect = useCallback(() => {
		if (wsRef.current?.readyState === WebSocket.OPEN) return;

		setState("connecting");
		setError(null);
		firstServerAudioTurnDoneRef.current = false;
		setInitialAgentPlaybackDone(false);

		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.host}/v1/public/sessions/${sessionId}/voice`;

		const ws = new WebSocket(wsUrl);
		wsRef.current = ws;

		ws.onopen = () => {
			ws.send(JSON.stringify({ type: "auth", token: sessionToken }));
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);

				switch (data.type) {
					case "state":
						if (data.data === "connected") {
							setError(null);
							setState("connected");
						}
						break;

					case "assistant_message":
						addMessage({
							role: "assistant",
							content: data.data,
							timestamp: Date.now(),
						});
						if (data.state === "completed") {
							setState("completed");
						} else {
							setState("speaking");
						}
						break;

					case "transcription":
						addMessage({
							role: "user",
							content: data.data,
							timestamp: Date.now(),
						});
						setState("processing");
						break;

					case "audio_chunk":
						if (data.data) {
							try {
								const binaryString = atob(data.data);
								const bytes = new Uint8Array(binaryString.length);
								for (let i = 0; i < binaryString.length; i++) {
									bytes[i] = binaryString.charCodeAt(i);
								}
								audioQueueRef.current.push(bytes.buffer);
								if (!isPlayingRef.current) {
									playAudioQueue();
								}
							} catch {
								// ignore decode errors
							}
						}
						break;

					case "audio_end":
						// Stay in "speaking" until client finishes playing the queue
						pendingAudioEndRef.current = true;
						onPlaybackDoneRef.current = () => {
							markFirstServerAudioTurnDone();
							if (stateRef.current !== "completed") {
								setState("connected");
							}
							onPlaybackDoneRef.current = null;
						};
						// If nothing is playing and queue is empty, transition now (incl. zero TTS audio)
						if (!isPlayingRef.current && audioQueueRef.current.length === 0) {
							pendingAudioEndRef.current = false;
							markFirstServerAudioTurnDone();
							if (stateRef.current !== "completed") {
								setState("connected");
							}
							onPlaybackDoneRef.current = null;
						}
						break;

					case "error":
						setError(data.data);
						setState("error");
						break;
				}
			} catch {
				// ignore parse errors
			}
		};

		ws.onclose = () => {
			setState("disconnected");
		};

		ws.onerror = () => {
			// Only show connection failed if we never reached "connected" (browsers often fire onerror spuriously)
			if (stateRef.current === "connecting") {
				setState("error");
				setError("WebSocket connection failed");
			}
		};
	}, [sessionId, sessionToken, addMessage, playAudioQueue, markFirstServerAudioTurnDone]);

	const disconnect = useCallback(() => {
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
			mediaRecorderRef.current.stop();
		}
		cancelAnimationFrame(animFrameRef.current);
		setState("disconnected");
	}, []);

	const startRecording = useCallback(async () => {
		if (!initialAgentPlaybackDone) return;
		if (stateRef.current !== "connected") return;
		if (isPlayingRef.current) return;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

			const mimeType = getSupportedMimeType();
			const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
			const mediaRecorder = new MediaRecorder(stream, options);
			mediaRecorderRef.current = mediaRecorder;
			audioChunksRef.current = [];
			pendingFileReadsRef.current = 0;

			const ctx = new AudioContext();
			const source = ctx.createMediaStreamSource(stream);
			const analyser = ctx.createAnalyser();
			analyser.fftSize = 256;
			source.connect(analyser);
			analyserRef.current = analyser;

			const dataArray = new Uint8Array(analyser.frequencyBinCount);
			const updateLevel = () => {
				analyser.getByteFrequencyData(dataArray);
				const average = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
				setAudioLevel(Math.min(average / 128, 1));
				animFrameRef.current = requestAnimationFrame(updateLevel);
			};
			updateLevel();

			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					audioChunksRef.current.push(e.data);

					pendingFileReadsRef.current += 1;
					const reader = new FileReader();
					reader.onloadend = () => {
						pendingFileReadsRef.current -= 1;
						try {
							const base64 = (reader.result as string).split(",")[1];
							if (base64) {
								wsRef.current?.send(
									JSON.stringify({ type: "audio_chunk", data: base64 }),
								);
							}
						} catch {
							// ignore
						}
					};
					reader.onerror = () => {
						pendingFileReadsRef.current -= 1;
					};
					reader.readAsDataURL(e.data);
				}
			};

			mediaRecorder.start(250);
			wsRef.current?.send(JSON.stringify({ type: "start_recording" }));
			setState("listening");
		} catch {
			setError("Microphone access denied");
			setState("error");
		}
	}, [initialAgentPlaybackDone]);

	const stopRecording = useCallback(() => {
		cancelAnimationFrame(animFrameRef.current);
		setAudioLevel(0);
		setState("processing");

		const recorder = mediaRecorderRef.current;
		if (!recorder || recorder.state === "inactive") {
			wsRef.current?.send(JSON.stringify({ type: "stop" }));
			mediaRecorderRef.current = null;
			return;
		}

		const sendStopWhenReady = () => {
			const deadline = Date.now() + 3000;
			const tick = () => {
				if (pendingFileReadsRef.current <= 0 || Date.now() > deadline) {
					wsRef.current?.send(JSON.stringify({ type: "stop" }));
					mediaRecorderRef.current = null;
					return;
				}
				setTimeout(tick, 15);
			};
			setTimeout(tick, 0);
		};

		recorder.onstop = () => {
			recorder.stream.getTracks().forEach((t) => t.stop());
			sendStopWhenReady();
		};
		recorder.stop();
	}, []);

	useEffect(() => {
		return () => {
			disconnect();
		};
	}, [disconnect]);

	return {
		state,
		messages,
		error,
		audioLevel,
		initialAgentPlaybackDone,
		connect,
		disconnect,
		startRecording,
		stopRecording,
	};
}
