import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { RoleService } from "../services/role.service";
import { CreateRoleDto } from "../dtos/role-create.dto";
import { AuthGuard } from "src/auth/guards/auth/authentication.guard";
import { Permissions } from "src/auth/decorators/permissions.decorator";
import { Resource } from "src/common/enums/resource.enum";
import { AuthorizationGuard } from "src/auth/guards/auth/authtorization.guard";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth/jwt-auth.guard";

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Permissions(Resource.roles)
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.createOne(createRoleDto);
  }

  @Get()
  findAll() {
    return this.roleService.getAll();
  }

  @Patch(':id')
  update(@Body() updateRoleDto: CreateRoleDto, @Param('id') id: number) {
    return this.roleService.update(id, updateRoleDto);
  }
  
  @Delete(':id')
  remove(@Body() id: number) {
    return this.roleService.remove(id);
  }
}