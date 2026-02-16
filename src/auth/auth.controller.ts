import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ParseIntPipe, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { Request, Response } from 'express';
import { JwtPayloadParams, resultAndTokenParams } from 'src/common/utils/types';
import { ActiveUser } from 'src/common/decorators/active-user.decorator';
import { GoogleAuthGuard } from './guards/google/google-oauth.guard';
import { Public } from './decorators/public.decorator';
import { User } from 'src/modules/users/entities/user.entity';
import { ApiBody, ApiResponse } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiBody({ type: SignInDto, description: 'User login credentials', })
  @ApiResponse({ status: 200, description: 'Login successful' })
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.login(signInDto);
  }

  @Public()
  @Post('register')
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.register(signUpDto);
  }

  @Get('me')
  me(@ActiveUser() user: JwtPayloadParams) {
    return user;
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/login')
  googleLogin() {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req, @Res() res: Response) {
    /* El usuario se guarda el el request gracias al STRATEGY de Google */
    const user: User = req.user;
    const result: resultAndTokenParams = await this.authService.loginFromGoogle(user);
    console.log({ result });
    res.redirect("http://localhost:3030/auth/success");
  }

  @Public()
  @Get('success')
  googleSuccess() {
    return { message: 'Google authentication successful. You can now access your account.' };
  }

}

export interface RequestWithUser extends Request {
  user: Omit<User, 'password'>;
}

