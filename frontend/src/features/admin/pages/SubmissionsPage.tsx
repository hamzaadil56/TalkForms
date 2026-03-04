/** Submissions page — Living Interface botanical theme */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../app/AuthProvider";
import { exportCsv, fetchSubmissions } from "../api/adminApi";
import { SubmissionTable } from "../components/SubmissionTable";
import { AdminShell, EmptyState, PageBody, PageHeader } from "../../../shared/ui/Layout";
import type { SubmissionRow } from "../../../shared/types/api";

export default function SubmissionsPage() {
	const { formId } = useParams<{ formId: string }>();
	const { admin, logout } = useAuth();
	const navigate = useNavigate();
	const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [exporting, setExporting] = useState(false);
	const [exportStatus, setExportStatus] = useState<string | null>(null);

	useEffect(() => {
		if (!formId) return;
		setLoading(true);
		fetchSubmissions(formId)
			.then((res) => setSubmissions(res.rows))
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, [formId]);

	const handleExport = async () => {
		if (!formId) return;
		setExporting(true);
		setExportStatus(null);
		try {
			const res = await exportCsv(formId);
			setExportStatus(`Export created: ${res.row_count} rows`);
		} catch (err) {
			setExportStatus(err instanceof Error ? err.message : "Export failed");
		} finally {
			setExporting(false);
		}
	};

	return (
		<AdminShell email={admin?.email} onLogout={() => { logout(); navigate("/admin/login"); }}>
			<PageHeader
				title="Submissions"
				subtitle={formId ? `Form: ${formId}` : undefined}
				backTo="/admin"
				backLabel="Dashboard"
				actions={
					<button
						onClick={handleExport}
						disabled={exporting || submissions.length === 0}
						className="px-5 py-[9px] rounded-lg font-body font-semibold text-[13px] text-white transition-all duration-150 disabled:opacity-50 hover:opacity-90"
						style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-teal)" }}
					>
						{exporting ? "Exporting..." : "Export CSV"}
					</button>
				}
			/>
			<PageBody>
				{exportStatus && (
					<div
						className="rounded-xl p-3 border font-body text-[13px] text-text-secondary mb-4"
						style={{ background: "var(--stone-50)", borderColor: "var(--border-subtle)" }}
					>
						{exportStatus}
					</div>
				)}

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
				) : submissions.length === 0 ? (
					<EmptyState
						title="No submissions yet"
						description="Submissions will appear here once consumers complete your form."
					/>
				) : (
					<SubmissionTable submissions={submissions} />
				)}
			</PageBody>
		</AdminShell>
	);
}
