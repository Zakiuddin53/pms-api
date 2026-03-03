import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GlobalRole } from '@/common/enums/role.enum';
import { PropertyRole } from '@/common/enums/role.enum';
import { Permission, RolePermissions } from '@/common/permissions/permissions';
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
    if (user.globalRole === GlobalRole.SUPER_ADMIN) {
      return true;
    }

    const propertyId = Number(request.params?.propertyId) || null;

    // Try to resolve a role in this order:
    //  1. Role already attached by PropertyRoleGuard (upstream guard)
    //  2. Property-specific role from the JWT roles array (matched by propertyId in params)
    //  3. Fallback: PROPERTY_ADMIN globally + no propertyId in params
    //     (e.g. POST /properties to create a new property)
    //  4. Fallback: PROPERTY_ADMIN globally + propertyId in params
    //     Covers the window between property creation and next login when
    //     the JWT roles[] has not yet been refreshed, but globalRole proves
    //     they are an admin. Acceptable because PROPERTY_ADMIN is a high-trust role.
    const role: PropertyRole | undefined =
      request.propertyRole ??
      user.roles?.find(
        (membership: { propertyId: number; role: PropertyRole }) =>
          membership.propertyId === propertyId,
      )?.role ??
      (user.globalRole === GlobalRole.PROPERTY_ADMIN
        ? PropertyRole.PROPERTY_ADMIN
        : undefined);

    if (!role) {
      throw new ForbiddenException('Forbidden');
    }

    const permissions = RolePermissions[role] ?? [];
    if (!permissions.includes(required as Permission)) {
      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}
