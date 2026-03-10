import { NextRequest, NextResponse } from 'next/server';
import { creditStoreMode, getCreditUser, refundCredits, spendCredits } from '@/lib/server/credit-store';

export const runtime = 'nodejs';

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mimeType: string; data: string };

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ContentPart[];
}

const MODEL_CREDIT_COSTS: Record<string, number> = {
  'gemini-2.5-flash': 1, 'llama-3.3-70b-versatile': 1, 'llama-3.1-8b-instant': 1,
  'mistral-small-latest': 1, 'deepseek-chat': 1, 'command-r': 1, 'gpt-4.1-nano': 1,
  'gpt-4.1-mini': 2, 'claude-3-5-haiku-20241022': 2, 'grok-3-mini': 2, 'gemini-2.5-pro': 2,
  'gpt-4.1': 5, 'claude-sonnet-4-20250514': 5, 'grok-3': 5, 'mistral-large-latest': 5,
  'command-r-plus': 5, 'deepseek-reasoner': 5,
  'claude-opus-4-20250514': 10, 'o3-mini': 10,
};

const ipRateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_PER_MINUTE = 30;

function getIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const existing = ipRateLimit.get(ip);
  if (!existing || now >= existing.resetAt) {
    ipRateLimit.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (existing.count >= RATE_LIMIT_PER_MINUTE) return false;
  existing.count++;
  return true;
}

function contentToOpenAI(content: string | ContentPart[]) {
  if (typeof content === 'string') return content;
  return content.map((p) => {
    if (p.type === 'text') return { type: 'text', text: p.text };
    if (p.type === 'image') return { type: 'image_url', image_url: { url: `data:${p.mimeType};base64,${p.data}` } };
    return p;
  });
}

function contentToAnthropic(content: string | ContentPart[]) {
  if (typeof content === 'string') return content;
  return content.map((p) => {
    if (p.type === 'text') return { type: 'text', text: p.text };
    if (p.type === 'image') return { type: 'image', source: { type: 'base64', media_type: p.mimeType, data: p.data } };
    return p;
  });
}

function contentToGoogle(content: string | ContentPart[]): Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> {
  if (typeof content === 'string') return [{ text: content }];
  return content.map((p) => {
    if (p.type === 'text') return { text: p.text };
    if (p.type === 'image') return { inlineData: { mimeType: p.mimeType, data: p.data } };
    return { text: '' };
  });
}

function getProviderForModel(modelId: string): string {
  if (modelId.startsWith('gpt-') || modelId.startsWith('o3')) return 'openai';
  if (modelId.startsWith('claude-')) return 'anthropic';
  if (modelId.startsWith('gemini-')) return 'google';
  if (modelId.startsWith('grok-')) return 'xai';
  if (modelId.startsWith('mistral-')) return 'mistral';
  if (modelId.startsWith('deepseek-')) return 'deepseek';
  if (modelId.startsWith('command-')) return 'cohere';
  if (modelId.startsWith('llama-')) return 'groq';
  return 'openai';
}

async function streamOpenAI(model: string, messages: ChatMessage[], apiKey: string): Promise<Response> {
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: contentToOpenAI(m.content) })),
      stream: true,
    }),
  });
}

async function streamAnthropic(model: string, messages: ChatMessage[], apiKey: string): Promise<Response> {
  const systemMsg = messages.find((m) => m.role === 'system');
  const nonSystem = messages.filter((m) => m.role !== 'system');
  const body: {
    model: string;
    max_tokens: number;
    messages: Array<{ role: string; content: string | ReturnType<typeof contentToAnthropic> }>;
    stream: boolean;
    system?: string;
  } = {
    model,
    max_tokens: 4096,
    messages: nonSystem.map((m) => ({ role: m.role === 'tool' ? 'user' : m.role, content: contentToAnthropic(m.content) })),
    stream: true,
  };
  if (systemMsg) {
    body.system = typeof systemMsg.content === 'string'
      ? systemMsg.content
      : systemMsg.content.map((p) => p.type === 'text' ? p.text : '').join('');
  }
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
}

async function streamGoogle(model: string, messages: ChatMessage[], apiKey: string): Promise<Response> {
  const systemMsg = messages.find((m) => m.role === 'system');
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: contentToGoogle(m.content),
    }));
  const body: { contents: typeof contents; systemInstruction?: { parts: Array<{ text: string }> } } = { contents };
  if (systemMsg) {
    const txt = typeof systemMsg.content === 'string' ? systemMsg.content : systemMsg.content.map((p) => p.type === 'text' ? p.text : '').join('');
    body.systemInstruction = { parts: [{ text: txt }] };
  }
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function streamXAI(model: string, messages: ChatMessage[], apiKey: string): Promise<Response> {
  return fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, stream: true, messages: messages.map((m) => ({ role: m.role, content: contentToOpenAI(m.content) })) }),
  });
}

