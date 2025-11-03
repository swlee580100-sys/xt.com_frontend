# 公共 CMS 接口说明

以下接口用于客户端公开读取 CMS 中配置的内容，均无需鉴权，可直接访问。

基础路径：`https://<host>/api`

## 1. 用户见证

- **GET** `/public/cms/testimonials`
  - 功能：获取所有用户见证，按创建时间倒序排列。
  - 响应示例：
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "name": "用户名称",
          "title": "称号",
          "rating": 5,
          "content": "评论内容",
          "createdAt": "2024-06-20T10:00:00.000Z",
          "updatedAt": "2024-06-21T09:30:00.000Z"
        }
      ]
    }
    ```

## 2. 公共轮播

- **GET** `/public/cms/carousels`
  - 功能：获取轮播内容，按 `sortOrder` 升序排列。
  - 响应示例：
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "sortOrder": 1,
          "content": "轮播文案内容",
          "createdAt": "2024-06-20T10:00:00.000Z",
          "updatedAt": "2024-06-21T09:30:00.000Z"
        }
      ]
    }
    ```

## 3. 排行榜

- **GET** `/public/cms/leaderboard`
  - 查询参数：
    - `type`（可选，枚举值：`DAILY`、`WEEKLY`、`MONTHLY`），按榜单类型筛选。
  - 功能：获取排行榜数据，默认按类型升序、成交笔数降序排序。
  - 响应示例：
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "type": "DAILY",
          "avatar": "https://example.com/avatar.png",
          "country": "中国",
          "name": "陈睿",
          "tradeCount": 48,
          "winRate": 78.5,
          "volume": 152345.67,
          "createdAt": "2024-06-20T10:00:00.000Z",
          "updatedAt": "2024-06-21T09:30:00.000Z"
        }
      ]
    }
    ```

## 4. 交易时长与赢利率

- **GET** `/public/cms/trading-performance`
  - 功能：获取不同交易时长（分钟）对应的赢利率配置，按交易时长升序排列。
  - 响应示例：
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "tradeDuration": 15,
          "winRate": 68.2,
          "createdAt": "2024-06-20T10:00:00.000Z",
          "updatedAt": "2024-06-21T09:30:00.000Z"
        }
      ]
    }
    ```

> 全部接口均由全局 `TransformInterceptor` 自动封装成 `{ "data": ... }` 格式。
