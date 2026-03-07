import type { DiscoveredExperience } from './types';
import { chatGptResponseSchema } from '@/lib/schemas/discovery';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-4o';
const TEMPERATURE = 0.3;
const MAX_OUTPUT_TOKENS = 4000;
const RETRY_DELAY_MS = 2000;

interface OpenAiCallResult {
  experiences: DiscoveredExperience[];
  promptTokens: number;
  completionTokens: number;
}

/**
 * Extract the JSON content from a Responses API output array.
 * The output contains a mix of tool calls (web_search_call) and message items.
 * Since web search is incompatible with JSON mode, the model returns JSON
 * in its text output — we extract and find the JSON block.
 */
function extractJsonFromOutput(output: ResponseOutputItem[]): string | null {
  for (const item of output) {
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const block of item.content) {
        if (block.type === 'output_text' && typeof block.text === 'string') {
          const text = block.text.trim();
          // Try the raw text first (model may return pure JSON)
          if (text.startsWith('{')) return text;
          // Extract from markdown code fence
          const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
          if (fenceMatch) return fenceMatch[1].trim();
          // Last resort: find the first { ... } block
          const braceStart = text.indexOf('{');
          const braceEnd = text.lastIndexOf('}');
          if (braceStart !== -1 && braceEnd > braceStart) {
            return text.slice(braceStart, braceEnd + 1);
          }
          return text;
        }
      }
    }
  }
  return null;
}

/** Minimal types for the Responses API output structure */
interface ResponseOutputItem {
  type: string;
  content?: Array<{ type: string; text?: string }>;
}

/**
 * Call the OpenAI Responses API with web search enabled.
 * The model can search the web to verify places, find accurate coordinates,
 * and discover current information about attractions and restaurants.
 * Retries once on 429/5xx.
 */
export async function callOpenAi(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<OpenAiCallResult> {
  const body = {
    model: DEFAULT_MODEL,
    temperature: TEMPERATURE,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    tools: [
      {
        type: 'web_search_preview',
        search_context_size: 'medium',
      },
    ],
    input: [
      { role: 'developer', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.warn(`[discovery/openai] API error ${res.status}:`, errorBody);

        // Retry once on transient errors (server errors or actual rate limits)
        if (res.status >= 500 || (res.status === 429 && !errorBody.includes('insufficient_quota'))) {
          lastError = new Error(`OpenAI API returned ${res.status}: ${errorBody}`);
          if (attempt === 0) {
            await delay(RETRY_DELAY_MS);
            continue;
          }
          throw lastError;
        }

        // Non-retryable: bad key, insufficient quota, billing issue, etc.
        throw new Error(`OpenAI API error ${res.status}: ${errorBody}`);
      }

      const data = await res.json();
      const content = extractJsonFromOutput(data.output ?? []);
      if (!content) {
        throw new Error('OpenAI response missing text content');
      }

      const parsed = JSON.parse(content);
      const validated = chatGptResponseSchema.safeParse(parsed);

      if (!validated.success) {
        console.warn(
          '[discovery/openai] Response validation failed:',
          validated.error.flatten(),
        );
        // Return whatever experiences parsed successfully
        const fallback = Array.isArray(parsed.experiences) ? parsed.experiences : [];
        return {
          experiences: fallback.filter(
            (e: unknown) =>
              typeof e === 'object' &&
              e !== null &&
              'name' in e &&
              'michelinStars' in e,
          ) as DiscoveredExperience[],
          promptTokens: data.usage?.input_tokens ?? 0,
          completionTokens: data.usage?.output_tokens ?? 0,
        };
      }

      return {
        experiences: validated.data.experiences as DiscoveredExperience[],
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === 0 && lastError.message.includes('429')) {
        await delay(RETRY_DELAY_MS);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error('OpenAI call failed');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
