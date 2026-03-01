// Direct client-side AI API calls (keys never touch our server)
import { getApiKey } from './key-store';
import type { Provider } from './models';
import type { Tool, ToolResult } from './tools';
import { toolsToOpenAI, toolsToAnthropic, toolsToGemini, getToolById } from './tools';

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mimeType: string; data: string } // base64 without prefix

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ContentPart[];
  tool_calls?: any[];
  tool_call_id?: string;
}

// Helper: get plain text from content
export function getTextContent(content: string | ContentPart[]): string {
  if (typeof content === 'string') return content;
  return content.filter(p => p.type === 'text').map(p => (p as any).text).join('');
}

// Convert content parts to OpenAI format
function contentToOpenAI(content: string | ContentPart[]): any {
  if (typeof content === 'string') return content;
  return content.map(p => {
    if (p.type === 'text') return { type: 'text', text: p.text };
    if (p.type === 'image') return { type: 'image_url', image_url: { url: `data:${p.mimeType};base64,${p.data}` } };
    return p;
  });
}

// Convert content parts to Anthropic format
function contentToAnthropic(content: string | ContentPart[]): any {
  if (typeof content === 'string') return content;
  return content.map(p => {
    if (p.type === 'text') return { type: 'text', text: p.text };
    if (p.type === 'image') return { type: 'image', source: { type: 'base64', media_type: p.mimeType, data: p.data } };
    return p;
  });
}

// Convert content parts to Google format
function contentToGoogle(content: string | ContentPart[]): any[] {
  if (typeof content === 'string') return [{ text: content }];
  return content.map(p => {
    if (p.type === 'text') return { text: p.text };
    if (p.type === 'image') return { inlineData: { mimeType: p.mimeType, data: p.data } };
    return { text: '' };
  });
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (usage: { inputTokens: number; outputTokens: number }) => void;
  onError: (error: string) => void;
}

const OPENAI_COMPATIBLE_ENDPOINTS: Partial<Record<Provider, string>> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  xai: 'https://api.x.ai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

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
    const endpoint = OPENAI_COMPATIBLE_ENDPOINTS[provider];
    if (endpoint) {
      const extraHeaders: Record<string, string> = {};
      if (provider === 'openrouter') {
        extraHeaders['HTTP-Referer'] = 'https://anychat-alpha.vercel.app';
        extraHeaders['X-Title'] = 'AnyChat';
      }
      await streamOpenAICompatible(endpoint, apiKey, modelId, messages, callbacks, signal, extraHeaders);
    } else if (provider === 'anthropic') {
      await streamAnthropic(apiKey, modelId, messages, callbacks, signal);
    } else if (provider === 'google') {
      await streamGoogle(apiKey, modelId, messages, callbacks, signal);
    } else if (provider === 'cohere') {
      await streamCohere(apiKey, modelId, messages, callbacks, signal);
    }
  } catch (err) {
    if (signal?.aborted) return;
    callbacks.onError(err instanceof Error ? err.message : 'Onbekende fout');
  }
}

async function streamOpenAICompatible(
  endpoint: string, apiKey: string, model: string, messages: ChatMessage[],
  cb: StreamCallbacks, signal?: AbortSignal, extraHeaders?: Record<string, string>
) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({ ...m, content: contentToOpenAI(m.content) })),
      stream: true,
      stream_options: { include_usage: true },
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API fout: ${res.status}`);
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
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMsgs = messages.filter(m => m.role !== 'system');

  const body: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    messages: chatMsgs.map(m => ({ ...m, content: contentToAnthropic(m.content) })),
    stream: true,
  };
  if (systemMsg) body.system = getTextContent(systemMsg.content);

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
      parts: contentToGoogle(m.content),
    }));

  const systemInstruction = messages.find(m => m.role === 'system');
  const body: Record<string, unknown> = { contents };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: getTextContent(systemInstruction.content) }] };
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

async function streamCohere(
  apiKey: string, model: string, messages: ChatMessage[],
  cb: StreamCallbacks, signal?: AbortSignal
) {
  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Cohere fout: ${res.status}`);
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
        if (data.type === 'content-delta' && data.delta?.message?.content?.text) {
          cb.onToken(data.delta.message.content.text);
        }
        if (data.type === 'message-end' && data.delta?.usage?.billed_units) {
          usage = {
            inputTokens: data.delta.usage.billed_units.input_tokens || 0,
            outputTokens: data.delta.usage.billed_units.output_tokens || 0,
          };
        }
      } catch { /* skip */ }
    }
  }
  cb.onDone(usage);
}

// ── Tool-calling wrapper ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any

export interface ToolCallbacks extends StreamCallbacks {
  onToolCall: (toolName: string, params: any) => void
  onToolResult: (toolName: string, result: ToolResult) => void
}

