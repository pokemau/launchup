import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../../entities/enums/role.enum';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { role?: Role | string } | undefined;
    if (!user || user.role !== Role.Admin) {
      throw new ForbiddenException('Admins only');
    }
    return true;
  }
}
