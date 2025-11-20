import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { adminService } from '@/services/admins';
import type { CreateAdminDto } from '@/types/admin';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateAdminDialog = ({ open, onOpenChange }: CreateAdminDialogProps) => {
  const { api } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: CreateAdminDto) => adminService.create(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      onOpenChange(false);
      setFormData({ username: '', password: '', displayName: '' });
      setErrors({});
      toast({
        title: '成功',
        description: '操作員已建立',
      });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || '建立操作員失敗';
      setErrors({ general: message });
      toast({
        title: '錯誤',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 驗證
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = '用戶名不能為空';
    }

    if (!formData.password.trim()) {
      newErrors.password = '密碼不能為空';
    } else if (formData.password.length < 6) {
      newErrors.password = '密碼長度至少為 6 個字符';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    createMutation.mutate({
      username: formData.username.trim(),
      password: formData.password,
      displayName: formData.displayName.trim() || undefined,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 清除該字段的錯誤
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新增操作員</DialogTitle>
            <DialogDescription>
              建立一個新的操作員帳號
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {errors.general && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {errors.general}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="username">用戶名 *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                className={errors.username ? 'border-red-500' : ''}
                placeholder="請輸入用戶名"
              />
              {errors.username && (
                <span className="text-sm text-red-600">{errors.username}</span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">密碼 *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className={errors.password ? 'border-red-500' : ''}
                placeholder="請輸入密碼（至少 6 個字符）"
              />
              {errors.password && (
                <span className="text-sm text-red-600">{errors.password}</span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="displayName">顯示名稱</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                placeholder="請輸入顯示名稱（選填）"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setFormData({ username: '', password: '', displayName: '' });
                setErrors({});
              }}
              disabled={createMutation.isPending}
            >
              取消
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? '建立中...' : '建立'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

