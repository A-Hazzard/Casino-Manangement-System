'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useCashierActivity } from '@/lib/hooks/vault/useCashierActivity';
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
  XCircle
} from 'lucide-react';

import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function CashierActivitySection() {
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const { activities, loading, refreshing, refresh } = useCashierActivity();
  const { formatAmount } = useCurrencyFormat();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Welcome to Your Cash Desk!",
      description: "You haven't had any shift or float activity yet. Once you start your first shift, your activity logs will appear here.",
      icon: <History className="h-8 w-8 text-button" />,
      color: "from-indigo-50"
    },
    {
      title: "Process Payouts & Tickets",
      description: "Quickly handle player ticket redemptions and hand pay requests. Use the actions menu to manage payouts efficiently.",
      icon: <Tickets className="h-8 w-8 text-emerald-500" />,
      color: "from-emerald-50"
    },
    {
      title: "Vault Communications",
      description: "Stay updated on float request approvals and important vault messages. All your interactions are tracked in real-time.",
      icon: <MessageSquare className="h-8 w-8 text-orange-500" />,
      color: "from-orange-50"
    }
  ];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  // Initial and conditional refresh
  useEffect(() => {
    if (filterDate) {
      const start = new Date(filterDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filterDate);
      end.setHours(23, 59, 59, 999);
      refresh(false, start.toISOString(), end.toISOString());
    } else {
        refresh(false);
    }
  }, [filterDate, refresh]);

  // Poll for updates every 20 seconds only if at least 2 items
  useEffect(() => {
    if (activities.length < 2) return;

    const interval = setInterval(() => {
      if (filterDate) {
          const start = new Date(filterDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(filterDate);
          end.setHours(23, 59, 59, 999);
          refresh(true, start.toISOString(), end.toISOString());
      } else {
          refresh(true);
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [refresh, activities.length, filterDate]);

  const handleCancel = useCallback(async (requestId: string) => {
    try {
      const res = await fetch('/api/vault/float-request/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
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
  }, [refresh]);

  if (loading && activities.length === 0) {
    // ... skeleton code ...
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full animate-pulse bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse bg-gray-100 rounded" />
                  <div className="h-3 w-24 animate-pulse bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }



  // If NO activities at all (and no date filter), show the welcome slider
  if (activities.length === 0 && !filterDate && !loading) {
      const slide = slides[currentSlide];
      return (
          <div className="pt-4 mt-4 border-t border-gray-100">
            <Card className={`relative rounded-xl border-none shadow-premium bg-gradient-to-br ${slide.color} items-center justify-center border-t-4 border-t-button text-center p-8 transition-all duration-500`}>
                {/* Navigation Arrows */}
                <button 
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/50 hover:bg-white shadow-sm text-gray-400 hover:text-button transition-all z-10"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button 
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/50 hover:bg-white shadow-sm text-gray-400 hover:text-button transition-all z-10"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="animate-in fade-in zoom-in-95 duration-500">
                    <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4">
                        {slide.icon}
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">{slide.title}</h3>
                    <p className="text-sm text-gray-600 max-w-sm mx-auto min-h-[40px]">
                        {slide.description}
                    </p>
                </div>

                <div className="mt-8 flex justify-center gap-3">
                    {slides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`transition-all duration-300 rounded-full ${
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
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">APPROVED</Badge>;
      case 'pending':
      case 'pending_start':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">PENDING</Badge>;
      case 'denied':
      case 'cancelled':
      case 'closed':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none uppercase">{status}</Badge>;
      case 'pending_review':
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none uppercase">REVIEW</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getIcon = (type: string, action: string, status: string) => {
    if (status === 'denied' || status === 'cancelled') return <XCircle className="h-5 w-5 text-red-400" />;
    if (status === 'pending' || status === 'pending_start') return <Clock className="h-5 w-5 text-orange-400" />;
    
    if (action.includes('Increase')) return <ArrowUpRight className="h-5 w-5 text-blue-400" />;
    if (action.includes('Decrease')) return <ArrowDownLeft className="h-5 w-5 text-purple-400" />;
    
    return <CheckCircle2 className="h-5 w-5 text-green-400" />;
  };

  return (
    <div className="pt-4 mt-4 border-t border-gray-100">
      <Card className="rounded-lg bg-container shadow-md border-t-4 border-orangeHighlight animate-in fade-in duration-500">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-900">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-gray-300">
              <History className="h-4 w-4 text-orangeHighlight" />
          </div>
          Shift & Float History
        </CardTitle>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
            <ModernCalendar 
                mode="single"
                date={filterDate ? { from: filterDate } : undefined}
                onSelect={(range) => setFilterDate(range?.from)}
                className="w-full sm:w-48"
            />
            {filterDate && (
                <button 
                    onClick={() => setFilterDate(undefined)}
                    className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase tracking-tighter"
                >
                    Clear
                </button>
            )}
            <div className="h-4 w-[1px] bg-gray-200 hidden sm:block mx-1"></div>
            <button 
              onClick={() => refresh(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 whitespace-nowrap"
            >
              {refreshing && <Loader2 className="h-3 w-3 animate-spin" />}
              Refresh
            </button>
        </div>
      </CardHeader>
      <CardContent>
      <div className="space-y-1">
          {activities.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500 italic border-2 border-dashed rounded-lg">
              No recent activity found
            </div>
          ) : (
            activities.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
              >
                <div className="mt-1">
                  {getIcon(activity.type, activity.action, activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {activity.action}
                    </p>
                    <div className="flex-shrink-0">
                      {activity.amount !== undefined && (
                        <span className={activity.amount > 0 ? 'text-sm font-bold text-button' : 'text-sm font-bold text-orangeHighlight'}>
                          {formatAmount(activity.amount)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                      {activity.timestamp.toLocaleDateString()} {activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-gray-300">•</span>
                    {getStatusBadge(activity.status)}
                  </div>

                  {activity.notes && (
                    <p className="mt-2 text-xs text-gray-600 bg-gray-100/50 p-2 rounded italic line-clamp-2">
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
                        className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 py-1 px-2 rounded transition-colors border border-transparent hover:border-red-100"
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
