import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { SignUpParams } from 'src/common/utils/types';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}
  
  async createOne(createUserDetails: CreateUserDto){
    const userEntity = this.userRepository.create(createUserDetails);
    return this.userRepository.save(userEntity);
  }

  async findOneById(id: number) {
    return this.userRepository.findOne({where: {id}});
  }

  async findOne(email: string) {
    return this.userRepository.findOne({where: {email}});
  }
  
  async createHandle(createUserDetails: CreateUserDto) {
    const user = await this.userRepository.findOne({where: {email: createUserDetails.email}});
    if (user) throw new UnauthorizedException('Email already exists');

    return await this.createOne(createUserDetails);
  }
  
  async findOneByEmailHandle(email: string) {
    const user = await this.userRepository.findOne({where: {email}});
    if (!user) throw new UnauthorizedException('Email not found');
    return user;
  }

  async findByIdWithRole(id: number) {
    const {password, ...user} = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'role.permissions']
    })

    return user;
  }
  
  findAll() {
    return this.userRepository.find({});
  }
  
}
