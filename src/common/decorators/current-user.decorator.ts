import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@/common/types/auth.types';

/**
 * Extracts the authenticated user's JWT payload (or a specific field) from the request.
 *
 * Usage:
 *   @CurrentUser() user: JwtPayload
 *   @CurrentUser('sub') sub: string
 */
export const CurrentUser = createParamDecorator(
  (field: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return field ? user?.[field] : user;
  },
);
