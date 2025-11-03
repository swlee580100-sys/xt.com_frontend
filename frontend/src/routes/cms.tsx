import { useState } from 'react';
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
import type {
  Testimonial,
  TestimonialPayload,
  CarouselItem,
  CarouselPayload,
  LeaderboardEntry,
  LeaderboardPayload,
  LeaderboardType,
  TradingPerformanceEntry,
  TradingPerformancePayload
} from '@/types/cms';

const tabs = [
  {
    value: 'testimonials',
    label: '用户见证管理',
    description: '管理展示在站点上的用户见证内容'
  },
  {
    value: 'carousel',
    label: '公共轮播管理',
    description: '配置公共区域轮播图与对应的跳转链接'
  },
  {
    value: 'leaderboard',
    label: '排行榜管理',
    description: '维护排行榜展示的数据来源与排版'
  },
  {
    value: 'trading-performance',
    label: '交易时长/赢利率管理',
    description: '维护不同交易时长对应的赢利率配置'
  }
] as const;

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

type TradingPerformanceFormState = {
  tradeDuration: string;
  winRate: string;
};

const initialTradingPerformanceFormState: TradingPerformanceFormState = {
  tradeDuration: '0',
  winRate: '0'
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

  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
  const [editingPerformance, setEditingPerformance] = useState<TradingPerformanceEntry | null>(null);
  const [performanceFormData, setPerformanceFormData] = useState<TradingPerformanceFormState>(() => ({
    ...initialTradingPerformanceFormState
  }));
  const [performanceFormErrors, setPerformanceFormErrors] = useState<Record<string, string>>({});

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
    data: tradingPerformance = [],
    isLoading: tradingPerformanceLoading
  } = useQuery({
    queryKey: ['cms', 'trading-performance'],
    queryFn: () => cmsService.listTradingPerformance(api)
  });

  const createMutation = useMutation({
    mutationFn: (payload: TestimonialPayload) => cmsService.createTestimonial(api, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'testimonials'] });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '新增失败，请稍后再试';
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
      const message = error.response?.data?.message || error.message || '更新失败，请稍后再试';
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
      const message = error.response?.data?.message || error.message || '新增失败，请稍后再试';
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
      const message = error.response?.data?.message || error.message || '更新失败，请稍后再试';
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
      const message = error.response?.data?.message || error.message || '新增失败，请稍后再试';
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
      const message = error.response?.data?.message || error.message || '更新失败，请稍后再试';
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

  const createPerformanceMutation = useMutation({
    mutationFn: (payload: TradingPerformancePayload) =>
      cmsService.createTradingPerformance(api, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'trading-performance'] });
      setPerformanceDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '新增失败，请稍后再试';
      setPerformanceFormErrors({ general: message });
    }
  });

  const updatePerformanceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TradingPerformancePayload }) =>
      cmsService.updateTradingPerformance(api, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'trading-performance'] });
      setPerformanceDialogOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '更新失败，请稍后再试';
      setPerformanceFormErrors({ general: message });
    }
  });

  const deletePerformanceMutation = useMutation({
    mutationFn: (id: string) => cmsService.deleteTradingPerformance(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'trading-performance'] });
    }
  });

  const isPerformanceSubmitting =
    createPerformanceMutation.isPending || updatePerformanceMutation.isPending;

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
      errors.name = '名称不能为空';
    }

    if (!formData.title.trim()) {
      errors.title = '称号不能为空';
    }

    const rating = Number(formData.rating);
    if (Number.isNaN(rating)) {
      errors.rating = '评价星必须是数字';
    } else if (rating < 1 || rating > 5) {
      errors.rating = '评价星范围为 1-5';
    }

    if (!formData.content.trim()) {
      errors.content = '评论内容不能为空';
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
    const confirmed = window.confirm(`确认删除「${testimonial.name}」的用户见证吗？`);
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
      errors.sortOrder = '排序必须是整数';
    } else if (sortOrder < 0) {
      errors.sortOrder = '排序不能小于 0';
    }

    if (!carouselFormData.content.trim()) {
      errors.content = '内文不能为空';
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
    const confirmed = window.confirm(`确认删除排序为 ${item.sortOrder} 的公告轮播吗？`);
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
      errors.country = '国家不能为空';
    }

    if (!leaderboardFormData.name.trim()) {
      errors.name = '姓名不能为空';
    }

    const tradeCount = Number(leaderboardFormData.tradeCount);
    if (!Number.isInteger(tradeCount) || tradeCount < 0) {
      errors.tradeCount = '成交笔数必须是 >= 0 的整数';
    }

    const winRate = Number(leaderboardFormData.winRate);
    if (Number.isNaN(winRate) || winRate < 0 || winRate > 100) {
      errors.winRate = '胜率需在 0-100 之间';
    }

    const volume = Number(leaderboardFormData.volume);
    if (Number.isNaN(volume) || volume < 0) {
      errors.volume = '成交金额必须是非负数';
    }

    if (leaderboardFormData.avatar.trim()) {
      try {
        new URL(leaderboardFormData.avatar.trim());
      } catch {
        errors.avatar = '头像地址不是有效的 URL';
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
    const confirmed = window.confirm(`确认删除 ${leaderboardTypeLabel[entry.type]} 的 ${entry.name} 吗？`);
    if (confirmed) {
      deleteLeaderboardMutation.mutate(entry.id);
    }
  };

  const handlePerformanceDialogOpenChange = (open: boolean) => {
    setPerformanceDialogOpen(open);
    if (!open) {
      setEditingPerformance(null);
      setPerformanceFormErrors({});
      setPerformanceFormData(() => ({ ...initialTradingPerformanceFormState }));
    }
  };

  const handleCreatePerformance = () => {
    setEditingPerformance(null);
    setPerformanceFormErrors({});
    setPerformanceFormData(() => ({ ...initialTradingPerformanceFormState }));
    setPerformanceDialogOpen(true);
  };

  const handleEditPerformance = (entry: TradingPerformanceEntry) => {
    setEditingPerformance(entry);
    setPerformanceFormErrors({});
    setPerformanceFormData({
      tradeDuration: String(entry.tradeDuration),
      winRate: entry.winRate.toString()
    });
    setPerformanceDialogOpen(true);
  };

  const validatePerformanceForm = () => {
    const errors: Record<string, string> = {};

    const duration = Number(performanceFormData.tradeDuration);
    if (!Number.isInteger(duration) || duration < 0) {
      errors.tradeDuration = '交易时长必须是 >= 0 的整数（单位：分钟）';
    }

    const winRate = Number(performanceFormData.winRate);
    if (Number.isNaN(winRate) || winRate < 0 || winRate > 100) {
      errors.winRate = '赢利率需在 0-100 之间';
    }

    return errors;
  };

  const handlePerformanceSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validatePerformanceForm();

    if (Object.keys(errors).length > 0) {
      setPerformanceFormErrors(errors);
      return;
    }

    const payload: TradingPerformancePayload = {
      tradeDuration: Number(performanceFormData.tradeDuration),
      winRate: Number(performanceFormData.winRate)
    };

    if (editingPerformance) {
      updatePerformanceMutation.mutate({ id: editingPerformance.id, payload });
    } else {
      createPerformanceMutation.mutate(payload);
    }
  };

  const handlePerformanceDelete = (entry: TradingPerformanceEntry) => {
    if (deletePerformanceMutation.isPending) return;
    const confirmed = window.confirm(`确认删除交易时长 ${entry.tradeDuration} 分钟的配置吗？`);
    if (confirmed) {
      deletePerformanceMutation.mutate(entry.id);
    }
  };

  const renderTestimonialsTable = () => {
    if (testimonialsLoading) {
      return (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          正在加载用户见证...
        </div>
      );
    }

    if (testimonials.length === 0) {
      return (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          暂无用户见证，点击右上角按钮新增一条吧。
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">名称</TableHead>
              <TableHead className="w-48">称号</TableHead>
              <TableHead className="w-24">评价星</TableHead>
              <TableHead>评论内容</TableHead>
              <TableHead className="w-40">更新时间</TableHead>
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
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(testimonial.updatedAt).toLocaleString()}
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(testimonial)}
                  >
                    <Edit2 className="mr-1 h-4 w-4" />
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(testimonial)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    删除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderCarouselsTable = () => {
    if (carouselsLoading) {
      return (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          正在加载公告轮播...
        </div>
      );
    }

    if (carousels.length === 0) {
      return (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          暂无公告轮播，点击右上角按钮新增一条吧。
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">排序</TableHead>
              <TableHead>内容</TableHead>
              <TableHead className="w-40">更新时间</TableHead>
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
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(item.updatedAt).toLocaleString()}
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEditCarousel(item)}>
                    <Edit2 className="mr-1 h-4 w-4" />
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleCarouselDelete(item)}
                    disabled={deleteCarouselMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    删除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderLeaderboardTable = () => {
    if (leaderboardLoading) {
      return (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          正在加载排行榜...
        </div>
      );
    }

    if (leaderboard.length === 0) {
      return (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          暂无排行榜数据，点击右上角按钮新增一条吧。
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">类型</TableHead>
              <TableHead className="w-24">头像</TableHead>
              <TableHead className="w-28">国家/地区</TableHead>
              <TableHead className="w-32">姓名</TableHead>
              <TableHead className="w-28">成交笔数</TableHead>
              <TableHead className="w-24">胜率</TableHead>
              <TableHead className="w-32">成交金额</TableHead>
              <TableHead className="w-40">更新时间</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map(entry => (
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
                <TableCell>￥{entry.volume.toLocaleString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(entry.updatedAt).toLocaleString()}
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEditLeaderboard(entry)}>
                    <Edit2 className="mr-1 h-4 w-4" />
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleLeaderboardDelete(entry)}
                    disabled={deleteLeaderboardMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    删除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderPerformanceTable = () => {
    if (tradingPerformanceLoading) {
      return (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          正在加载交易时长与赢利率配置...
        </div>
      );
    }

    if (tradingPerformance.length === 0) {
      return (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          暂无交易时长配置，点击右上角按钮新增一条吧。
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">交易时长 (分钟)</TableHead>
              <TableHead className="w-32">赢利率 (%)</TableHead>
              <TableHead className="w-40">更新时间</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tradingPerformance.map(entry => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.tradeDuration}</TableCell>
                <TableCell>{entry.winRate.toFixed(2)}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(entry.updatedAt).toLocaleString()}
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEditPerformance(entry)}>
                    <Edit2 className="mr-1 h-4 w-4" />
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handlePerformanceDelete(entry)}
                    disabled={deletePerformanceMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    删除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">CMS 内容管理</h1>
        <p className="text-muted-foreground">集中管理站点前台的营销与展示内容</p>
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
          const isTradingPerformanceTab = tab.value === 'trading-performance';

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
                      新增用户见证
                    </Button>
                  ) : null}
                  {isCarousel ? (
                    <Button size="sm" onClick={handleCreateCarousel}>
                      新增公告轮播
                    </Button>
                  ) : null}
                  {isLeaderboard ? (
                    <Button size="sm" onClick={handleCreateLeaderboard}>
                      新增排行榜记录
                    </Button>
                  ) : null}
                  {isTradingPerformanceTab ? (
                    <Button size="sm" onClick={handleCreatePerformance}>
                      新增交易时长配置
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
                        : isTradingPerformanceTab
                          ? renderPerformanceTable()
                          : placeholder}
                </CardContent>
              </Card>

              {isTestimonials ? (
                <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
                  <DialogContent className="sm:max-w-[520px]">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <DialogHeader>
                        <DialogTitle>{editing ? '编辑用户见证' : '新增用户见证'}</DialogTitle>
                      </DialogHeader>

                      {formErrors.general && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {formErrors.general}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="testimonial-name">名称</Label>
                        <Input
                          id="testimonial-name"
                          value={formData.name}
                          onChange={event => setFormData(prev => ({ ...prev, name: event.target.value }))}
                          placeholder="例如：张伟"
                          disabled={isSubmitting}
                        />
                        {formErrors.name ? (
                          <p className="text-sm text-destructive">{formErrors.name}</p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="testimonial-title">称号</Label>
                        <Input
                          id="testimonial-title"
                          value={formData.title}
                          onChange={event =>
                            setFormData(prev => ({ ...prev, title: event.target.value }))
                          }
                          placeholder="例如：资深交易员"
                          disabled={isSubmitting}
                        />
                        {formErrors.title ? (
                          <p className="text-sm text-destructive">{formErrors.title}</p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="testimonial-rating">评价星</Label>
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
                          <p className="text-xs text-muted-foreground">输入 1-5 之间的整数</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="testimonial-content">评论内文</Label>
                        <textarea
                          id="testimonial-content"
                          value={formData.content}
                          onChange={event =>
                            setFormData(prev => ({ ...prev, content: event.target.value }))
                          }
                          rows={5}
                          className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="请输入详细的评价内容..."
                          disabled={isSubmitting}
                        />
                        {formErrors.content ? (
                          <p className="text-sm text-destructive">{formErrors.content}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            建议 20-200 字，突出体验亮点
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
                          {isSubmitting ? '提交中…' : editing ? '保存修改' : '创建'}
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
                        <DialogTitle>{editingCarousel ? '编辑公告轮播' : '新增公告轮播'}</DialogTitle>
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
                            数值越小越靠前，建议从 0 或 1 开始递增
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="carousel-content">内文</Label>
                        <textarea
                          id="carousel-content"
                          value={carouselFormData.content}
                          onChange={event =>
                            setCarouselFormData(prev => ({ ...prev, content: event.target.value }))
                          }
                          rows={4}
                          className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="请输入公告内容..."
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
                          {isCarouselSubmitting ? '提交中…' : editingCarousel ? '保存修改' : '创建'}
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
                          {editingLeaderboard ? '编辑排行榜记录' : '新增排行榜记录'}
                        </DialogTitle>
                      </DialogHeader>

                      {leaderboardFormErrors.general && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {leaderboardFormErrors.general}
                        </div>
                      )}

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="leaderboard-type">排行榜类型</Label>
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
                              <SelectValue placeholder="选择类型" />
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
                          <Label htmlFor="leaderboard-avatar">头像链接</Label>
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
                            <p className="text-xs text-muted-foreground">可选，建议使用 CDN 图片地址</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="leaderboard-country">国家/地区</Label>
                          <Input
                            id="leaderboard-country"
                            value={leaderboardFormData.country}
                            onChange={event =>
                              setLeaderboardFormData(prev => ({
                                ...prev,
                                country: event.target.value
                              }))
                            }
                            placeholder="例如：中国"
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
                            placeholder="例如：陈睿"
                            disabled={isLeaderboardSubmitting}
                          />
                          {leaderboardFormErrors.name ? (
                            <p className="text-sm text-destructive">{leaderboardFormErrors.name}</p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="leaderboard-tradeCount">成交笔数</Label>
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
                          <Label htmlFor="leaderboard-winRate">胜率 (%)</Label>
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
                            <p className="text-xs text-muted-foreground">范围 0-100，保留 2 位小数</p>
                          )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="leaderboard-volume">成交金额</Label>
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
                            <p className="text-xs text-muted-foreground">支持两位小数，单位：平台默认货币</p>
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
                          {isLeaderboardSubmitting ? '提交中…' : editingLeaderboard ? '保存修改' : '创建'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : null}

              {isTradingPerformanceTab ? (
                <Dialog open={performanceDialogOpen} onOpenChange={handlePerformanceDialogOpenChange}>
                  <DialogContent className="sm:max-w-[420px]">
                    <form onSubmit={handlePerformanceSubmit} className="space-y-4">
                      <DialogHeader>
                        <DialogTitle>
                          {editingPerformance ? '编辑交易时长配置' : '新增交易时长配置'}
                        </DialogTitle>
                      </DialogHeader>

                      {performanceFormErrors.general && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {performanceFormErrors.general}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="performance-duration">交易时长 (分钟)</Label>
                        <Input
                          id="performance-duration"
                          type="number"
                          min={0}
                          value={performanceFormData.tradeDuration}
                          onChange={event =>
                            setPerformanceFormData(prev => ({
                              ...prev,
                              tradeDuration: event.target.value
                            }))
                          }
                          disabled={isPerformanceSubmitting}
                        />
                        {performanceFormErrors.tradeDuration ? (
                          <p className="text-sm text-destructive">
                            {performanceFormErrors.tradeDuration}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">可设置 0 及以上整数，单位为分钟</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="performance-winRate">赢利率 (%)</Label>
                        <Input
                          id="performance-winRate"
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={performanceFormData.winRate}
                          onChange={event =>
                            setPerformanceFormData(prev => ({
                              ...prev,
                              winRate: event.target.value
                            }))
                          }
                          disabled={isPerformanceSubmitting}
                        />
                        {performanceFormErrors.winRate ? (
                          <p className="text-sm text-destructive">{performanceFormErrors.winRate}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">范围 0-100，可保留两位小数</p>
                        )}
                      </div>

                      <DialogFooter className="gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isPerformanceSubmitting}
                          onClick={() => handlePerformanceDialogOpenChange(false)}
                        >
                          取消
                        </Button>
                        <Button type="submit" disabled={isPerformanceSubmitting}>
                          {isPerformanceSubmitting ? '提交中…' : editingPerformance ? '保存修改' : '创建'}
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
