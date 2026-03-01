import { NextRequest, NextResponse } from 'next/server';

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mimeType: string; data: string };

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ContentPart[];
}

const FREE_DAILY_LIMIT = 20;
const FREE_MODEL = 'gemini-2.5-flash-preview-05-20';

const ipUsage = new Map<string, { count: number; resetAt: number }>();

function getIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function nextMidnightTs(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime();
}

function contentToGoogle(content: string | ContentPart[]): any[] {
  if (typeof content === 'string') return [{ text: content }];
  return content.map((p) => {
    if (p.type === 'text') return { text: p.text };
    if (p.type === 'image') return { inlineData: { mimeType: p.mimeType, data: p.data } };
    return { text: '' };
  });
}

export async function POST(req: NextRequest) {
  try {
    // Set GEMINI_FREE_KEY in Vercel Environment Variables
    // Dashboard: vercel.com/snuushcos-projects/anychat/settings/environment-variables
    const apiKey = process.env.GEMINI_FREE_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Free model unavailable. Missing server key.',
          note: 'Set GEMINI_FREE_KEY in Vercel Environment Variables.',
          dashboard: 'vercel.com/snuushcos-projects/anychat/settings/environment-variables',
        },
        { status: 500 }
      );
    }

    const ip = getIp(req);
    const now = Date.now();
    const existing = ipUsage.get(ip);
    const usage = !existing || now >= existing.resetAt
      ? { count: 0, resetAt: nextMidnightTs() }
      : existing;

    if (usage.count >= FREE_DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: 'Daily free limit reached. Add your own API key for unlimited access.',
          upgradeUrl: '/settings',
        },
        { status: 429 }
      );
    }

    usage.count += 1;
    ipUsage.set(ip, usage);

    const body = await req.json().catch(() => ({} as { messages?: ChatMessage[]; model?: string }));
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });
    }

    const contents = messages
      .filter((m: ChatMessage) => m.role !== 'system')
      .map((m: ChatMessage) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: contentToGoogle(m.content),
      }));

    const systemInstruction = messages.find((m: ChatMessage) => m.role === 'system');
    const geminiBody: Record<string, unknown> = { contents };
    if (systemInstruction) {
      const systemText = typeof systemInstruction.content === 'string'
        ? systemInstruction.content
        : systemInstruction.content
            .map((p: ContentPart) => (p.type === 'text' ? p.text : ''))
            .join('');
      geminiBody.systemInstruction = { parts: [{ text: systemText }] };
    }

    const model = FREE_MODEL;
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      }
    );

    if (!upstream.ok || !upstream.body) {
      const err = await upstream.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.error?.message || 'Free model unavailable. Try again later.' },
        { status: upstream.status || 502 }
      );
    }

    const headers = new Headers({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'x-free-limit': String(FREE_DAILY_LIMIT),
      'x-free-used': String(usage.count),
      'x-free-remaining': String(Math.max(0, FREE_DAILY_LIMIT - usage.count)),
      'x-free-reset-at': String(usage.resetAt),
    });

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}
