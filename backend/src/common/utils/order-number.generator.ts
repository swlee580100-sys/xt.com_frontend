/**
 * 生成唯一的交易订单号
 * 格式: TXN + 时间戳 + 随机数
 * 例如: TXN20251022073012345678ABC
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(); // 毫秒时间戳
  const random = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6位随机字符
  return `TXN${timestamp}${random}`;
}

/**
 * 验证订单号格式
 */
export function isValidOrderNumber(orderNumber: string): boolean {
  return /^TXN\d{13}[A-Z0-9]{6}$/.test(orderNumber);
}
