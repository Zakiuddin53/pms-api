import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GlobalRole } from '../enums/global-role.enum';
import { PropertyRole } from '../enums/property-role.enum';
import { RolePermissions } from '../permissions/permissions';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

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

    if (user.globalRole === GlobalRole.SUPER_ADMIN) {
      return true;
    }

    const propertyId = Number(request.params?.propertyId);
    const role =
      request.propertyRole ??
      user.roles?.find(
        (membership: { propertyId: number; role: PropertyRole }) =>
          membership.propertyId === propertyId,
      )?.role;

    if (!role) {
      throw new ForbiddenException('Forbidden');
    }

    const permissions = RolePermissions[role] ?? [];
    if (!permissions.includes(required)) {
      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}
