/** Voice interface — Living Interface botanical theme with teal mic pulse */
import { useCallback, useEffect, useMemo } from "react";
import { useVoiceSession, type VoiceState } from "../hooks/useVoiceSession";
import { MessageBubble } from "./MessageBubble";

interface VoiceInterfaceProps {
	sessionId: string;
	sessionToken: string;
	onSwitchToChat?: () => void;
}

export function VoiceInterface({ sessionId, sessionToken, onSwitchToChat }: VoiceInterfaceProps) {
	const voice = useVoiceSession({ sessionId, sessionToken });

	useEffect(() => {
		voice.connect();
		return () => voice.disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleMicClick = useCallback(() => {
		if (!voice.initialAgentPlaybackDone) return;
		if (voice.state === "connected" || voice.state === "speaking") {
			voice.startRecording();
		} else if (voice.state === "listening") {
			voice.stopRecording();
		} else if (voice.state === "disconnected" || voice.state === "error") {
			voice.connect();
		}
	}, [voice]);

	const isCompleted = voice.state === "completed";

	const baseStateLabel: Record<VoiceState, string> = useMemo(() => ({
		disconnected: "Disconnected",
		connecting:   "Connecting...",
		connected:    "Tap to speak",
		listening:    "Listening... tap to stop",
		processing:   "Processing...",
		speaking:     "Speaking...",
		completed:    "Form completed",
		error:        "Connection error",
	}), []);

	const headline =
		voice.state === "connected" && !voice.initialAgentPlaybackDone
			? "Agent is getting ready…"
			: baseStateLabel[voice.state];

	return (
		<div
			className="rounded-2xl overflow-hidden flex flex-col"
			style={{
				background: "var(--stone-0)",
				border: "1px solid var(--border-default)",
				boxShadow: "var(--shadow-md)",
				height: "75vh",
				maxHeight: "680px",
			}}
		>
			{/* Voice visualization area */}
			<div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6">

				{/* Tri-color waveform — visible while listening or speaking */}
				{(voice.state === "listening" || voice.state === "speaking") && (
					<div className="flex items-center gap-[4px] h-[52px]">
						{Array.from({ length: 15 }).map((_, i) => (
							<div
								key={i}
								className="w-[4px] rounded-sm"
								style={{
									background:
										i % 3 === 0 ? "var(--teal-400)"
										: i % 3 === 1 ? "var(--lavender-400)"
										: "var(--sage-400)",
									animation: `waveform-anim 0.9s ease infinite`,
									animationDelay: `${i * 0.06}s`,
								}}
							/>
						))}
					</div>
				)}

				{/* Mic button — teal brand gradient, teal pulse */}
				<button
					onClick={handleMicClick}
					disabled={
						voice.state === "processing" ||
						voice.state === "connecting" ||
						isCompleted ||
						(!voice.initialAgentPlaybackDone &&
							(voice.state === "connected" || voice.state === "speaking"))
					}
					className="w-[80px] h-[80px] rounded-full border-none grid place-items-center cursor-pointer transition-all duration-150 text-white disabled:opacity-50 disabled:cursor-not-allowed"
					style={{
						background: voice.state === "listening"
							? "var(--coral-400)"
							: "var(--gradient-brand)",
						animation: (voice.state === "connected" || voice.state === "listening") && !isCompleted
							? "mic-pulse 2.2s ease infinite"
							: "none",
						boxShadow: voice.state === "listening"
							? "var(--shadow-coral)"
							: "var(--shadow-teal)",
					}}
				>
					{voice.state === "listening" ? (
						<svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
							<rect x="6" y="6" width="12" height="12" rx="2" />
						</svg>
					) : (
						<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
						</svg>
					)}
				</button>

				{/* State label */}
				<p className="font-display font-semibold text-[20px] text-text-primary tracking-tight">
					{headline}
				</p>

				{voice.error && (
					<p className="font-body text-[13px] mt-1" style={{ color: "var(--color-error)" }}>
						{voice.error}
					</p>
				)}

				{isCompleted && (
					<div
						className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-body font-medium text-[13px]"
						style={{ background: "var(--success-bg)", color: "var(--color-success)" }}
					>
						<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
						</svg>
						Thank you for your responses!
					</div>
				)}
			</div>

			{/* Message history */}
			{voice.messages.length > 0 && (
				<div className="border-t border-border-subtle max-h-[30%] overflow-y-auto px-6 py-4 flex flex-col gap-2">
					{voice.messages.map((msg, i) => (
						<MessageBubble key={i} message={msg} />
					))}
				</div>
			)}

			{/* Controls */}
			<div className="border-t border-border-subtle p-4 flex justify-center gap-3">
				{voice.state === "connected" && voice.initialAgentPlaybackDone && (
					<button
						onClick={voice.startRecording}
						className="px-5 py-[10px] rounded-lg font-body font-semibold text-[13px] text-white transition-all hover:opacity-90"
						style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-teal)" }}
					>
						<span className="flex items-center gap-2">
							<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
							</svg>
							Start Speaking
						</span>
					</button>
				)}
				{voice.state === "listening" && (
					<button
						onClick={voice.stopRecording}
						className="px-5 py-[10px] rounded-lg font-body font-semibold text-[13px] text-white transition-all hover:opacity-90"
						style={{ background: "var(--coral-400)", boxShadow: "var(--shadow-coral)" }}
					>
						<span className="flex items-center gap-2">
							<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
								<rect x="6" y="6" width="12" height="12" rx="2" />
							</svg>
							Stop Recording
						</span>
					</button>
				)}
				{onSwitchToChat && !isCompleted && (
					<button
						onClick={onSwitchToChat}
						className="px-4 py-[10px] rounded-lg font-body font-medium text-[13px] text-text-secondary transition-all hover:text-teal-600"
						style={{ background: "var(--stone-0)", border: "1.5px solid var(--stone-200)" }}
						onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--teal-300)"; }}
						onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--stone-200)"; }}
					>
						Switch to Chat
					</button>
				)}
			</div>
		</div>
	);
}
