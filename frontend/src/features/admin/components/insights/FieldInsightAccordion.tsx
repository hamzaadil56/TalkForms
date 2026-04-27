import { useState } from "react";
import type {
	FieldAIInsight,
	FieldCategoricalStats,
	FieldDistribution,
	FieldNumericStats,
	FieldTextStats,
} from "../../../../shared/types/api";
import { FieldDistributionCard } from "./FieldDistributionCard";

const TYPE_LABELS: Record<string, string> = {
	text: "Text",
	email: "Email",
	number: "Number",
	phone: "Phone",
	url: "URL",
	date: "Date",
	select: "Select",
	boolean: "Yes / No",
};

function responseCount(dist: FieldDistribution): number {
	const t = dist.field_type;
	if (t === "number") return (dist.stats as FieldNumericStats).count;
	if (t === "select" || t === "boolean") return (dist.stats as FieldCategoricalStats).total_responses;
	return (dist.stats as FieldTextStats).total_responses;
}

interface Props {
	dist: FieldDistribution;
	aiInsight?: FieldAIInsight;
	defaultOpen?: boolean;
}

export function FieldInsightAccordion({ dist, aiInsight, defaultOpen = false }: Props) {
	const [open, setOpen] = useState(defaultOpen);
	const count = responseCount(dist);
	const typeBadge = TYPE_LABELS[dist.field_type] ?? dist.field_type;
	const oneLine = aiInsight?.summary
		? aiInsight.summary.split(/(?<=[.!?])\s+/)[0]
		: null;

	return (
		<div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50/60 transition-colors"
			>
				<span className="flex-1 min-w-0">
					<span className="flex items-center gap-2">
						<span className="text-[14px] font-semibold text-text-primary truncate">{dist.field_name}</span>
						<span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 uppercase tracking-wider">
							{typeBadge}
						</span>
					</span>
					{oneLine && (
						<span className="block text-[12px] text-text-tertiary mt-0.5 truncate" title={aiInsight?.summary}>
							{oneLine}
						</span>
					)}
				</span>
				<span className="shrink-0 text-[12px] tabular-nums text-text-secondary">
					{count} {count === 1 ? "response" : "responses"}
				</span>
				<svg
					className={`shrink-0 w-4 h-4 text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`}
					fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
				>
					<path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
				</svg>
			</button>
			{open && (
				<div className="border-t border-stone-100 p-4 bg-stone-50/30">
					<FieldDistributionCard dist={dist} aiInsight={aiInsight} />
				</div>
			)}
		</div>
	);
}
