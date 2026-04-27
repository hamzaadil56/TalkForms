# User Story: Redesign the Insights page for clarity over density

**ID:** INS-001
**Epic:** Admin · Form Insights
**Form route:** `/admin/forms/:formId/analytics`
**Component:** `frontend/src/features/admin/pages/InsightsPage.tsx`

---

## Story

**As an** admin reviewing a form's performance,
**I want** the Insights page to lead with the answers I care about — not a wall of charts and cards —
**so that** I can understand how my form is doing in 5 seconds, and drill into details only when I want to.

## Problem (today)

The page stacks five visually similar card groups vertically (KPIs → Funnel + Channel → AI summary → per-field distributions → CTA → footer link). Everything competes for attention with the same weight, the form's name is a UUID, the AI summary is buried mid-page, and per-field cards each contain their own truncated chart — producing a cluttered, scroll-heavy experience.

## Goals

1. Establish a clear visual hierarchy: **headline answer → supporting metrics → drill-down**.
2. Reduce on-screen density; use progressive disclosure for per-field detail.
3. Make the AI narrative the primary insight surface, not an afterthought.
4. Keep the page useful when there is little or no data, and on mobile.

## Non-goals

- Changing the analytics API or data model.
- Adding new metrics. (This is a UI/UX pass.)
- Redesigning the rest of the admin shell.

## Proposed structure (top → bottom)

1. **Page header** — form *name* (not UUID) + small meta line (`12 submissions · last 7 days`). Primary CTA: `Export`. Secondary CTA: `Regenerate AI insights` (only after first generation).
2. **Hero summary band** — a single row stating the headline finding in plain language. If AI insights are generated, this is the AI overall summary in 1–2 sentences. If not, it's a one-line auto-summary ("10 of 20 sessions completed; biggest drop-off at *Favorite game*") with an inline `Generate AI insights` button.
3. **KPI strip** — 4 compact metrics on one row, smaller than today, no card chrome (just label + number + delta if available).
4. **Two-up: Funnel | Channel** — kept, but visually quieter (no card border doubling, less padding).
5. **Per-field insights** — collapsed accordion list, one row per field, showing: field name · response count · 1-line AI insight (if any) · expand chevron. Expanded state reveals the chart and top values.
6. **Footer** — single subtle link to raw submissions.

## Acceptance criteria

- [ ] Header subtitle renders the form's **title**, not its UUID. Browser tab title matches.
- [ ] A "hero summary" band sits directly under the header and is the largest text block on the page.
- [ ] KPI strip uses lighter styling (no card borders/shadows) and fits on one row at ≥1024px.
- [ ] Per-field distributions are **collapsed by default**; expanding one reveals the chart. The first field expands automatically only when there is exactly one field.
- [ ] Bar chart labels are no longer hard-truncated to 9 chars; full value is available via hover tooltip (`<title>` element on each bar at minimum).
- [ ] AI insights, once generated, **persist** across reloads/navigation (TanStack Query cache keyed by `formId`, or fetched from a stored backend record).
- [ ] When the API returns 403, render a clear "You don't have access to this form" state — not the generic "No data yet" empty state.
- [ ] Loading state uses skeletons matching the final layout, not a centered spinner.
- [ ] At 375px viewport: sidebar collapses, hero/KPIs/funnel stack cleanly, no horizontal scroll, no overlap.
- [ ] Disabled `Export CSV` button shows a tooltip explaining why ("Available after the first submission").
- [ ] Duplicate "AI Insights available" CTA block at the bottom is removed (the header button is the single entry point; the hero band picks up the prompt when there's no summary yet).

## Out of scope (file follow-ups)

- Date-range filter on KPIs.
- Comparison vs. previous period.
- Sharing / public insights link.

## Notes for implementation

- Reuse existing components where possible (`KpiCards`, `CompletionFunnel`, `FieldDistributionCard`, `OverallSummaryCard`); most changes are layout, styling, and a new `<FieldInsightAccordion>` wrapper.
- Form title is already available via the existing form CRUD queries in `useAdminQueries.ts`.
- Persisting AI insights server-side is preferable to cache-only, but cache-only is acceptable for v1.
