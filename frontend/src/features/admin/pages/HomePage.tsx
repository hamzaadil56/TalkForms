import { Link } from "react-router-dom";

export default function HomePage() {
	return (
		<div
			className="min-h-screen flex items-center justify-center px-4"
			style={{ background: "var(--mesh-bg)" }}
		>
			<div className="text-center space-y-8 animate-fade-up">
				<div>
					{/* Logo mark */}
					<div
						className="w-14 h-14 rounded-xl grid place-items-center mx-auto mb-6 text-white"
						style={{
							background: "var(--gradient-brand)",
							boxShadow: "var(--shadow-teal)",
						}}
					>
						<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
						</svg>
					</div>
					<h1 className="font-display font-extrabold text-[56px] text-text-primary leading-[1.1] tracking-[-0.04em]">
						Agentic Forms
					</h1>
					<p className="font-body text-text-secondary text-[17px] mt-3 max-w-md mx-auto leading-relaxed">
						Admins craft intelligent form journeys. Consumers experience them through natural conversation.
					</p>
				</div>
				<div className="flex flex-wrap gap-3 justify-center">
					<Link
						to="/admin/login"
						className="px-6 py-[11px] rounded-lg font-body font-semibold text-[14px] text-white transition-all duration-150 hover:opacity-90"
						style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-teal)" }}
					>
						Admin Login
					</Link>
					<Link
						to="/legacy/voice"
						className="px-6 py-[11px] rounded-lg font-body font-medium text-[14px] transition-all duration-150 hover:text-text-primary"
						style={{
							background: "var(--stone-0)",
							border: "1.5px solid var(--stone-200)",
							color: "var(--text-secondary)",
						}}
					>
						Legacy Voice Agent
					</Link>
				</div>
			</div>
		</div>
	);
}
