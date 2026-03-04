/** Chat interface — Living Interface botanical theme */
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../../../shared/types/api";
import type { SessionStatus } from "../hooks/useConsumerSession";
import { MessageBubble, TypingIndicator } from "./MessageBubble";

interface ChatInterfaceProps {
	messages: ChatMessage[];
	status: SessionStatus;
	error: string | null;
	onSend: (message: string) => void;
	onSwitchToVoice?: () => void;
}

export function ChatInterface({
	messages,
	status,
	error,
	onSend,
	onSwitchToVoice,
}: ChatInterfaceProps) {
	const [input, setInput] = useState("");
	const chatEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, status]);

	useEffect(() => {
		if (status === "active") {
			inputRef.current?.focus();
		}
	}, [status]);

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (!input.trim() || status === "sending" || status === "streaming") return;
		onSend(input.trim());
		setInput("");
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	const isCompleted = status === "completed";
	const isBusy = status === "sending" || status === "streaming";
	const isStreaming = status === "streaming";

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
			{/* Messages */}
			<div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
				{messages.map((msg, i) => (
					<MessageBubble
						key={i}
						message={msg}
						isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
					/>
				))}
				{status === "sending" && <TypingIndicator />}
				{error && (
					<div className="text-center">
						<p
							className="text-[13px] px-4 py-2 rounded-xl inline-block font-body"
							style={{ color: "var(--color-error)", background: "var(--error-bg)" }}
							role="alert"
						>
							{error}
						</p>
					</div>
				)}
				<div ref={chatEndRef} />
			</div>

			{/* Input area */}
			{!isCompleted ? (
				<div
					className="px-6 pb-8 pt-4"
					style={{ background: "linear-gradient(to top, var(--stone-25) 75%, transparent)" }}
				>
					<form
						onSubmit={handleSubmit}
						className="flex items-end gap-3 rounded-[28px] px-5 py-3 transition-all"
						style={{
							background: "var(--stone-0)",
							border: "1.5px solid var(--stone-200)",
							boxShadow: "var(--shadow-md)",
						}}
						onFocus={(e) => {
							const form = e.currentTarget;
							form.style.borderColor = "var(--teal-300)";
							form.style.boxShadow = "var(--shadow-md), 0 0 0 3px rgba(20,184,166,0.10)";
						}}
						onBlur={(e) => {
							if (!e.currentTarget.contains(e.relatedTarget)) {
								const form = e.currentTarget;
								form.style.borderColor = "var(--stone-200)";
								form.style.boxShadow = "var(--shadow-md)";
							}
						}}
					>
						<textarea
							ref={inputRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							className="flex-1 border-none outline-none font-body text-[15px] text-text-primary bg-transparent resize-none max-h-[120px] leading-normal placeholder:text-text-muted"
							placeholder="Type your answer..."
							disabled={isBusy}
							rows={1}
							autoFocus
						/>
						{/* Send button — teal gradient */}
						<button
							type="submit"
							disabled={isBusy || !input.trim()}
							className="w-[38px] h-[38px] rounded-full grid place-items-center flex-shrink-0 text-white transition-all duration-150 hover:opacity-90 hover:scale-[1.05] active:scale-[0.94] disabled:cursor-not-allowed"
							style={{
								background: (!isBusy && input.trim()) ? "var(--gradient-brand)" : "var(--stone-150)",
								color: (!isBusy && input.trim()) ? "white" : "var(--stone-400)",
								boxShadow: (!isBusy && input.trim()) ? "var(--shadow-teal)" : "none",
							}}
						>
							<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
							</svg>
						</button>
						{onSwitchToVoice && (
							<button
								type="button"
								onClick={onSwitchToVoice}
								className="w-[38px] h-[38px] rounded-full border grid place-items-center flex-shrink-0 transition-all duration-150"
								style={{ borderColor: "var(--stone-200)", color: "var(--text-muted)" }}
								title="Switch to voice mode"
								onMouseEnter={(e) => {
									e.currentTarget.style.borderColor = "var(--teal-300)";
									e.currentTarget.style.color = "var(--teal-600)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.borderColor = "var(--stone-200)";
									e.currentTarget.style.color = "var(--text-muted)";
								}}
							>
								<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
								</svg>
							</button>
						)}
					</form>
				</div>
			) : (
				<div className="border-t border-border-subtle p-6 text-center">
					<div
						className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-body text-[13px] font-medium"
						style={{ background: "var(--success-bg)", color: "var(--color-success)" }}
					>
						<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
						</svg>
						Form completed! Thank you for your responses.
					</div>
				</div>
			)}
		</div>
	);
}
