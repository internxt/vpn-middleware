import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(async (_, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();

  return req.user;
});
