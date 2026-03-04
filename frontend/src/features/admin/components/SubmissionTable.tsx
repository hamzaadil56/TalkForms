/** Submissions table — Living Interface botanical theme */
import type { SubmissionRow } from "../../../shared/types/api";

interface SubmissionTableProps {
	submissions: SubmissionRow[];
}

export function SubmissionTable({ submissions }: SubmissionTableProps) {
	const fieldKeys = Array.from(
		new Set(submissions.flatMap((s) => Object.keys(s.answers))),
	);

	if (submissions.length === 0) return null;

	return (
		<div
			className="rounded-2xl overflow-hidden"
			style={{ background: "var(--stone-0)", border: "1px solid var(--border-default)" }}
		>
			<div className="overflow-x-auto">
				<table className="w-full border-collapse">
					<thead>
						<tr style={{ borderBottom: "1.5px solid var(--border-subtle)" }}>
							<th
								className="px-4 py-3 text-left font-body text-[11px] font-semibold uppercase tracking-widest"
								style={{ color: "var(--text-muted)", background: "var(--stone-25)" }}
							>
								#
							</th>
							<th
								className="px-4 py-3 text-left font-body text-[11px] font-semibold uppercase tracking-widest"
								style={{ color: "var(--text-muted)", background: "var(--stone-25)" }}
							>
								Completed
							</th>
							{fieldKeys.map((key) => (
								<th
									key={key}
									className="px-4 py-3 text-left font-body text-[11px] font-semibold uppercase tracking-widest whitespace-nowrap"
									style={{ color: "var(--text-muted)", background: "var(--stone-25)" }}
								>
									{key}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{submissions.map((sub, i) => (
							<tr
								key={sub.submission_id}
								className="transition-colors"
								style={{ borderBottom: "1px solid var(--border-subtle)" }}
								onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--stone-25)"; }}
								onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
							>
								<td className="px-4 py-3 font-body text-[13px]" style={{ color: "var(--text-muted)" }}>
									{i + 1}
								</td>
								<td className="px-4 py-3 font-body text-[13px] whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
									{new Date(sub.completed_at).toLocaleDateString(undefined, {
										year: "numeric",
										month: "short",
										day: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</td>
								{fieldKeys.map((key) => (
									<td key={key} className="px-4 py-3 font-body text-[13px] max-w-[200px] truncate" style={{ color: "var(--text-primary)" }}>
										{sub.answers[key] || (
											<span style={{ color: "var(--text-muted)" }}>-</span>
										)}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div
				className="px-4 py-3 border-t font-body text-[11px] uppercase tracking-widest"
				style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
			>
				{submissions.length} submission{submissions.length !== 1 ? "s" : ""}
			</div>
		</div>
	);
}
