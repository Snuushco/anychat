// Direct client-side AI API calls (keys never touch our server)
import { getApiKey } from './key-store';
import type { Provider } from './models';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (usage: { inputTokens: number; outputTokens: number }) => void;
  onError: (error: string) => void;
}

export async function streamChat(
  modelId: string,
  provider: Provider,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const apiKey = await getApiKey(provider);
  if (!apiKey) {
    callbacks.onError(`Geen API key gevonden voor ${provider}. Voeg er een toe in Instellingen.`);
    return;
  }

  try {
    if (provider === 'openai') {
      await streamOpenAI(apiKey, modelId, messages, callbacks, signal);
    } else if (provider === 'anthropic') {
      await streamAnthropic(apiKey, modelId, messages, callbacks, signal);
    } else if (provider === 'google') {
      await streamGoogle(apiKey, modelId, messages, callbacks, signal);
    }
  } catch (err) {
    if (signal?.aborted) return;
    callbacks.onError(err instanceof Error ? err.message : 'Onbekende fout');
  }
}

async function streamOpenAI(
  apiKey: string, model: string, messages: ChatMessage[],
  cb: StreamCallbacks, signal?: AbortSignal
) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI fout: ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let usage = { inputTokens: 0, outputTokens: 0 };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.choices?.[0]?.delta?.content) {
          cb.onToken(data.choices[0].delta.content);
        }
        if (data.usage) {
          usage = {
            inputTokens: data.usage.prompt_tokens || 0,
            outputTokens: data.usage.completion_tokens || 0,
          };
        }
      } catch { /* skip malformed */ }
    }
  }
  cb.onDone(usage);
}

async function streamAnthropic(
  apiKey: string, model: string, messages: ChatMessage[],
  cb: StreamCallbacks, signal?: AbortSignal
) {
  // Filter out system messages for Anthropic's format
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMsgs = messages.filter(m => m.role !== 'system');

  const body: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    messages: chatMsgs,
    stream: true,
  };
  if (systemMsg) body.system = systemMsg.content;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic fout: ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let usage = { inputTokens: 0, outputTokens: 0 };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'content_block_delta' && data.delta?.text) {
          cb.onToken(data.delta.text);
        }
        if (data.type === 'message_start' && data.message?.usage) {
          usage.inputTokens = data.message.usage.input_tokens || 0;
        }
        if (data.type === 'message_delta' && data.usage) {
          usage.outputTokens = data.usage.output_tokens || 0;
        }
      } catch { /* skip */ }
    }
  }
  cb.onDone(usage);
}

async function streamGoogle(
  apiKey: string, model: string, messages: ChatMessage[],
  cb: StreamCallbacks, signal?: AbortSignal
) {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find(m => m.role === 'system');
  const body: Record<string, unknown> = { contents };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google fout: ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let usage = { inputTokens: 0, outputTokens: 0 };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          cb.onToken(data.candidates[0].content.parts[0].text);
        }
        if (data.usageMetadata) {
          usage = {
            inputTokens: data.usageMetadata.promptTokenCount || 0,
            outputTokens: data.usageMetadata.candidatesTokenCount || 0,
          };
        }
      } catch { /* skip */ }
    }
  }
  cb.onDone(usage);
}
