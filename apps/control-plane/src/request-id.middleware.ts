import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: { headers: Record<string, string | undefined> }, response: { header?: (name: string, value: string) => void; setHeader?: (name: string, value: string) => void }, next: () => void) {
    const requestId = request.headers['x-request-id'] || randomUUID();
    const setHeader = response.header || response.setHeader;
    setHeader?.call(response, 'x-request-id', requestId);
    next();
  }
}
