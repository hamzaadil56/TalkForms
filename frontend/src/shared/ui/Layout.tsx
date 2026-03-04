import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

/* ----------------------------------------------------------------
   Admin Shell — light sidebar + content
   ---------------------------------------------------------------- */

interface AdminShellProps {
	children: ReactNode;
	email?: string;
	onLogout?: () => void;
}

const navItems = [
	{ to: "/admin", label: "Dashboard", icon: DashboardIcon },
	{ to: "/admin/forms/new", label: "Create Form", icon: PlusIcon },
];

export function AdminShell({ children, email, onLogout }: AdminShellProps) {
	const location = useLocation();

	return (
		<div className="flex h-screen bg-bg-page text-text-primary">
			{/* Sidebar */}
			<aside className="w-[248px] flex-shrink-0 bg-bg-base border-r border-border-subtle flex flex-col py-4 gap-1 sticky top-0 h-screen">
				{/* Logo */}
				<div className="px-3 pb-5 flex items-center gap-3">
					<div
						className="w-8 h-8 rounded-lg grid place-items-center flex-shrink-0"
						style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-teal)" }}
					>
						<svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
						</svg>
					</div>
					<span className="font-display text-[17px] font-bold text-text-primary tracking-tight">
						Agentic Forms
					</span>
				</div>

				{/* Nav */}
				<nav className="flex-1 flex flex-col gap-0.5 px-3">
					{navItems.map((item) => {
						const isActive = location.pathname === item.to;
						return (
							<Link
								key={item.to}
								to={item.to}
								className={`flex items-center gap-3 px-3 py-[9px] rounded-lg text-[13px] font-medium transition-all duration-[120ms] relative ${
									isActive
										? "text-teal-700 bg-teal-50 font-semibold"
										: "text-text-secondary hover:text-text-primary hover:bg-stone-50"
								}`}
							>
								{isActive && (
									<span className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-teal-500 rounded-r-full" />
								)}
								<item.icon active={isActive} />
								{item.label}
							</Link>
						);
					})}
				</nav>

				{/* User / Logout */}
				<div className="px-4 pt-4 border-t border-border-subtle">
					{email && (
						<p className="text-[11px] text-text-muted truncate mb-2 font-mono">{email}</p>
					)}
					{onLogout && (
						<button
							onClick={onLogout}
							className="w-full text-left text-[13px] text-text-secondary hover:text-text-primary py-1 transition-colors duration-[120ms] font-body"
						>
							Sign out
						</button>
					)}
				</div>
			</aside>

			{/* Main content */}
			<main className="flex-1 overflow-y-auto flex flex-col min-w-0">
				{children}
			</main>
		</div>
	);
}

/* ----------------------------------------------------------------
   Page primitives
   ---------------------------------------------------------------- */

interface PageHeaderProps {
	title: string;
	subtitle?: string;
	backTo?: string;
	backLabel?: string;
	actions?: ReactNode;
}

export function PageHeader({ title, subtitle, backTo, backLabel, actions }: PageHeaderProps) {
	return (
		<header
			className="sticky top-0 z-20 px-8 py-5 border-b border-border-subtle flex items-center justify-between gap-4"
			style={{ background: "rgba(250,250,249,0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
		>
			<div>
				{backTo && (
					<Link
						to={backTo}
						className="text-[11px] uppercase tracking-widest font-semibold text-text-muted hover:text-teal-600 mb-1 inline-block transition-colors"
					>
						&larr; {backLabel || "Back"}
					</Link>
				)}
				<h1 className="font-display text-[26px] font-bold text-text-primary leading-tight tracking-tight">
					{title}
				</h1>
				{subtitle && (
					<p className="text-[13px] text-text-secondary mt-0.5 font-body">{subtitle}</p>
				)}
			</div>
			{actions && <div className="flex gap-3">{actions}</div>}
		</header>
	);
}

export function PageBody({ children }: { children: ReactNode }) {
	return (
		<div className="px-8 py-6 max-w-[1200px] w-full mx-auto flex-1">
			{children}
		</div>
	);
}

interface PageLayoutProps {
	children: ReactNode;
	maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const maxWidthStyles = {
	sm: "max-w-lg",
	md: "max-w-2xl",
	lg: "max-w-4xl",
	xl: "max-w-6xl",
	"2xl": "max-w-7xl",
};

export function PageLayout({ children, maxWidth = "xl" }: PageLayoutProps) {
	return (
		<div className={`${maxWidthStyles[maxWidth]} mx-auto py-8 px-4`}>
			{children}
		</div>
	);
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
	return (
		<div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-3">
			<div className="w-16 h-16 bg-stone-50 border-[1.5px] border-stone-200 rounded-2xl grid place-items-center text-[28px] mb-2">
				💬
			</div>
			<h2 className="font-display font-bold text-[22px] text-text-primary tracking-tight">{title}</h2>
			<p className="text-[13px] text-text-secondary max-w-[260px] leading-relaxed font-body">{description}</p>
			{action}
		</div>
	);
}

export function ErrorDisplay({ message, retry }: { message: string; retry?: () => void }) {
	return (
		<div
			className="rounded-2xl p-8 border text-center"
			style={{ background: "var(--error-bg)", borderColor: "var(--error-border)" }}
		>
			<p className="text-error mb-4 font-body text-[14px]">{message}</p>
			{retry && (
				<button
					onClick={retry}
					className="px-4 py-2 rounded-lg bg-bg-elevated border border-border-default text-text-secondary hover:text-text-primary text-[13px] transition-colors font-body"
				>
					Try Again
				</button>
			)}
		</div>
	);
}

/* ----------------------------------------------------------------
   Icons
   ---------------------------------------------------------------- */

function DashboardIcon({ active }: { active?: boolean }) {
	return (
		<svg
			className={`w-4 h-4 flex-shrink-0 transition-colors ${active ? "text-teal-500" : "text-text-muted"}`}
			fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
		>
			<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
		</svg>
	);
}

function PlusIcon({ active }: { active?: boolean }) {
	return (
		<svg
			className={`w-4 h-4 flex-shrink-0 transition-colors ${active ? "text-teal-500" : "text-text-muted"}`}
			fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
		>
			<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
		</svg>
	);
}
