# 身份证上传接口文档

## 接口概述

用户可以通过此接口上传身份证正面和反面照片。上传的照片将保存在服务器，并在管理后台的用户详情中展示。

---

## 1. 上传身份证

### 接口信息

- **URL**: `/api/auth/upload-id-card`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **认证**: 需要用户登录（JWT Token）

### 请求头

```http
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | File | 是 | 身份证图片文件 |
| type | string | 是 | 身份证类型：`front`（正面）或 `back`（反面） |

### 文件限制

- **文件大小**: 最大 5MB
- **文件格式**: jpg, jpeg, png, gif
- **建议尺寸**: 建议不超过 2000x2000 像素

### 请求示例

#### JavaScript (Fetch API)

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

// 使用示例
const file = document.querySelector('input[type="file"]').files[0];
const result = await uploadIdCard(file, 'front');
console.log(result);
```

#### JavaScript (Axios)

```javascript
import axios from 'axios';

const uploadIdCard = async (file, type) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  const response = await axios.post(
    'http://localhost:3000/api/auth/upload-id-card',
    formData,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};
```

#### cURL

```bash
# 上传正面
curl -X POST http://localhost:3000/api/auth/upload-id-card \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/id-card-front.jpg" \
  -F "type=front"

# 上传反面
curl -X POST http://localhost:3000/api/auth/upload-id-card \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/id-card-back.jpg" \
  -F "type=back"
```

### 响应示例

#### 成功响应 (200 OK)

```json
{
  "success": true,
  "data": {
    "message": "ID card uploaded successfully",
    "user": {
      "id": "854135be-c8d9-4dc4-b18a-39ddbde4e8fd",
      "email": "user@example.com",
      "displayName": "测试用户",
      "phoneNumber": "13800138000",
      "avatar": null,
      "idCardFront": "/uploads/id-cards/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
      "idCardBack": "/uploads/id-cards/b2c3d4e5-f6a7-8901-bcde-f12345678901.jpg",
      "roles": ["trader"],
      "isActive": true,
      "verificationStatus": "PENDING",
      "lastLoginAt": "2025-01-15T10:30:00.000Z",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-15T10:35:00.000Z",
      "demoBalance": 10000,
      "realBalance": 0,
      "totalProfitLoss": 0,
      "totalTrades": 0,
      "winRate": 0
    },
    "fileUrl": "/uploads/id-cards/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg"
  }
}
```

#### 错误响应

##### 1. 未提供文件 (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "No file uploaded",
    "error": "Bad Request"
  }
}
```

##### 2. 文件格式错误 (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Only image files are allowed!",
    "error": "Bad Request"
  }
}
```

##### 3. 文件过大 (413 Payload Too Large)

```json
{
  "success": false,
  "error": {
    "statusCode": 413,
    "message": "File too large",
    "error": "Payload Too Large"
  }
}
```

##### 4. 未授权 (401 Unauthorized)

```json
{
  "success": false,
  "error": {
    "statusCode": 401,
    "message": "Unauthorized",
    "error": "Unauthorized"
  }
}
```

