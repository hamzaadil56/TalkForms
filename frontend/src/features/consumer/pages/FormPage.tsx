/** Consumer form page — Living Interface botanical theme */
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useConsumerSession } from "../hooks/useConsumerSession";
import { ChatInterface } from "../components/ChatInterface";
import { VoiceInterface } from "../components/VoiceInterface";

export default function FormPage() {
	const { slug } = useParams<{ slug: string }>();
	const session = useConsumerSession();
	const [channel, setChannel] = useState<"chat" | "voice">("chat");
	const [activeMode, setActiveMode] = useState<"chat" | "voice">("chat");

	const handleStart = () => {
		if (!slug) return;
		setActiveMode(channel);
		session.startSession(slug, channel);
	};

	const handleSwitchToVoice = () => setActiveMode("voice");
	const handleSwitchToChat = () => setActiveMode("chat");

	return (
		<div className="consumer-runtime min-h-screen flex flex-col items-center px-4 py-8">
			{/* Header */}
			<div className="w-full max-w-[640px] px-2 pb-4">
				<div className="flex items-center gap-2 mb-2">
					{/* Powered-by dot */}
					<span
						className="w-2 h-2 rounded-full flex-shrink-0"
						style={{ background: "var(--gradient-brand)" }}
					/>
					<span className="text-[11px] text-text-muted font-body font-medium uppercase tracking-widest">
						Agentic Forms
					</span>
				</div>
				<h1 className="font-display font-bold text-[32px] text-text-primary leading-tight tracking-tight">
					{slug ? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Agentic Form"}
				</h1>
				{slug && (
					<p className="text-[15px] text-text-secondary mt-1 leading-relaxed font-body">
						Answer a few questions through a conversational experience.
					</p>
				)}
			</div>

			<div className="w-full max-w-[640px] flex-1 flex flex-col">
				{!session.isStarted ? (
					/* Start screen */
					<div
						className="rounded-2xl p-8 text-center space-y-6 animate-fade-up"
						style={{
							background: "rgba(255,255,255,0.85)",
							border: "1px solid rgba(255,255,255,0.9)",
							boxShadow: "var(--shadow-xl)",
							backdropFilter: "blur(20px)",
						}}
					>
						<div>
							<h2 className="font-display font-bold text-[26px] text-text-primary mb-2 tracking-tight">
								Ready to begin?
							</h2>
							<p className="text-[15px] text-text-secondary leading-relaxed font-body">
								Choose how you'd like to interact.
							</p>
						</div>

						{/* Channel selector */}
						<div className="flex justify-center gap-3">
							<button
								onClick={() => setChannel("chat")}
								className="px-5 py-3 rounded-full font-body font-medium text-[13px] transition-all duration-150"
								style={
									channel === "chat"
										? { background: "var(--teal-500)", color: "white", boxShadow: "var(--shadow-teal)" }
										: { background: "var(--stone-0)", border: "1.5px solid var(--stone-200)", color: "var(--text-primary)" }
								}
							>
								<span className="flex items-center gap-2">
									<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
									</svg>
									Chat
								</span>
							</button>
							<button
								onClick={() => setChannel("voice")}
								className="px-5 py-3 rounded-full font-body font-medium text-[13px] transition-all duration-150"
								style={
									channel === "voice"
										? { background: "var(--teal-500)", color: "white", boxShadow: "var(--shadow-teal)" }
										: { background: "var(--stone-0)", border: "1.5px solid var(--stone-200)", color: "var(--text-primary)" }
								}
							>
								<span className="flex items-center gap-2">
									<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
									</svg>
									Voice
								</span>
							</button>
						</div>

						{/* Start button — coral CTA */}
						<button
							onClick={handleStart}
							disabled={session.status === "starting"}
							className="px-8 py-[11px] rounded-lg font-body font-semibold text-[15px] text-white transition-all duration-150 disabled:opacity-50"
							style={{
								background: "var(--gradient-action)",
								boxShadow: "var(--shadow-coral)",
							}}
						>
							{session.status === "starting" ? (
								<span className="flex items-center gap-2">
									<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									Starting...
								</span>
							) : (
								"Start →"
							)}
						</button>

						{session.error && (
							<p className="font-body text-[13px]" style={{ color: "var(--color-error)" }} role="alert">
								{session.error}
							</p>
						)}
					</div>
				) : activeMode === "voice" ? (
					<VoiceInterface
						sessionId={session.sessionId}
						sessionToken={session.sessionToken}
						onSwitchToChat={handleSwitchToChat}
					/>
				) : (
					<ChatInterface
						messages={session.messages}
						status={session.status}
						error={session.error}
						onSend={session.send}
						onSwitchToVoice={handleSwitchToVoice}
					/>
				)}
			</div>
		</div>
	);
}
