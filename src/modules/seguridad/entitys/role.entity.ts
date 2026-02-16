import { Resource } from "src/common/enums/resource.enum";
import { User } from "src/modules/users/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'role'}) 
export class Role {
    @PrimaryGeneratedColumn()
    roleId: number;

    @Column({ unique: true })
    name: string;

    @Column({ nullable: true })
    description: string;

    @OneToMany(() => Permission, permission => permission.role)
    permissions: Permission[];

    @OneToMany(() => User, user => user.role)
    users: User[]
}

@Entity({ name: 'permission' })
export class Permission {
    @PrimaryGeneratedColumn()
    permissionId: number;

    @Column({ enum: Resource, type: 'enum' })
    resource: Resource;

    @ManyToOne( () => Role, role => role.permissions)
    @JoinColumn({ name: 'roleId' })
    role: Role;
}