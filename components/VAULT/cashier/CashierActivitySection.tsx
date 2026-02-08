'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useCashierActivity } from '@/lib/hooks/vault/useCashierActivity';
import {
    ArrowDownLeft,
    ArrowUpRight,
    CheckCircle2,
    Clock,
    History,
    Loader2,
    XCircle
} from 'lucide-react';

export default function CashierActivitySection() {
  const { activities, loading, refreshing, refresh } = useCashierActivity();
  const { formatAmount } = useCurrencyFormat();

  if ((loading || refreshing) && activities.length === 0) {
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
    <Card className="rounded-lg bg-container shadow-md border-t-4 border-orangeHighlight animate-in fade-in duration-500">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-900">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-gray-300">
              <History className="h-4 w-4 text-orangeHighlight" />
          </div>
          Shift & Float History
        </CardTitle>
        <button 
          onClick={() => refresh(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
        >
          {refreshing && <Loader2 className="h-3 w-3 animate-spin" />}
          Refresh History
        </button>
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
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
