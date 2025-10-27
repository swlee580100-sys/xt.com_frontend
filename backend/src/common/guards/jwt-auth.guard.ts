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

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
      // 在开发模式下，如果没有提供 token，注入一个默认用户
      const request = context.switchToHttp().getRequest();

      // 尝试从 header、query、body 中获取 userId
      const authHeader = request.headers.authorization;
      const queryUserId = request.query.userId;
      const bodyUserId = request.body?.userId;

      // 如果有 Authorization header，尝试正常解析
      if (authHeader) {
        try {
          const result = await super.canActivate(context);
          if (result) {
            return true;
          }
        } catch (error) {
          // JWT 解析失败，继续使用默认用户
        }
      }

      // 使用提供的 userId 或默认的测试用户
      const defaultUserId = queryUserId || bodyUserId || '854135be-c8d9-4dc4-b18a-39ddbde4e8fd'; // test@example.com 的 ID

      // 注入用户信息到 request
      request.user = {
        id: defaultUserId,
        email: 'test@example.com',
        roles: ['trader']
      };

      return true;
    }

    // 正常的 JWT 验证流程
    return super.canActivate(context) as Promise<boolean>;
  }
}
