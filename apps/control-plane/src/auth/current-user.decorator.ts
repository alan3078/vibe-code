import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest().user;
});
