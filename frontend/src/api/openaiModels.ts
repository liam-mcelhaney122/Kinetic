import { apiGet } from './client';

export function getOpenAIModels(signal?: AbortSignal): Promise<string[]> {
  return apiGet<{ models: string[] }>('/openai/models', signal).then((r) => r.models);
}
