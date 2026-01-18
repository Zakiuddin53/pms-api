import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { GlobalRole } from '../enums/global-role.enum';
import { PropertyRole } from '../enums/property-role.enum';

@Injectable()
export class PropertyRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Forbidden');
    }

    if (user.globalRole === GlobalRole.SUPER_ADMIN) {
      return true;
    }

    const propertyId = Number(request.params?.propertyId);
    if (!Number.isInteger(propertyId)) {
      throw new ForbiddenException('Forbidden');
    }

    const membership = user.roles?.find(
      (role: { propertyId: number; role: PropertyRole }) =>
        role.propertyId === propertyId,
    );
    if (!membership) {
      throw new ForbiddenException('Forbidden');
    }

    request.propertyId = propertyId;
    request.propertyRole = membership.role;
    return true;
  }
}
