import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type MouseEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TRADING_PAIRS, type TradingPair } from '@/constants/trading-pairs';
import { Pencil, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const generatePlanId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const TAIPEI_TIMEZONE = 'Asia/Taipei';

const formatDateTimePartsForTaipei = (date: Date) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TAIPEI_TIMEZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '00';
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
};

const buildInputValueFromParts = (parts: ReturnType<typeof formatDateTimePartsForTaipei>) => {
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
};

const convertTaipeiInputToIso = (input: string): string => {
  if (!input) return new Date().toISOString();
  const normalized = input.match(/:\d{2}$/) ? input : `${input}:00`;
  return new Date(`${normalized}+08:00`).toISOString();
};

const getCurrentTaipeiDateTime = () => {
  const parts = formatDateTimePartsForTaipei(new Date());
  const input = buildInputValueFromParts(parts);
  return {
    input,
    iso: convertTaipeiInputToIso(input),
  };
};

const formatIsoToTaipeiInput = (isoString: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString.slice(0, 19);
  }
  const parts = formatDateTimePartsForTaipei(date);
  return buildInputValueFromParts(parts);
};

interface OpeningPlan {
  id: string;
  name: string;
  startTime: string; // ISO string
  tradingPairs: TradingPair[];
  roundDuration: number; // seconds
  isActive: boolean;
  isEnded: boolean;
  defaultResultMode: ResultFilterMode;
}

interface OpeningRound {
  id: string;
  planId: string;
  roundNumber: string;
  tradingPair: TradingPair;
  startTime: string;
  endTime: string;
  duration: number;
  winningDirection: 'BUY_UP' | 'BUY_DOWN';
  resultMode: ResultFilterMode;
}

interface OpeningRoundTrade {
  id: string;
  roundId: string;
  userId: string;
  userName: string;
  direction: 'BUY_UP' | 'BUY_DOWN';
  amount: number;
  placedAt: string;
}

const formatDurationCountdown = (
  round: OpeningRound,
  currentTime: number
): { text: string; isExpired: boolean } => {
  const end = new Date(round.endTime).getTime();
  const remaining = Math.max(end - currentTime, 0);
  const isExpired = remaining === 0;
  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return {
    text: isExpired
      ? '已結束'
      : `${minutes > 0 ? `${minutes} 分 ` : ''}${seconds.toString().padStart(2, '0')} 秒`,
    isExpired,
  };
};

const DEFAULT_PLAN_ROUND_DURATION = 180;
const MAX_UPCOMING_ROUNDS = 1;
const ALLOWED_DURATIONS = [30, 60, 90, 120, 150, 180] as const;
const WINNING_DIRECTION_LABEL: Record<'BUY_UP' | 'BUY_DOWN', string> = {
  BUY_UP: '買漲',
  BUY_DOWN: '買跌',
};
const WINNING_DIRECTION_META: Record<'BUY_UP' | 'BUY_DOWN', { label: string; icon: LucideIcon; className: string }> = {
  BUY_UP: {
    label: WINNING_DIRECTION_LABEL.BUY_UP,
    icon: TrendingUp,
    className: 'bg-green-50 text-green-600 ring-1 ring-inset ring-green-200',
  },
  BUY_DOWN: {
    label: WINNING_DIRECTION_LABEL.BUY_DOWN,
    icon: TrendingDown,
    className: 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-200',
  },
};

type ResultFilterMode = 'ALL_PROFIT' | 'ALL_LOSS' | 'RANDOM' | 'MANUAL';

const RESULT_FILTER_LABEL: Record<ResultFilterMode, string> = {
  ALL_PROFIT: '全體用戶盈利',
  ALL_LOSS: '全體用戶虧損',
  RANDOM: '隨機分佈',
  MANUAL: '個別用戶設置',
};

const getOppositeDirection = (direction: 'BUY_UP' | 'BUY_DOWN'): 'BUY_UP' | 'BUY_DOWN' =>
  direction === 'BUY_UP' ? 'BUY_DOWN' : 'BUY_UP';

const MOCK_USERS = Array.from({ length: 10 }).map((_, index) => ({
  userId: `mock-user-${index + 1}`,
  userName: `模擬用戶 ${index + 1}`,
  isActive: index < 4,
  latestTradeAt: new Date(Date.now() - index * 90_000).toISOString(),
}));

const MOCK_TRADES = Array.from({ length: 20 }).map((_, index) => {
  const user = MOCK_USERS[index % MOCK_USERS.length];
  const tradingPair = index % 2 === 0 ? 'BTC/USDT' : 'ETH/USDT';
  return {
    id: `mock-trade-${index + 1}`,
    userId: user.userId,
    userName: user.userName,
    durationSeconds: 30 + (index % 4) * 30,
    direction: index % 2 === 0 ? 'BUY_UP' : 'BUY_DOWN',
    amount: 50 + (index % 5) * 25,
    placedAt: new Date(Date.now() - index * 45_000).toISOString(),
    isWinning: index % 3 === 0,
    tradingPair,
  };
});

type TradeRow = (typeof MOCK_TRADES)[number];

