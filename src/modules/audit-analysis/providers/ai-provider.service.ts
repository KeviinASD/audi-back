// audit-analysis/providers/ai-provider.service.ts
// Selecciona el proveedor de IA activo según la variable de entorno AI_PROVIDER.
// Valores soportados: 'openai' (default) | 'claude'

import { Injectable } from '@nestjs/common';
import { IAiProvider, AiProviderResponse } from './ai-provider.interface';
import { OpenAiProvider } from './openai.provider';
import { ClaudeProvider } from './claude.provider';

@Injectable()
export class AiProviderService {

  private readonly providers: Record<string, IAiProvider>;

  constructor(
    private readonly openai: OpenAiProvider,
    private readonly claude: ClaudeProvider,
  ) {
    this.providers = {
      openai: openai,
      claude: claude,
    };
  }

  get activeProvider(): IAiProvider {
    const name = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();
    return this.providers[name] ?? this.providers['openai'];
  }

  call(systemPrompt: string, userMessage: string): Promise<AiProviderResponse> {
    return this.activeProvider.call(systemPrompt, userMessage);
  }
}
