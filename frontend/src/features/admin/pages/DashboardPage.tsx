import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/AuthProvider";
import { adminApi } from "../../../shared/lib/httpClient";
import { AdminShell, EmptyState, PageBody, PageHeader } from "../../../shared/ui/Layout";
import type { FormSummary } from "../../../shared/types/api";

export default function DashboardPage() {
	const { admin, logout } = useAuth();
	const navigate = useNavigate();
	const [forms, setForms] = useState<FormSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const orgId = admin?.memberships[0]?.org_id;

	useEffect(() => {
		if (!orgId) return;
		setLoading(true);
		adminApi
			.get<{ forms: FormSummary[] }>(`/orgs/${orgId}/forms`)
			.then((res) => setForms(res.forms))
			.catch((err) => {
				if (err.status === 404 || err.status === 405) {
					setForms([]);
				} else {
					setError(err.message);
				}
			})
			.finally(() => setLoading(false));
	}, [orgId]);

	const handleLogout = () => {
		logout();
		navigate("/admin/login");
	};

	return (
		<AdminShell email={admin?.email} onLogout={handleLogout}>
			<PageHeader
				title="Dashboard"
				subtitle={`${forms.length} form${forms.length !== 1 ? "s" : ""}`}
				actions={
					<Link
						to="/admin/forms/new"
						className="px-5 py-[9px] rounded-lg font-body font-semibold text-[13px] text-white transition-all duration-150 hover:opacity-90"
						style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-teal)" }}
					>
						+ Create Form
					</Link>
				}
			/>
			<PageBody>
				{loading ? (
					<div className="flex justify-center py-20">
						<div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
					</div>
				) : error ? (
					<div
						className="rounded-2xl p-8 border text-center"
						style={{ background: "var(--error-bg)", borderColor: "var(--error-border)" }}
					>
						<p className="font-body text-[14px]" style={{ color: "var(--color-error)" }}>{error}</p>
					</div>
				) : forms.length === 0 ? (
					<EmptyState
						title="No forms yet"
						description="Create your first conversational form to get started."
						action={
							<Link
								to="/admin/forms/new"
								className="px-6 py-[10px] rounded-lg font-body font-semibold text-[13px] text-white transition-all duration-150 hover:opacity-90"
								style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-teal)" }}
							>
								Create Your First Form
							</Link>
						}
					/>
				) : (
					<div className="grid gap-3">
						{forms.map((form) => (
							<div
								key={form.id}
								className="rounded-2xl p-5 flex items-center justify-between transition-all duration-150"
								style={{
									background: "var(--stone-0)",
									border: "1px solid var(--border-default)",
									borderLeft: "3px solid var(--teal-300)",
								}}
								onMouseEnter={(e) => {
									(e.currentTarget as HTMLDivElement).style.borderColor = "var(--teal-200)";
									(e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
								}}
								onMouseLeave={(e) => {
									(e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-default)";
									(e.currentTarget as HTMLDivElement).style.borderLeftColor = "var(--teal-300)";
									(e.currentTarget as HTMLDivElement).style.boxShadow = "none";
								}}
							>
								<div className="flex-1 min-w-0 pl-2">
									<div className="flex items-center gap-3 mb-1">
										<h3 className="font-display font-semibold text-[18px] text-text-primary truncate tracking-tight">
											{form.title}
										</h3>
										<StatusBadge status={form.status} />
									</div>
									<p className="font-mono text-[12px] text-text-muted">
										/{form.slug} &middot; {form.mode}
									</p>
								</div>
								<div className="flex gap-2 ml-4">
									<Link
										to={`/admin/forms/${form.id}`}
										className="px-3 py-[7px] rounded-lg font-body text-[13px] transition-all hover:text-text-primary"
										style={{
											background: "var(--stone-50)",
											border: "1px solid var(--border-default)",
											color: "var(--text-secondary)",
										}}
									>
										Edit
									</Link>
									<Link
										to={`/admin/forms/${form.id}/submissions`}
										className="px-3 py-[7px] rounded-lg font-body text-[13px] transition-all hover:text-text-primary"
										style={{
											background: "var(--stone-50)",
											border: "1px solid var(--border-default)",
											color: "var(--text-secondary)",
										}}
									>
										Submissions
									</Link>
									{form.status === "published" && (
										<Link
											to={`/f/${form.slug}`}
											target="_blank"
											className="px-3 py-[7px] rounded-lg font-body text-[13px] transition-all hover:opacity-80"
											style={{
												background: "var(--teal-50)",
												border: "1px solid var(--border-teal)",
												color: "var(--teal-700)",
											}}
										>
											Open ↗
										</Link>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</PageBody>
		</AdminShell>
	);
}

function StatusBadge({ status }: { status: string }) {
	if (status === "published") {
		return (
			<span
				className="inline-flex items-center gap-1 px-[10px] py-[2px] rounded-full text-[11px] font-semibold tracking-wide font-body"
				style={{
					background: "var(--success-bg)",
					color: "#059669",
					border: "1px solid var(--success-border)",
				}}
			>
				<span className="w-[6px] h-[6px] rounded-full bg-[#10b981] animate-pulse-dot" />
				{status}
			</span>
		);
	}
	return (
		<span
			className="inline-flex items-center px-[10px] py-[2px] rounded-full text-[11px] font-semibold font-body"
			style={{
				background: "var(--stone-50)",
				color: "var(--stone-500)",
				border: "1px solid var(--stone-200)",
			}}
		>
			{status}
		</span>
	);
}
