import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PropertyRole } from '@/common/enums/role.enum';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user || user.role !== PropertyRole.SUPER_ADMIN) {
      throw new ForbiddenException('Forbidden');
    }
    return true;
  }
}

