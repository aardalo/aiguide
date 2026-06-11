import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSetting, SETTING_KEYS } from '@/lib/settings';
import type { AiProviderId } from '@/lib/discovery/types';

const requestSchema = z.object({
  description: z.string().min(3).max(1000),
  previousAttempt: z.string().max(500).optional(),
});

const SYSTEM_PROMPT = `You are a geography and travel expert. The user will describe a place using a natural language description — it may be vague, poetic, or reference a well-known landmark indirectly.

Your task: identify the most likely real-world place and return a JSON object.

Rules:
- Return ONLY a JSON object, no other text
- The "name" should be the official/common name that a geocoding service (like OpenStreetMap Nominatim) would recognise
- The "searchQuery" should be a concise search string optimised for geocoding lookup (e.g. "Reschensee, South Tyrol, Italy" or "Church of the Good Shepherd, Lake Tekapo, New Zealand")
- Include "country" for disambiguation
- "confidence" is your estimate: "high", "medium", or "low"
- If you truly cannot identify the place, set "name" to null

JSON format:
{
  "name": "Place Name" | null,
  "searchQuery": "optimised geocoding query",
  "country": "Country Name",
  "confidence": "high" | "medium" | "low",
  "reasoning": "brief explanation of why you identified this place"
}`;

function buildUserPrompt(description: string, previousAttempt?: string): string {
  let prompt = `Identify this place: "${description}"`;
  if (previousAttempt) {
    prompt += `\n\nA previous attempt identified this as "${previousAttempt}" but geocoding could not find it. Please suggest a different or more specific name/search query that a geocoding service would recognise.`;
  }
  return prompt;
}

interface AiIdentifyResult {
  name: string | null;
  searchQuery: string;
  country: string;
  confidence: string;
  reasoning: string;
}

const resultSchema = z.object({
  name: z.string().nullable(),
  searchQuery: z.string(),
  country: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  reasoning: z.string(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = requestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: validation.error.flatten() },
      { status: 400 },
    );
  }

  const { description, previousAttempt } = validation.data;

  // Determine AI provider and key
  const aiProviderSetting = await getSetting(SETTING_KEYS.AI_PROVIDER);
  const aiProvider: AiProviderId = aiProviderSetting === 'claude' ? 'claude' : 'chatgpt';

  let apiKey: string | null = null;
  if (aiProvider === 'claude') {
    apiKey = process.env.ANTHROPIC_API_KEY ?? (await getSetting(SETTING_KEYS.ANTHROPIC_API_KEY));
  } else {
    apiKey = process.env.OPENAI_API_KEY ?? (await getSetting(SETTING_KEYS.OPENAI_API_KEY));
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: `${aiProvider === 'claude' ? 'Anthropic' : 'OpenAI'} API key not configured.` },
      { status: 400 },
    );
  }

  const userPrompt = buildUserPrompt(description, previousAttempt);

  try {
    const result = aiProvider === 'claude'
      ? await callClaude(apiKey, userPrompt)
      : await callOpenAi(apiKey, userPrompt);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[api/geocode/ai-identify] Error:', err);
    if (message.includes('401') || message.includes('invalid_api_key')) {
      return NextResponse.json({ error: 'API key invalid' }, { status: 401 });
    }
    if (message.includes('429')) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function callClaude(apiKey: string, userPrompt: string): Promise<AiIdentifyResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Claude API ${res.status}: ${text}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find((b: Record<string, unknown>) => b.type === 'text');
  const text = textBlock?.text as string | undefined;
  if (!text) throw new Error('No text in Claude response');

  return parseAiResponse(text);
}

async function callOpenAi(apiKey: string, userPrompt: string): Promise<AiIdentifyResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI API ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content as string | undefined;
  if (!text) throw new Error('No text in OpenAI response');

  return parseAiResponse(text);
}

function parseAiResponse(text: string): AiIdentifyResult {
  // Extract JSON from potential markdown fences
  let jsonStr = text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();
  else if (!jsonStr.startsWith('{')) {
    const braceStart = jsonStr.indexOf('{');
    const braceEnd = jsonStr.lastIndexOf('}');
    if (braceStart !== -1 && braceEnd > braceStart) {
      jsonStr = jsonStr.slice(braceStart, braceEnd + 1);
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }

  const result = resultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid AI response shape: ${result.error.message}`);
  }

  return result.data;
}
