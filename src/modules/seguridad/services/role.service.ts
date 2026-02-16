import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Permission, Role } from "../entitys/role.entity";
import { Repository } from "typeorm";
import { CreateRoleDto } from "../dtos/role-create.dto";


@Injectable()
export class RoleService {
    constructor(
        @InjectRepository(Role)
        private roleRepository: Repository<Role>,
    ) { }

    async createOne({name, permissions, description = "",}: CreateRoleDto) {
        const role = new Role();
        role.name = name;
        role.description = description;

        role.permissions = permissions.map(permissionDto => {
            const permission = new Permission();
            permission.resource = permissionDto.resource;
            permission.role = role; // Set the role for the permission
            return permission;
        })

        return this.roleRepository.save(role);
    }

    async getAll() {
        return this.roleRepository.find({});
    }

    async findOne(id: number) {
        const role = await this.roleRepository.findOne({ where: { roleId: id }, relations: ['permissions'] });
        if (!role) {
            throw new NotFoundException(`Role with id ${id} not found`);
        }
        return role;
    }

    async update(id: number, updateRole: CreateRoleDto) {
        const role = await this.findOne(id);
        Object.assign(role, updateRole);
        return this.roleRepository.save(role);
    }

    async remove(id: number) {
        const role = await this.findOne(id);
        return this.roleRepository.remove(role);
    }
}