##### 5. type 参数错误 (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": [
      "type must be one of the following values: front, back"
    ],
    "error": "Bad Request"
  }
}
```

---

## 2. 获取用户信息（包含身份证）

上传后，可以通过以下接口获取用户信息，其中包含身份证 URL。

### 接口信息

- **URL**: `/api/auth/me`
- **Method**: `GET`
- **认证**: 需要用户登录（JWT Token）

### 请求示例

```javascript
const getUserInfo = async () => {
  const response = await fetch('http://localhost:3000/api/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  return await response.json();
};
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "854135be-c8d9-4dc4-b18a-39ddbde4e8fd",
    "email": "user@example.com",
    "displayName": "测试用户",
    "phoneNumber": "13800138000",
    "avatar": null,
    "idCardFront": "/uploads/id-cards/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
    "idCardBack": "/uploads/id-cards/b2c3d4e5-f6a7-8901-bcde-f12345678901.jpg",
    "roles": ["trader"],
    "isActive": true,
    "verificationStatus": "PENDING",
    "lastLoginAt": "2025-01-15T10:30:00.000Z",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-15T10:35:00.000Z",
    "demoBalance": 10000,
    "realBalance": 0,
    "totalProfitLoss": 0,
    "totalTrades": 0,
    "winRate": 0
  }
}
```

---

## 3. 管理后台获取用户列表（包含身份证）

管理员可以通过此接口获取用户列表，包含身份证信息。

### 接口信息

- **URL**: `/api/admin/users`
- **Method**: `GET`
- **认证**: 需要管理员登录（JWT Token）

### 响应示例

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "854135be-c8d9-4dc4-b18a-39ddbde4e8fd",
        "email": "user@example.com",
        "displayName": "测试用户",
        "phoneNumber": "13800138000",
        "avatar": null,
        "idCardFront": "/uploads/id-cards/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        "idCardBack": "/uploads/id-cards/b2c3d4e5-f6a7-8901-bcde-f12345678901.jpg",
        "roles": ["trader"],
        "isActive": true,
        "verificationStatus": "PENDING",
        "lastLoginAt": "2025-01-15T10:30:00.000Z",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-15T10:35:00.000Z",
        "demoBalance": 10000,
        "realBalance": 0,
        "totalProfitLoss": 0,
        "totalTrades": 0,
        "winRate": 0
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

---

## 4. 访问身份证图片

### 图片 URL 格式

身份证图片 URL 格式为：`/uploads/id-cards/{filename}`

完整访问地址：`http://localhost:3000/uploads/id-cards/{filename}`

### 访问示例

```html
<!-- HTML -->
<img src="http://localhost:3000/uploads/id-cards/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg" alt="身份证正面">
<img src="http://localhost:3000/uploads/id-cards/b2c3d4e5-f6a7-8901-bcde-f12345678901.jpg" alt="身份证反面">
```

```javascript
// JavaScript
const getImageUrl = (path) => {
  if (!path) return null;
  return `http://localhost:3000${path}`;
};

// 使用
const frontUrl = getImageUrl(user.idCardFront);
const backUrl = getImageUrl(user.idCardBack);
```

### 注意事项

1. 图片 URL 不需要认证，可以直接访问
2. 生产环境请将 `http://localhost:3000` 替换为实际域名
3. 建议在前端配置环境变量管理 API 基础 URL

---

## 5. 前端实现示例

### React 完整示例

```typescript
import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

interface UploadIdCardProps {
  onUploadSuccess?: () => void;
}

export const UploadIdCard: React.FC<UploadIdCardProps> = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'front' | 'back'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
      alert('只能上传 JPG、PNG 或 GIF 格式的图片');
      return;
    }

    // 验证文件大小
    if (file.size > 5 * 1024 * 1024) {
      alert('文件大小不能超过 5MB');
      return;
    }

    // 预览
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'front') {
        setFrontPreview(e.target?.result as string);
      } else {
        setBackPreview(e.target?.result as string);
      }
    };
    reader.readAsDataURL(file);

    // 上传
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/upload-id-card`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      alert(`身份证${type === 'front' ? '正面' : '反面'}上传成功`);
      onUploadSuccess?.();
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 身份证正面 */}
      <div>
        <label className="block text-sm font-medium mb-2">
          身份证正面
        </label>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif"
          onChange={(e) => handleFileChange(e, 'front')}
          disabled={uploading}
          className="block w-full text-sm"
        />
        {frontPreview && (
          <img
            src={frontPreview}
            alt="身份证正面预览"
            className="mt-2 w-full h-40 object-contain border rounded"
          />
        )}
      </div>

      {/* 身份证反面 */}
      <div>
        <label className="block text-sm font-medium mb-2">
          身份证反面
        </label>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif"
          onChange={(e) => handleFileChange(e, 'back')}
          disabled={uploading}
          className="block w-full text-sm"
        />
        {backPreview && (
          <img
            src={backPreview}
            alt="身份证反面预览"
            className="mt-2 w-full h-40 object-contain border rounded"
          />
        )}
      </div>
    </div>
  );
};
```

### 管理后台用户详情显示

```typescript
import React from 'react';

interface User {
  id: string;
  email: string;
  displayName: string;
  idCardFront?: string;
  idCardBack?: string;
  // ... 其他字段
}

interface UserDetailProps {
  user: User;
}

const API_BASE_URL = 'http://localhost:3000';

