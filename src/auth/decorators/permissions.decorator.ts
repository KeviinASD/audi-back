import { SetMetadata } from "@nestjs/common";
import { Resource } from "src/common/enums/resource.enum";
import { PermissionDto } from "src/modules/seguridad/dtos/role-create.dto";

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: Resource[]) => SetMetadata(PERMISSIONS_KEY, permissions);