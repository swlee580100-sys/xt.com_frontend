/**
 * Edit Market Session Dialog
 * 編輯/建立大盤對話框
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { marketSessionService } from '@/services/market-sessions';
import type {
  MarketSession,
  CreateMarketSessionRequest,
  UpdateMarketSessionRequest,
  MarketResult
} from '@/types/market-session';

interface EditMarketSessionDialogProps {
  session: MarketSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  activeCount?: number; // 當前正在進行的盤數量
  onSessionStarted?: () => void; // 大盤啟用成功後的回調
}

export function EditMarketSessionDialog({
  session,
  open,
  onOpenChange,
  onSuccess,
  activeCount = 0,
  onSessionStarted
}: EditMarketSessionDialogProps) {
  const { api } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    initialResult: 'PENDING' as MarketResult
  });
  const [enableImmediately, setEnableImmediately] = useState(false);

  // 初始化表單數據
  useEffect(() => {
    if (session) {
      // 編輯模式
      setFormData({
        name: session.name,
        description: session.description || '',
        initialResult: session.initialResult
      });
      setEnableImmediately(false); // 編輯時不顯示立即啟用選項
    } else {
      // 建立模式 - 設定預設值
      setFormData({
        name: '',
        description: '',
        initialResult: 'PENDING'
      });
      setEnableImmediately(false); // 預設關閉
    }
    // 當對話框打開時，activeCount 會從父組件傳入，這裡不需要額外處理
  }, [session, open]);

  // 格式化日期時間為 datetime-local 輸入格式
  const formatDateTimeLocal = (isoString: string): string => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) return;

    // 驗證
    if (!formData.name.trim()) {
      toast({
        title: '錯誤',
        description: '請輸入大盤名稱',
        variant: 'destructive'
      });
      return;
    }

    // 如果建立時選擇立即啟用，且當前有 ACTIVE 的盤，則不允許建立
    if (!session && enableImmediately && activeCount > 0) {
      toast({
        title: '錯誤',
        description: '當前有正在進行的盤，無法立即啟用新盤',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (session) {
        // 更新
        const updateData: UpdateMarketSessionRequest = {
          name: formData.name,
          description: formData.description || undefined,
          initialResult: formData.initialResult
        };

        await marketSessionService.admin.updateSession(api, session.id, updateData);
        toast({
          title: '成功',
          description: '大盤已更新'
        });
      } else {
        // 建立
        // 後端需要時間欄位，但 UI 不再要求，預設使用現在時間 + 3 小時
        const start = new Date();
        const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
        const createData: CreateMarketSessionRequest = {
          name: formData.name,
          description: formData.description || undefined,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          initialResult: formData.initialResult
        };

        const createdSession = await marketSessionService.admin.createSession(api, createData);
        
        // 驗證創建的大盤 ID
        if (!createdSession || !createdSession.id) {
          console.error('❌ 創建大盤失敗：未返回有效的大盤 ID', createdSession);
          toast({
            title: '錯誤',
            description: '創建大盤失敗：未返回有效的大盤 ID',
            variant: 'destructive'
          });
          return;
        }
        
        // 如果選擇立即啟用，則調用 startSession
        if (enableImmediately) {
          try {
            console.log('🟢 開始啟用大盤:', createdSession.id, 'initialResult:', formData.initialResult);
            // 傳遞 initialResult 參數，與手動啟用時保持一致
            const startResult = await marketSessionService.admin.startSession(api, createdSession.id, {
              initialResult: formData.initialResult
            });
            console.log('✅ 大盤啟用成功:', startResult);
            toast({
              title: '成功',
              description: `大盤已建立並立即啟用，建立了 ${startResult.subMarketsCreated || 0} 個小盤`
            });
            // 調用回調函數，通知父組件刷新狀態
            if (onSessionStarted) {
              onSessionStarted();
            }
          } catch (startError: any) {
            console.error('❌ 啟用大盤失敗:', startError);
            console.error('錯誤詳情:', {
              message: startError.message,
              response: startError.response?.data,
              status: startError.response?.status,
              url: startError.config?.url,
              method: startError.config?.method
            });
            toast({
              title: '部分成功',
              description: '大盤已建立，但啟用失敗：' + (startError.response?.data?.message || startError.message || '未知錯誤'),
              variant: 'destructive'
            });
          }
        } else {
          toast({
            title: '成功',
            description: '大盤已建立'
          });
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error('Failed to save market session:', error);
      toast({
        title: '錯誤',
        description: error.response?.data?.message || '儲存失敗',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{session ? '編輯大盤' : '建立大盤'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* 大盤名稱 */}
            <div>
              <Label htmlFor="name">大盤名稱 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如：2025-01-14 早盤"
                required
              />
            </div>

            {/* 描述 */}
            <div>
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="大盤描述（選填）"
              />
            </div>

            {/* 是否立即啟用（僅建立模式顯示） */}
            {!session && (
              <div className="space-y-2">
                {activeCount > 0 && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-800 font-medium">
                      警告：當前有 {activeCount} 個正在進行的盤，無法立即啟用新盤
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableImmediately">是否立即啟用</Label>
                    <p className="text-sm text-muted-foreground">
                      建立後立即啟用此大盤
                    </p>
                  </div>
                  <Switch
                    id="enableImmediately"
                    checked={enableImmediately}
                    onCheckedChange={setEnableImmediately}
                    disabled={activeCount > 0}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '儲存中...' : session ? '更新' : '建立'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