export async function streamChatWithTools(
  modelId: string,
  provider: Provider,
  messages: ChatMessage[],
  tools: Tool[],
  callbacks: ToolCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const apiKey = await getApiKey(provider);
  if (!apiKey) {
    callbacks.onError(`Geen API key gevonden voor ${provider}. Voeg er een toe in Instellingen.`);
    return;
  }

  const endpoint = OPENAI_COMPATIBLE_ENDPOINTS[provider];

  if (endpoint) {
    await openaiToolLoop(endpoint, apiKey, modelId, provider, messages, tools, callbacks, signal);
  } else if (provider === 'anthropic') {
    await anthropicToolLoop(apiKey, modelId, messages, tools, callbacks, signal);
  } else if (provider === 'google') {
    await googleToolLoop(apiKey, modelId, messages, tools, callbacks, signal);
  } else {
    await streamChat(modelId, provider, messages, callbacks, signal);
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

async function openaiToolLoop(
  endpoint: string, apiKey: string, model: string, provider: Provider,
  messages: ChatMessage[], tools: Tool[], cb: ToolCallbacks, signal?: AbortSignal
) {
  const extraHeaders: Record<string, string> = {};
  if (provider === 'openrouter') {
    extraHeaders['HTTP-Referer'] = 'https://anychat-alpha.vercel.app';
    extraHeaders['X-Title'] = 'AnyChat';
  }

  const currentMessages = [...messages];

  for (let round = 0; round < 5; round++) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify({
        model,
        messages: currentMessages.map(m => {
          const out: any = { role: m.role, content: contentToOpenAI(m.content) };
          if (m.tool_calls) out.tool_calls = m.tool_calls;
          if (m.tool_call_id) out.tool_call_id = m.tool_call_id;
          return out;
        }),
        tools: toolsToOpenAI(tools),
        tool_choice: 'auto',
      }),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `API fout: ${res.status}`);
    }

    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error('No response from API');

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      currentMessages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });
      for (const tc of msg.tool_calls) {
        const toolId = tc.function.name;
        let params: any;
        try { params = JSON.parse(tc.function.arguments); } catch { params = {}; }
        cb.onToolCall(toolId, params);
        const tool = getToolById(toolId);
        const result: ToolResult = tool
          ? await tool.execute(params)
          : { success: false, data: null, display: 'text', content: `Unknown tool: ${toolId}` };
        cb.onToolResult(toolId, result);
        currentMessages.push({ role: 'tool', content: result.content, tool_call_id: tc.id });
      }
    } else {
      if (msg.content) cb.onToken(msg.content);
      cb.onDone({ inputTokens: data.usage?.prompt_tokens || 0, outputTokens: data.usage?.completion_tokens || 0 });
      return;
    }
  }
  cb.onError('Max tool call rounds reached');
}

async function anthropicToolLoop(
  apiKey: string, model: string, messages: ChatMessage[], tools: Tool[],
  cb: ToolCallbacks, signal?: AbortSignal
) {
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMsgs = messages.filter(m => m.role !== 'system');
  const anthropicMsgs: any[] = chatMsgs.map(m => ({
    role: m.role === 'tool' ? 'user' : m.role, content: contentToAnthropic(m.content),
  }));

  for (let round = 0; round < 5; round++) {
    const body: any = {
      model, max_tokens: 4096, messages: anthropicMsgs, tools: toolsToAnthropic(tools),
    };
    if (systemMsg) body.system = getTextContent(systemMsg.content);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey, 'anthropic-version': '2023-06-01',
        'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body), signal,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Anthropic fout: ${res.status}`);
    }

    const data = await res.json();
    const toolUseBlocks = (data.content || []).filter((b: any) => b.type === 'tool_use');
    const textBlocks = (data.content || []).filter((b: any) => b.type === 'text');

    if (toolUseBlocks.length > 0) {
      anthropicMsgs.push({ role: 'assistant', content: data.content });
      const toolResults: any[] = [];
      for (const block of toolUseBlocks) {
        cb.onToolCall(block.name, block.input);
        const tool = getToolById(block.name);
        const result: ToolResult = tool
          ? await tool.execute(block.input)
          : { success: false, data: null, display: 'text', content: `Unknown tool: ${block.name}` };
        cb.onToolResult(block.name, result);
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result.content });
      }
      anthropicMsgs.push({ role: 'user', content: toolResults });
    } else {
      const text = textBlocks.map((b: any) => b.text).join('');
      if (text) cb.onToken(text);
      cb.onDone({ inputTokens: data.usage?.input_tokens || 0, outputTokens: data.usage?.output_tokens || 0 });
      return;
    }
  }
  cb.onError('Max tool call rounds reached');
}

async function googleToolLoop(
  apiKey: string, model: string, messages: ChatMessage[], tools: Tool[],
  cb: ToolCallbacks, signal?: AbortSignal
) {
  const systemInstruction = messages.find(m => m.role === 'system');
  const contents: any[] = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: contentToGoogle(m.content) }));

  for (let round = 0; round < 5; round++) {
    const body: any = { contents, tools: toolsToGemini(tools) };
    if (systemInstruction) body.systemInstruction = { parts: [{ text: getTextContent(systemInstruction.content) }] };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal }
    );
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Google fout: ${res.status}`);
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const functionCalls = parts.filter((p: any) => p.functionCall);
    const textParts = parts.filter((p: any) => p.text);

    if (functionCalls.length > 0) {
      contents.push({ role: 'model', parts });
      const functionResponses: any[] = [];
      for (const fc of functionCalls) {
        const { name, args } = fc.functionCall;
        cb.onToolCall(name, args);
        const tool = getToolById(name);
        const result: ToolResult = tool
          ? await tool.execute(args)
          : { success: false, data: null, display: 'text', content: `Unknown tool: ${name}` };
        cb.onToolResult(name, result);
        functionResponses.push({ functionResponse: { name, response: { content: result.content } } });
      }
      contents.push({ role: 'user', parts: functionResponses });
    } else {
      const text = textParts.map((p: any) => p.text).join('');
      if (text) cb.onToken(text);
      cb.onDone({ inputTokens: data.usageMetadata?.promptTokenCount || 0, outputTokens: data.usageMetadata?.candidatesTokenCount || 0 });
      return;
    }
  }
  cb.onError('Max tool call rounds reached');
}
