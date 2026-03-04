/** Session completion screen — Living Interface botanical theme */

interface SessionCompleteProps {
	onRestart?: () => void;
}

export function SessionComplete({ onRestart }: SessionCompleteProps) {
	return (
		<div
			className="rounded-2xl p-12 text-center space-y-5 animate-fade-up"
			style={{
				background: "var(--stone-0)",
				border: "1px solid var(--border-default)",
				boxShadow: "var(--shadow-md)",
			}}
		>
			{/* Success icon — nature gradient */}
			<div
				className="w-[72px] h-[72px] rounded-full grid place-items-center mx-auto text-[32px]"
				style={{
					background: "var(--gradient-nature)",
					boxShadow: "0 8px 32px rgba(20,184,166,0.3)",
					animation: "success-burst 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
				}}
			>
				✓
			</div>
			<h2 className="font-display font-bold text-[26px] text-text-primary tracking-tight">
				Thank You!
			</h2>
			<p className="font-body text-[15px] text-text-secondary max-w-sm mx-auto leading-relaxed">
				Your responses have been submitted successfully. We appreciate your time.
			</p>
			{onRestart && (
				<button
					onClick={onRestart}
					className="px-5 py-[9px] rounded-lg font-body font-medium text-[13px] transition-all hover:text-teal-600"
					style={{
						background: "var(--stone-0)",
						border: "1.5px solid var(--stone-200)",
						color: "var(--text-secondary)",
					}}
					onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--teal-300)"; }}
					onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--stone-200)"; }}
				>
					Start Again
				</button>
			)}
		</div>
	);
}
