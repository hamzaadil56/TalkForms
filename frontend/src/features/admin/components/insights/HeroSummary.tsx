import type { FormAnalytics, FormAIInsightsResponse } from "../../../../shared/types/api";

function buildAutoSummary(analytics: FormAnalytics): string {
	const completed = analytics.total_submissions;
	const sessions = analytics.total_sessions;
	const base = `${completed} of ${sessions} ${sessions === 1 ? "session" : "sessions"} completed`;

	const drop = analytics.dropoff_funnel
		.filter((s) => s.dropoff_pct > 0)
		.sort((a, b) => b.dropoff_pct - a.dropoff_pct)[0];

	if (drop && drop.dropoff_pct >= 10) {
		return `${base}; biggest drop-off at ${drop.field_name} (${drop.dropoff_pct.toFixed(0)}%).`;
	}
	return `${base}.`;
}

interface Props {
	analytics: FormAnalytics;
	aiInsights: FormAIInsightsResponse | null;
	onGenerate: () => void;
	generating: boolean;
	canGenerate: boolean;
}

export function HeroSummary({ analytics, aiInsights, onGenerate, generating, canGenerate }: Props) {
	if (aiInsights) {
		const generated = new Date(aiInsights.generated_at).toLocaleString();
		return (
			<section className="rounded-2xl border border-forest-200 bg-gradient-to-br from-forest-50 to-white px-6 py-6">
				<div className="flex items-center gap-2 mb-3">
					<div className="w-1.5 h-1.5 rounded-full bg-forest-500" />
					<p className="text-[11px] font-semibold text-forest-700 uppercase tracking-widest">
						AI Summary
					</p>
					<p className="ml-auto text-[11px] text-text-tertiary">Generated {generated}</p>
				</div>
				<p className="font-heading text-[20px] leading-snug text-text-primary">
					{aiInsights.overall_summary}
				</p>
			</section>
		);
	}

	return (
		<section className="rounded-2xl border border-stone-200 bg-white px-6 py-6 flex flex-col sm:flex-row sm:items-center gap-4">
			<div className="flex-1 min-w-0">
				<p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-widest mb-2">
					Headline
				</p>
				<p className="font-heading text-[20px] leading-snug text-text-primary">
					{buildAutoSummary(analytics)}
				</p>
			</div>
			{canGenerate && (
				<button
					onClick={onGenerate}
					disabled={generating}
					className="shrink-0 px-4 py-2 rounded-md font-medium text-[13px] text-white bg-forest-500 hover:bg-forest-600 transition-all duration-150 disabled:opacity-50 shadow-forest inline-flex items-center gap-1.5"
				>
					{generating ? (
						<>
							<div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
							Analyzing…
						</>
					) : (
						"Generate AI insights"
					)}
				</button>
			)}
		</section>
	);
}
