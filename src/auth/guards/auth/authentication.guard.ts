import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Request } from 'express';
import jwtConfig from 'src/auth/config/jwt.config';
import { JwtPayloadParams } from 'src/common/utils/types';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {

  private readonly SECRET_KEY: string;

  constructor(
    private jwtService: JwtService,
    private userService: UsersService,
    @Inject(jwtConfig.KEY) private jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {
    this.SECRET_KEY = jwtConfiguration.secret as string;
  }

  async canActivate( context: ExecutionContext ): Promise<boolean>{
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const paylod: JwtPayloadParams = await this.jwtService.verifyAsync(
        token,
        { secret: this.SECRET_KEY }
      );
      console.log("este es el paylod: ", paylod);

      const user = await this.userService.findByIdWithRole(paylod.sub);
      if (!user) {
        throw new UnauthorizedException('Unauthorized user');
      }
      console.log("este es el user: ", user);

      request['user'] = user;
    } catch (error: any) {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}