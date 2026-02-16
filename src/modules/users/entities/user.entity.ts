
import { Role } from "src/modules/seguridad/entitys/role.entity";
import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import * as bcrypt from 'bcrypt';
import { RoleTier } from "src/common/enums/role.enum";

@Entity({name: 'user'})
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    username: string;

    @Column({unique: true})
    email: string;

    @Column({})
    password: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'enum', enum: RoleTier, default: RoleTier.User })
    roleTier: RoleTier;

    @ManyToOne(type => Role, role => role.users)
    @JoinColumn({ name: 'roleId' })
    role: Role;
}
