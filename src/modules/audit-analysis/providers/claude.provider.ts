// audit-analysis/providers/claude.provider.ts
// Implementación con Anthropic Claude — activar cuando ANTHROPIC_API_KEY esté disponible.
// Para usar: cambiar AI_PROVIDER=claude en .env

import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { IAiProvider, AiProviderResponse } from './ai-provider.interface';

@Injectable()
export class ClaudeProvider implements IAiProvider {
  readonly name = 'claude';

  private readonly client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY ?? 'placeholder',
  });

  async call(systemPrompt: string, userMessage: string): Promise<AiProviderResponse> {
    const response = await this.client.messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 2000,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('');

    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    return { text, tokensUsed };
  }
}
