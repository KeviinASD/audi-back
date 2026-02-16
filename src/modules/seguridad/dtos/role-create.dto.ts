import { Type } from "class-transformer";
import { IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { Resource } from "src/common/enums/resource.enum";

export class CreateRoleDto {
    @IsString()
    @IsNotEmpty()
    name: string;
    
    @IsString()
    description?: string;

    @ValidateNested({ each: true })
    @Type(() => PermissionDto)
    permissions: PermissionDto[];
}

export class PermissionDto {
    @IsString()
    @IsNotEmpty()
    resource: Resource;
}