async function streamMistral(model: string, messages: ChatMessage[], apiKey: string): Promise<Response> {
  return fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, stream: true, messages: messages.map((m) => ({ role: m.role, content: contentToOpenAI(m.content) })) }),
  });
}

async function streamDeepSeek(model: string, messages: ChatMessage[], apiKey: string): Promise<Response> {
  return fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, stream: true, messages: messages.map((m) => ({ role: m.role, content: contentToOpenAI(m.content) })) }),
  });
}

async function streamGroq(model: string, messages: ChatMessage[], apiKey: string): Promise<Response> {
  return fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, stream: true, messages: messages.map((m) => ({ role: m.role, content: contentToOpenAI(m.content) })) }),
  });
}

async function streamCohere(model: string, messages: ChatMessage[], apiKey: string): Promise<Response> {
  return fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      stream: true,
      messages: messages.map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : m.content.map((p) => p.type === 'text' ? p.text : '').join('') })),
    }),
  });
}

const API_KEYS: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  xai: 'XAI_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  groq: 'GROQ_API_KEY',
  cohere: 'COHERE_API_KEY',
};

export async function POST(req: NextRequest) {
  try {
    const ip = getIp(req);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please slow down.', errorCode: 'rate_limit' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { messages, model: modelId, userToken } = body as {
      messages?: ChatMessage[];
      model?: string;
      userToken?: string;
    };

    if (!messages?.length || !modelId || !userToken) {
      return NextResponse.json({ error: 'Missing messages, model, or userToken.', errorCode: 'bad_request' }, { status: 400 });
    }

    const creditCost = MODEL_CREDIT_COSTS[modelId] ?? 3;
    const user = await getCreditUser(userToken);

    if (user.credits < creditCost) {
      return NextResponse.json({
        error: 'Insufficient credits.',
        errorCode: 'insufficient_credits',
        required: creditCost,
        balance: user.credits,
        buyUrl: '/credits',
      }, { status: 402 });
    }

    const provider = getProviderForModel(modelId);
    const apiKey = process.env[API_KEYS[provider] || ''];

    if (!apiKey) {
      return NextResponse.json({
        error: `Server key not configured for ${provider}. Contact support.`,
        errorCode: 'provider_not_configured',
      }, { status: 500 });
    }

    const charge = await spendCredits(userToken, creditCost, { modelId, provider });
    if (!charge.ok) {
      return NextResponse.json({
        error: 'Insufficient credits.',
        errorCode: 'insufficient_credits',
        required: creditCost,
        balance: charge.user.credits,
        buyUrl: '/credits',
      }, { status: 402 });
    }

    let remainingCredits = charge.user.credits;
    let upstream: Response;
    switch (provider) {
      case 'openai': upstream = await streamOpenAI(modelId, messages, apiKey); break;
      case 'anthropic': upstream = await streamAnthropic(modelId, messages, apiKey); break;
      case 'google': upstream = await streamGoogle(modelId, messages, apiKey); break;
      case 'xai': upstream = await streamXAI(modelId, messages, apiKey); break;
      case 'mistral': upstream = await streamMistral(modelId, messages, apiKey); break;
      case 'deepseek': upstream = await streamDeepSeek(modelId, messages, apiKey); break;
      case 'groq': upstream = await streamGroq(modelId, messages, apiKey); break;
      case 'cohere': upstream = await streamCohere(modelId, messages, apiKey); break;
      default:
        remainingCredits = (await refundCredits(userToken, creditCost, { modelId, provider, reason: 'unsupported_model' })).credits;
        return NextResponse.json({ error: 'Unsupported model.', errorCode: 'unsupported_model' }, { status: 400 });
    }

    if (!upstream.ok || !upstream.body) {
      remainingCredits = (await refundCredits(userToken, creditCost, { modelId, provider, reason: 'upstream_error' })).credits;
      const err = await upstream.json().catch(() => ({} as { error?: { message?: string } }));
      return NextResponse.json(
        {
          error: err?.error?.message || 'Model unavailable. Try again later.',
          errorCode: upstream.status === 429 ? 'provider_rate_limit' : 'provider_error',
          refunded: true,
          creditsRemaining: remainingCredits,
        },
        { status: upstream.status || 502 }
      );
    }

    const headers = new Headers({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'x-credits-spent': String(creditCost),
      'x-credits-remaining': String(remainingCredits),
    });

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: 'Unexpected server error.', errorCode: 'unexpected_server_error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userToken = req.nextUrl.searchParams.get('userToken');
  if (!userToken) {
    return NextResponse.json({ error: 'Missing userToken' }, { status: 400 });
  }
  const user = await getCreditUser(userToken);
  return NextResponse.json({
    credits: user.credits,
    isPro: user.isPro,
    proExpiresAt: user.proExpiresAt,
    store: creditStoreMode(),
  });
}
