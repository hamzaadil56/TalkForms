/** Error boundary for catching render errors — Living Interface botanical theme */
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("ErrorBoundary caught:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}
			return (
				<div
					className="min-h-screen flex items-center justify-center p-4"
					style={{ background: "var(--mesh-bg)" }}
				>
					<div
						className="rounded-2xl p-8 max-w-lg w-full text-center"
						style={{
							background: "rgba(255,255,255,0.85)",
							border: "1px solid rgba(255,255,255,0.9)",
							boxShadow: "var(--shadow-xl)",
							backdropFilter: "blur(20px)",
						}}
					>
						<div
							className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4 text-[24px]"
							style={{ background: "var(--stone-50)", border: "1.5px solid var(--stone-200)" }}
						>
							⚠️
						</div>
						<h2 className="font-display font-bold text-[26px] text-text-primary mb-2 tracking-tight">
							Something went wrong
						</h2>
						<p className="font-body text-[13px] text-text-secondary mb-4 leading-relaxed">
							An unexpected error occurred. Please try refreshing the page.
						</p>
						{this.state.error && (
							<p
								className="font-mono text-[12px] rounded-xl p-3 mb-4 text-left break-all"
								style={{ color: "var(--color-error)", background: "var(--error-bg)" }}
							>
								{this.state.error.message}
							</p>
						)}
						<button
							onClick={() => window.location.reload()}
							className="px-5 py-[9px] rounded-lg font-body font-semibold text-[13px] text-white transition-all hover:opacity-90"
							style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-teal)" }}
						>
							Refresh Page
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
