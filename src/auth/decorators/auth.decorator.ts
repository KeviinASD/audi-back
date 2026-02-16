import { SetMetadata, UseGuards, applyDecorators } from "@nestjs/common";
import { ROLES_KEY, Roles } from "./roles.decorator";
import { RolesGuard } from "../guards/roles/roles.guard";
import { AuthGuard } from "../guards/auth/authentication.guard";
import { PermissionDto } from "src/modules/seguridad/dtos/role-create.dto";
import { Permissions } from "./permissions.decorator";


export function Auth(...permission: PermissionDto[]) {
    return applyDecorators(
        /* Permissions(...permission), */
        UseGuards(AuthGuard, RolesGuard),
    )
}