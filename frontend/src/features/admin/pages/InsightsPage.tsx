import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../app/AuthProvider";
import {
	useAIInsightsCache,
	useExportCsv,
	useFieldDistributions,
	useForm,
	useFormAnalytics,
	useGenerateAIInsights,
} from "../hooks/useAdminQueries";
import { AdminShell, EmptyState, PageBody, PageHeader } from "../../../shared/ui/Layout";
import { ApiError } from "../../../shared/lib/httpClient";
import { KpiCards } from "../components/insights/KpiCards";
import { CompletionFunnel } from "../components/insights/CompletionFunnel";
import { FieldInsightAccordion } from "../components/insights/FieldInsightAccordion";
import { HeroSummary } from "../components/insights/HeroSummary";

const CHANNEL_LABELS: Record<string, string> = { chat: "Chat", voice: "Voice", chat_voice: "Chat + Voice" };

function ChannelBreakdown({ channels }: { channels: Record<string, number> }) {
	const sum = Object.values(channels).reduce((a, n) => a + n, 0);
	const total = sum > 0 ? sum : 1;
	if (sum === 0) {
		return <p className="text-[13px] text-text-tertiary">No completed responses yet.</p>;
	}
	return (
		<div className="space-y-3">
			{(["chat", "voice", "chat_voice"] as const).map((key) => {
				const n = channels[key] ?? 0;
				const pct = Math.round((100 * n) / total);
				return (
					<div key={key}>
						<div className="flex justify-between text-[12px] mb-1">
							<span className="text-text-secondary">{CHANNEL_LABELS[key]}</span>
							<span className="text-text-primary font-medium tabular-nums">{n}</span>
						</div>
						<div className="h-2 rounded-full bg-stone-100 overflow-hidden">
							<div
								className="h-full rounded-full bg-forest-400/90 transition-all duration-500"
								style={{ width: `${pct}%` }}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
}

function InsightsSkeleton() {
	return (
		<div className="space-y-6 animate-pulse" aria-hidden="true">
			<div className="h-24 rounded-2xl bg-stone-100" />
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-y-2">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="px-4 py-3 space-y-2">
						<div className="h-3 w-20 rounded bg-stone-100" />
						<div className="h-6 w-16 rounded bg-stone-200" />
						<div className="h-3 w-24 rounded bg-stone-100" />
					</div>
				))}
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div className="lg:col-span-2 h-44 rounded-xl bg-stone-100" />
				<div className="h-44 rounded-xl bg-stone-100" />
			</div>
			<div className="space-y-2">
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="h-12 rounded-xl bg-stone-100" />
				))}
			</div>
		</div>
	);
}

