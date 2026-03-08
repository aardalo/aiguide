import { NextRequest, NextResponse } from 'next/server';
import { getSetting, SETTING_KEYS } from '@/lib/settings';

/**
 * GET /api/discover-experiences/test-key
 * Diagnostic endpoint: sends a minimal API call to verify the configured AI provider key works.
 */
export async function GET(_request: NextRequest) {
  const aiProvider = (await getSetting(SETTING_KEYS.AI_PROVIDER)) ?? 'chatgpt';

  if (aiProvider === 'claude') {
    return testAnthropicKey();
  }
  return testOpenAiKey();
}

async function testOpenAiKey(): Promise<NextResponse> {
  const apiKey =
    process.env.OPENAI_API_KEY ?? (await getSetting(SETTING_KEYS.OPENAI_API_KEY));
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, provider: 'chatgpt', error: 'No OpenAI API key configured.' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { ok: false, provider: 'chatgpt', status: res.status, error: body },
        { status: 200 },
      );
    }

    const data = await res.json();
    return NextResponse.json({
      ok: true,
      provider: 'chatgpt',
      model: data.model,
      usage: data.usage,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, provider: 'chatgpt', error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

async function testAnthropicKey(): Promise<NextResponse> {
  const apiKey =
    process.env.ANTHROPIC_API_KEY ?? (await getSetting(SETTING_KEYS.ANTHROPIC_API_KEY));
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, provider: 'claude', error: 'No Anthropic API key configured.' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { ok: false, provider: 'claude', status: res.status, error: body },
        { status: 200 },
      );
    }

    const data = await res.json();
    return NextResponse.json({
      ok: true,
      provider: 'claude',
      model: data.model,
      usage: data.usage,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, provider: 'claude', error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
