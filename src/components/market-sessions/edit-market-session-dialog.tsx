/**
 * Edit Market Session Dialog
 * 编辑/创建大盘对话框
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
    startTime: '',
    endTime: '',
    initialResult: 'PENDING' as MarketResult,
    actualResult: undefined as MarketResult | undefined,
    assetType: 'BTC/USDT'
  });

  // 初始化表单数据
  useEffect(() => {
    if (session) {
      // 编辑模式
      setFormData({
        name: session.name,
        description: session.description || '',
        startTime: formatDateTimeLocal(session.startTime),
        endTime: formatDateTimeLocal(session.endTime),
        initialResult: session.initialResult,
        actualResult: session.actualResult || undefined,
        assetType: session.assetType || 'BTC/USDT'
      });
    } else {
      // 创建模式 - 设置默认值
      const now = new Date();
      const start = new Date(now.getTime() + 60 * 60 * 1000); // 1小时后
      const end = new Date(start.getTime() + 3 * 60 * 60 * 1000); // 3小时时长

      setFormData({
        name: '',
        description: '',
        startTime: formatDateTimeLocal(start.toISOString()),
        endTime: formatDateTimeLocal(end.toISOString()),
        initialResult: 'PENDING',
        actualResult: undefined,
        assetType: 'BTC/USDT'
      });
    }
  }, [session, open]);

  // 格式化日期时间为 datetime-local 输入格式
  const formatDateTimeLocal = (isoString: string): string => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) return;

    // 验证
    if (!formData.name.trim()) {
      toast({
        title: '错误',
        description: '请输入大盘名称',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      toast({
        title: '错误',
        description: '请选择开盘和结束时间',
        variant: 'destructive'
      });
      return;
    }

    if (new Date(formData.endTime) <= new Date(formData.startTime)) {
      toast({
        title: '错误',
        description: '结束时间必须晚于开盘时间',
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
          startTime: new Date(formData.startTime).toISOString(),
          endTime: new Date(formData.endTime).toISOString(),
          initialResult: formData.initialResult,
          actualResult: formData.actualResult,
          assetType: formData.assetType
        };

        await marketSessionService.admin.updateSession(api, session.id, updateData);
        toast({
          title: '成功',
          description: '大盘已更新'
        });
      } else {
        // 创建
        const createData: CreateMarketSessionRequest = {
          name: formData.name,
          description: formData.description || undefined,
          startTime: new Date(formData.startTime).toISOString(),
          endTime: new Date(formData.endTime).toISOString(),
          initialResult: formData.initialResult,
          assetType: formData.assetType
        };

        await marketSessionService.admin.createSession(api, createData);
        toast({
          title: '成功',
          description: '大盘已创建'
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Failed to save market session:', error);
      toast({
        title: '错误',
        description: error.response?.data?.message || '保存失败',
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
          <DialogTitle>{session ? '编辑大盘' : '创建大盘'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* 大盘名称 */}
            <div>
              <Label htmlFor="name">大盘名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如：2025-01-14 早盘"
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
                placeholder="大盘描述（可选）"
              />
            </div>

            {/* 时间范围 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">开盘时间 *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endTime">结束时间 *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* 资产类型 */}
            <div>
              <Label htmlFor="assetType">资产类型</Label>
              <Select
                value={formData.assetType}
                onValueChange={value => setFormData(prev => ({ ...prev, assetType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                  <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                  <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 初始结果 */}
            <div>
              <Label htmlFor="initialResult">初始结果</Label>
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
                  <SelectItem value="WIN">赢</SelectItem>
                  <SelectItem value="LOSE">输</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 实际结果（仅编辑时显示） */}
            {session && (
              <div>
                <Label htmlFor="actualResult">实际结果</Label>
                <Select
                  value={formData.actualResult || 'PENDING'}
                  onValueChange={value =>
                    setFormData(prev => ({ ...prev, actualResult: value as MarketResult }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">待定</SelectItem>
                    <SelectItem value="WIN">赢</SelectItem>
                    <SelectItem value="LOSE">输</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : session ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
