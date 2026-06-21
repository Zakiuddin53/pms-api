import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PropertyRole } from '@/common/enums/role.enum';
import { Permission, resolvePermissions } from '@/common/permissions/permissions';
import { REQUIRE_PERMISSION_KEY } from '@/common/decorators/require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Forbidden');
    }

    // Super admins have unrestricted access
    if (user.role === PropertyRole.SUPER_ADMIN) {
      return true;
    }

    // For PROPERTY_ADMIN: use the per-user custom permission set embedded in the JWT
    const permissions = resolvePermissions(user.role, user.permissions);
    if (!permissions.includes(required as Permission)) {
      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}
