import type { DiscoveredExperience } from './types';
import { chatGptResponseSchema } from '@/lib/schemas/discovery';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.3;
const MAX_TOKENS = 4000;
const RETRY_DELAY_MS = 2000;

interface ClaudeCallResult {
  experiences: DiscoveredExperience[];
  promptTokens: number;
  completionTokens: number;
}

/**
 * Extract JSON content from Claude Messages API response content blocks.
 * The response may contain text blocks and web_search_tool_result blocks.
 * We look for the text block that contains the JSON object.
 */
function extractJsonFromContent(content: ContentBlock[]): string | null {
  for (const block of content) {
    if (block.type === 'text' && typeof block.text === 'string') {
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
  return null;
}

/** Minimal types for the Claude Messages API content structure */
interface ContentBlock {
  type: string;
  text?: string;
}

/**
 * Call the Anthropic Messages API with web search enabled.
 * Claude can search the web to verify places, find accurate coordinates,
 * and discover current information about attractions and restaurants.
 * Retries once on 429/5xx.
 */
export async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model?: string,
): Promise<ClaudeCallResult> {
  const body = {
    model: model || DEFAULT_MODEL,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5,
      },
    ],
    messages: [
      { role: 'user', content: userPrompt },
    ],
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(ANTHROPIC_MESSAGES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.warn(`[discovery/claude] API error ${res.status}:`, errorBody);

        // Retry once on transient errors
        if (res.status >= 500 || (res.status === 429 && !errorBody.includes('insufficient'))) {
          lastError = new Error(`Anthropic API returned ${res.status}: ${errorBody}`);
          if (attempt === 0) {
            await delay(RETRY_DELAY_MS);
            continue;
          }
          throw lastError;
        }

        // Non-retryable
        throw new Error(`Anthropic API error ${res.status}: ${errorBody}`);
      }

      const data = await res.json();
      const content = extractJsonFromContent(data.content ?? []);
      if (!content) {
        throw new Error('Claude response missing text content');
      }

      const parsed = JSON.parse(content);
      const validated = chatGptResponseSchema.safeParse(parsed);

      if (!validated.success) {
        console.warn(
          '[discovery/claude] Response validation failed:',
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

  throw lastError ?? new Error('Claude call failed');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
