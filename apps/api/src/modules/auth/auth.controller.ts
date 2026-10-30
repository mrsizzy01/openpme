import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RegisterOrganizationDto } from './auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private sessionContext(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      terminalId: request.get('x-desktop-terminal-id')?.slice(0, 100),
      terminalToken: request.get('x-desktop-terminal-token'),
    };
  }

  private setRefreshCookie(response: Response, token: string) {
    response.cookie('smart_pme_refresh', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(response: Response) {
    response.clearCookie('smart_pme_refresh', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @ApiOperation({ summary: 'Connexion utilisateur et obtention du jeton JWT' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  @ApiResponse({ status: 429, description: 'Trop de tentatives de connexion' })
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const { refreshToken, ...result } = await this.authService.login(dto, this.sessionContext(request));
    this.setRefreshCookie(response, refreshToken);
    return result;
  }

  @Post('register-organization')
  @ApiOperation({ summary: 'Créer une nouvelle entreprise et son compte administrateur' })
  @ApiResponse({ status: 201, description: 'Entreprise créée' })
  async registerOrganization(
    @Body() dto: RegisterOrganizationDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken, ...result } = await this.authService.registerOrganization(dto, this.sessionContext(request));
    this.setRefreshCookie(response, refreshToken);
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renouveler la session avec un cookie HttpOnly à usage rotatif' })
  @ApiResponse({ status: 200, description: 'Session renouvelée' })
  @ApiResponse({ status: 401, description: 'Session expirée, révoquée ou invalide' })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const { refreshToken, ...result } = await this.authService.refreshSession(
      request.cookies?.smart_pme_refresh,
      this.sessionContext(request),
    );
    this.setRefreshCookie(response, refreshToken);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Révoquer la session courante' })
  @ApiResponse({ status: 200, description: 'Session révoquée' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(request.cookies?.smart_pme_refresh);
    this.clearRefreshCookie(response);
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir les informations du profil connecté et son entreprise' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}
