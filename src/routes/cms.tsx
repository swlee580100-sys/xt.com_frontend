import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Trash2 } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { cmsService } from '@/services/cms';
import { settingsService } from '@/services/settings';
import type {
  Testimonial,
  TestimonialPayload,
  CarouselItem,
  CarouselPayload,
  LeaderboardEntry,
  LeaderboardPayload,
  LeaderboardType,
  TradingPerformanceEntry,
  TradingPerformancePayload,
} from '@/types/cms';
import type {
  ShareConfig,
  UpdateShareConfigDto,
  DepositAddressConfig,
  UpdateDepositAddressConfigDto
} from '@/types/settings';

const tabs = [
  {
    value: 'testimonials',
    label: '用戶見證管理',
    description: '管理展示在登入前首頁上的用戶見證內容'
  },
  {
    value: 'carousel',
    label: '公告輪播管理',
    description: '配置登入後首頁公告輪播文字'
  },
  {
    value: 'leaderboard',
    label: '排行榜管理',
    description: '維護排行榜展示的數據來源與排版'
  },
  {
    value: 'share-copy',
    label: '分享平台文案設置',
    description: '管理分享按鈕對應的預設與自定義文案'
  },
  {
    value: 'deposit-address',
    label: '入金地址設置',
    description: '設定平台使用者入金時顯示的預設地址'
  }
] as const;

const DEFAULT_SHARE_CONFIG: ShareConfig = {
  title: '加入我們一起交易',
  description: '體驗最專業的數字貨幣交易平台',
  image: '',
  url: 'http://localhost:5180',
  hashtags: ['crypto', 'trading'],
  content: '🎉 邀請好友一起交易\n\n立即註冊可獲得 10000 USDT 體驗金\n開啟你的交易之旅！'
};

const DEFAULT_DEPOSIT_ADDRESS_CONFIG: DepositAddressConfig = {
  address: 'TPMsabGrWUtwhyaKrTeXTrHq4nHSSEuaww',
  qrCodeUrl: ''
};

const placeholder = (
  <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
    模块待开发，后续补充列表与操作。
  </div>
);

const leaderboardTypeOptions: Array<{ label: string; value: LeaderboardType }> = [
  { label: '日榜', value: 'DAILY' },
  { label: '周榜', value: 'WEEKLY' },
  { label: '月榜', value: 'MONTHLY' }
];

const leaderboardTypeLabel: Record<LeaderboardType, string> = {
  DAILY: '日榜',
  WEEKLY: '周榜',
  MONTHLY: '月榜'
};

// 格式化日期時間為兩行顯示
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const dateStr = date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const timeStr = date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  return `${dateStr}\n${timeStr}`;
};

type TestimonialFormState = {
  name: string;
  title: string;
  rating: string;
  content: string;
};

const initialTestimonialFormState: TestimonialFormState = {
  name: '',
  title: '',
  rating: '5',
  content: ''
};

type CarouselFormState = {
  sortOrder: string;
  content: string;
};

const initialCarouselFormState: CarouselFormState = {
  sortOrder: '0',
  content: ''
};

type LeaderboardFormState = {
  type: LeaderboardType;
  avatar: string;
  country: string;
  name: string;
  tradeCount: string;
  winRate: string;
  volume: string;
};

const initialLeaderboardFormState: LeaderboardFormState = {
  type: 'DAILY',
  avatar: '',
  country: '',
  name: '',
  tradeCount: '0',
  winRate: '0',
  volume: '0'
};

