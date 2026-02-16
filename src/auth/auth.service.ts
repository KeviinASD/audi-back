import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/modules/users/users.service';
import { JwtPayloadParams, SignInParams, SignUpParams, resultAndTokenParams } from 'src/common/utils/types';
import * as bcrypt from 'bcrypt';
import { User } from 'src/modules/users/entities/user.entity';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService
  ) { }

  async login(signInDto: SignInDto): Promise<resultAndTokenParams> {
    const user = await this.userService.findOne(signInDto.email);
    if (!user) throw new UnauthorizedException('Email not found');

    const isPasswordValid = await bcrypt.compare(signInDto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid password');

    this.logger.log(`User logged in successfully: ${user.email}`);
    return await this.resultAndToken(user);
  }


  async register(signUpDto: SignUpDto): Promise<resultAndTokenParams> {
    const userFound = await this.userService.findOne(signUpDto.email);
    if (userFound) { throw new UnauthorizedException('Email already exists'); }

    const hashPassword = bcrypt.hashSync(signUpDto.password, 10);

    const user = await this.userService.createOne({
      username: signUpDto.username,
      email: signUpDto.email,
      password: hashPassword,
    });

    this.logger.log(`New user registered: ${user.email}`);
    return await this.resultAndToken(user);
  }

  async resultAndToken(user: User): Promise<resultAndTokenParams> {
    const { password, ...result } = user;
    const payload: JwtPayloadParams = { sub: user.id };

    return {
      user: { ...result },
      access_token: this.jwtService.sign(payload)
    }
  }

  async getUser(id: number): Promise<User> {
    return null;
  }

  async validateJwtUser(userId: number): Promise<Omit<User, 'password'>> {
    const user = await this.userService.findOneById(userId);
    if (!user) throw new UnauthorizedException('User not found!');
    const { password, ...result } = user;
    return result;
  }

  async validateGoogleUser(googleUser: SignUpDto) {
    const user = await this.userService.findOne(googleUser.email);
    if (user) return user;
    return await this.userService.createOne(googleUser)
  }

  async loginFromGoogle(user: User) {
    return await this.resultAndToken(user);
  }

}
