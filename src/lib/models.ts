export type Provider = 'free' | 'openai' | 'anthropic' | 'google' | 'xai' | 'mistral' | 'deepseek' | 'cohere' | 'groq' | 'openrouter';

export interface AIModel {
  id: string;
  name: string;
  provider: Provider;
  inputCostPer1k: number;  // USD per 1K tokens
  outputCostPer1k: number;
  maxTokens: number;
  description: string;
  speed: 'fast' | 'medium' | 'slow';
}

export const MODELS: AIModel[] = [
  // Free
  {
    id: 'free',
    name: 'AnyChat Free',
    provider: 'free' as Provider,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
    maxTokens: 128000,
    description: 'Free model powered by Gemini Flash. 20 messages/day. No API key needed.',
    speed: 'fast' as const,
  },
  // OpenAI
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    inputCostPer1k: 0.002,
    outputCostPer1k: 0.008,
    maxTokens: 1048576,
    description: 'Latest flagship model. Smart and fast.',
    speed: 'medium',
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'openai',
    inputCostPer1k: 0.0004,
    outputCostPer1k: 0.0016,
    maxTokens: 1048576,
    description: 'Fast and affordable. Great for everyday use.',
    speed: 'fast',
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    provider: 'openai',
    inputCostPer1k: 0.0001,
    outputCostPer1k: 0.0004,
    maxTokens: 1048576,
    description: 'Super fast and cheapest. Best for simple tasks.',
    speed: 'fast',
  },
  {
    id: 'o3-mini',
    name: 'o3-mini',
    provider: 'openai',
    inputCostPer1k: 0.0011,
    outputCostPer1k: 0.0044,
    maxTokens: 200000,
    description: 'Reasoning model for complex problems.',
    speed: 'slow',
  },
  // Anthropic
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.075,
    maxTokens: 200000,
    description: 'Most capable. Great for complex tasks and creativity.',
    speed: 'slow',
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    maxTokens: 200000,
    description: 'Excellent for writing and analysis.',
    speed: 'medium',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    inputCostPer1k: 0.0008,
    outputCostPer1k: 0.004,
    maxTokens: 200000,
    description: 'Fast and affordable. Great for everyday use.',
    speed: 'fast',
  },
  // Google
  {
    id: 'gemini-2.5-pro-preview-06-05',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    inputCostPer1k: 0.00125,
    outputCostPer1k: 0.01,
    maxTokens: 1048576,
    description: 'Powerful model with a large context window.',
    speed: 'medium',
  },
  {
    id: 'gemini-2.5-flash-preview-05-20',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    maxTokens: 1048576,
    description: 'Lightning fast and low cost.',
    speed: 'fast',
  },
  // xAI
  {
    id: 'grok-3',
    name: 'Grok 3',
    provider: 'xai',
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    maxTokens: 131072,
    description: 'Powerful model from xAI.',
    speed: 'medium',
  },
  {
    id: 'grok-3-mini',
    name: 'Grok 3 Mini',
    provider: 'xai',
    inputCostPer1k: 0.0003,
    outputCostPer1k: 0.0005,
    maxTokens: 131072,
    description: 'Fast and affordable model from xAI.',
    speed: 'fast',
  },
  // Mistral
  {
    id: 'mistral-large-latest',
    name: 'Mistral Large',
    provider: 'mistral',
    inputCostPer1k: 0.002,
    outputCostPer1k: 0.006,
    maxTokens: 128000,
    description: 'Most powerful Mistral model.',
    speed: 'medium',
  },
  {
    id: 'mistral-small-latest',
    name: 'Mistral Small',
    provider: 'mistral',
    inputCostPer1k: 0.0001,
    outputCostPer1k: 0.0003,
    maxTokens: 128000,
    description: 'Fast and efficient.',
    speed: 'fast',
  },
  // DeepSeek
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    inputCostPer1k: 0.00014,
    outputCostPer1k: 0.00028,
    maxTokens: 128000,
    description: 'Affordable and capable.',
    speed: 'medium',
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    provider: 'deepseek',
    inputCostPer1k: 0.00055,
    outputCostPer1k: 0.0022,
    maxTokens: 128000,
    description: 'Reasoning model for complex problems.',
    speed: 'slow',
  },
  // Cohere
  {
    id: 'command-r-plus',
    name: 'Command R+',
    provider: 'cohere',
    inputCostPer1k: 0.0025,
    outputCostPer1k: 0.01,
    maxTokens: 128000,
    description: 'Most powerful Cohere model.',
    speed: 'medium',
  },
  {
    id: 'command-r',
    name: 'Command R',
    provider: 'cohere',
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    maxTokens: 128000,
    description: 'Fast and affordable.',
    speed: 'fast',
  },
  // Groq
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    provider: 'groq',
    inputCostPer1k: 0.00059,
    outputCostPer1k: 0.00079,
    maxTokens: 128000,
    description: 'Powerful open-source model, blazing fast.',
    speed: 'fast',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B',
    provider: 'groq',
    inputCostPer1k: 0.00005,
    outputCostPer1k: 0.00008,
    maxTokens: 128000,
    description: 'Ultra-fast for simple tasks.',
    speed: 'fast',
  },
  // OpenRouter
  {
    id: 'openrouter/auto',
    name: 'OpenRouter Auto',
    provider: 'openrouter',
    inputCostPer1k: 0.0,
    outputCostPer1k: 0.0,
    maxTokens: 128000,
    description: 'Automatically picks the best model. Costs vary by model.',
    speed: 'medium',
  },
];

