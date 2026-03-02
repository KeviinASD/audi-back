// audit-analysis/providers/openai.provider.ts

import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { IAiProvider, AiProviderResponse } from './ai-provider.interface';

@Injectable()
export class OpenAiProvider implements IAiProvider {
  readonly name = 'openai';

  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.OPENAI_API_KEY
          ? `Bearer ${process.env.OPENAI_API_KEY}`
          : '',
      },
    });
  }

  async call(systemPrompt: string, userMessage: string): Promise<AiProviderResponse> {
    const response = await this.client.post('/chat/completions', {
      model:      'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      max_tokens: 2000,
    });

    const text: string = response.data.choices[0].message.content;
    const tokensUsed: number =
      response.data.usage.prompt_tokens + response.data.usage.completion_tokens;

    return { text, tokensUsed };
  }
}