const createMockRoundTrades = (
  round: OpeningRound,
  mode: 'FOLLOW_WIN' | 'OPPOSE_WIN' | 'RANDOM',
  winningDirection: 'BUY_UP' | 'BUY_DOWN',
  minimum = 4,
  maximum = 10
): OpeningRoundTrade[] => {
  let seed = round.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const count = Math.max(
    minimum,
    Math.min(maximum, Math.floor(random() * (maximum - minimum + 1)) + minimum)
  );

  const trades: OpeningRoundTrade[] = [];
  const startTime = new Date(round.startTime).getTime();
  const durationMs = (round.duration || 60) * 1000;

  for (let i = 0; i < count; i += 1) {
    const userIndex = Math.floor(random() * MOCK_USERS.length);
    let direction: 'BUY_UP' | 'BUY_DOWN';
    switch (mode) {
      case 'FOLLOW_WIN':
        direction = winningDirection;
        break;
      case 'OPPOSE_WIN':
        direction = getOppositeDirection(winningDirection);
        break;
      case 'RANDOM':
      default:
        direction = random() > 0.5 ? 'BUY_UP' : 'BUY_DOWN';
        break;
    }
    const amount = Math.round((random() * 900 + 100) / 10) * 10;
    const placedAt = new Date(
      startTime + Math.floor(random() * durationMs)
    ).toISOString();

    trades.push({
      id: `${round.id}-trade-${i}`,
      roundId: round.id,
      userId: `user-${userIndex + 1}`,
      userName: MOCK_USERS[userIndex].userName,
      direction,
      amount,
      placedAt
    });
  }

  return trades.sort(
    (a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime()
  );
};

const applyPlanOutcomeToRound = (
  round: OpeningRound,
  plan: OpeningPlan,
  options: { forceReroll?: boolean } = {}
): { round: OpeningRound; trades: OpeningRoundTrade[] } => {
  const mode = round.resultMode ?? plan.defaultResultMode ?? 'RANDOM';
  let winningDirection: 'BUY_UP' | 'BUY_DOWN';
  if (!round.winningDirection || options.forceReroll) {
    winningDirection = Math.random() < 0.5 ? 'BUY_UP' : 'BUY_DOWN';
  } else {
    winningDirection = round.winningDirection;
  }

  const adjustedRound: OpeningRound = {
    ...round,
    winningDirection,
  };

  const trades = createMockRoundTrades(
    adjustedRound,
    mode === 'ALL_PROFIT'
      ? 'FOLLOW_WIN'
      : mode === 'ALL_LOSS'
        ? 'OPPOSE_WIN'
        : mode === 'MANUAL'
          ? 'RANDOM'
          : 'RANDOM',
    winningDirection
  );

  return { round: adjustedRound, trades };
};

const rebuildRoundsForPlan = (
  rounds: OpeningRound[],
  plan: OpeningPlan,
  options: { forceReroll?: boolean } = {}
): { rounds: OpeningRound[]; trades: Record<string, OpeningRoundTrade[]> } => {
  const tradesUpdate: Record<string, OpeningRoundTrade[]> = {};
  const updatedRounds = rounds.map(round => {
    if (round.planId !== plan.id) {
      return round;
    }
    const { round: updatedRound, trades } = applyPlanOutcomeToRound(round, plan, options);
    tradesUpdate[updatedRound.id] = trades;
    return updatedRound;
  });
  return { rounds: updatedRounds, trades: tradesUpdate };
};

const formatDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return {
      dateText: '無效日期',
      timeText: '--',
    };
  }

  return {
    dateText: date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
    timeText: date.toLocaleTimeString('zh-TW', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
};

interface PlanDialogState {
  open: boolean;
  editingPlan: OpeningPlan | null;
  selectedPairs: Set<TradingPair>;
  startTimeInput: string;
  isActive: boolean;
  nameInput: string;
  defaultResultMode: ResultFilterMode;
  errors: Partial<Record<'name' | 'startTime' | 'tradingPairs', string>>;
}

const createInitialDialogState = (plan?: OpeningPlan): PlanDialogState => {
  const baseTime = formatIsoToTaipeiInput(getCurrentTaipeiDateTime().iso);
  return {
    open: false,
    editingPlan: plan ?? null,
    selectedPairs: new Set(plan ? plan.tradingPairs : ['BTC/USDT']),
    startTimeInput: plan ? formatIsoToTaipeiInput(plan.startTime) : baseTime,
    isActive: plan ? plan.isActive : false,
    nameInput: plan ? plan.name : '新開盤方案',
    defaultResultMode: plan?.defaultResultMode ?? 'RANDOM',
    errors: {},
  };
};

export const OpeningSettingsPage = () => {
  const [plans, setPlans] = useState<OpeningPlan[]>([]);
  const [dialogState, setDialogState] = useState<PlanDialogState>(() => createInitialDialogState());
  const [openedRounds, setOpenedRounds] = useState<OpeningRound[]>([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => null);
  const [tradeRows, setTradeRows] = useState(MOCK_TRADES);
  const [selectedMiniRoundId, setSelectedMiniRoundId] = useState<string | null>(null);
  const [roundTrades, setRoundTrades] = useState<Record<string, OpeningRoundTrade[]>>({});
  const [tradeWinRule, setTradeWinRule] = useState<'ALL_LOSE' | 'ALL_WIN' | 'MANUAL' | 'RANDOM'>('MANUAL');
  const [cardFilterRules, setCardFilterRules] = useState<Map<string, 'ALL_LOSE' | 'ALL_WIN' | 'MANUAL' | 'RANDOM'>>(
    () => new Map()
  );
  const [filterConfirmDialog, setFilterConfirmDialog] = useState<{
    open: boolean;
    cardKey: string;
    filterValue: 'ALL_LOSE' | 'ALL_WIN' | 'MANUAL' | 'RANDOM';
    cardEntries: Array<{ trade: TradeRow; round: OpeningRound }>;
  }>({
    open: false,
    cardKey: '',
    filterValue: 'MANUAL',
    cardEntries: [],
  });
  const [endPlanConfirmDialog, setEndPlanConfirmDialog] = useState<{
    open: boolean;
    planId: string | null;
  }>({
    open: false,
    planId: null,
  });
  const plansRef = useRef<OpeningPlan[]>(plans);
  const seededRef = useRef(false);
  const testTradesGeneratedRef = useRef(false);
  const [roundDialog, setRoundDialog] = useState<{
    open: boolean;
    targetRound: OpeningRound | null;
    tradingPair: TradingPair | '';
    startTimeInput: string;
    durationValue: string;
    winningDirection: 'BUY_UP' | 'BUY_DOWN';
    errors: Partial<Record<'tradingPair' | 'startTime' | 'duration', string>>;
  }>({
    open: false,
    targetRound: null,
    tradingPair: '',
    startTimeInput: '',
    durationValue: String(ALLOWED_DURATIONS[1]),
    winningDirection: 'BUY_UP',
    errors: {},
  });

  useEffect(() => {
    plansRef.current = plans;
  }, [plans]);

  useEffect(() => {
    if (selectedPlanId && plans.some(plan => plan.id === selectedPlanId)) {
      return;
    }
    setSelectedPlanId(plans[0]?.id ?? null);
  }, [plans, selectedPlanId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeCount = useMemo(() => plans.filter(plan => plan.isActive).length, [plans]);
  const roundDialogPlanPairs = useMemo(() => {
    if (!roundDialog.targetRound) return TRADING_PAIRS;
    const plan = plans.find(p => p.id === roundDialog.targetRound?.planId);
    if (plan && plan.tradingPairs.length > 0) {
      return plan.tradingPairs;
    }
    return TRADING_PAIRS;
  }, [plans, roundDialog.targetRound]);

  const generateRoundsForPlan = useCallback(
    (plan: OpeningPlan, batchSize = 1) => {
      if (plan.tradingPairs.length === 0) {
        return;
      }

      const createdRounds: OpeningRound[] = [];
      const tradesMap: Record<string, OpeningRoundTrade[]> = {};

      setOpenedRounds(prev => {
        const rounds = [...prev];

        plan.tradingPairs.forEach(pair => {
          const pairRounds = rounds
            .filter(round => round.planId === plan.id && round.tradingPair === pair)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

          const durationMap = new Map<number, OpeningRound[]>(
            ALLOWED_DURATIONS.map(duration => [
              duration,
              pairRounds
                .filter(round => round.duration === duration)
                .sort(
                  (a, b) =>
                    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                ),
            ])
          );

          const addRound = (duration: number, startMs: number) => {
            const durationRounds = durationMap.get(duration);
            if (!durationRounds) return null;

            const startDate = new Date(startMs);
            if (Number.isNaN(startDate.getTime())) {
              return null;
            }

            const endDate = new Date(startDate.getTime() + duration * 1000);
            const roundIndex = durationRounds.length + 1;
            const roundNumber = `${duration}s${roundIndex
              .toString()
              .padStart(2, '0')}`;
            const newRound: OpeningRound = {
              id: `${plan.id}-${pair}-${duration}-${startDate.getTime()}`,
              planId: plan.id,
              roundNumber,
              tradingPair: pair,
              startTime: startDate.toISOString(),
              endTime: endDate.toISOString(),
              duration,
              winningDirection: Math.random() < 0.5 ? 'BUY_UP' : 'BUY_DOWN',
              resultMode: plan.defaultResultMode,
            };
            const { round: adjustedRound, trades } = applyPlanOutcomeToRound(newRound, plan, {
              forceReroll: true,
            });

            rounds.push(adjustedRound);
            pairRounds.push(adjustedRound);
            durationRounds.push(adjustedRound);
            durationRounds.sort(
              (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
            pairRounds.sort(
              (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
            createdRounds.push(adjustedRound);
            tradesMap[adjustedRound.id] = trades;
            return endDate.getTime();
          };

          ALLOWED_DURATIONS.forEach(duration => {
            const durationRounds = durationMap.get(duration);
            if (!durationRounds) return;

            if (durationRounds.length === 0) {
              const initialStartMs = new Date(plan.startTime).getTime();
              if (!Number.isNaN(initialStartMs)) {
                addRound(duration, initialStartMs);
              }
            }

            if (!plan.isActive) {
              return;
            }

            let latestEndMs =
              durationRounds.length > 0
                ? new Date(
                    durationRounds[durationRounds.length - 1].endTime
                  ).getTime()
                : new Date(plan.startTime).getTime();

            let upcomingCount = durationRounds.filter(
              round => new Date(round.startTime).getTime() >= currentTime
            ).length;

            const desiredUpcoming = plan.isActive ? MAX_UPCOMING_ROUNDS : 0;
            while (upcomingCount < desiredUpcoming) {
              const nextEnd = addRound(duration, latestEndMs);
              if (!nextEnd) break;
              latestEndMs = nextEnd;
              upcomingCount += 1;
            }
          });
        });

        return rounds;
      });

      if (Object.keys(tradesMap).length > 0) {
        setRoundTrades(prev => ({
          ...prev,
          ...tradesMap,
        }));
      }

      if (createdRounds.length > 0) {
        setRoundTrades(prev => {
          const next = { ...prev };
          createdRounds.forEach(round => {
            if (!next[round.id]) {
              next[round.id] = tradesMap[round.id] ?? [];
            }
          });
          return next;
        });
      }
    },
    []
  );

  const sortedRounds = useMemo(() => {
    return [...openedRounds].sort((a, b) => {
      const startDiff =
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      if (startDiff !== 0) return startDiff;
      if (a.duration !== b.duration) return a.duration - b.duration;
      return a.roundNumber.localeCompare(b.roundNumber);
    });
  }, [openedRounds]);

  const detailRounds = useMemo(() => {
    return [...openedRounds].sort((a, b) => {
      const startDiff =
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      if (startDiff !== 0) return startDiff;
      if (a.duration !== b.duration) return a.duration - b.duration;
      return a.roundNumber.localeCompare(b.roundNumber);
    });
  }, [openedRounds]);

  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return null;
    return plans.find(plan => plan.id === selectedPlanId) ?? null;
  }, [plans, selectedPlanId]);

  const selectedPlanRounds = useMemo(() => {
    if (!selectedPlanId) return [];
    return detailRounds.filter(round => round.planId === selectedPlanId);
  }, [detailRounds, selectedPlanId]);

  useEffect(() => {
    if (selectedPlanRounds.length === 0) {
      setSelectedMiniRoundId(null);
      return;
    }
    setSelectedMiniRoundId(prev => {
      if (!prev) {
        return selectedPlanRounds[0]?.id ?? null;
      }
      const exists = selectedPlanRounds.some(round => round.id === prev);
      return exists ? prev : selectedPlanRounds[0]?.id ?? null;
    });
  }, [selectedPlanRounds]);

  const tradeAssignments = useMemo(() => {
    const assignments = new Map<string, TradeRow[]>();
    selectedPlanRounds.forEach(round => {
      assignments.set(round.id, []);
    });

    tradeRows.forEach(trade => {
      const placedAtMs = new Date(trade.placedAt).getTime();
      if (Number.isNaN(placedAtMs)) {
        return;
      }
      const matchingRound = selectedPlanRounds.find(round => {
        if (round.tradingPair !== trade.tradingPair) return false;
        if (round.duration !== trade.durationSeconds) return false;
        const start = new Date(round.startTime).getTime();
        const end = new Date(round.endTime).getTime();
        return placedAtMs >= start && placedAtMs < end;
      });
      if (!matchingRound) {
        return;
      }
      const bucket = assignments.get(matchingRound.id);
      if (bucket) {
        bucket.push(trade);
      } else {
        assignments.set(matchingRound.id, [trade]);
      }
    });

    return assignments;
  }, [selectedPlanRounds, tradeRows]);

  const getTradesForRounds = useCallback(
    (rounds: OpeningRound[]) => {
      const entries: Array<{ trade: TradeRow; round: OpeningRound }> = [];
      rounds.forEach(round => {
        const trades = tradeAssignments.get(round.id) ?? [];
        trades.forEach(trade => {
          entries.push({ trade, round });
        });
      });
      return entries.sort(
        (a, b) => new Date(b.trade.placedAt).getTime() - new Date(a.trade.placedAt).getTime()
      );
    },
    [tradeAssignments]
  );

  const activeRoundsByDuration = useMemo(() => {
    const durationMap = new Map<number, OpeningRound[]>();
    ALLOWED_DURATIONS.forEach(duration => {
      durationMap.set(duration, []);
    });

    const allActive: OpeningRound[] = [];

    selectedPlanRounds.forEach(round => {
      const start = new Date(round.startTime).getTime();
      const end = new Date(round.endTime).getTime();
      if (currentTime >= start && currentTime < end) {
        const bucket = durationMap.get(round.duration);
        if (bucket) {
          bucket.push(round);
        }
        allActive.push(round);
      }
    });

    return { durationMap, allActive };
  }, [currentTime, selectedPlanRounds]);

  const activeTradesAll = useMemo(() => {
    return getTradesForRounds(activeRoundsByDuration.allActive);
  }, [activeRoundsByDuration, getTradesForRounds]);

  const activeTradesByDuration = useMemo(() => {
    const result = new Map<number, Array<{ trade: TradeRow; round: OpeningRound }>>();
    ALLOWED_DURATIONS.forEach(duration => {
      const rounds = activeRoundsByDuration.durationMap.get(duration) ?? [];
      result.set(duration, getTradesForRounds(rounds));
    });
    return result;
  }, [activeRoundsByDuration, getTradesForRounds]);

  const selectedMiniRound = useMemo(() => {
    if (selectedPlanRounds.length === 0) {
      return null;
    }
    const activeRoundId = selectedMiniRoundId ?? selectedPlanRounds[0].id;
    return selectedPlanRounds.find(round => round.id === activeRoundId) ?? selectedPlanRounds[0];
  }, [selectedMiniRoundId, selectedPlanRounds]);

  const selectedMiniRoundLabel = useMemo(() => {
    if (!selectedMiniRound) {
      return '';
    }
    return selectedMiniRound.roundNumber;
  }, [selectedMiniRound]);

  const selectedMiniRoundTrades = useMemo(() => {
    if (!selectedMiniRound) {
      return [] as Array<{ trade: TradeRow; round: OpeningRound }>;
    }
    return getTradesForRounds([selectedMiniRound]);
  }, [getTradesForRounds, selectedMiniRound]);

  const allTradesForPlan = useMemo(() => {
    return getTradesForRounds(selectedPlanRounds);
  }, [getTradesForRounds, selectedPlanRounds]);

  const tradesByDuration = useMemo(() => {
    const result = new Map<number, Array<{ trade: TradeRow; round: OpeningRound }>>();
    ALLOWED_DURATIONS.forEach(duration => {
      const rounds = selectedPlanRounds.filter(round => round.duration === duration);
      result.set(duration, getTradesForRounds(rounds));
    });
    return result;
  }, [getTradesForRounds, selectedPlanRounds]);

  const tradeCardItems = useMemo(() => {
    const items: Array<{
      key: string;
      title: string;
      entries: Array<{ trade: TradeRow; round: OpeningRound }>;
      emptyText: string;
    }> = [];

    items.push({
      key: 'all',
      title: '全部交易列表',
      entries: activeTradesAll,
      emptyText: '目前沒有進行中的交易資料。',
    });

    ALLOWED_DURATIONS.forEach(duration => {
      const label = `${duration}s`;
      items.push({
        key: `duration-${duration}`,
        title: `${label}交易列表`,
        entries: activeTradesByDuration.get(duration) ?? [],
        emptyText: `目前沒有進行中的 ${label} 交易資料。`,
      });
    });

    items.push({
      key: 'history',
      title: `${selectedMiniRoundLabel || '小盤'} 歷史交易列表`,
      entries: selectedMiniRoundTrades,
      emptyText: '目前沒有歷史交易資料。',
    });

    return items;
  }, [activeTradesAll, activeTradesByDuration, selectedMiniRoundLabel, selectedMiniRoundTrades]);

  const selectedMiniRoundTiming = useMemo(() => {
    if (!selectedMiniRound) {
      return null;
    }
    const startDate = new Date(selectedMiniRound.startTime);
    if (Number.isNaN(startDate.getTime())) {
      return null;
    }
    const duration = selectedMiniRound.duration || DEFAULT_PLAN_ROUND_DURATION;
    const endDate = new Date(startDate.getTime() + duration * 1000);
    const elapsedSeconds = Math.max(0, Math.floor((currentTime - startDate.getTime()) / 1000));
    const remainingSeconds = Math.max(duration - elapsedSeconds, 0);
    const isEnded = currentTime >= endDate.getTime();

    const formatLabel = (iso: string) => {
      const parts = formatDateLabel(iso);
      return `${parts.dateText} ${parts.timeText}`;
    };

    const formatCountdown = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return {
      startText: formatLabel(startDate.toISOString()),
      endText: formatLabel(endDate.toISOString()),
      countdownText: isEnded ? '此盤已結束' : `倒數 ${formatCountdown(remainingSeconds)}`,
    };
  }, [currentTime, selectedMiniRound]);

  const getDurationCountdown = useCallback((duration: number) => {
    const activeRounds = activeRoundsByDuration.durationMap.get(duration) ?? [];
    if (activeRounds.length === 0) {
      return null;
    }
    // 獲取第一個進行中的小盤
    const firstActiveRound = activeRounds[0];
    const startDate = new Date(firstActiveRound.startTime);
    if (Number.isNaN(startDate.getTime())) {
      return null;
    }
    const endDate = new Date(startDate.getTime() + firstActiveRound.duration * 1000);
    const remainingSeconds = Math.max(0, Math.floor((endDate.getTime() - currentTime) / 1000));
    const isEnded = currentTime >= endDate.getTime();

    const formatCountdown = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return isEnded ? '已結束' : formatCountdown(remainingSeconds);
  }, [activeRoundsByDuration, currentTime]);

  const handleTradeWinRuleChange = useCallback((value: 'ALL_LOSE' | 'ALL_WIN' | 'MANUAL' | 'RANDOM') => {
    setTradeWinRule(value);
    if (value === 'MANUAL') {
      return;
    }
    setTradeRows(prev =>
      prev.map(trade => ({
        ...trade,
        isWinning:
          value === 'ALL_WIN'
            ? true
            : value === 'ALL_LOSE'
              ? false
              : Math.random() >= 0.5,
      }))
    );
  }, []);

  const handleToggleTradeResult = useCallback((tradeId: string, value: boolean, cardKey: string) => {
    setTradeRows(prev => prev.map(trade => (trade.id === tradeId ? { ...trade, isWinning: value } : trade)));
    setCardFilterRules(prev => {
      const newMap = new Map(prev);
      newMap.set(cardKey, 'MANUAL');
      return newMap;
    });
  }, []);

  const handleCardFilterChange = useCallback(
    (cardKey: string, filterValue: 'ALL_LOSE' | 'ALL_WIN' | 'MANUAL' | 'RANDOM', cardEntries: Array<{ trade: TradeRow; round: OpeningRound }>) => {
      // 如果是「全部交易列表」且不是「個別設置」，需要確認
      if (cardKey === 'all' && filterValue !== 'MANUAL') {
        setFilterConfirmDialog({
          open: true,
          cardKey,
          filterValue,
          cardEntries,
        });
        return;
      }

      // 直接執行變更
      executeCardFilterChange(cardKey, filterValue, cardEntries);
    },
    []
  );

  const executeCardFilterChange = useCallback(
    (cardKey: string, filterValue: 'ALL_LOSE' | 'ALL_WIN' | 'MANUAL' | 'RANDOM', cardEntries: Array<{ trade: TradeRow; round: OpeningRound }>) => {
      setCardFilterRules(prev => {
        const newMap = new Map(prev);
        newMap.set(cardKey, filterValue);
        return newMap;
      });

      if (filterValue === 'MANUAL') {
        return;
      }

      const tradeIds = new Set(cardEntries.map(entry => entry.trade.id));
      setTradeRows(prev =>
        prev.map(trade => {
          if (!tradeIds.has(trade.id)) {
            return trade;
          }
          if (filterValue === 'ALL_LOSE') {
            return { ...trade, isWinning: false };
          }
          if (filterValue === 'ALL_WIN') {
            return { ...trade, isWinning: true };
          }
          if (filterValue === 'RANDOM') {
            return { ...trade, isWinning: Math.random() >= 0.5 };
          }
          return trade;
        })
      );
    },
    []
  );

  const roundMap = useMemo(() => {
    const map = new Map<string, OpeningRound>();
    openedRounds.forEach(round => {
      map.set(round.id, round);
    });
    return map;
  }, [openedRounds]);

  const getRoundStatus = useCallback((round: OpeningRound) => {
    const start = new Date(round.startTime).getTime();
    const end = new Date(round.endTime).getTime();
    if (currentTime < start) {
      return '未開始';
    }
    if (currentTime >= end) {
      return '已結束';
    }
    return '進行中';
  }, [currentTime]);

  const updateRoundOutcomeSettings = useCallback(
    (
      round: OpeningRound,
      overrides: Partial<OpeningRound>,
      options: { forceReroll?: boolean } = {}
    ) => {
      const plan = plansRef.current.find(planItem => planItem.id === round.planId);
      if (!plan) return;

      const mergedRound: OpeningRound = { ...round, ...overrides };
      const shouldReroll =
        options.forceReroll ??
        (overrides.resultMode !== 'MANUAL' &&
          !(overrides.resultMode === undefined && round.resultMode === 'MANUAL'));

      let tradesPatch: Record<string, OpeningRoundTrade[]> = {};
      setOpenedRounds(prev =>
        prev.map(item => {
          if (item.id !== round.id) {
            return item;
          }
          const merged: OpeningRound = { ...item, ...overrides };
          const { round: adjusted, trades } = applyPlanOutcomeToRound(merged, plan, {
            forceReroll: shouldReroll,
          });
          if (shouldReroll) {
            tradesPatch[adjusted.id] = trades;
          }
          return adjusted;
        })
      );
      if (Object.keys(tradesPatch).length > 0) {
        setRoundTrades(prev => ({
          ...prev,
          ...tradesPatch,
        }));
      }

      if (overrides.resultMode === 'ALL_PROFIT' || overrides.resultMode === 'ALL_LOSS') {
        const winDirection =
          overrides.winningDirection ??
          mergedRound.winningDirection ??
          'BUY_UP';
        const desiredDirection =
          overrides.resultMode === 'ALL_PROFIT'
            ? winDirection
            : getOppositeDirection(winDirection);
        setRoundTrades(prev => {
          const trades = prev[round.id] ?? [];
          const updatedTrades = trades.map(entry => ({
            ...entry,
            direction: desiredDirection,
          }));
          return {
            ...prev,
            [round.id]: updatedTrades,
          };
        });
      }
    },
    []
  );

  const handleTradeWinLossChange = useCallback(
    (round: OpeningRound, trade: OpeningRoundTrade, outcome: 'WIN' | 'LOSS') => {
      updateRoundOutcomeSettings(round, { resultMode: 'MANUAL' }, { forceReroll: false });
      const winningDir = round.winningDirection ?? 'BUY_UP';
      const desiredDirection =
        outcome === 'WIN' ? winningDir : getOppositeDirection(winningDir);

      setRoundTrades(prev => {
        const trades = prev[round.id] ?? [];
        const updatedTrades = trades.map(entry =>
          entry.id === trade.id ? { ...entry, direction: desiredDirection } : entry
        );
        return {
          ...prev,
          [round.id]: updatedTrades
        };
      });
    },
    [updateRoundOutcomeSettings]
  );

  const ensureContinuousRounds = useCallback(() => {
    const createdRounds: OpeningRound[] = [];
    const createdTrades: Record<string, OpeningRoundTrade[]> = {};
    setOpenedRounds(prev => {
      let rounds = [...prev];
      let changed = false;

      plansRef.current.forEach(plan => {
        if (plan.tradingPairs.length === 0 || plan.isEnded) {
          return;
        }

        plan.tradingPairs.forEach(pair => {
          const pairRounds = rounds
            .filter(round => round.planId === plan.id && round.tradingPair === pair)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

          const durationMap = new Map<number, OpeningRound[]>(
            ALLOWED_DURATIONS.map(duration => [
              duration,
              pairRounds
                .filter(round => round.duration === duration)
                .sort(
                  (a, b) =>
                    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                ),
            ])
          );

          const addRound = (duration: number, startMs: number) => {
            const durationRounds = durationMap.get(duration);
            if (!durationRounds) return null;

            const startDate = new Date(startMs);
            if (Number.isNaN(startDate.getTime())) {
              return null;
            }

            const endDate = new Date(startDate.getTime() + duration * 1000);
            const roundIndex = durationRounds.length + 1;
            const roundNumber = `${duration}s${roundIndex
              .toString()
              .padStart(2, '0')}`;
            const newRound: OpeningRound = {
              id: `${plan.id}-${pair}-${duration}-${startDate.getTime()}`,
              planId: plan.id,
              roundNumber,
              tradingPair: pair,
              startTime: startDate.toISOString(),
              endTime: endDate.toISOString(),
              duration,
              winningDirection: Math.random() < 0.5 ? 'BUY_UP' : 'BUY_DOWN',
              resultMode: plan.defaultResultMode,
            };
            const { round: adjustedRound, trades } = applyPlanOutcomeToRound(newRound, plan, {
              forceReroll: true,
            });
            rounds.push(adjustedRound);
            pairRounds.push(adjustedRound);
            durationRounds.push(adjustedRound);
            durationRounds.sort(
              (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
            pairRounds.sort(
              (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
            createdRounds.push(adjustedRound);
            createdTrades[adjustedRound.id] = trades;
            changed = true;
            return endDate.getTime();
          };

          ALLOWED_DURATIONS.forEach(duration => {
            const durationRounds = durationMap.get(duration);
            if (!durationRounds) return;

            if (durationRounds.length === 0) {
              const initialStartMs = new Date(plan.startTime).getTime();
              if (!Number.isNaN(initialStartMs)) {
                addRound(duration, initialStartMs);
              }
            }

            if (!plan.isActive) {
              return;
            }

            let latestEndMs =
              durationRounds.length > 0
                ? new Date(
                    durationRounds[durationRounds.length - 1].endTime
                  ).getTime()
                : new Date(plan.startTime).getTime();

            let upcomingCount = durationRounds.filter(
              round => new Date(round.startTime).getTime() >= currentTime
            ).length;

            const desiredUpcoming = plan.isActive ? MAX_UPCOMING_ROUNDS : 0;
            while (upcomingCount < desiredUpcoming) {
              const nextEnd = addRound(duration, latestEndMs);
              if (!nextEnd) break;
              latestEndMs = nextEnd;
              upcomingCount += 1;
            }
          });
        });
      });

      if (!changed) {
        return prev;
      }

      return rounds.sort((a, b) => {
        const startDiff =
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        if (startDiff !== 0) return startDiff;
        if (a.duration !== b.duration) return a.duration - b.duration;
        return a.roundNumber.localeCompare(b.roundNumber);
      });
    });
    if (Object.keys(createdTrades).length > 0) {
      setRoundTrades(prev => ({
        ...prev,
        ...createdTrades,
      }));
    }
    if (createdRounds.length > 0) {
      setRoundTrades(prev => {
        const next = { ...prev };
        createdRounds.forEach(round => {
          if (!next[round.id]) {
            next[round.id] = createdTrades[round.id] ?? [];
          }
        });
        return next;
      });
    }
  }, [currentTime]);

  useEffect(() => {
    ensureContinuousRounds();
  }, [ensureContinuousRounds, currentTime]);

  useEffect(() => {
    if (seededRef.current) return;
    const now = getCurrentTaipeiDateTime();
    const samplePlan: OpeningPlan = {
      id: generatePlanId(),
      name: '大小盤功能測試',
      startTime: now.iso,
      tradingPairs: ['BTC/USDT', 'ETH/USDT'],
      roundDuration: DEFAULT_PLAN_ROUND_DURATION,
      isActive: true,
      isEnded: false,
      defaultResultMode: 'RANDOM'
    };
    setPlans([samplePlan]);
    setSelectedPlanId(samplePlan.id);
    seededRef.current = true;
    generateRoundsForPlan(samplePlan, MAX_UPCOMING_ROUNDS);
  }, [generateRoundsForPlan]);

  // 生成測試交易數據（進行中和歷史）
  useEffect(() => {
    if (!seededRef.current || openedRounds.length === 0 || testTradesGeneratedRef.current) return;

    const generateTestTrades = () => {
      const newTrades: TradeRow[] = [];
      const now = Date.now();

      openedRounds.forEach((round, roundIndex) => {
        const roundStart = new Date(round.startTime).getTime();
        const roundEnd = new Date(round.endTime).getTime();
        const isActive = now >= roundStart && now < roundEnd;
        const isPast = now >= roundEnd;

        // 為進行中的小盤生成 2-4 筆交易
        if (isActive) {
          const tradeCount = 2 + (roundIndex % 3);
          for (let i = 0; i < tradeCount; i++) {
            const user = MOCK_USERS[(roundIndex * 3 + i) % MOCK_USERS.length];
            const placedAtMs = roundStart + Math.floor((now - roundStart) * (i + 1) / (tradeCount + 1));
            newTrades.push({
              id: `test-active-${round.id}-${i}`,
              userId: user.userId,
              userName: user.userName,
              durationSeconds: round.duration,
              direction: Math.random() < 0.5 ? 'BUY_UP' : 'BUY_DOWN',
              amount: 50 + Math.floor(Math.random() * 200),
              placedAt: new Date(placedAtMs).toISOString(),
              isWinning: Math.random() < 0.5,
              tradingPair: round.tradingPair,
            });
          }
        }

        // 為已結束的小盤生成 1-3 筆歷史交易
        if (isPast && roundIndex < 5) {
          const tradeCount = 1 + (roundIndex % 3);
          for (let i = 0; i < tradeCount; i++) {
            const user = MOCK_USERS[(roundIndex * 2 + i + 5) % MOCK_USERS.length];
            const placedAtMs = roundStart + Math.floor((roundEnd - roundStart) * (i + 1) / (tradeCount + 1));
            newTrades.push({
              id: `test-history-${round.id}-${i}`,
              userId: user.userId,
              userName: user.userName,
              durationSeconds: round.duration,
              direction: Math.random() < 0.5 ? 'BUY_UP' : 'BUY_DOWN',
              amount: 50 + Math.floor(Math.random() * 200),
              placedAt: new Date(placedAtMs).toISOString(),
              isWinning: Math.random() < 0.5,
              tradingPair: round.tradingPair,
            });
          }
        }
      });

      if (newTrades.length > 0) {
        setTradeRows(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const uniqueNewTrades = newTrades.filter(t => !existingIds.has(t.id));
          return [...prev, ...uniqueNewTrades];
        });
        testTradesGeneratedRef.current = true;
      }
    };

    // 延遲生成，確保小盤已經完全生成
    const timer = setTimeout(generateTestTrades, 500);
    return () => clearTimeout(timer);
  }, [openedRounds]);

  const openCreateDialog = () => {
    setDialogState({
      ...createInitialDialogState(),
      open: true,
      editingPlan: null,
    });
  };

  const openEditDialog = (plan: OpeningPlan) => {
    setDialogState({
      ...createInitialDialogState(plan),
      open: true,
      editingPlan: plan,
    });
  };

  const closeDialog = () => {
    setDialogState((prev) => ({
      ...prev,
      open: false,
      errors: {},
    }));
  };

  const handleTogglePlan = (planId: string, value: boolean) => {
    const targetPlan = plans.find(plan => plan.id === planId);
    if (!targetPlan) return;

    const updatedPlan: OpeningPlan = { ...targetPlan, isActive: value };
    setPlans(prev => prev.map(plan => (plan.id === planId ? updatedPlan : plan)));

    if (value) {
      generateRoundsForPlan(updatedPlan, MAX_UPCOMING_ROUNDS);
    }
  };

  const handleEndPlan = (planId: string) => {
    setEndPlanConfirmDialog({
      open: true,
      planId,
    });
  };

  const executeEndPlan = (planId: string) => {
    const targetPlan = plans.find(plan => plan.id === planId);
    if (!targetPlan) return;

    const updatedPlan: OpeningPlan = { ...targetPlan, isActive: false, isEnded: true };
    setPlans(prev => prev.map(plan => (plan.id === planId ? updatedPlan : plan)));
  };

  const handleDeletePlan = (planId: string) => {
    setPlans(prev => prev.filter(plan => plan.id !== planId));
    setOpenedRounds(prev => prev.filter(round => round.planId !== planId));
    setRoundTrades(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(roundId => {
        if (roundId.startsWith(`${planId}-`)) {
          delete next[roundId];
        }
      });
      return next;
    });
  };

  const handleRoundResultModeChange = useCallback(
    (round: OpeningRound, mode: ResultFilterMode) => {
      updateRoundOutcomeSettings(
        round,
        {
          resultMode: mode,
        },
        { forceReroll: mode !== 'MANUAL' }
      );
      if (mode === 'ALL_PROFIT' || mode === 'ALL_LOSS') {
        const desiredDirection =
          mode === 'ALL_PROFIT'
            ? round.winningDirection ?? 'BUY_UP'
            : getOppositeDirection(round.winningDirection ?? 'BUY_UP');
        setRoundTrades(prev => {
          const trades = prev[round.id] ?? [];
          const updatedTrades = trades.map(entry => ({
            ...entry,
            direction: desiredDirection,
          }));
          return {
            ...prev,
            [round.id]: updatedTrades,
          };
        });
      }
    },
    [updateRoundOutcomeSettings]
  );

  const handleSavePlan = () => {
    const errors: PlanDialogState['errors'] = {};
    const { nameInput, startTimeInput, selectedPairs, defaultResultMode } = dialogState;

    if (!nameInput.trim()) {
      errors.name = '請輸入方案名稱';
    }
    if (!startTimeInput.trim()) {
      errors.startTime = '請選擇開始時間';
    }
    if (selectedPairs.size === 0) {
      errors.tradingPairs = '至少選擇一個交易對';
    }

    if (Object.keys(errors).length > 0) {
      setDialogState(prev => ({ ...prev, errors }));
      return;
    }

    const planPayload: OpeningPlan = {
      id: dialogState.editingPlan ? dialogState.editingPlan.id : generatePlanId(),
      name: nameInput.trim(),
      startTime: convertTaipeiInputToIso(startTimeInput),
      tradingPairs: Array.from(selectedPairs),
      roundDuration: dialogState.editingPlan?.roundDuration ?? DEFAULT_PLAN_ROUND_DURATION,
      isActive: dialogState.isActive,
      isEnded: dialogState.editingPlan?.isEnded ?? false,
      defaultResultMode,
    };

    setPlans(prev => {
      if (dialogState.editingPlan) {
        return prev.map(plan => (plan.id === planPayload.id ? planPayload : plan));
      }
      return [...prev, planPayload];
    });

    closeDialog();
  };

  const handleRoundDurationChange = useCallback((round: OpeningRound, rawValue: number, overrides?: Partial<OpeningRound>) => {
    const plan = plansRef.current.find(planItem => planItem.id === round.planId);
    if (!plan) {
      return;
    }

    const fallback = ALLOWED_DURATIONS[0];
    const sanitized = ALLOWED_DURATIONS.includes(rawValue as typeof ALLOWED_DURATIONS[number])
      ? rawValue
      : fallback;

    const tradesUpdate: Record<string, OpeningRoundTrade[]> = {};
    setOpenedRounds(prev => {
      const cloned = prev.map(item => ({ ...item }));
      const targetIndex = cloned.findIndex(item => item.id === round.id);
      if (targetIndex === -1) {
        return prev;
      }

      const currentTarget = { ...cloned[targetIndex], ...overrides };
      currentTarget.duration = sanitized;
      cloned[targetIndex] = currentTarget;

      const filtered = cloned
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => item.planId === currentTarget.planId && item.tradingPair === currentTarget.tradingPair)
        .sort((a, b) => new Date(a.item.startTime).getTime() - new Date(b.item.startTime).getTime());

      const sortedIndex = filtered.findIndex(entry => entry.idx === targetIndex);
      if (sortedIndex === -1) {
        return prev;
      }

      let prevEnd: number | null = null;
      for (let i = 0; i < filtered.length; i += 1) {
        const { item, idx } = filtered[i];

        if (i < sortedIndex) {
          prevEnd = new Date(item.endTime).getTime();
          continue;
        }

        const startMs: number =
          i === sortedIndex && overrides?.startTime
            ? new Date(overrides.startTime).getTime()
            : prevEnd ?? new Date(item.startTime).getTime();
        const endMs: number = startMs + sanitized * 1000;
        prevEnd = endMs;

        const baseRound: OpeningRound = {
          ...cloned[idx],
          startTime: new Date(startMs).toISOString(),
          endTime: new Date(endMs).toISOString(),
          duration: sanitized,
          winningDirection:
            idx === targetIndex && overrides?.winningDirection
              ? overrides.winningDirection
              : cloned[idx].winningDirection,
          tradingPair: idx === targetIndex ? currentTarget.tradingPair : cloned[idx].tradingPair,
        };

        const { round: adjustedRound, trades } = applyPlanOutcomeToRound(baseRound, plan);
        cloned[idx] = adjustedRound;
        tradesUpdate[adjustedRound.id] = trades;
      }

      return cloned;
    });

    if (Object.keys(tradesUpdate).length > 0) {
      setRoundTrades(prev => ({
        ...prev,
        ...tradesUpdate,
      }));
    }

    setPlans(prev =>
      prev.map(planItem =>
        planItem.id === round.planId ? { ...planItem, roundDuration: sanitized } : planItem
      )
    );
  }, []);

  const openRoundDialog = (round: OpeningRound) => {
    if (getRoundStatus(round) === '已結束') {
      return;
    }
    setRoundDialog({
      open: true,
      targetRound: round,
      tradingPair: round.tradingPair,
      startTimeInput: formatIsoToTaipeiInput(round.startTime),
      durationValue: String(round.duration),
      winningDirection: round.winningDirection ?? 'BUY_UP',
      errors: {},
    });
  };

  const closeRoundDialog = () => {
    setRoundDialog(prev => ({
      ...prev,
      open: false,
      targetRound: null,
      errors: {},
    }));
  };

  const handleSaveRound = () => {
    if (!roundDialog.targetRound) return;

    const errors: typeof roundDialog.errors = {};
    if (!roundDialog.tradingPair) {
      errors.tradingPair = '請選擇交易對';
    }
    const planForValidation = plansRef.current.find(p => p.id === roundDialog.targetRound?.planId);
    if (planForValidation && !planForValidation.tradingPairs.includes(roundDialog.tradingPair as TradingPair)) {
      errors.tradingPair = '僅可選擇此方案設定的交易對';
    }
    if (!roundDialog.startTimeInput) {
      errors.startTime = '請輸入開始時間';
    }
    const durationValue = parseInt(roundDialog.durationValue, 10);
    if (!ALLOWED_DURATIONS.includes(durationValue as typeof ALLOWED_DURATIONS[number])) {
      errors.duration = '請選擇有效的交易時長';
    }

    const startIso = convertTaipeiInputToIso(roundDialog.startTimeInput);
    const endTimeMs = new Date(startIso).getTime() + durationValue * 1000;
    const endIso = new Date(endTimeMs).toISOString();
    const startDate = new Date(startIso);
    const endDate = new Date(endIso);
    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
      if (endDate <= startDate) {
        errors.duration = '交易時長必須大於零';
      }
    }

    if (Object.keys(errors).length > 0) {
      setRoundDialog(prev => ({ ...prev, errors }));
      return;
    }

    const owningPlan =
      plansRef.current.find(p => p.id === roundDialog.targetRound?.planId) ??
      plans.find(p => p.id === roundDialog.targetRound?.planId);
    const effectiveResultMode =
      roundDialog.targetRound?.resultMode ??
      owningPlan?.defaultResultMode ??
      'RANDOM';

    handleRoundDurationChange(roundDialog.targetRound, durationValue, {
      tradingPair: roundDialog.tradingPair as TradingPair,
      startTime: startIso,
      winningDirection: roundDialog.winningDirection as 'BUY_UP' | 'BUY_DOWN',
      resultMode: effectiveResultMode,
    });
    closeRoundDialog();
  };

  const handleDateTimeInputInteraction = useCallback(
    (event: FocusEvent<HTMLInputElement> | MouseEvent<HTMLInputElement>) => {
      if (typeof (event.currentTarget as HTMLInputElement).showPicker === 'function') {
        (event.currentTarget as HTMLInputElement).showPicker();
      }
    },
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">開盤設置</h1>
          <p className="text-sm text-muted-foreground">管理自動開盤產生的排程與交易對。</p>
          <p className="text-xs text-muted-foreground mt-1">目前共有 {plans.length} 組設定，其中 {activeCount} 組正在持續生成。</p>
        </div>
        <Button onClick={openCreateDialog} className="w-full sm:w-auto" size="lg">
          <Plus className="mr-2 h-4 w-4" /> 新增開盤方案
        </Button>
      </div>

      <Tabs defaultValue="management" className="space-y-6">
        <TabsList>
          <TabsTrigger value="management">大盤管理</TabsTrigger>
          <TabsTrigger value="details">開盤細節</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>開盤方案列表</CardTitle>
              <CardDescription>檢視所有開盤方案的狀態與小盤資訊。</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {plans.length === 0 ? (
                <div className="py-20 text-center text-sm text-muted-foreground">目前尚未建立開盤方案。</div>
              ) : (
                <div className="overflow-auto" style={{ minHeight: 0 }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[160px]">方案名稱</TableHead>
                        <TableHead className="min-w-[180px]">開始時間</TableHead>
                        <TableHead className="min-w-[120px]">狀態</TableHead>
                        <TableHead className="min-w-[100px]">小盤數量</TableHead>
                        <TableHead className="min-w-[140px] text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map(plan => {
                        const { dateText, timeText } = formatDateLabel(plan.startTime);
                        const roundCount = openedRounds.filter(round => round.planId === plan.id).length;
                        const status = plan.isEnded ? '已結束' : plan.isActive ? '進行中' : '未啟動';
                        return (
                          <TableRow key={plan.id}>
                            <TableCell className="font-medium">{plan.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{dateText}</span>
                                <span className="text-xs text-muted-foreground">{timeText}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {plan.isEnded ? (
                                <Badge variant="destructive">{status}</Badge>
                              ) : plan.isActive ? (
                                <Badge variant="default">{status}</Badge>
                              ) : (
                                <Badge variant="outline">{status}</Badge>
                              )}
                            </TableCell>
                            <TableCell>{roundCount}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openEditDialog(plan)}
                                  aria-label="編輯開盤方案"
                                  disabled={openedRounds.some(round => round.planId === plan.id && getRoundStatus(round) !== '未開始')}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDeletePlan(plan.id)}
                                  aria-label="刪除開盤方案"
                                  disabled={openedRounds.some(round => round.planId === plan.id && getRoundStatus(round) !== '未開始')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          {selectedPlan ? (
            <>
              <Card className="min-h-[30vh]">
                <CardHeader>
                  <CardTitle>大盤設定</CardTitle>
                  <CardDescription>檢視大盤基本資訊與控制狀態。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>選擇大盤</Label>
                      <Select
                        value={selectedPlanId ?? ''}
                        onValueChange={(value) => setSelectedPlanId(value || null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="選擇大盤" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map(plan => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>開始時間</Label>
                      <Input
                        value={
                          selectedPlan
                            ? formatDateLabel(selectedPlan.startTime).dateText +
                              ' ' +
                              formatDateLabel(selectedPlan.startTime).timeText
                            : ''
                        }
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>狀態</Label>
                      <div className="flex items-center gap-2">
                        {selectedPlan?.isEnded ? (
                          <Badge variant="destructive">已結束</Badge>
                        ) : selectedPlan?.isActive ? (
                          <Badge variant="default">進行中</Badge>
                        ) : (
                          <Badge variant="outline">未啟動</Badge>
                        )}
                        {selectedPlan && !selectedPlan.isEnded && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleEndPlan(selectedPlan.id)}
                            disabled={selectedPlan.isEnded}
                          >
                            結束大盤
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedPlanRounds.length > 0 ? (
                    <div className="space-y-4">
                      <Tabs
                        value={selectedMiniRoundId ?? selectedPlanRounds[0].id}
                        onValueChange={value => setSelectedMiniRoundId(value)}
                      >
                        <TabsList className="flex w-full overflow-x-auto justify-start">
                          {selectedPlanRounds.map(round => (
                            <TabsTrigger
                              key={round.id}
                              value={round.id}
                              className="whitespace-nowrap px-[8px] py-[4px] text-xs sm:text-sm"
                            >
                              {round.roundNumber}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        {selectedPlanRounds.map(round => (
                          <TabsContent key={round.id} value={round.id}>
                          </TabsContent>
                        ))}
                      </Tabs>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      目前沒有小盤資料
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="min-h-[150vh] bg-gray-100">
                <CardContent className="p-0">
                  <div className="overflow-x-auto pb-2">
                    <div className="flex gap-4 p-3">
                      {tradeCardItems.map(card => {
                        const currentFilter = cardFilterRules.get(card.key) || 'MANUAL';
                        // 檢查是否是時長容器（30s、60s等）
                        const durationMatch = card.key.match(/^duration-(\d+)$/);
                        const duration = durationMatch ? parseInt(durationMatch[1], 10) : null;
                        const countdown = duration ? getDurationCountdown(duration) : null;
                        return (
                          <Card key={card.key} className="w-[300px] flex-shrink-0 flex flex-col" style={{ height: '150vh' }}>
                            <CardHeader className="flex-shrink-0 pt-3 px-3 pb-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-col gap-1">
                                  <CardTitle className="text-sm">{card.title}</CardTitle>
                                  {countdown && (
                                    <span className="text-xs text-blue-600 font-medium">
                                      倒數：{countdown}
                                    </span>
                                  )}
                                </div>
                                <Select
                                  value={currentFilter}
                                  onValueChange={(value: 'ALL_LOSE' | 'ALL_WIN' | 'MANUAL' | 'RANDOM') =>
                                    handleCardFilterChange(card.key, value, card.entries)
                                  }
                                >
                                  <SelectTrigger className="h-7 w-[100px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ALL_LOSE">全用戶輸</SelectItem>
                                    <SelectItem value="ALL_WIN">全用戶贏</SelectItem>
                                    <SelectItem value="RANDOM">隨機輸贏</SelectItem>
                                    <SelectItem value="MANUAL">個別設置</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3 flex-1 overflow-y-auto p-3">
                              {card.entries.length === 0 ? (
                                <p className="py-6 text-center text-xs text-muted-foreground">{card.emptyText}</p>
                              ) : (
                                card.entries.map(({ trade, round }) => {
                                  const direction = trade.direction as 'BUY_UP' | 'BUY_DOWN';
                                  const meta = WINNING_DIRECTION_META[direction];
                                  const IconComponent = meta.icon;
                                  const placedAt = formatDateLabel(trade.placedAt);
                                  return (
                                    <div key={`${round.id}-${trade.id}`} className="rounded-md border px-3 py-3 space-y-2">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1 text-xs text-muted-foreground">
                                          <p className="text-sm font-medium text-foreground">{trade.userName}</p>
                                          <p>交易對：{trade.tradingPair}</p>
                                          <p>小盤：{round.roundNumber}</p>
                                        </div>
                                        <Switch
                                          checked={trade.isWinning}
                                          onCheckedChange={value => handleToggleTradeResult(trade.id, value, card.key)}
                                          className="scale-75"
                                        />
                                      </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>{placedAt.dateText} {placedAt.timeText}</span>
                                      <span>下注 ${trade.amount.toLocaleString()}</span>
                                    </div>
                                    <span
                                      className={cn(
                                        'inline-flex w-full items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                                        meta.className
                                      )}
                                    >
                                      <IconComponent className="h-3.5 w-3.5" />
                                      {WINNING_DIRECTION_LABEL[direction]}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                請先選擇一個大盤
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogState.open} onOpenChange={(open) => (open ? setDialogState(prev => ({ ...prev, open })) : closeDialog())}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogState.editingPlan ? '編輯開盤方案' : '新增開盤方案'}</DialogTitle>
            <DialogDescription>
              設定開始時間、交易對與每盤秒數。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="plan-name">方案名稱</Label>
              <Input
                id="plan-name"
                value={dialogState.nameInput}
                onChange={(e) => setDialogState(prev => ({ ...prev, nameInput: e.target.value }))}
              />
              {dialogState.errors.name && (
                <p className="text-xs text-destructive">{dialogState.errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-start-time">開始時間</Label>
              <Input
                id="plan-start-time"
                type="datetime-local"
                step="1"
                value={dialogState.startTimeInput}
                onChange={(e) => setDialogState(prev => ({ ...prev, startTimeInput: e.target.value }))}
                className="pointer-events-auto"
                onClick={handleDateTimeInputInteraction}
                onFocus={handleDateTimeInputInteraction}
              />
              {dialogState.errors.startTime && (
                <p className="text-xs text-destructive">{dialogState.errors.startTime}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-result-filter">輸贏篩選</Label>
              <Select
                value={dialogState.defaultResultMode}
                onValueChange={(value) =>
                  setDialogState(prev => ({
                    ...prev,
                    defaultResultMode: value as ResultFilterMode
                  }))
                }
              >
                <SelectTrigger id="plan-result-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RESULT_FILTER_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              取消
            </Button>
            <Button
              onClick={handleSavePlan}
            >
              確認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roundDialog.open} onOpenChange={(open) => (open ? setRoundDialog(prev => ({ ...prev, open })) : closeRoundDialog())}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>編輯盤資訊</DialogTitle>
            <DialogDescription>僅限進行中的盤可調整交易對與時間。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>交易對</Label>
              <Select
                value={roundDialog.tradingPair || ''}
                onValueChange={(value) =>
                  setRoundDialog(prev => ({ ...prev, tradingPair: value as TradingPair }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇交易對" />
                </SelectTrigger>
                <SelectContent>
                  {roundDialogPlanPairs.map(pair => (
                    <SelectItem key={pair} value={pair}>
                      {pair}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roundDialog.errors.tradingPair && (
                <p className="text-xs text-destructive">{roundDialog.errors.tradingPair}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="round-start-time">開始時間</Label>
              <Input
                id="round-start-time"
                type="datetime-local"
                step="1"
                value={roundDialog.startTimeInput}
                onChange={(e) => setRoundDialog(prev => ({ ...prev, startTimeInput: e.target.value }))}
                className="pointer-events-auto"
                onClick={handleDateTimeInputInteraction}
                onFocus={handleDateTimeInputInteraction}
              />
              {roundDialog.errors.startTime && (
                <p className="text-xs text-destructive">{roundDialog.errors.startTime}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="round-duration">交易時長（秒）</Label>
              <Select
                value={roundDialog.durationValue}
                onValueChange={(value) => setRoundDialog(prev => ({ ...prev, durationValue: value }))}
              >
                <SelectTrigger id="round-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWED_DURATIONS.map(option => (
                    <SelectItem key={option} value={String(option)}>
                      {option} 秒
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roundDialog.errors.duration && (
                <p className="text-xs text-destructive">{roundDialog.errors.duration}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>輸贏策略</Label>
                <Select
                  value={
                    roundDialog.targetRound?.resultMode ??
                    selectedPlan?.defaultResultMode ??
                    'RANDOM'
                  }
                  onValueChange={value =>
                    setRoundDialog(prev => ({
                      ...prev,
                      targetRound: prev.targetRound
                        ? { ...prev.targetRound, resultMode: value as ResultFilterMode }
                        : prev.targetRound,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESULT_FILTER_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>勝出方向</Label>
              <Select
                value={roundDialog.winningDirection}
                onValueChange={(value) =>
                  setRoundDialog(prev => ({ ...prev, winningDirection: value as 'BUY_UP' | 'BUY_DOWN' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['BUY_UP', 'BUY_DOWN'] as const).map(direction => {
                    const meta = WINNING_DIRECTION_META[direction];
                    const IconComponent = meta.icon;
                    return (
                      <SelectItem key={direction} value={direction}>
                        <span className="flex items-center gap-2">
                          <IconComponent className={cn('h-4 w-4', direction === 'BUY_UP' ? 'text-green-600' : 'text-red-600')} />
                          <span className={direction === 'BUY_UP' ? 'text-green-600' : 'text-red-600'}>{meta.label}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRoundDialog}>
              取消
            </Button>
            <Button onClick={handleSaveRound}>確認</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={filterConfirmDialog.open} onOpenChange={(open) => setFilterConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認變更</DialogTitle>
            <DialogDescription>
              此操作將變更「全部交易列表」中所有交易的輸贏狀態，是否確定要繼續？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFilterConfirmDialog(prev => ({ ...prev, open: false }))}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                executeCardFilterChange(
                  filterConfirmDialog.cardKey,
                  filterConfirmDialog.filterValue,
                  filterConfirmDialog.cardEntries
                );
                setFilterConfirmDialog(prev => ({ ...prev, open: false }));
              }}
            >
              確認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={endPlanConfirmDialog.open} onOpenChange={(open) => setEndPlanConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認結束大盤</DialogTitle>
            <DialogDescription>
              此操作將停止生成新的小盤，並將大盤標記為已結束。此操作無法復原，是否確定要繼續？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEndPlanConfirmDialog(prev => ({ ...prev, open: false }))}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (endPlanConfirmDialog.planId) {
                  executeEndPlan(endPlanConfirmDialog.planId);
                }
                setEndPlanConfirmDialog(prev => ({ ...prev, open: false }));
              }}
            >
              確認結束
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
