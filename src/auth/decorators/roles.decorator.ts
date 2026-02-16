import { SetMetadata } from '@nestjs/common';
import { RoleTier } from '../../common/enums/role.enum';


export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleTier[]) => SetMetadata(ROLES_KEY, roles);
