/** Chat message bubble — Living Interface botanical theme */
import type { ChatMessage } from "../../../shared/types/api";

interface MessageBubbleProps {
	message: ChatMessage;
	isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
	const isBot = message.role === "assistant";

	if (isBot) {
		return (
			<div className="flex gap-3 items-end max-w-[88%] self-start animate-bubble-left">
				{/* Lavender bot avatar — AI identity color */}
				<div
					className="w-8 h-8 rounded-full flex-shrink-0 grid place-items-center text-white text-[13px] font-bold"
					style={{
						background: "var(--gradient-brand)",
						boxShadow: "0 2px 8px rgba(20,184,166,0.3)",
					}}
				>
					A
				</div>
				<div className="msg-bot-bubble px-5 py-4">
					<p className={`whitespace-pre-wrap${isStreaming ? " streaming-cursor" : ""}`}>
						{message.content}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex justify-end max-w-[88%] self-end animate-bubble-right">
			<div className="msg-user-bubble px-5 py-3">
				<p className="whitespace-pre-wrap">{message.content}</p>
			</div>
		</div>
	);
}

export function TypingIndicator() {
	return (
		<div className="flex gap-3 items-end max-w-[88%] self-start animate-bubble-left">
			<div
				className="w-8 h-8 rounded-full flex-shrink-0 grid place-items-center text-white text-[13px] font-bold"
				style={{
					background: "var(--gradient-brand)",
					boxShadow: "0 2px 8px rgba(20,184,166,0.3)",
				}}
			>
				A
			</div>
			<div
				className="flex gap-[5px] items-center px-5 py-4"
				style={{
					background: "var(--stone-0)",
					border: "1px solid var(--border-default)",
					borderRadius: "var(--radius-2xl) var(--radius-2xl) var(--radius-2xl) var(--radius-sm)",
					boxShadow: "var(--shadow-xs)",
				}}
			>
				{/* Tri-color typing dots: teal → lavender → sage */}
				<span
					className="w-[7px] h-[7px] rounded-full"
					style={{ background: "var(--teal-400)", animation: "typing-bounce 1.5s infinite ease-in-out" }}
				/>
				<span
					className="w-[7px] h-[7px] rounded-full"
					style={{ background: "var(--lavender-400)", animation: "typing-bounce 1.5s infinite ease-in-out 0.18s" }}
				/>
				<span
					className="w-[7px] h-[7px] rounded-full"
					style={{ background: "var(--sage-400)", animation: "typing-bounce 1.5s infinite ease-in-out 0.36s" }}
				/>
			</div>
		</div>
	);
}
