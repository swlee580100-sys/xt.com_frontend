import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 检查是否标记为公开接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    // 开发模式：跳过 JWT 验证
    // 生产环境务必设置 AUTH_SKIP_JWT_VERIFICATION=false
    const skipJwtVerification = this.configService.get<boolean>('auth.skipJwtVerification');
    if (skipJwtVerification) {
      return true;
    }

    // 正常的 JWT 验证流程
    return super.canActivate(context);
  }
}
