import type { DiscoveredExperience } from './types';
import { chatGptResponseSchema } from '@/lib/schemas/discovery';

const ANTHROPIC_BATCHES_URL = 'https://api.anthropic.com/v1/messages/batches';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.3;
const MAX_TOKENS = 4000;
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_TIME_MS = 300_000; // 5 minutes

interface BatchCallResult {
  experiences: DiscoveredExperience[];
  promptTokens: number;
  completionTokens: number;
}

interface BatchRequest {
  custom_id: string;
  params: {
    model: string;
    temperature: number;
    max_tokens: number;
    system: string;
    messages: Array<{ role: string; content: string }>;
  };
}

interface BatchStatus {
  id: string;
  processing_status: 'in_progress' | 'ended' | 'canceling' | 'expired';
  results_url?: string;
  request_counts: {
    processing: number;
    succeeded: number;
    errored: number;
    canceled: number;
    expired: number;
  };
}

interface BatchResultLine {
  custom_id: string;
  result: {
    type: 'succeeded' | 'errored' | 'expired' | 'canceled';
    message?: {
      content: Array<{ type: string; text?: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };
    error?: { type: string; message: string };
  };
}

function extractJsonFromContent(content: Array<{ type: string; text?: string }>): string | null {
  for (const block of content) {
    if (block.type === 'text' && typeof block.text === 'string') {
      const text = block.text.trim();
      if (text.startsWith('{')) return text;
      const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (fenceMatch) return fenceMatch[1].trim();
      const braceStart = text.indexOf('{');
      const braceEnd = text.lastIndexOf('}');
      if (braceStart !== -1 && braceEnd > braceStart) {
        return text.slice(braceStart, braceEnd + 1);
      }
      return text;
    }
  }
  return null;
}

/**
 * Submit all discovery chunks as a single Anthropic Message Batch.
 * Polls until complete (up to 5 minutes) then parses results.
 * Batch API offers 50% cost reduction vs real-time.
 */
export async function callClaudeBatch(
  apiKey: string,
  systemPrompt: string,
  userPrompts: string[],
  model?: string,
): Promise<BatchCallResult> {
  const requests: BatchRequest[] = userPrompts.map((prompt, i) => ({
    custom_id: `chunk-${i}`,
    params: {
      model: model || DEFAULT_MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    },
  }));

  // Create batch
  const createRes = await fetch(ANTHROPIC_BATCHES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ requests }),
  });

  if (!createRes.ok) {
    const errorBody = await createRes.text();
    throw new Error(`Anthropic Batch API error ${createRes.status}: ${errorBody}`);
  }

  const batch: BatchStatus = await createRes.json();
  console.log(`[discovery/claude-batch] Created batch ${batch.id} with ${requests.length} requests`);

  // Poll for completion
  const startTime = Date.now();
  let status = batch;

  while (status.processing_status === 'in_progress') {
    if (Date.now() - startTime > MAX_POLL_TIME_MS) {
      throw new Error(
        `Batch ${batch.id} still processing after ${MAX_POLL_TIME_MS / 1000}s. ` +
        `Check status at console.anthropic.com or retry without batch mode.`,
      );
    }

    await delay(POLL_INTERVAL_MS);

    const pollRes = await fetch(`${ANTHROPIC_BATCHES_URL}/${batch.id}`, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (!pollRes.ok) {
      const errorBody = await pollRes.text();
      throw new Error(`Batch poll error ${pollRes.status}: ${errorBody}`);
    }

    status = await pollRes.json();
    console.log(
      `[discovery/claude-batch] Batch ${batch.id}: ${status.processing_status}`,
      status.request_counts,
    );
  }

  if (status.processing_status !== 'ended') {
    throw new Error(`Batch ${batch.id} ended with status: ${status.processing_status}`);
  }

  if (!status.results_url) {
    throw new Error(`Batch ${batch.id} ended but no results_url`);
  }

  // Fetch results (JSONL)
  const resultsRes = await fetch(status.results_url, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  });

  if (!resultsRes.ok) {
    const errorBody = await resultsRes.text();
    throw new Error(`Batch results fetch error ${resultsRes.status}: ${errorBody}`);
  }

  const resultsText = await resultsRes.text();
  const lines = resultsText.trim().split('\n').filter(Boolean);

  const allExperiences: DiscoveredExperience[] = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (const line of lines) {
    const result: BatchResultLine = JSON.parse(line);

    if (result.result.type !== 'succeeded' || !result.result.message) {
      console.warn(
        `[discovery/claude-batch] ${result.custom_id} failed:`,
        result.result.error ?? result.result.type,
      );
      continue;
    }

    const content = extractJsonFromContent(result.result.message.content);
    if (!content) {
      console.warn(`[discovery/claude-batch] ${result.custom_id}: no JSON content`);
      continue;
    }

    totalPromptTokens += result.result.message.usage?.input_tokens ?? 0;
    totalCompletionTokens += result.result.message.usage?.output_tokens ?? 0;

    try {
      const parsed = JSON.parse(content);
      const validated = chatGptResponseSchema.safeParse(parsed);

      if (validated.success) {
        allExperiences.push(...(validated.data.experiences as DiscoveredExperience[]));
      } else {
        // Fallback: extract what we can
        const fallback = Array.isArray(parsed.experiences) ? parsed.experiences : [];
        allExperiences.push(
          ...fallback.filter(
            (e: unknown) =>
              typeof e === 'object' && e !== null && 'name' in e && 'michelinStars' in e,
          ) as DiscoveredExperience[],
        );
      }
    } catch (err) {
      console.warn(`[discovery/claude-batch] ${result.custom_id}: JSON parse error:`, err);
    }
  }

  console.log(
    `[discovery/claude-batch] Batch ${batch.id} complete: ${allExperiences.length} experiences, ` +
    `${totalPromptTokens} prompt tokens, ${totalCompletionTokens} completion tokens`,
  );

  return { experiences: allExperiences, promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
