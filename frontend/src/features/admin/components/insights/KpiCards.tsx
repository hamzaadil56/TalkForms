import type { FormAnalytics } from "../../../../shared/types/api";

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatInt(n: number): string {
	return new Intl.NumberFormat().format(n);
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
	return (
		<div className="px-4 py-3 first:pl-0 sm:border-l sm:border-stone-200 sm:first:border-l-0">
			<p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">{label}</p>
			<p className="text-[22px] font-semibold text-text-primary leading-tight tabular-nums">{value}</p>
			{sub && <p className="text-[11px] text-text-tertiary">{sub}</p>}
		</div>
	);
}

export function KpiCards({ analytics }: { analytics: FormAnalytics }) {
	const topChannel = Object.entries(analytics.channel_breakdown).sort((a, b) => b[1] - a[1])[0];
	const channelLabel: Record<string, string> = { chat: "Chat", voice: "Voice", chat_voice: "Chat + Voice" };

	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-y-2">
			<Kpi
				label="Total Submissions"
				value={formatInt(analytics.total_submissions)}
				sub={`${formatInt(analytics.total_sessions)} sessions`}
			/>
			<Kpi
				label="Completion Rate"
				value={`${analytics.completion_rate_pct.toFixed(1)}%`}
				sub="of all sessions"
			/>
			<Kpi
				label="Avg Duration"
				value={analytics.avg_completion_seconds ? formatDuration(analytics.avg_completion_seconds) : "—"}
				sub="minutes:seconds"
			/>
			<Kpi
				label="Top Channel"
				value={topChannel ? (channelLabel[topChannel[0]] ?? topChannel[0]) : "—"}
				sub={topChannel ? `${formatInt(topChannel[1])} submissions` : undefined}
			/>
		</div>
	);
}
