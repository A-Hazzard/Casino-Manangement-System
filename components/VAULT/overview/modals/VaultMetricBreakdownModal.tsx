
import { Badge } from '@/components/shared/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/shared/ui/table';
import { cn } from '@/lib/utils';
import { VaultTransaction } from '@/shared/types/vault';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type MetricType = 'in' | 'out' | 'payout';

interface VaultMetricBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  type: MetricType;
  title: string;
}

export function VaultMetricBreakdownModal({
  open,
  onOpenChange,
  locationId,
  type,
  title,
}: VaultMetricBreakdownModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VaultTransaction[]>([]);

  useEffect(() => {
    if (open && locationId) {
      fetchData();
    }
  }, [open, locationId, type]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vault/metrics/breakdown?locationId=${locationId}&type=${type}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch breakdown', error);
    } finally {
      setLoading(false);
    }
  };

  const getTxColor = (tx: VaultTransaction) => {
    if (tx.to.type === 'vault') return 'text-green-600 font-medium';
    if (tx.from.type === 'vault') return 'text-red-500 font-medium';
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            {type === 'in' ? <ArrowUpRight className="h-5 w-5 text-violet-600" /> : 
             type === 'out' ? <ArrowDownLeft className="h-5 w-5 text-red-500" /> : <Loader2 className="h-5 w-5 text-violet-600" />}
            {title} Breakdown
          </DialogTitle>
          <DialogDescription className="text-violet-700/80">
            Transactions contributing to this metric for the current gaming day.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
               <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin" />
                  <Loader2 className="absolute inset-0 h-16 w-16 animate-pulse text-violet-200 p-4" />
               </div>
               <p className="text-sm font-black uppercase tracking-widest text-violet-400">Calculating breakdown...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center">
                 <Loader2 className="h-6 w-6 text-gray-200" />
              </div>
              <p className="text-sm font-bold uppercase tracking-tight text-gray-400">No transactions found for this period.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table Selection */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-gray-100">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Time</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Type</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Source/Dest</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((tx) => (
                      <TableRow key={tx._id} className="border-b border-gray-50 hover:bg-violet-50/30 transition-colors">
                        <TableCell className="text-xs font-bold text-gray-500">
                          {format(new Date(tx.timestamp), 'HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-[9px] font-black px-2 py-0.5 h-auto bg-white border-violet-100 text-violet-600 rounded-md">
                            {tx.type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-700">
                              {tx.to.type === 'vault' ? `From ${tx.from.type}` : `To ${tx.to.type}`}
                            </span>
                            {tx.notes && <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">{tx.notes}</p>}
                          </div>
                        </TableCell>
                        <TableCell className={cn("text-right font-black tracking-tight", getTxColor(tx))}>
                          {tx.to.type === 'vault' ? '+' : '-'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Layout */}
              <div className="sm:hidden space-y-4">
                {data.map((tx) => (
                  <div key={tx._id} className="rounded-2xl border border-gray-100 p-4 bg-white shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {format(new Date(tx.timestamp), 'HH:mm:ss')}
                        </div>
                        <Badge variant="outline" className="capitalize text-[9px] font-black px-2 py-0.5 h-auto bg-violet-50 border-violet-100 text-violet-600 rounded-md">
                          {tx.type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className={cn("text-xl font-black tracking-tight", getTxColor(tx))}>
                        {tx.to.type === 'vault' ? '+' : '-'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-50">
                       <span className="text-xs font-bold text-gray-600">
                        {tx.to.type === 'vault' ? `From ${tx.from.type}` : `To ${tx.to.type}`}
                       </span>
                    </div>
                    {tx.notes && (
                      <div className="rounded-xl bg-gray-50/50 p-3 text-[11px] text-gray-500 font-medium leading-relaxed italic border border-gray-100">
                        "{tx.notes}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        <div className="p-5 bg-gray-50 border-t flex justify-between items-center text-sm">
           <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Journal Total Counted:</span>
           <span className={cn("text-2xl font-black tracking-tight", type === 'in' ? 'text-violet-600' : 'text-red-500')}>
              {type === 'in' ? '+' : '-'}${data.reduce((sum, tx) => sum + tx.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
           </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
