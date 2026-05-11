'use client';

import { Badge } from '@/components/shared/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useCashierActivity } from '@/lib/hooks/vault/useCashierActivity';
import { cn } from '@/lib/utils';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Loader2,
  MessageSquare,
  Tickets,
  XCircle,
} from 'lucide-react';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function CashierActivitySection() {
  const { activities, loading, refreshing, refresh } = useCashierActivity();
  const { formatAmount } = useCurrencyFormat();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: 'Welcome to Your Cash Desk!',
      description:
        "You haven't had any shift or float activity yet. Once you start your first shift, your activity logs will appear here.",
      icon: <History className="h-8 w-8 text-button" />,
      color: 'from-indigo-50',
    },
    {
      title: 'Process Payouts & Tickets',
      description:
        'Quickly handle player ticket redemptions and hand pay requests. Use the actions menu to manage payouts efficiently.',
      icon: <Tickets className="h-8 w-8 text-emerald-500" />,
      color: 'from-emerald-50',
    },
    {
      title: 'Vault Communications',
      description:
        'Stay updated on float request approvals and important vault messages. All your interactions are tracked in real-time.',
      icon: <MessageSquare className="h-8 w-8 text-orange-500" />,
      color: 'from-orange-50',
    },
  ];

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % slides.length);
  const prevSlide = () =>
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);

  // Initial refresh
  useEffect(() => {
    refresh(false);
  }, [refresh]);

  // Poll for updates every 30 seconds only if at least 2 items
  useEffect(() => {
    if (activities.length < 2) return;

    const interval = setInterval(() => {
      refresh(true);
    }, 30000); // 30 seconds polling
    return () => clearInterval(interval);
  }, [refresh, activities.length]);

  const handleCancel = useCallback(
    async (requestId: string) => {
      try {
        const res = await fetch('/api/vault/float-request/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId }),
        });
        const data = await res.json();

        if (data.success) {
          toast.success('Request cancelled successfully');
          refresh(true);
        } else {
          toast.error(data.error || 'Failed to cancel request');
        }
      } catch {
        toast.error('Network error - could not cancel request');
      }
    },
    [refresh]
  );

  if (loading && activities.length === 0) {
    // ... skeleton code ...
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // If NO activities at all (and no date filter), show the welcome slider
  if (activities.length === 0 && !loading) {
    const slide = slides[currentSlide];
    return (
      <div className="mt-4 border-t border-gray-100 pt-4">
        <Card
          className={`shadow-premium relative rounded-xl border-none bg-gradient-to-br ${slide.color} items-center justify-center border-t-4 border-t-button p-8 text-center transition-all duration-500`}
        >
          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/50 p-2 text-gray-400 shadow-sm transition-all hover:bg-white hover:text-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/50 p-2 text-gray-400 shadow-sm transition-all hover:bg-white hover:text-button"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="duration-500 animate-in fade-in zoom-in-95">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg">
              {slide.icon}
            </div>
            <h3 className="mb-2 text-xl font-black text-gray-900">
              {slide.title}
            </h3>
            <p className="mx-auto min-h-[40px] max-w-sm text-sm text-gray-600">
              {slide.description}
            </p>
          </div>

          <div className="mt-8 flex justify-center gap-3">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`rounded-full transition-all duration-300 ${
                  currentSlide === idx
                    ? 'h-2 w-6 bg-button'
                    : 'h-2 w-2 bg-button/20 hover:bg-button/40'
                }`}
              />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
      case 'completed':
        return (
          <Badge className="border-none bg-green-100 uppercase text-green-700 hover:bg-green-100">
            {status === 'active' ? 'APPROVED' : status}
          </Badge>
        );
      case 'pending':
      case 'pending_start':
        return (
          <Badge className="border-none bg-orange-100 text-orange-700 hover:bg-orange-100">
            PENDING
          </Badge>
        );
      case 'denied':
      case 'cancelled':
      case 'closed':
        return (
          <Badge className="border-none bg-red-100 uppercase text-red-700 hover:bg-red-100">
            {status}
          </Badge>
        );
      case 'pending_review':
        return (
          <Badge className="border-none bg-purple-100 uppercase text-purple-700 hover:bg-purple-100">
            REVIEW
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getIcon = (type: string, action: string, status: string) => {
    if (status === 'denied' || status === 'cancelled')
      return <XCircle className="h-5 w-5 text-red-400" />;
    if (status === 'pending' || status === 'pending_start')
      return <Clock className="h-5 w-5 text-orange-400" />;

    if (action.includes('Increase'))
      return <ArrowUpRight className="h-5 w-5 text-blue-400" />;
    if (action.includes('Decrease'))
      return <ArrowDownLeft className="h-5 w-5 text-purple-400" />;

    if (type === 'payout') return <Tickets className="h-5 w-5 text-red-400" />;

    return <CheckCircle2 className="h-5 w-5 text-green-400" />;
  };

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <Card className="rounded-lg border-t-4 border-orangeHighlight bg-container shadow-md duration-500 animate-in fade-in">
        <CardHeader className="flex flex-col items-start justify-between space-y-4 pb-4 sm:flex-row sm:items-center sm:space-y-0">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-gray-300">
              <History className="h-4 w-4 text-orangeHighlight" />
            </div>
            Shift & Float History
          </CardTitle>

          <div className="flex w-full items-center gap-3 sm:w-auto">
            <button
              onClick={() => refresh(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {refreshing && <Loader2 className="h-3 w-3 animate-spin" />}
              Refresh
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {activities.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed py-8 text-center text-sm italic text-gray-500">
                No recent activity found
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {activities.map(activity => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-4 rounded-lg border-b border-gray-100 p-3 transition-colors last:border-0 hover:bg-gray-50"
                  >
                    <div className="mt-1">
                      {getIcon(activity.type, activity.action, activity.status)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-gray-900">
                          {activity.action}
                        </p>
                        <div className="flex-shrink-0">
                          {activity.amount !== undefined && (
                            <span
                              className={cn(
                                'text-sm font-bold',
                                activity.isOutflow
                                  ? 'text-red-500'
                                  : 'text-button'
                              )}
                            >
                              {activity.isOutflow && '-'}
                              {formatAmount(activity.amount)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
                          {activity.timestamp.toLocaleDateString()}{' '}
                          {activity.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-gray-300">•</span>
                        {getStatusBadge(activity.status)}
                      </div>

                      {activity.notes && (
                        <p className="mt-2 line-clamp-2 rounded bg-gray-100/50 p-2 text-xs italic text-gray-600">
                          {activity.notes}
                        </p>
                      )}

                      {activity.details && (
                        <p className="mt-1 text-[11px] font-bold text-red-600">
                          {activity.details}
                        </p>
                      )}

                      {/* Cancel Action for Pending Requests */}
                      {activity.status === 'pending' && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => handleCancel(activity.id)}
                            className="rounded border border-transparent px-2 py-1 text-xs font-semibold text-red-500 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-700"
                          >
                            Cancel Request
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
