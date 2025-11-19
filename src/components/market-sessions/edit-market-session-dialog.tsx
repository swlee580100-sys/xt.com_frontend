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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
}

export function EditMarketSessionDialog({
  session,
  open,
  onOpenChange,
  onSuccess
}: EditMarketSessionDialogProps) {
  const { api } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    initialResult: 'PENDING' as MarketResult,
    actualResult: undefined as MarketResult | undefined
  });

  // 初始化表單數據
  useEffect(() => {
    if (session) {
      // 編輯模式
      setFormData({
        name: session.name,
        description: session.description || '',
        initialResult: session.initialResult,
        actualResult: session.actualResult || undefined
      });
    } else {
      // 建立模式 - 設定預設值
      setFormData({
        name: '',
        description: '',
        initialResult: 'PENDING',
        actualResult: undefined
      });
    }
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

    try {
      setIsSubmitting(true);

      if (session) {
        // 更新
        const updateData: UpdateMarketSessionRequest = {
          name: formData.name,
          description: formData.description || undefined,
          initialResult: formData.initialResult,
          // 編輯時不再提供「實際結果」欄位，後端不需更新此欄
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

        await marketSessionService.admin.createSession(api, createData);
        toast({
          title: '成功',
          description: '大盤已建立'
        });
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

            {/* 時間範圍：已移除（由後台啟停控制） */}

            {/* 資產類型：已移除（建立大盤不需要資產類型） */}

            {/* 初始結果 */}
            <div>
              <Label htmlFor="initialResult">預設輸贏結果</Label>
              <Select
                value={formData.initialResult}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, initialResult: value as MarketResult }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">待定</SelectItem>
                  <SelectItem value="WIN">贏</SelectItem>
                  <SelectItem value="LOSE">輸</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 實際結果：已移除（編輯大盤不需要此篩選器） */}
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
