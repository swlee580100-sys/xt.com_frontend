# 身份证上传功能 - 完整实现总结

## 已完成的修改

### 后端修改

#### 1. 数据库修改
- **文件**: `backend/prisma/schema.prisma`
- **修改内容**: 在 User 模型添加了两个字段
  ```prisma
  idCardFront  String?  // 身份证正面照片 URL
  idCardBack   String?  // 身份证反面照片 URL
  ```
- **迁移文件**: `backend/migrations/add_id_card_fields.sql`

#### 2. 后端接口
- **上传接口**: `POST /api/auth/upload-id-card`
  - 需要登录认证（JWT Token）
  - 支持 multipart/form-data 格式
  - 参数：`file`（图片文件）和 `type`（front/back）
  - 文件限制：最大 5MB，支持 jpg/jpeg/png/gif

- **文件存储**: `./uploads/id-cards/`

#### 3. DTO 更新
- **UserEntity** (`backend/src/auth/entities/user.entity.ts`): 添加 `idCardFront` 和 `idCardBack` 字段
- **UserResponseDto** (`backend/src/users/dto/user-response.dto.ts`): 添加身份证字段到响应
- **UploadIdCardDto** (`backend/src/auth/dto/upload-id-card.dto.ts`): 新建上传验证 DTO

#### 4. Service 更新
- **AuthService** (`backend/src/auth/auth.service.ts`):
  - 添加 `uploadIdCard` 方法
  - 更新 `sanitizeUser` 方法包含身份证字段

#### 5. 静态文件服务
- **main.ts**: 配置 `/uploads` 路径的静态文件访问
- **helmet 配置**: 允许跨域加载图片

### 前端修改

#### 1. 类型定义更新
- **文件**: `frontend/src/types/user.ts`
- **修改**: User 接口添加身份证字段
  ```typescript
  idCardFront?: string;  // 身份证正面照片 URL
  idCardBack?: string;   // 身份证反面照片 URL
  ```

#### 2. 用户编辑弹窗更新
- **文件**: `frontend/src/components/users/edit-user-dialog.tsx`
- **修改内容**:
  - 弹窗宽度扩大到 700px
  - 添加滚动支持 (max-h-[90vh] overflow-y-auto)
  - 在表单底部添加身份证展示区域
  - 支持点击图片在新窗口查看大图
  - 只有当用户上传了身份证时才显示

## 功能特点

### 安全性
1. ✅ 所有上传接口需要 JWT 认证
2. ✅ 服务器验证文件类型和大小
3. ✅ 生成唯一的文件名防止覆盖
4. ✅ 配置了 CORS 和 helmet 安全策略

### 用户体验
1. ✅ 支持点击图片查看大图
2. ✅ 清晰的"未上传"状态提示
3. ✅ 响应式布局，左右并排显示正反面
4. ✅ hover 效果增强交互体验

### 管理功能
1. ✅ 管理员可以在用户详情弹窗中查看身份证
2. ✅ 用户列表接口自动返回身份证信息
3. ✅ 支持通过 `/api/admin/users` 批量查看用户身份证

## 使用指南

### 用户端上传身份证

使用提供的接口文档中的代码示例进行上传：

```javascript
const uploadIdCard = async (file, type) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type); // 'front' 或 'back'

  const response = await fetch('http://localhost:3000/api/auth/upload-id-card', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: formData,
  });

  return await response.json();
};
```

### 管理后台查看

1. 进入"用户管理"页面
2. 点击用户操作菜单中的"编辑"
3. 在弹出的编辑对话框底部会显示身份证信息（如果用户已上传）
4. 点击身份证图片可在新窗口查看大图

## 文件结构

```
backend/
├── migrations/
│   └── add_id_card_fields.sql           # 数据库迁移文件
├── prisma/
│   └── schema.prisma                    # 更新的数据库模型
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts           # 添加上传接口
│   │   ├── auth.service.ts              # 添加上传逻辑
│   │   ├── dto/
│   │   │   └── upload-id-card.dto.ts    # 上传验证 DTO
│   │   └── entities/
│   │       └── user.entity.ts           # 更新 User 接口
│   ├── users/
│   │   ├── users.service.ts             # 查询添加身份证字段
│   │   └── dto/
│   │       └── user-response.dto.ts     # 响应添加身份证字段
│   ├── common/
│   │   └── services/
│   │       └── file-upload.service.ts   # 文件上传服务（备用）
│   └── main.ts                          # 配置静态文件服务
└── uploads/
    └── id-cards/                        # 身份证存储目录

frontend/
├── src/
│   ├── types/
│   │   └── user.ts                      # 更新 User 类型
│   └── components/
│       └── users/
│           └── edit-user-dialog.tsx     # 添加身份证展示

docs/
└── id-card-upload-api.md                # API 文档
```

## 环境配置

### 开发环境
- API 地址: `http://localhost:3000`
- 图片访问: `http://localhost:3000/uploads/id-cards/{filename}`

### 生产环境
需要修改以下配置：
1. 前端代码中的 API 地址（建议使用环境变量）
2. CORS 配置限制允许的域名
3. 考虑使用云存储服务（如 AWS S3、阿里云 OSS）

## 测试清单

- [x] 后端数据库迁移执行成功
- [x] 后端 TypeScript 编译通过
- [x] 上传接口创建成功
- [x] 静态文件服务配置完成
- [x] 前端类型定义更新
- [x] 用户编辑弹窗显示身份证
- [ ] 实际测试文件上传
- [ ] 实际测试图片显示
- [ ] 测试大图查看功能
- [ ] 测试未上传状态显示

## 后续优化建议

1. **前端上传组件**: 为用户端创建身份证上传表单组件
2. **图片压缩**: 在前端上传前压缩图片，减少服务器负担
3. **云存储**: 集成云存储服务，提高可扩展性
4. **图片预览**: 在管理后台添加图片预览和放大功能
5. **批量操作**: 支持批量查看多个用户的身份证
6. **历史记录**: 保存身份证上传历史，支持版本控制
7. **OCR 识别**: 集成 OCR 技术自动识别身份证信息

## 常见问题

### Q: 如何测试上传功能？
**A**: 使用 cURL 或 Postman 进行测试：
```bash
curl -X POST http://localhost:3000/api/auth/upload-id-card \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "type=front"
```

### Q: 图片无法显示怎么办？
**A**: 检查：
1. uploads 目录是否存在且有权限
2. URL 是否正确拼接
3. 浏览器控制台是否有 CORS 错误

### Q: 如何更改文件大小限制？
**A**: 修改 `auth.controller.ts` 中的 `limits.fileSize` 值

### Q: 如何支持更多图片格式？
**A**: 修改 `fileFilter` 中的正则表达式：
```javascript
if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|bmp)$/))
```

## 技术栈

- **后端**: NestJS, Prisma, Multer, PostgreSQL
- **前端**: React, TypeScript, TanStack Query, Tailwind CSS
- **文件存储**: 本地文件系统（可扩展至云存储）

---

**版本**: 1.0.0
**最后更新**: 2025-01-15
**维护者**: 开发团队