export const CmsPage = () => {
  const { api } = useAuth();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [formData, setFormData] = useState<TestimonialFormState>(() => ({
    ...initialTestimonialFormState
  }));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [carouselDialogOpen, setCarouselDialogOpen] = useState(false);
  const [editingCarousel, setEditingCarousel] = useState<CarouselItem | null>(null);
  const [carouselFormData, setCarouselFormData] = useState<CarouselFormState>(() => ({
    ...initialCarouselFormState
  }));
  const [carouselFormErrors, setCarouselFormErrors] = useState<Record<string, string>>({});

  const [leaderboardDialogOpen, setLeaderboardDialogOpen] = useState(false);
  const [editingLeaderboard, setEditingLeaderboard] = useState<LeaderboardEntry | null>(null);
  const [leaderboardFormData, setLeaderboardFormData] = useState<LeaderboardFormState>(() => ({
    ...initialLeaderboardFormState
  }));
  const [leaderboardFormErrors, setLeaderboardFormErrors] = useState<Record<string, string>>({});

  const [leaderboardFilter, setLeaderboardFilter] = useState<LeaderboardType | 'all'>('all');
  const [shareConfig, setShareConfig] = useState<ShareConfig>(DEFAULT_SHARE_CONFIG);
  const [shareConfigError, setShareConfigError] = useState<string | null>(null);
  const [shareConfigSuccess, setShareConfigSuccess] = useState<string | null>(null);
  const [depositAddressConfig, setDepositAddressConfig] = useState<DepositAddressConfig>(DEFAULT_DEPOSIT_ADDRESS_CONFIG);
  const [depositAddressError, setDepositAddressError] = useState<string | null>(null);
  const [depositAddressSuccess, setDepositAddressSuccess] = useState<string | null>(null);

  const {
    data: testimonials = [],
    isLoading: testimonialsLoading
  } = useQuery({
    queryKey: ['cms', 'testimonials'],
    queryFn: () => cmsService.listTestimonials(api)
  });

  const {
    data: carousels = [],
    isLoading: carouselsLoading
  } = useQuery({
    queryKey: ['cms', 'carousels'],
    queryFn: () => cmsService.listCarousels(api)
  });

  const {
    data: leaderboard = [],
    isLoading: leaderboardLoading
  } = useQuery({
    queryKey: ['cms', 'leaderboard'],
    queryFn: () => cmsService.listLeaderboard(api)
  });

  const {
    data: shareConfigData,
    isLoading: shareConfigLoading,
    error: shareConfigQueryError
  } = useQuery({
    queryKey: ['settings', 'share-config'],
    queryFn: () => settingsService.getShareConfig(api)
  });

  const {
    data: depositAddressData,
    isLoading: depositAddressLoading,
    error: depositAddressQueryError
  } = useQuery({
    queryKey: ['settings', 'deposit-address'],
    queryFn: () => settingsService.getDepositAddressConfig(api)
  });

  useEffect(() => {
    console.log('分享配置数据更新:', { shareConfigData, shareConfigLoading });
    if (shareConfigData) {
      // 确保所有字段都有默认值
      const config = {
        title: shareConfigData.title || '',
        description: shareConfigData.description || '',
        image: shareConfigData.image || '',
        url: shareConfigData.url || '',
        hashtags: shareConfigData.hashtags || [],
        content: shareConfigData.content || ''
      };
      console.log('设置分享配置为:', config);
      setShareConfig(config);
      setShareConfigError(null);
    } else if (!shareConfigLoading && !shareConfigData) {
      console.log('使用默认分享配置');
      setShareConfig(DEFAULT_SHARE_CONFIG);
    }
  }, [shareConfigData, shareConfigLoading]);

  useEffect(() => {
    if (shareConfigQueryError) {
      const message =
        shareConfigQueryError instanceof Error
          ? shareConfigQueryError.message
          : '分享配置載入失敗，請稍後再試';
      setShareConfigError(message);
    } else {
      setShareConfigError(null);
    }
  }, [shareConfigQueryError]);

  useEffect(() => {
    if (!shareConfigSuccess) return;
    const timer = window.setTimeout(() => setShareConfigSuccess(null), 3000);
    return () => window.clearTimeout(timer);
  }, [shareConfigSuccess]);

  useEffect(() => {
    console.log('入金地址数据更新:', { depositAddressData, depositAddressLoading });
    if (depositAddressData) {
      const config = {
        address: depositAddressData.address || '',
        qrCodeUrl: depositAddressData.qrCodeUrl || ''
      };
      console.log('设置入金地址配置为:', config);
      setDepositAddressConfig(config);
      setDepositAddressError(null);
    } else if (!depositAddressLoading && !depositAddressData) {
      console.log('使用默认入金地址配置');
      setDepositAddressConfig(DEFAULT_DEPOSIT_ADDRESS_CONFIG);
    }
  }, [depositAddressData, depositAddressLoading]);

  useEffect(() => {
    if (depositAddressQueryError) {
      const message =
        depositAddressQueryError instanceof Error
          ? depositAddressQueryError.message
          : '入金地址載入失敗，請稍後再試';
      setDepositAddressError(message);
    } else {
      setDepositAddressError(null);
    }
  }, [depositAddressQueryError]);

  useEffect(() => {
    if (!depositAddressSuccess) return;
    const timer = window.setTimeout(() => setDepositAddressSuccess(null), 3000);
    return () => window.clearTimeout(timer);
  }, [depositAddressSuccess]);

  const createMutation = useMutation({
    mutationFn: (payload: TestimonialPayload) => cmsService.createTestimonial(api, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'testimonials'] });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '新增失敗，請稍后再试';
      setFormErrors({ general: message });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TestimonialPayload }) =>
      cmsService.updateTestimonial(api, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'testimonials'] });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '更新失敗，請稍后再试';
      setFormErrors({ general: message });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cmsService.deleteTestimonial(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'testimonials'] });
    }
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const createCarouselMutation = useMutation({
    mutationFn: (payload: CarouselPayload) => cmsService.createCarousel(api, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'carousels'] });
      setCarouselDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '新增失敗，請稍后再试';
      setCarouselFormErrors({ general: message });
    }
  });

  const updateCarouselMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CarouselPayload }) =>
      cmsService.updateCarousel(api, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'carousels'] });
      setCarouselDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '更新失敗，請稍后再试';
      setCarouselFormErrors({ general: message });
    }
  });

  const deleteCarouselMutation = useMutation({
    mutationFn: (id: string) => cmsService.deleteCarousel(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'carousels'] });
    }
  });

  const isCarouselSubmitting =
    createCarouselMutation.isPending || updateCarouselMutation.isPending;

  const createLeaderboardMutation = useMutation({
    mutationFn: (payload: LeaderboardPayload) => cmsService.createLeaderboard(api, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'leaderboard'] });
      setLeaderboardDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '新增失敗，請稍后再试';
      setLeaderboardFormErrors({ general: message });
    }
  });

  const updateLeaderboardMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LeaderboardPayload }) =>
      cmsService.updateLeaderboard(api, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'leaderboard'] });
      setLeaderboardDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '更新失敗，請稍后再试';
      setLeaderboardFormErrors({ general: message });
    }
  });

  const deleteLeaderboardMutation = useMutation({
    mutationFn: (id: string) => cmsService.deleteLeaderboard(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'leaderboard'] });
    }
  });

  const isLeaderboardSubmitting =
    createLeaderboardMutation.isPending || updateLeaderboardMutation.isPending;

  const updateShareConfigMutation = useMutation({
    mutationFn: (payload: UpdateShareConfigDto) => settingsService.updateShareConfig(api, payload),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'share-config'] });
      setShareConfigError(null);
      setShareConfigSuccess('分享配置已更新');
      // 确保所有字段都有默认值
      setShareConfig({
        title: data.title || '',
        description: data.description || '',
        image: data.image || '',
        url: data.url || '',
        hashtags: data.hashtags || [],
        content: data.content || ''
      });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || '更新失敗，請稍後再試';
      setShareConfigSuccess(null);
      setShareConfigError(message);
    }
  });

  const updateDepositAddressMutation = useMutation({
    mutationFn: (payload: UpdateDepositAddressConfigDto) => settingsService.updateDepositAddressConfig(api, payload),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'deposit-address'] });
      setDepositAddressError(null);
      setDepositAddressSuccess('入金地址已更新');
      setDepositAddressConfig({
        address: data.address || '',
        qrCodeUrl: data.qrCodeUrl || ''
      });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || '更新失敗，請稍後再試';
      setDepositAddressSuccess(null);
      setDepositAddressError(message);
    }
  });

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditing(null);
      setFormErrors({});
      setFormData(() => ({ ...initialTestimonialFormState }));
    }
  };

  const handleCreate = () => {
    setEditing(null);
    setFormErrors({});
    setFormData(() => ({ ...initialTestimonialFormState }));
    setDialogOpen(true);
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditing(testimonial);
    setFormErrors({});
    setFormData({
      name: testimonial.name,
      title: testimonial.title,
      rating: String(testimonial.rating),
      content: testimonial.content
    });
    setDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = '名稱不能为空';
    }

    if (!formData.title.trim()) {
      errors.title = '稱號不能为空';
    }

    const rating = Number(formData.rating);
    if (Number.isNaN(rating)) {
      errors.rating = '評價星必须是数字';
    } else if (rating < 1 || rating > 5) {
      errors.rating = '評價星范围为 1-5';
    }

    if (!formData.content.trim()) {
      errors.content = '評論內容不能为空';
    }

    return errors;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload: TestimonialPayload = {
      name: formData.name.trim(),
      title: formData.title.trim(),
      rating: Number(formData.rating),
      content: formData.content.trim()
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (testimonial: Testimonial) => {
    if (deleteMutation.isPending) return;
    const confirmed = window.confirm(`確認刪除「${testimonial.name}」的用戶見證嗎？`);
    if (confirmed) {
      deleteMutation.mutate(testimonial.id);
    }
  };

  const handleCarouselDialogOpenChange = (open: boolean) => {
    setCarouselDialogOpen(open);
    if (!open) {
      setEditingCarousel(null);
      setCarouselFormErrors({});
      setCarouselFormData(() => ({ ...initialCarouselFormState }));
    }
  };

  const handleCreateCarousel = () => {
    setEditingCarousel(null);
    setCarouselFormErrors({});
    setCarouselFormData(() => ({ ...initialCarouselFormState }));
    setCarouselDialogOpen(true);
  };

  const handleEditCarousel = (item: CarouselItem) => {
    setEditingCarousel(item);
    setCarouselFormErrors({});
    setCarouselFormData({
      sortOrder: String(item.sortOrder),
      content: item.content
    });
    setCarouselDialogOpen(true);
  };

  const validateCarouselForm = () => {
    const errors: Record<string, string> = {};

    const sortOrder = Number(carouselFormData.sortOrder);
    if (!Number.isInteger(sortOrder)) {
      errors.sortOrder = '排序必須是整數';
    } else if (sortOrder < 0) {
      errors.sortOrder = '排序不能小于 0';
    }

    if (!carouselFormData.content.trim()) {
      errors.content = '內文不能为空';
    }

    return errors;
  };

  const handleCarouselSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateCarouselForm();

    if (Object.keys(errors).length > 0) {
      setCarouselFormErrors(errors);
      return;
    }

    const payload: CarouselPayload = {
      sortOrder: Number(carouselFormData.sortOrder),
      content: carouselFormData.content.trim()
    };

    if (editingCarousel) {
      updateCarouselMutation.mutate({ id: editingCarousel.id, payload });
    } else {
      createCarouselMutation.mutate(payload);
    }
  };

  const handleCarouselDelete = (item: CarouselItem) => {
    if (deleteCarouselMutation.isPending) return;
    const confirmed = window.confirm(`確認刪除排序為 ${item.sortOrder} 的公告輪播嗎？`);
    if (confirmed) {
      deleteCarouselMutation.mutate(item.id);
    }
  };

  const handleLeaderboardDialogOpenChange = (open: boolean) => {
    setLeaderboardDialogOpen(open);
    if (!open) {
      setEditingLeaderboard(null);
      setLeaderboardFormErrors({});
      setLeaderboardFormData(() => ({ ...initialLeaderboardFormState }));
    }
  };

  const handleCreateLeaderboard = () => {
    setEditingLeaderboard(null);
    setLeaderboardFormErrors({});
    setLeaderboardFormData(() => ({ ...initialLeaderboardFormState }));
    setLeaderboardDialogOpen(true);
  };

  const handleEditLeaderboard = (entry: LeaderboardEntry) => {
    setEditingLeaderboard(entry);
    setLeaderboardFormErrors({});
    setLeaderboardFormData({
      type: entry.type,
      avatar: entry.avatar ?? '',
      country: entry.country,
      name: entry.name,
      tradeCount: String(entry.tradeCount),
      winRate: entry.winRate.toString(),
      volume: entry.volume.toString()
    });
    setLeaderboardDialogOpen(true);
  };

  const validateLeaderboardForm = () => {
    const errors: Record<string, string> = {};

    if (!leaderboardFormData.country.trim()) {
      errors.country = '國家不能为空';
    }

    if (!leaderboardFormData.name.trim()) {
      errors.name = '姓名不能为空';
    }

    const tradeCount = Number(leaderboardFormData.tradeCount);
    if (!Number.isInteger(tradeCount) || tradeCount < 0) {
      errors.tradeCount = '成交筆數必須是 >= 0 的整數';
    }

    const winRate = Number(leaderboardFormData.winRate);
    if (Number.isNaN(winRate) || winRate < 0 || winRate > 100) {
      errors.winRate = '勝率需在 0-100 之間';
    }

    const volume = Number(leaderboardFormData.volume);
    if (Number.isNaN(volume) || volume < 0) {
      errors.volume = '成交金額必須是非負數';
    }

    if (leaderboardFormData.avatar.trim()) {
      try {
        new URL(leaderboardFormData.avatar.trim());
      } catch {
        errors.avatar = '頭像地址不是有效的 URL';
      }
    }

    return errors;
  };

  const handleLeaderboardSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateLeaderboardForm();

    if (Object.keys(errors).length > 0) {
      setLeaderboardFormErrors(errors);
      return;
    }

    const payload: LeaderboardPayload = {
      type: leaderboardFormData.type,
      avatar: leaderboardFormData.avatar.trim() || undefined,
      country: leaderboardFormData.country.trim(),
      name: leaderboardFormData.name.trim(),
      tradeCount: Number(leaderboardFormData.tradeCount),
      winRate: Number(leaderboardFormData.winRate),
      volume: Number(leaderboardFormData.volume)
    };

    if (editingLeaderboard) {
      updateLeaderboardMutation.mutate({ id: editingLeaderboard.id, payload });
    } else {
      createLeaderboardMutation.mutate(payload);
    }
  };

  const handleLeaderboardDelete = (entry: LeaderboardEntry) => {
    if (deleteLeaderboardMutation.isPending) return;
    const confirmed = window.confirm(`確認刪除 ${leaderboardTypeLabel[entry.type]} 的 ${entry.name} 嗎？`);
    if (confirmed) {
      deleteLeaderboardMutation.mutate(entry.id);
    }
  };

  const renderTestimonialsTable = () => {
    if (testimonialsLoading) {
      return (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          正在載入用戶見證...
        </div>
      );
    }

    if (testimonials.length === 0) {
      return (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          暫無用戶見證，點擊右上角按鈕新增一條吧。
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead style={{ minWidth: '100px' }}>名稱</TableHead>
                <TableHead style={{ minWidth: '120px' }}>稱號</TableHead>
              <TableHead className="w-24">評價星</TableHead>
                <TableHead style={{ minWidth: '200px' }}>評論內容</TableHead>
                <TableHead style={{ minWidth: '150px' }}>更新時間</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {testimonials.map(testimonial => (
              <TableRow key={testimonial.id}>
                <TableCell className="font-medium">{testimonial.name}</TableCell>
                <TableCell>{testimonial.title}</TableCell>
                <TableCell>
                  <span className="font-medium text-amber-500">
                    {'★'.repeat(testimonial.rating)}
                  </span>
                  <span className="ml-1 text-muted-foreground">
                    {testimonial.rating}/5
                  </span>
                </TableCell>
                <TableCell className="max-w-xl whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {testimonial.content}
                </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-pre-line">
                    {formatDateTime(testimonial.updatedAt)}
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(testimonial)}
                  >
                    <Edit2 className="mr-1 h-4 w-4" />
                    編輯
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(testimonial)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    刪除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    );
  };

  const renderCarouselsTable = () => {
    if (carouselsLoading) {
      return (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          正在載入公告輪播...
        </div>
      );
    }

    if (carousels.length === 0) {
      return (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          暫無公告輪播，點擊右上角按鈕新增一條吧。
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">排序</TableHead>
              <TableHead>內容</TableHead>
              <TableHead className="w-40">更新時間</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carousels.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.sortOrder}</TableCell>
                <TableCell className="max-w-2xl whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {item.content}
                </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-pre-line">
                    {formatDateTime(item.updatedAt)}
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEditCarousel(item)}>
                    <Edit2 className="mr-1 h-4 w-4" />
                    編輯
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleCarouselDelete(item)}
                    disabled={deleteCarouselMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    刪除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    );
  };

  const renderLeaderboardTable = () => {
    if (leaderboardLoading) {
      return (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          正在載入排行榜...
        </div>
      );
    }

    const filteredLeaderboard = leaderboardFilter === 'all' 
      ? leaderboard 
      : leaderboard.filter(entry => entry.type === leaderboardFilter);

    if (filteredLeaderboard.length === 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">篩選：</span>
            <Select
              value={leaderboardFilter}
              onValueChange={(value) => setLeaderboardFilter(value as LeaderboardType | 'all')}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="DAILY">日榜</SelectItem>
                <SelectItem value="WEEKLY">週榜</SelectItem>
                <SelectItem value="MONTHLY">月榜</SelectItem>
              </SelectContent>
            </Select>
          </div>
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            {leaderboard.length === 0 
              ? '暫無排行榜數據，點擊右上角按鈕新增一條吧。'
              : `暫無${leaderboardFilter === 'DAILY' ? '日榜' : leaderboardFilter === 'WEEKLY' ? '週榜' : '月榜'}數據`}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">篩選：</span>
          <Select
            value={leaderboardFilter}
            onValueChange={(value) => setLeaderboardFilter(value as LeaderboardType | 'all')}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="DAILY">日榜</SelectItem>
              <SelectItem value="WEEKLY">週榜</SelectItem>
              <SelectItem value="MONTHLY">月榜</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead className="w-24">類型</TableHead>
                <TableHead style={{ minWidth: '90px' }}>頭像</TableHead>
                <TableHead className="w-28">國家/地區</TableHead>
              <TableHead className="w-32">姓名</TableHead>
              <TableHead className="w-28">成交筆數</TableHead>
              <TableHead className="w-24">勝率</TableHead>
              <TableHead className="w-32">成交金額</TableHead>
              <TableHead className="w-40">更新時間</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {filteredLeaderboard.map(entry => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{leaderboardTypeLabel[entry.type]}</TableCell>
                <TableCell>
                  {entry.avatar ? (
                    <img
                      src={entry.avatar}
                      alt={entry.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">未上传</span>
                  )}
                </TableCell>
                <TableCell>{entry.country}</TableCell>
                <TableCell>{entry.name}</TableCell>
                <TableCell>{entry.tradeCount.toLocaleString()}</TableCell>
                <TableCell>{entry.winRate.toFixed(2)}%</TableCell>
                  <TableCell>${entry.volume.toLocaleString()} USDT</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-pre-line">
                    {formatDateTime(entry.updatedAt)}
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEditLeaderboard(entry)}>
                    <Edit2 className="mr-1 h-4 w-4" />
                    編輯
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleLeaderboardDelete(entry)}
                    disabled={deleteLeaderboardMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    刪除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    );
  };

  const handleShareConfigReset = () => {
    setShareConfig(DEFAULT_SHARE_CONFIG);
    setShareConfigError(null);
    setShareConfigSuccess(null);
  };

  const handleShareConfigSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // 验证必填字段
    if (!shareConfig.url.trim()) {
      setShareConfigError('連結不可為空');
      setShareConfigSuccess(null);
      return;
    }
    if (!shareConfig.content.trim()) {
      setShareConfigError('分享文案不可為空');
      setShareConfigSuccess(null);
      return;
    }

    updateShareConfigMutation.mutate({
      config: {
        title: shareConfig.title || DEFAULT_SHARE_CONFIG.title,
        description: shareConfig.description || DEFAULT_SHARE_CONFIG.description,
        image: shareConfig.image || '',
        url: shareConfig.url.trim(),
        hashtags: shareConfig.hashtags || DEFAULT_SHARE_CONFIG.hashtags,
        content: shareConfig.content.trim()
      }
    });
  };

  const renderShareCopyForm = () => {
    if (shareConfigLoading) {
      return (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          正在載入分享配置...
        </div>
      );
    }

    return (
      <form className="space-y-4" onSubmit={handleShareConfigSubmit}>
        {shareConfigSuccess ? (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
            {shareConfigSuccess}
          </div>
        ) : null}

        {shareConfigError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {shareConfigError}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="share-url">分享連結</Label>
          <Input
            id="share-url"
            value={shareConfig.url}
            onChange={event => {
              setShareConfig(prev => ({ ...prev, url: event.target.value }));
              setShareConfigError(null);
              setShareConfigSuccess(null);
            }}
            placeholder="https://example.com"
            disabled={updateShareConfigMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">分享的目標連結</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="share-content">分享文案</Label>
          <textarea
            id="share-content"
            value={shareConfig.content}
            onChange={event => {
              setShareConfig(prev => ({ ...prev, content: event.target.value }));
              setShareConfigError(null);
              setShareConfigSuccess(null);
            }}
            rows={6}
            className="min-h-[160px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="🎉 邀請好友一起交易..."
            disabled={updateShareConfigMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            平台上的分享按鈕會套用此段文字，可使用換行與連結。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={updateShareConfigMutation.isPending}>
            {updateShareConfigMutation.isPending ? '儲存中…' : '保存分享配置'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleShareConfigReset}
            disabled={updateShareConfigMutation.isPending}
          >
            恢復預設配置
          </Button>
        </div>
      </form>
    );
  };

  const handleDepositAddressReset = () => {
    setDepositAddressConfig(DEFAULT_DEPOSIT_ADDRESS_CONFIG);
    setDepositAddressError(null);
    setDepositAddressSuccess(null);
  };

  const handleDepositAddressSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = depositAddressConfig.address.trim();
    if (!trimmed) {
      setDepositAddressError('入金地址不可為空');
      setDepositAddressSuccess(null);
      return;
    }
    updateDepositAddressMutation.mutate({
      config: {
        address: trimmed,
        qrCodeUrl: depositAddressConfig.qrCodeUrl
      }
    });
  };

  const handleQrcodeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 檢查文件類型
    if (!file.type.startsWith('image/')) {
      setDepositAddressError('請上傳圖片文件');
      return;
    }

    // 檢查文件大小（限制為 5MB）
    if (file.size > 5 * 1024 * 1024) {
      setDepositAddressError('圖片大小不能超過 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setDepositAddressConfig(prev => ({ ...prev, qrCodeUrl: result }));
        setDepositAddressError(null);
        setDepositAddressSuccess(null);
      }
    };
    reader.onerror = () => {
      setDepositAddressError('圖片讀取失敗，請重試');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQrcode = () => {
    setDepositAddressConfig(prev => ({ ...prev, qrCodeUrl: '' }));
    setDepositAddressError(null);
    setDepositAddressSuccess(null);
  };

  const renderDepositAddressForm = () => {
    if (depositAddressLoading) {
      return (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          正在載入入金地址...
        </div>
      );
    }

    return (
      <form className="space-y-4" onSubmit={handleDepositAddressSubmit}>
        {depositAddressSuccess ? (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
            {depositAddressSuccess}
          </div>
        ) : null}

        {depositAddressError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {depositAddressError}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="deposit-address">入金地址</Label>
          <Input
            id="deposit-address"
            value={depositAddressConfig.address}
            onChange={event => {
              setDepositAddressConfig(prev => ({ ...prev, address: event.target.value }));
              setDepositAddressError(null);
              setDepositAddressSuccess(null);
            }}
            autoComplete="off"
            spellCheck={false}
            disabled={updateDepositAddressMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            用戶在入金頁面會看到此地址，請確認與錢包資訊一致。
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="qrcode-upload">QR Code 圖片</Label>
          <div className="space-y-3">
            {depositAddressConfig.qrCodeUrl ? (
              <div className="space-y-2">
                <div className="relative inline-block">
                  <img
                    src={depositAddressConfig.qrCodeUrl}
                    alt="QR Code"
                    className="h-32 w-32 border rounded-md object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={handleRemoveQrcode}
                    disabled={updateDepositAddressMutation.isPending}
                  >
                    ×
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  已上傳 QR Code 圖片，點擊 × 可移除
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  id="qrcode-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleQrcodeUpload}
                  disabled={updateDepositAddressMutation.isPending}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  上傳 QR Code 圖片（最大 5MB）
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={updateDepositAddressMutation.isPending}>
            {updateDepositAddressMutation.isPending ? '儲存中…' : '保存入金地址'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDepositAddressReset}
            disabled={updateDepositAddressMutation.isPending}
          >
            恢復預設地址
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CMS 內容管理</h1>
        <p className="text-muted-foreground">集中管理網頁前端營銷與展示內容</p>
      </div>

      <Tabs defaultValue={tabs[0]?.value ?? ''} className="space-y-4">
        <TabsList>
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(tab => {
          const isTestimonials = tab.value === 'testimonials';
          const isCarousel = tab.value === 'carousel';
          const isLeaderboard = tab.value === 'leaderboard';
          const isShareCopy = tab.value === 'share-copy';
          const isDepositAddress = tab.value === 'deposit-address';

          return (
            <TabsContent key={tab.value} value={tab.value} className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>{tab.label}</CardTitle>
                    <CardDescription>{tab.description}</CardDescription>
                  </div>
                  {isTestimonials ? (
                    <Button size="sm" onClick={handleCreate}>
                      新增用戶見證
                    </Button>
                  ) : null}
                  {isCarousel ? (
                    <Button size="sm" onClick={handleCreateCarousel}>
                      新增公告輪播
                    </Button>
                  ) : null}
                  {isLeaderboard ? (
                    <Button size="sm" onClick={handleCreateLeaderboard}>
                      新增排行榜记录
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent>
                  {isTestimonials
                    ? renderTestimonialsTable()
                    : isCarousel
                      ? renderCarouselsTable()
                      : isLeaderboard
                        ? renderLeaderboardTable()
                        : isShareCopy
                          ? renderShareCopyForm()
                          : isDepositAddress
                            ? renderDepositAddressForm()
                            : placeholder}
                </CardContent>
              </Card>

              {isTestimonials ? (
                <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
                  <DialogContent className="sm:max-w-[520px]">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <DialogHeader>
                        <DialogTitle>{editing ? '編輯用戶見證' : '新增用戶見證'}</DialogTitle>
                      </DialogHeader>

                      {formErrors.general && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {formErrors.general}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="testimonial-name">名稱</Label>
                        <Input
                          id="testimonial-name"
                          value={formData.name}
                          onChange={event => setFormData(prev => ({ ...prev, name: event.target.value }))}
                          placeholder="例如：張偉"
                          disabled={isSubmitting}
                        />
                        {formErrors.name ? (
                          <p className="text-sm text-destructive">{formErrors.name}</p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="testimonial-title">稱號</Label>
                        <Input
                          id="testimonial-title"
                          value={formData.title}
                          onChange={event =>
                            setFormData(prev => ({ ...prev, title: event.target.value }))
                          }
                          placeholder="例如：資深交易員"
                          disabled={isSubmitting}
                        />
                        {formErrors.title ? (
                          <p className="text-sm text-destructive">{formErrors.title}</p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="testimonial-rating">評價星</Label>
                        <Input
                          id="testimonial-rating"
                          type="number"
                          min={1}
                          max={5}
                          value={formData.rating}
                          onChange={event =>
                            setFormData(prev => ({ ...prev, rating: event.target.value }))
                          }
                          disabled={isSubmitting}
                        />
                        {formErrors.rating ? (
                          <p className="text-sm text-destructive">{formErrors.rating}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">輸入 1-5 之间的整数</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="testimonial-content">評論內文</Label>
                        <textarea
                          id="testimonial-content"
                          value={formData.content}
                          onChange={event =>
                            setFormData(prev => ({ ...prev, content: event.target.value }))
                          }
                          rows={5}
                          className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="請輸入详细的评價內容..."
                          disabled={isSubmitting}
                        />
                        {formErrors.content ? (
                          <p className="text-sm text-destructive">{formErrors.content}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            建議 20-200 字，突出體驗亮點
                          </p>
                        )}
                      </div>

                      <DialogFooter className="gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isSubmitting}
                          onClick={() => handleDialogOpenChange(false)}
                        >
                          取消
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? '提交中…' : editing ? '保存修改' : '創建'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : null}

              {isCarousel ? (
                <Dialog open={carouselDialogOpen} onOpenChange={handleCarouselDialogOpenChange}>
                  <DialogContent className="sm:max-w-[520px]">
                    <form onSubmit={handleCarouselSubmit} className="space-y-4">
                      <DialogHeader>
                        <DialogTitle>{editingCarousel ? '編輯公告輪播' : '新增公告輪播'}</DialogTitle>
                      </DialogHeader>

                      {carouselFormErrors.general && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {carouselFormErrors.general}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="carousel-sortOrder">排序</Label>
                        <Input
                          id="carousel-sortOrder"
                          type="number"
                          min={0}
                          value={carouselFormData.sortOrder}
                          onChange={event =>
                            setCarouselFormData(prev => ({
                              ...prev,
                              sortOrder: event.target.value
                            }))
                          }
                          disabled={isCarouselSubmitting}
                        />
                        {carouselFormErrors.sortOrder ? (
                          <p className="text-sm text-destructive">{carouselFormErrors.sortOrder}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            數值越小越靠前，建議從 0 或 1 開始遞增
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="carousel-content">內文</Label>
                        <textarea
                          id="carousel-content"
                          value={carouselFormData.content}
                          onChange={event =>
                            setCarouselFormData(prev => ({ ...prev, content: event.target.value }))
                          }
                          rows={4}
                          className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="請輸入公告內容..."
                          disabled={isCarouselSubmitting}
                        />
                        {carouselFormErrors.content ? (
                          <p className="text-sm text-destructive">{carouselFormErrors.content}</p>
                        ) : null}
                      </div>

                      <DialogFooter className="gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isCarouselSubmitting}
                          onClick={() => handleCarouselDialogOpenChange(false)}
                        >
                          取消
                        </Button>
                        <Button type="submit" disabled={isCarouselSubmitting}>
                          {isCarouselSubmitting ? '提交中…' : editingCarousel ? '保存修改' : '創建'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : null}

              {isLeaderboard ? (
                <Dialog
                  open={leaderboardDialogOpen}
                  onOpenChange={handleLeaderboardDialogOpenChange}
                >
                  <DialogContent className="sm:max-w-[560px]">
                    <form onSubmit={handleLeaderboardSubmit} className="space-y-4">
                      <DialogHeader>
                        <DialogTitle>
                          {editingLeaderboard ? '編輯排行榜记录' : '新增排行榜记录'}
                        </DialogTitle>
                      </DialogHeader>

                      {leaderboardFormErrors.general && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {leaderboardFormErrors.general}
                        </div>
                      )}

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="leaderboard-type">排行榜類型</Label>
                          <Select
                            value={leaderboardFormData.type}
                            onValueChange={value =>
                              setLeaderboardFormData(prev => ({
                                ...prev,
                                type: value as LeaderboardType
                              }))
                            }
                            disabled={isLeaderboardSubmitting}
                          >
                            <SelectTrigger id="leaderboard-type">
                              <SelectValue placeholder="選擇類型" />
                            </SelectTrigger>
                            <SelectContent>
                              {leaderboardTypeOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="leaderboard-avatar">頭像链接</Label>
                          <Input
                            id="leaderboard-avatar"
                            value={leaderboardFormData.avatar}
                            onChange={event =>
                              setLeaderboardFormData(prev => ({
                                ...prev,
                                avatar: event.target.value
                              }))
                            }
                            placeholder="https://..."
                            disabled={isLeaderboardSubmitting}
                          />
                          {leaderboardFormErrors.avatar ? (
                            <p className="text-sm text-destructive">{leaderboardFormErrors.avatar}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">可選，建議使用 CDN 圖片地址</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="leaderboard-country">國家/地區</Label>
                          <Input
                            id="leaderboard-country"
                            value={leaderboardFormData.country}
                            onChange={event =>
                              setLeaderboardFormData(prev => ({
                                ...prev,
                                country: event.target.value
                              }))
                            }
                            placeholder="例如：中國"
                            disabled={isLeaderboardSubmitting}
                          />
                          {leaderboardFormErrors.country ? (
                            <p className="text-sm text-destructive">{leaderboardFormErrors.country}</p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="leaderboard-name">姓名</Label>
                          <Input
                            id="leaderboard-name"
                            value={leaderboardFormData.name}
                            onChange={event =>
                              setLeaderboardFormData(prev => ({
                                ...prev,
                                name: event.target.value
                              }))
                            }
                            placeholder="例如：陳睿"
                            disabled={isLeaderboardSubmitting}
                          />
                          {leaderboardFormErrors.name ? (
                            <p className="text-sm text-destructive">{leaderboardFormErrors.name}</p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="leaderboard-tradeCount">成交筆數</Label>
                          <Input
                            id="leaderboard-tradeCount"
                            type="number"
                            min={0}
                            value={leaderboardFormData.tradeCount}
                            onChange={event =>
                              setLeaderboardFormData(prev => ({
                                ...prev,
                                tradeCount: event.target.value
                              }))
                            }
                            disabled={isLeaderboardSubmitting}
                          />
                          {leaderboardFormErrors.tradeCount ? (
                            <p className="text-sm text-destructive">{leaderboardFormErrors.tradeCount}</p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="leaderboard-winRate">勝率 (%)</Label>
                          <Input
                            id="leaderboard-winRate"
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            value={leaderboardFormData.winRate}
                            onChange={event =>
                              setLeaderboardFormData(prev => ({
                                ...prev,
                                winRate: event.target.value
                              }))
                            }
                            disabled={isLeaderboardSubmitting}
                          />
                          {leaderboardFormErrors.winRate ? (
                            <p className="text-sm text-destructive">{leaderboardFormErrors.winRate}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">範圍 0-100，保留 2 位小数</p>
                          )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="leaderboard-volume">成交金額</Label>
                          <Input
                            id="leaderboard-volume"
                            type="number"
                            min={0}
                            step={0.01}
                            value={leaderboardFormData.volume}
                            onChange={event =>
                              setLeaderboardFormData(prev => ({
                                ...prev,
                                volume: event.target.value
                              }))
                            }
                            disabled={isLeaderboardSubmitting}
                          />
                          {leaderboardFormErrors.volume ? (
                            <p className="text-sm text-destructive">{leaderboardFormErrors.volume}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">支持兩位小數，單位：平台默認貨幣</p>
                          )}
                        </div>
                      </div>

                      <DialogFooter className="gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isLeaderboardSubmitting}
                          onClick={() => handleLeaderboardDialogOpenChange(false)}
                        >
                          取消
                        </Button>
                        <Button type="submit" disabled={isLeaderboardSubmitting}>
                          {isLeaderboardSubmitting ? '提交中…' : editingLeaderboard ? '保存修改' : '創建'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : null}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};
