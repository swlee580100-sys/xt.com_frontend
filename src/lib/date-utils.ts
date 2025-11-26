/**
 * 時間工具函數
 * 將後端返回的 UTC 時間轉換為台灣時間（UTC+8）顯示
 */

/**
 * 將 UTC 時間字符串轉換為台灣時間的 Date 對象
 * @param dateString UTC 時間字符串（ISO 8601 格式，如 "2025-11-24T14:33:25.883Z"）
 * @returns Date 對象（已轉換為台灣時間）
 */
export function toTaiwanTime(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  // Date 對象在顯示時會自動使用本地時區，所以不需要手動轉換
  // 但為了確保一致性，我們返回一個新的 Date 對象
  return date;
}

/**
 * 格式化為台灣時間的完整日期時間字符串
 * @param dateString UTC 時間字符串
 * @param options 格式化選項
 * @returns 格式化後的字符串，如 "2025/11/24 下午10:33:25"
 */
export function formatTaiwanDateTime(
  dateString: string | null | undefined,
  options?: {
    year?: 'numeric' | '2-digit';
    month?: 'numeric' | '2-digit';
    day?: 'numeric' | '2-digit';
    hour?: 'numeric' | '2-digit';
    minute?: 'numeric' | '2-digit';
    second?: 'numeric' | '2-digit';
    hour12?: boolean;
  }
): string {
  if (!dateString) return '-';
  const date = toTaiwanTime(dateString);
  if (!date) return '-';
  
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Taipei',
    ...options,
  });
}

/**
 * 格式化為台灣時間的日期字符串
 * @param dateString UTC 時間字符串
 * @returns 格式化後的日期字符串，如 "2025/11/24"
 */
export function formatTaiwanDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = toTaiwanTime(dateString);
  if (!date) return '-';
  
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Taipei',
  });
}

/**
 * 格式化為台灣時間的時間字符串
 * @param dateString UTC 時間字符串
 * @param options 格式化選項
 * @returns 格式化後的時間字符串，如 "下午10:33:25"
 */
export function formatTaiwanTime(
  dateString: string | null | undefined,
  options?: {
    hour?: 'numeric' | '2-digit';
    minute?: 'numeric' | '2-digit';
    second?: 'numeric' | '2-digit';
    hour12?: boolean;
  }
): string {
  if (!dateString) return '-';
  const date = toTaiwanTime(dateString);
  if (!date) return '-';
  
  return date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Taipei',
    ...options,
  });
}

/**
 * 格式化為台灣時間的簡短日期時間字符串（不含秒）
 * @param dateString UTC 時間字符串
 * @returns 格式化後的字符串，如 "2025/11/24 下午10:33"
 */
export function formatTaiwanDateTimeShort(dateString: string | null | undefined): string {
  return formatTaiwanDateTime(dateString, {
    second: undefined,
  });
}


