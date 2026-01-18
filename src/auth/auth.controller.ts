import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RegisterSuperAdminDto } from './dto/register-super-admin.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-super-admin')
  @ApiOperation({ summary: 'create super admin' })
  async registerSuperAdmin(@Body() body: RegisterSuperAdminDto) {
    return this.authService.registerSuperAdmin(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'login' })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'get logged in user details' })
  async me(@Req() req: Request) {
    return this.authService.me(req.user!);
  }
}
