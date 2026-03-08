import { NextRequest, NextResponse } from 'next/server';
import { discoveryRequestSchema, discoveryBoundsRequestSchema } from '@/lib/schemas/discovery';
import { getSetting, SETTING_KEYS } from '@/lib/settings';
import { discoverExperiences, discoverExperiencesByBounds, type DiscoveryOptions } from '@/lib/discovery';
import type { AiProviderId } from '@/lib/discovery/types';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Try bounds-based request first, then trip-based
  const boundsResult = discoveryBoundsRequestSchema.safeParse(body);
  const tripResult = discoveryRequestSchema.safeParse(body);

  if (!boundsResult.success && !tripResult.success) {
    return NextResponse.json(
      { error: 'Invalid request: provide either { tripId } or { bounds }' },
      { status: 400 },
    );
  }

  // Determine which AI provider to use
  const aiProviderSetting = await getSetting(SETTING_KEYS.AI_PROVIDER);
  const aiProvider: AiProviderId = aiProviderSetting === 'claude' ? 'claude' : 'chatgpt';

  // Get the appropriate API key
  let apiKey: string | null = null;
  if (aiProvider === 'claude') {
    apiKey = process.env.ANTHROPIC_API_KEY ?? (await getSetting(SETTING_KEYS.ANTHROPIC_API_KEY));
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured. Set ANTHROPIC_API_KEY env var or add it in Settings.' },
        { status: 400 },
      );
    }
  } else {
    apiKey = process.env.OPENAI_API_KEY ?? (await getSetting(SETTING_KEYS.OPENAI_API_KEY));
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Set OPENAI_API_KEY env var or add it in Settings.' },
        { status: 400 },
      );
    }
  }

  // Read model and batch settings
  const modelKey = aiProvider === 'claude' ? SETTING_KEYS.AI_MODEL_CLAUDE : SETTING_KEYS.AI_MODEL_CHATGPT;
  const model = await getSetting(modelKey);
  const useBatch = aiProvider === 'claude' && (await getSetting(SETTING_KEYS.AI_CLAUDE_BATCH)) === 'true';
  const searxngBaseUrl = await getSetting(SETTING_KEYS.SEARXNG_BASE_URL);
  const googleApiKey = process.env.GOOGLE_API_KEY ?? (await getSetting(SETTING_KEYS.GOOGLE_API_KEY));

  // Check if client wants streaming progress (Accept header or query param)
  const wantsStream = request.headers.get('accept')?.includes('application/x-ndjson');

  if (!wantsStream) {
    // Non-streaming fallback (original behavior)
    const options: DiscoveryOptions = { model: model ?? undefined, useBatch, searxngBaseUrl: searxngBaseUrl ?? undefined, googleApiKey: googleApiKey ?? undefined };
    try {
      const result = boundsResult.success
        ? await discoverExperiencesByBounds(boundsResult.data.bounds, apiKey, aiProvider, options)
        : await discoverExperiences(tripResult.data!.tripId, apiKey, aiProvider, options); // eslint-disable-line @typescript-eslint/no-non-null-assertion -- one of the two must succeed
      return NextResponse.json(result);
    } catch (err) {
      return buildErrorResponse(err, aiProvider);
    }
  }

  // Streaming mode: return NDJSON with progress events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: { type: string; message?: string; data?: unknown }) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      const options: DiscoveryOptions = {
        model: model ?? undefined,
        useBatch,
        searxngBaseUrl: searxngBaseUrl ?? undefined,
        googleApiKey: googleApiKey ?? undefined,
        onProgress: (message: string) => send({ type: 'progress', message }),
      };

      try {
        const result = boundsResult.success
          ? await discoverExperiencesByBounds(boundsResult.data.bounds, apiKey!, aiProvider, options) // eslint-disable-line @typescript-eslint/no-non-null-assertion -- validated above
          : await discoverExperiences(tripResult.data!.tripId, apiKey!, aiProvider, options); // eslint-disable-line @typescript-eslint/no-non-null-assertion -- one of the two must succeed
        send({ type: 'result', data: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        send({ type: 'error', message: buildErrorMessage(message, aiProvider) });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    },
  });
}

function buildErrorMessage(message: string, aiProvider: AiProviderId): string {
  if (message.includes('not found')) return message;
  if (message.includes('at least 2 destinations')) return message;
  if (message.includes('insufficient_quota') || message.includes('insufficient')) {
    return aiProvider === 'claude'
      ? 'Anthropic quota exceeded or billing issue. Check your usage at console.anthropic.com.'
      : 'OpenAI quota exceeded or billing issue. For sk-proj- keys, check the project spending limit at platform.openai.com > Settings > Projects.';
  }
  if (message.includes('invalid_api_key') || message.includes('401')) {
    return `${aiProvider === 'claude' ? 'Anthropic' : 'OpenAI'} API key is invalid or revoked. Update it in Settings.`;
  }
  if (message.includes('429')) {
    return `${aiProvider === 'claude' ? 'Anthropic' : 'OpenAI'} rate limit exceeded. Try again in a moment.`;
  }
  return message;
}

function buildErrorResponse(err: unknown, aiProvider: AiProviderId): NextResponse {
  const message = err instanceof Error ? err.message : 'Unknown error';

  if (message.includes('not found')) {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  if (message.includes('at least 2 destinations')) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (message.includes('insufficient_quota') || message.includes('insufficient')) {
    return NextResponse.json(
      {
        error: aiProvider === 'claude'
          ? 'Anthropic quota exceeded or billing issue. Check your usage at console.anthropic.com.'
          : 'OpenAI quota exceeded or billing issue. For sk-proj- keys, check the project spending limit at platform.openai.com > Settings > Projects.',
        detail: message,
      },
      { status: 402 },
    );
  }
  if (message.includes('invalid_api_key') || message.includes('401')) {
    return NextResponse.json(
      { error: `${aiProvider === 'claude' ? 'Anthropic' : 'OpenAI'} API key is invalid or revoked. Update it in Settings.` },
      { status: 401 },
    );
  }
  if (message.includes('429')) {
    return NextResponse.json(
      { error: `${aiProvider === 'claude' ? 'Anthropic' : 'OpenAI'} rate limit exceeded. Try again in a moment.` },
      { status: 429 },
    );
  }
  console.error('[api/discover-experiences] Error:', err);
  return NextResponse.json({ error: message }, { status: 500 });
}
