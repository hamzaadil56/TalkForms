import { type FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../app/AuthProvider";

export default function LoginPage() {
	const { login, isAuthenticated } = useAuth();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const redirectTo = searchParams.get("redirect") || "/admin";

	const [email, setEmail] = useState("admin@example.com");
	const [password, setPassword] = useState("admin123");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	if (isAuthenticated) {
		navigate(redirectTo, { replace: true });
		return null;
	}

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setLoading(true);
		setError(null);
		try {
			await login(email, password);
			navigate(redirectTo, { replace: true });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className="min-h-screen flex items-center justify-center px-8"
			style={{ background: "var(--mesh-bg)" }}
		>
			<div
				className="w-full max-w-[420px] rounded-[28px] p-10 animate-fade-up"
				style={{
					background: "rgba(255,255,255,0.85)",
					border: "1px solid rgba(255,255,255,0.9)",
					boxShadow: "var(--shadow-xl)",
					backdropFilter: "blur(20px)",
				}}
			>
				{/* Logo */}
				<div className="text-center mb-8">
					<div
						className="w-[52px] h-[52px] rounded-xl grid place-items-center mx-auto mb-4 text-white"
						style={{
							background: "var(--gradient-brand)",
							boxShadow: "var(--shadow-teal)",
						}}
					>
						<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
						</svg>
					</div>
					<h1 className="font-display font-bold text-[32px] text-text-primary leading-tight tracking-tight">
						Welcome back
					</h1>
					<p className="font-body text-[13px] text-text-secondary mt-2">
						Sign in to manage your agentic forms.
					</p>
				</div>

				<form className="space-y-4" onSubmit={onSubmit}>
					<div>
						<label htmlFor="email" className="block font-body text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-2">
							Email
						</label>
						<input
							id="email"
							className="w-full px-4 py-[10px] rounded-lg font-body text-text-primary text-[15px] outline-none transition-all placeholder:text-text-muted"
							style={{
								background: "var(--stone-0)",
								border: "1.5px solid var(--stone-200)",
							}}
							onFocus={(e) => { e.currentTarget.style.borderColor = "var(--teal-400)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(20,184,166,0.12)"; }}
							onBlur={(e) => { e.currentTarget.style.borderColor = "var(--stone-200)"; e.currentTarget.style.boxShadow = "none"; }}
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="admin@example.com"
							type="email"
							autoComplete="email"
						/>
					</div>
					<div>
						<label htmlFor="password" className="block font-body text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-2">
							Password
						</label>
						<input
							id="password"
							className="w-full px-4 py-[10px] rounded-lg font-body text-text-primary text-[15px] outline-none transition-all placeholder:text-text-muted"
							style={{
								background: "var(--stone-0)",
								border: "1.5px solid var(--stone-200)",
							}}
							onFocus={(e) => { e.currentTarget.style.borderColor = "var(--teal-400)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(20,184,166,0.12)"; }}
							onBlur={(e) => { e.currentTarget.style.borderColor = "var(--stone-200)"; e.currentTarget.style.boxShadow = "none"; }}
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="Password"
							autoComplete="current-password"
						/>
					</div>
					{error && (
						<p className="font-body text-[13px]" style={{ color: "var(--color-error)" }} role="alert">
							{error}
						</p>
					)}
					<button
						className="w-full px-6 py-[11px] rounded-lg font-body font-semibold text-[14px] text-white transition-all duration-150 disabled:opacity-50 hover:opacity-90"
						style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-teal)" }}
						disabled={loading}
						type="submit"
					>
						{loading ? "Signing in..." : "Sign In"}
					</button>
				</form>
			</div>
		</div>
	);
}