export default function InsightsPage() {
	const { formId } = useParams<{ formId: string }>();
	const { admin, logout } = useAuth();
	const navigate = useNavigate();

	const formQuery = useForm(formId);
	const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useFormAnalytics(formId);
	const { data: distributions, isLoading: distLoading, error: distError } = useFieldDistributions(formId);
	const { data: aiInsights } = useAIInsightsCache(formId);
	const generateMutation = useGenerateAIInsights(formId);
	const exportMutation = useExportCsv();

	const [aiError, setAiError] = useState<string | null>(null);

	const formTitle = formQuery.data?.title;
	const isLoading = analyticsLoading || distLoading || formQuery.isLoading;

	useEffect(() => {
		if (!formTitle) return;
		const prev = document.title;
		document.title = `${formTitle} · Insights`;
		return () => { document.title = prev; };
	}, [formTitle]);

	const forbidden =
		(analyticsError instanceof ApiError && analyticsError.status === 403) ||
		(distError instanceof ApiError && distError.status === 403) ||
		(formQuery.error instanceof ApiError && formQuery.error.status === 403);

	const handleGenerateInsights = async () => {
		if (!formId) return;
		setAiError(null);
		try {
			await generateMutation.mutateAsync();
		} catch (err) {
			setAiError(err instanceof Error ? err.message : "Failed to generate insights.");
		}
	};

	const handleExport = async () => {
		if (!formId) return;
		try {
			await exportMutation.mutateAsync(formId);
		} catch { /* surfaced via mutation state */ }
	};

	const aiInsightMap = useMemo(
		() => new Map(aiInsights?.field_insights.map((fi) => [fi.field_key, fi]) ?? []),
		[aiInsights],
	);

	const fieldsCount = distributions?.fields.length ?? 0;
	const canExport = Boolean(analytics?.total_submissions);
	const lastSubmittedAt = useMemo(() => {
		if (!analytics) return null;
		// Approximate "last 7 days" line — backend doesn't expose latest timestamp here.
		return `${analytics.total_submissions} ${analytics.total_submissions === 1 ? "submission" : "submissions"}`;
	}, [analytics]);

	return (
		<AdminShell email={admin?.email} onLogout={() => { logout(); navigate("/admin/login"); }}>
			<PageHeader
				title={formTitle || "Insights"}
				subtitle={lastSubmittedAt ?? undefined}
				backTo={`/admin/forms/${formId}/submissions`}
				backLabel="Submissions"
				actions={
					<div className="flex items-center gap-2">
						{aiInsights && (
							<button
								onClick={handleGenerateInsights}
								disabled={generateMutation.isPending || !fieldsCount}
								className="px-3 py-[9px] rounded-md font-medium text-[13px] text-text-secondary bg-white border border-stone-200 hover:bg-stone-50 transition-all duration-150 disabled:opacity-50 inline-flex items-center gap-1.5"
							>
								{generateMutation.isPending ? (
									<>
										<div className="w-3.5 h-3.5 border-2 border-text-tertiary border-t-transparent rounded-full animate-spin" />
										Analyzing…
									</>
								) : (
									"Regenerate AI insights"
								)}
							</button>
						)}
						<span title={canExport ? undefined : "Available after the first submission"}>
							<button
								onClick={handleExport}
								disabled={exportMutation.isPending || !canExport}
								aria-disabled={!canExport}
								className="px-4 py-[9px] rounded-md font-medium text-[13px] text-white bg-forest-500 hover:bg-forest-600 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-forest inline-flex items-center gap-1.5"
							>
								<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
								</svg>
								{exportMutation.isPending ? "Exporting…" : "Export"}
							</button>
						</span>
					</div>
				}
			/>

			<PageBody>
				{forbidden ? (
					<EmptyState
						title="You don't have access to this form"
						description="Ask an admin in the owning organization to invite you, then reload."
					/>
				) : isLoading ? (
					<InsightsSkeleton />
				) : !analytics || !distributions ? (
					<EmptyState
						title="No data yet"
						description="Submit responses to this form to see insights here."
					/>
				) : analytics.total_submissions === 0 ? (
					<EmptyState
						title="No submissions yet"
						description="Insights will appear here once consumers complete your form."
					/>
				) : (
					<div className="space-y-6">
						<HeroSummary
							analytics={analytics}
							aiInsights={aiInsights ?? null}
							onGenerate={handleGenerateInsights}
							generating={generateMutation.isPending}
							canGenerate={fieldsCount > 0}
						/>

						{aiError && (
							<div className="rounded-md p-3 border border-clay-200 bg-clay-50 text-[13px] text-clay-700">
								{aiError}
							</div>
						)}

						<KpiCards analytics={analytics} />

						<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
							<div className="lg:col-span-2 rounded-xl border border-stone-200 bg-white p-5">
								<p className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-4">
									Completion Funnel
								</p>
								<CompletionFunnel
									steps={analytics.dropoff_funnel}
									totalSessions={analytics.total_sessions}
								/>
							</div>
							<div className="rounded-xl border border-stone-200 bg-white p-5">
								<p className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-4">
									By Channel
								</p>
								<ChannelBreakdown channels={analytics.channel_breakdown} />
							</div>
						</div>

						{fieldsCount > 0 ? (
							<div className="space-y-2">
								<p className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">
									Per-field insights
								</p>
								<div className="space-y-2">
									{distributions.fields.map((dist) => (
										<FieldInsightAccordion
											key={dist.field_key}
											dist={dist}
											aiInsight={aiInsightMap.get(dist.field_key)}
											defaultOpen={fieldsCount === 1}
										/>
									))}
								</div>
							</div>
						) : (
							<EmptyState
								title="No field data"
								description="This form has no fields with responses yet."
							/>
						)}

						<div className="pt-2 text-center">
							<Link
								to={`/admin/forms/${formId}/submissions`}
								className="text-[12px] text-text-tertiary hover:text-text-secondary underline-offset-2 hover:underline"
							>
								View raw submissions
							</Link>
						</div>
					</div>
				)}
			</PageBody>
		</AdminShell>
	);
}
