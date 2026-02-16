import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleService } from './services/role.service';
import { RoleController } from './controllers/role.controller';
import { Permission, Role } from './entitys/role.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission]), UsersModule], 
  controllers: [RoleController],
  providers: [RoleService],
  exports: []
})
export class SeguridadModule {}