export const PROVIDER_INFO: Record<Provider, { name: string; color: string; icon: string; keyPrefix: string; keyUrl: string }> = {
  free: {
    name: 'Free',
    color: '#10B981',
    icon: '🎁',
    keyPrefix: '',
    keyUrl: '',
  },
  openai: {
    name: 'OpenAI',
    color: '#10A37F',
    icon: '🟢',
    keyPrefix: 'sk-',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    name: 'Anthropic',
    color: '#D4A574',
    icon: '🟤',
    keyPrefix: 'sk-ant-',
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
  google: {
    name: 'Google',
    color: '#4285F4',
    icon: '🔵',
    keyPrefix: 'AI',
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  xai: {
    name: 'xAI/Grok',
    color: '#1DA1F2',
    icon: '⚡',
    keyPrefix: 'xai-',
    keyUrl: 'https://console.x.ai/',
  },
  mistral: {
    name: 'Mistral AI',
    color: '#FF7000',
    icon: '🟠',
    keyPrefix: '',
    keyUrl: 'https://console.mistral.ai/api-keys',
  },
  deepseek: {
    name: 'DeepSeek',
    color: '#4D6BFE',
    icon: '🔮',
    keyPrefix: 'sk-',
    keyUrl: 'https://platform.deepseek.com/api_keys',
  },
  cohere: {
    name: 'Cohere',
    color: '#39594D',
    icon: '🌿',
    keyPrefix: '',
    keyUrl: 'https://dashboard.cohere.com/api-keys',
  },
  groq: {
    name: 'Groq',
    color: '#F55036',
    icon: '🔥',
    keyPrefix: 'gsk_',
    keyUrl: 'https://console.groq.com/keys',
  },
  openrouter: {
    name: 'OpenRouter',
    color: '#6366F1',
    icon: '🌐',
    keyPrefix: 'sk-or-',
    keyUrl: 'https://openrouter.ai/keys',
  },
};

export function getModelById(id: string): AIModel | undefined {
  return MODELS.find(m => m.id === id);
}

export function getModelsByProvider(provider: Provider): AIModel[] {
  return MODELS.filter(m => m.provider === provider);
}

export function calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1000) * model.inputCostPer1k + (outputTokens / 1000) * model.outputCostPer1k;
}

// Rough token estimation (4 chars ≈ 1 token)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

