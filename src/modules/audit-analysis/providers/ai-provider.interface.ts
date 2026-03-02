// audit-analysis/providers/ai-provider.interface.ts

export interface AiProviderResponse {
  text: string;
  tokensUsed: number;
}

export interface IAiProvider {
  readonly name: string;
  call(systemPrompt: string, userMessage: string): Promise<AiProviderResponse>;
}
