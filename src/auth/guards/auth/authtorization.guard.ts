import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { RequestWithUser } from "src/auth/auth.controller";
import { PERMISSIONS_KEY } from "src/auth/decorators/permissions.decorator";
import { Resource } from "src/common/enums/resource.enum";
import { User } from "src/modules/users/entities/user.entity";
import { UsersService } from "src/modules/users/users.service";
import { Repository } from "typeorm";

@Injectable()
export class AuthorizationGuard implements CanActivate{

    constructor(
        private reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const {user: {role}}: RequestWithUser = context.switchToHttp().getRequest<RequestWithUser>();
        const requiredPermission = this.reflector.getAllAndOverride<Resource[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ])

        /* No se requiere de permisos para este controlador */
        if (!requiredPermission || requiredPermission.length === 0) return true;


        return true;
        /* if (!role || !role.permissions) return false;
        const hasRequiredResource = role.permissions.some((permission) => requiredPermission.includes(permission.resource));
        return hasRequiredResource; */
    }
}