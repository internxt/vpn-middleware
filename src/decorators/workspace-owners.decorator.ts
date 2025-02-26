import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { AuthTokenPayload } from '../modules/auth/interfaces';

export const WorkspaceOwnersIds = createParamDecorator(
  async (_, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();

    const ownersIds = [];

    if (req.headers.authorization) {
      const auth = req.headers.authorization.split('Bearer ')[1];
      const authDecoded = jwt.decode(auth) as { payload: AuthTokenPayload };

      const owners = authDecoded?.payload?.workspaces?.owners;

      if (Array.isArray(owners)) {
        ownersIds.push(...owners);
      }
    }

    return ownersIds;
  },
);
