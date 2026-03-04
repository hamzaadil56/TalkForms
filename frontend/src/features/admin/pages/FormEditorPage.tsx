/** Form editor page — Living Interface botanical theme */
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/AuthProvider";
import { createForm, generateForm, publishForm } from "../api/adminApi";
import { PromptFormBuilder } from "../components/PromptFormBuilder";
import { AdminShell, PageBody, PageHeader } from "../../../shared/ui/Layout";
import type {
	FormCreatePayload,
	FormCreateResponse,
	FormField,
} from "../../../shared/types/api";

export default function FormEditorPage() {
	const { admin, logout } = useAuth();
	const navigate = useNavigate();
	const orgId = admin?.memberships[0]?.org_id;

	const [prompt, setPrompt] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [slug, setSlug] = useState("");
	const [mode, setMode] = useState<"chat" | "voice" | "chat_voice">("chat_voice");
	const [persona, setPersona] = useState("Friendly and professional");
	const [systemPrompt, setSystemPrompt] = useState("");
	const [fields, setFields] = useState<FormField[]>([]);

	const [createdForm, setCreatedForm] = useState<FormCreateResponse | null>(null);
	const [status, setStatus] = useState("");
	const [saving, setSaving] = useState(false);

	const handleGenerate = async () => {
		if (!orgId || prompt.trim().length < 10) return;
		setIsGenerating(true);
		setStatus("Generating form with AI...");
		try {
			const result = await generateForm(orgId, prompt);
			setTitle(result.title);
			setDescription(result.description);
			setSystemPrompt(result.system_prompt);
			setFields(result.fields);
			setSlug(
				result.title
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/^-|-$/g, "") +
					`-${Math.floor(Math.random() * 1000)}`,
			);
			setStatus("Form generated successfully! Review and save below.");
		} catch (err) {
			setStatus(err instanceof Error ? err.message : "Failed to generate form");
		} finally {
			setIsGenerating(false);
		}
	};

	const handleCreate = async (event: FormEvent) => {
		event.preventDefault();
		if (!orgId) { setStatus("No workspace found"); return; }
		if (!systemPrompt && fields.length === 0) { setStatus("Generate a form first, or add fields manually"); return; }
		setSaving(true);
		setStatus("Creating form...");
		try {
			const payload: FormCreatePayload = { title, description, slug, mode, persona, system_prompt: systemPrompt, fields };
			const form = await createForm(orgId, payload);
			setCreatedForm(form);
			setStatus("Form created successfully!");
		} catch (err) {
			setStatus(err instanceof Error ? err.message : "Failed to create form");
		} finally {
			setSaving(false);
		}
	};

	const handlePublish = async () => {
		if (!createdForm) return;
		setSaving(true);
		setStatus("Publishing form...");
		try {
			await publishForm(createdForm.id);
			setStatus("Form published! Consumers can now access it.");
		} catch (err) {
			setStatus(err instanceof Error ? err.message : "Publish failed");
		} finally {
			setSaving(false);
		}
	};

	const inputClass = "w-full px-4 py-[10px] rounded-lg font-body text-text-primary text-[15px] outline-none transition-all placeholder:text-text-muted";
	const inputStyle = { background: "var(--stone-0)", border: "1.5px solid var(--stone-200)" };
	const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
		e.currentTarget.style.borderColor = "var(--teal-400)";
		e.currentTarget.style.boxShadow = "0 0 0 3px rgba(20,184,166,0.12)";
	};
	const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
		e.currentTarget.style.borderColor = "var(--stone-200)";
		e.currentTarget.style.boxShadow = "none";
	};

	return (
		<AdminShell email={admin?.email} onLogout={() => { logout(); navigate("/admin/login"); }}>
			<PageHeader
				title={createdForm ? "Form Created" : "Create Form"}
				subtitle="Describe what you want to collect and let AI build the form."
				backTo="/admin"
				backLabel="Dashboard"
			/>
			<PageBody>
				<form onSubmit={handleCreate} className="space-y-6 max-w-3xl">
					<PromptFormBuilder
						prompt={prompt}
						onPromptChange={setPrompt}
						fields={fields}
						onFieldsChange={setFields}
						onGenerate={handleGenerate}
						isGenerating={isGenerating}
					/>

					{/* Form Settings */}
					<section
						className="rounded-2xl p-6 space-y-4"
						style={{ background: "var(--stone-0)", border: "1px solid var(--border-default)" }}
					>
						<h2 className="font-body text-[11px] font-semibold uppercase tracking-widest text-text-muted">
							Form Settings
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<FieldInput label="Title" id="title" value={title} onChange={setTitle} placeholder="Form title" required
								inputClass={inputClass} inputStyle={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
							<FieldInput label="URL Slug" id="slug" value={slug} onChange={setSlug} placeholder="my-form" required mono
								inputClass={inputClass} inputStyle={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
						</div>
						<div>
							<label htmlFor="description" className="block font-body text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-2">
								Description
							</label>
							<textarea
								id="description"
								className={inputClass + " resize-none"}
								style={inputStyle}
								onFocus={inputFocus}
								onBlur={inputBlur}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Describe what this form collects"
								rows={2}
							/>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label htmlFor="mode" className="block font-body text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-2">
									Mode
								</label>
								<select
									id="mode"
									className={inputClass}
									style={inputStyle}
									onFocus={inputFocus}
									onBlur={inputBlur}
									value={mode}
									onChange={(e) => setMode(e.target.value as typeof mode)}
								>
									<option value="chat">Chat only</option>
									<option value="voice">Voice only</option>
									<option value="chat_voice">Chat + Voice</option>
								</select>
							</div>
							<FieldInput label="Bot Persona" id="persona" value={persona} onChange={setPersona} placeholder="Friendly and professional"
								inputClass={inputClass} inputStyle={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
						</div>
						<div>
							<label htmlFor="system-prompt" className="block font-body text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-2">
								Agent Instructions{" "}
								<span className="text-text-muted font-normal normal-case tracking-normal">(auto-generated, editable)</span>
							</label>
							<textarea
								id="system-prompt"
								className={inputClass + " text-[13px] font-mono resize-none"}
								style={inputStyle}
								onFocus={inputFocus}
								onBlur={inputBlur}
								value={systemPrompt}
								onChange={(e) => setSystemPrompt(e.target.value)}
								placeholder="Instructions for the conversational agent..."
								rows={4}
							/>
						</div>
					</section>

					{/* Fields Summary */}
					{fields.length > 0 && (
						<section
							className="rounded-2xl p-6"
							style={{ background: "var(--stone-0)", border: "1px solid var(--border-default)" }}
						>
							<h2 className="font-body text-[11px] font-semibold uppercase tracking-widest text-text-muted mb-3">
								Fields ({fields.length})
							</h2>
							<div className="space-y-2 text-[13px] font-body">
								{fields.map((field, i) => (
									<div key={field.name} className="flex items-center gap-3">
										<span className="text-text-muted w-5 text-right">{i + 1}.</span>
										<span className="font-mono text-teal-600">{field.name}</span>
										<span
											className="text-[11px] px-2 py-0.5 rounded font-body"
											style={{ background: "var(--stone-50)", color: "var(--text-muted)" }}
										>
											{field.type}
										</span>
										{field.required && <span className="text-[11px]" style={{ color: "var(--color-warning)" }}>required</span>}
										{field.description && <span className="text-text-secondary text-[11px] truncate max-w-[200px]">{field.description}</span>}
									</div>
								))}
							</div>
						</section>
					)}

					{/* Actions */}
					<div className="flex flex-wrap gap-3">
						{!createdForm ? (
							<button
								type="submit"
								disabled={saving || (!systemPrompt && fields.length === 0)}
								className="px-6 py-[10px] rounded-lg font-body font-semibold text-[13px] text-white transition-all duration-150 disabled:opacity-50 hover:opacity-90"
								style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-teal)" }}
							>
								{saving ? "Creating..." : "Create Draft Form"}
							</button>
						) : (
							<>
								<button
									type="button"
									onClick={handlePublish}
									disabled={saving}
									className="px-6 py-[10px] rounded-lg font-body font-semibold text-[13px] text-white transition-all duration-150 disabled:opacity-50 hover:opacity-90"
									style={{ background: "var(--gradient-action)", boxShadow: "var(--shadow-coral)" }}
								>
									{saving ? "Publishing..." : "Publish Form"}
								</button>
								<Link
									to={`/f/${createdForm.slug}`}
									target="_blank"
									className="px-6 py-[10px] rounded-lg font-body font-medium text-[13px] transition-all inline-flex items-center hover:text-text-primary"
									style={{
										background: "var(--stone-50)",
										border: "1px solid var(--border-default)",
										color: "var(--text-secondary)",
									}}
								>
									Preview ↗
								</Link>
								<Link
									to={`/admin/forms/${createdForm.id}/submissions`}
									className="px-6 py-[10px] rounded-lg font-body font-medium text-[13px] transition-all inline-flex items-center hover:text-text-primary"
									style={{
										background: "var(--stone-50)",
										border: "1px solid var(--border-default)",
										color: "var(--text-secondary)",
									}}
								>
									Submissions
								</Link>
							</>
						)}
						<button
							type="button"
							onClick={() => navigate("/admin")}
							className="px-6 py-[10px] rounded-lg font-body text-[13px] transition-all hover:text-text-primary"
							style={{
								background: "var(--stone-50)",
								border: "1px solid var(--border-default)",
								color: "var(--text-secondary)",
							}}
						>
							Cancel
						</button>
					</div>
				</form>

				{status && (
					<div
						className="mt-6 rounded-xl p-4 border font-body text-[13px]"
						style={
							status.includes("fail") || status.includes("error")
								? { borderColor: "var(--error-border)", color: "var(--color-error)", background: "var(--error-bg)" }
								: { borderColor: "var(--border-subtle)", color: "var(--text-secondary)", background: "var(--stone-50)" }
						}
					>
						{status}
					</div>
				)}
			</PageBody>
		</AdminShell>
	);
}

function FieldInput({
	label, id, value, onChange, placeholder, required, mono,
	inputClass, inputStyle, onFocus, onBlur,
}: {
	label: string; id: string; value: string; onChange: (v: string) => void;
	placeholder: string; required?: boolean; mono?: boolean;
	inputClass: string;
	inputStyle: React.CSSProperties;
	onFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
	onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
}) {
	return (
		<div>
			<label htmlFor={id} className="block font-body text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-2">
				{label}
			</label>
			<input
				id={id}
				className={`${inputClass}${mono ? " font-mono text-[13px]" : ""}`}
				style={inputStyle}
				onFocus={onFocus}
				onBlur={onBlur}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				required={required}
			/>
		</div>
	);
}
