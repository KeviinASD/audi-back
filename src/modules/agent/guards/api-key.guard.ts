// agent/guards/api-key.guard.ts

import {
  Injectable, CanActivate,
  ExecutionContext, UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request  = context.switchToHttp().getRequest();
    const apiKey   = request.headers['x-api-key'];
    const expected = process.env.AGENT_API_KEY;

    if (!apiKey || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API Key');
    }
    return true;
  }
}