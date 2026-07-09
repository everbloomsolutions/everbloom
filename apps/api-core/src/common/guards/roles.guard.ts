import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();

    // Allow CORS preflight requests to pass through.
    // AuthGuard already allows OPTIONS; if RolesGuard blocks, browser calls fail before sending credentials.
    if (request?.method === 'OPTIONS') {
      return true;
    }

    if (!requiredRoles) {
      return true;
    }
    const user = request.user;

    if (!user) {
      return false;
    }

    return requiredRoles.some((role) => user.role === role);
  }
}
