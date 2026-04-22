"""Form generation — parses an admin natural language prompt into a structured
form definition using Groq Llama (direct OpenAI-compatible client, no LiteLLM).
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

_GROQ_BASE_URL = "https://api.groq.com/openai/v1"
_MODEL = "llama-3.3-70b-versatile"

_SYSTEM_PROMPT = """You are an AI form architect. Given a user's description of what information they want to collect, you produce a structured form definition as JSON.

Your output must be valid JSON with this exact structure:
{
  "title": "Short form title",
  "description": "One-sentence description of the form's purpose",
  "system_prompt": "Instructions for the conversational agent that will conduct this form. Describe WHAT to collect, the TONE to use, any VALIDATION rules, and HOW to handle edge cases. Be specific and detailed.",
  "fields": [
    {
      "name": "field_name_snake_case",
      "type": "text|email|number|phone|url|date|select|boolean",
      "required": true,
      "description": "Human-readable description of this field"
    }
  ]
}

Rules:
1. Field names must be in snake_case (e.g. full_name, email_address).
2. Use the correct type for each field (email, phone, number, etc.).
3. Mark fields as required=true unless the user explicitly says optional.
4. The system_prompt should be detailed instructions for a conversational AI agent.
5. Output ONLY the JSON object — no markdown, no explanation."""


@dataclass
class GeneratedFormField:
    name: str
    type: str
    required: bool
    description: str


@dataclass
class GeneratedForm:
    title: str
    description: str
    system_prompt: str
    fields: list[GeneratedFormField]


async def generate_form_from_prompt(prompt: str) -> GeneratedForm:
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise ValueError("GROQ_API_KEY is required for form generation")

    client = AsyncOpenAI(api_key=api_key, base_url=_GROQ_BASE_URL)
    response = await client.chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=2000,
    )

    raw = (response.choices[0].message.content or "").strip()
    if raw.startswith("```"):
        raw = "\n".join(l for l in raw.split("\n") if not l.strip().startswith("```"))

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse LLM response as JSON: %s\nRaw: %s", exc, raw[:500])
        raise ValueError(f"Failed to parse form generation response: {exc}") from exc

    return GeneratedForm(
        title=data.get("title", "Untitled Form"),
        description=data.get("description", ""),
        system_prompt=data.get("system_prompt", ""),
        fields=[
            GeneratedFormField(
                name=f.get("name", "unknown"),
                type=f.get("type", "text"),
                required=f.get("required", True),
                description=f.get("description", ""),
            )
            for f in data.get("fields", [])
        ],
    )
