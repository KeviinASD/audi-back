import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { RequestWithUser } from 'src/auth/auth.controller';
import { RoleTier } from 'src/common/enums/role.enum';
import { ROLES_KEY } from 'src/auth/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  
  constructor(private reflector: Reflector) {}
  
  canActivate( context: ExecutionContext, ): boolean | Promise<boolean> | Observable<boolean> {
    
    /*
      we obtain the metadata from the handler or the class which use @Roles() decorator
      for example, if we use @Roles(Role.Admin) in the handler, we obtain [Role.Admin]
    */
   
    const requiredRoles = this.reflector.getAllAndOverride<RoleTier[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;
    
    const {user}: RequestWithUser = context.switchToHttp().getRequest<RequestWithUser>();
    const hasRequiredRole = requiredRoles.some((role) => user.roleTier === role);
    return hasRequiredRole;
  }
}
