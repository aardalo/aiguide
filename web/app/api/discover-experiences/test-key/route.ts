import { NextRequest, NextResponse } from 'next/server';
import { getSetting, SETTING_KEYS } from '@/lib/settings';

/**
 * GET /api/discover-experiences/test-key
 * Diagnostic endpoint: sends a minimal OpenAI API call to verify the key works.
 */
export async function GET(_request: NextRequest) {
  const apiKey =
    process.env.OPENAI_API_KEY ?? (await getSetting(SETTING_KEYS.OPENAI_API_KEY));
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'No OpenAI API key configured.' },
      { status: 400 },
    );
  }

  // Minimal completion: cheap model, 1 token max
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
        { ok: false, status: res.status, error: body },
        { status: 200 },
      );
    }

    const data = await res.json();
    return NextResponse.json({
      ok: true,
      model: data.model,
      usage: data.usage,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
