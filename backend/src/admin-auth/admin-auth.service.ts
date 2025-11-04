import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: AdminLoginDto, ip?: string) {
    const { username, password } = loginDto;

    // 查找管理员
    const admin = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('账户已被停用');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 生成 JWT tokens
    const payload = {
      sub: admin.id,
      username: admin.username,
      email: admin.email,
      type: 'admin', // 标记为管理员
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('auth.jwt.accessTokenSecret'),
      expiresIn: this.configService.get<string>('auth.jwt.accessTokenTtl'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('auth.jwt.refreshTokenSecret'),
      expiresIn: this.configService.get<string>('auth.jwt.refreshTokenTtl'),
    });

    // 保存 refresh token hash 和登录信息
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        refreshTokenHash,
        lastLoginAt: new Date(),
        lastLoginIp: ip || null, // 记录管理员登录 IP
      },
    });

    // 返回数据（不包含敏感信息）
    const { passwordHash, refreshTokenHash: _, ...adminData } = admin;

    return {
      admin: adminData,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async logout(adminId: string) {
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { refreshTokenHash: null },
    });

    return { message: '登出成功' };
  }

  async validateAdmin(adminId: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        permissions: true,
        isActive: true,
      },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('无效的管理员账户');
    }

    return admin;
  }
}
