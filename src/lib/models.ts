export type Provider = 'openai' | 'anthropic' | 'google';

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
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    inputCostPer1k: 0.0025,
    outputCostPer1k: 0.01,
    maxTokens: 128000,
    description: 'Snel en slim. Beste allrounder.',
    speed: 'fast',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    maxTokens: 128000,
    description: 'Supersnel en goedkoop. Voor simpele taken.',
    speed: 'fast',
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    maxTokens: 200000,
    description: 'Uitstekend voor schrijven en analyse.',
    speed: 'medium',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    inputCostPer1k: 0.0008,
    outputCostPer1k: 0.004,
    maxTokens: 200000,
    description: 'Snel en betaalbaar. Dagelijks gebruik.',
    speed: 'fast',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    inputCostPer1k: 0.00125,
    outputCostPer1k: 0.005,
    maxTokens: 2000000,
    description: 'Groot context window. Ideaal voor documenten.',
    speed: 'medium',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    inputCostPer1k: 0.000075,
    outputCostPer1k: 0.0003,
    maxTokens: 1000000,
    description: 'Razendsnel en goedkoopst. Simpele vragen.',
    speed: 'fast',
  },
];

export const PROVIDER_INFO: Record<Provider, { name: string; color: string; icon: string; keyPrefix: string; keyUrl: string }> = {
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