export const UserDetail: React.FC<UserDetailProps> = ({ user }) => {
  const getImageUrl = (path?: string) => {
    if (!path) return null;
    return `${API_BASE_URL}${path}`;
  };

  const openImage = (path?: string) => {
    if (!path) return;
    window.open(getImageUrl(path), '_blank');
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">用户信息</h3>

      {/* 基本信息 */}
      <div className="mb-4">
        <p><strong>姓名:</strong> {user.displayName}</p>
        <p><strong>邮箱:</strong> {user.email}</p>
      </div>

      {/* 身份证信息 */}
      <div className="mt-6">
        <h4 className="font-medium text-sm mb-3">身份证信息</h4>
        <div className="grid grid-cols-2 gap-4">
          {/* 正面 */}
          <div>
            <p className="text-sm text-gray-500 mb-2">身份证正面</p>
            {user.idCardFront ? (
              <img
                src={getImageUrl(user.idCardFront) || ''}
                alt="身份证正面"
                className="w-full h-48 object-contain border rounded cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => openImage(user.idCardFront)}
              />
            ) : (
              <div className="w-full h-48 flex items-center justify-center border rounded bg-gray-50">
                <span className="text-gray-400">未上传</span>
              </div>
            )}
          </div>

          {/* 反面 */}
          <div>
            <p className="text-sm text-gray-500 mb-2">身份证反面</p>
            {user.idCardBack ? (
              <img
                src={getImageUrl(user.idCardBack) || ''}
                alt="身份证反面"
                className="w-full h-48 object-contain border rounded cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => openImage(user.idCardBack)}
              />
            ) : (
              <div className="w-full h-48 flex items-center justify-center border rounded bg-gray-50">
                <span className="text-gray-400">未上传</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 6. 注意事项

### 安全性

1. **认证**: 所有上传接口都需要 JWT Token 认证
2. **文件验证**: 服务器会验证文件类型和大小
3. **唯一文件名**: 服务器会生成唯一的文件名，防止文件覆盖
4. **CORS配置**: 已配置跨域支持，允许前端访问

### 最佳实践

1. **文件压缩**: 建议在上传前压缩图片，提高上传速度
2. **预览功能**: 上传前显示预览，让用户确认图片
3. **错误处理**: 完善的错误提示，提升用户体验
4. **加载状态**: 显示上传进度，避免重复提交
5. **环境变量**: 使用环境变量管理 API 地址，方便部署

### 生产环境配置

```javascript
// config.ts
export const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:3000',
  },
  production: {
    baseURL: 'https://api.yourdomain.com',
  },
};

export const getApiBaseUrl = () => {
  const env = process.env.NODE_ENV || 'development';
  return API_CONFIG[env].baseURL;
};
```

---

## 7. 测试清单

- [ ] 正常上传身份证正面
- [ ] 正常上传身份证反面
- [ ] 上传非图片文件（应被拒绝）
- [ ] 上传超过 5MB 的文件（应被拒绝）
- [ ] 未登录上传（应返回 401）
- [ ] 上传后查看用户信息（应包含身份证 URL）
- [ ] 管理后台查看用户详情（应显示身份证图片）
- [ ] 直接访问图片 URL（应能正常显示）
- [ ] 点击图片查看大图（应能打开新窗口）
- [ ] 重复上传同一类型身份证（应覆盖旧的）

---

## 8. 常见问题

### Q1: 上传后图片无法显示？

**A**: 检查以下几点：
1. 确认 `/uploads` 目录已创建
2. 确认 URL 拼接正确（包含 API 基础地址）
3. 检查浏览器控制台是否有 CORS 错误
4. 确认服务器已正确配置静态文件服务

### Q2: 如何更换已上传的身份证？

**A**: 直接调用相同的接口，上传新的文件即可。新文件会覆盖旧文件的 URL。

### Q3: 如何删除已上传的身份证？

**A**: 目前接口不支持删除。如需删除功能，需要额外开发删除接口。

### Q4: 上传的文件保存在哪里？

**A**: 文件保存在服务器的 `uploads/id-cards/` 目录下。

### Q5: 生产环境需要注意什么？

**A**:
1. 修改 CORS 配置，限制允许的域名
2. 配置 HTTPS
3. 考虑使用云存储服务（如 AWS S3、阿里云 OSS）
4. 设置文件备份策略
5. 监控存储空间使用情况

---

## 联系支持

如有问题，请联系技术支持团队。
