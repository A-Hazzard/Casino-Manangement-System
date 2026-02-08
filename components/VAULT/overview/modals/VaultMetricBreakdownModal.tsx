
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
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'in' ? <ArrowUpRight className="h-5 w-5 text-green-500" /> : 
             type === 'out' ? <ArrowDownLeft className="h-5 w-5 text-red-400" /> : null}
            {title} Breakdown
          </DialogTitle>
          <DialogDescription>
            Transactions contributing to this metric for the current gaming day.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Calculating breakdown...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No transactions found for this period.
            </div>
          ) : (
            <>
              {/* Desktop Table Selection */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader className="sticky top-0 bg-container z-10">
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source/Dest</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((tx) => (
                      <TableRow key={tx._id}>
                        <TableCell className="text-sm">
                          {format(new Date(tx.timestamp), 'HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0 h-5">
                            {tx.type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[200px]">
                          <span className="text-muted-foreground italic">
                            {tx.to.type === 'vault' ? `From ${tx.from.type}` : `To ${tx.to.type}`}
                          </span>
                          {tx.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{tx.notes}</p>}
                        </TableCell>
                        <TableCell className={`text-right ${getTxColor(tx)}`}>
                          {tx.to.type === 'vault' ? '+' : '-'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Layout */}
              <div className="sm:hidden space-y-3">
                {data.map((tx) => (
                  <div key={tx._id} className="rounded-lg border p-3 bg-gray-50/50 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                          {format(new Date(tx.timestamp), 'HH:mm:ss')}
                        </div>
                        <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0 h-5">
                          {tx.type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className={`text-lg font-bold ${getTxColor(tx)}`}>
                        {tx.to.type === 'vault' ? '+' : '-'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    
                    <div className="text-sm">
                       <span className="text-muted-foreground italic">
                        {tx.to.type === 'vault' ? `From ${tx.from.type}` : `To ${tx.to.type}`}
                       </span>
                    </div>
                    {tx.notes && (
                      <div className="rounded bg-white p-2 text-xs text-gray-600 border border-gray-100">
                        {tx.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        <div className="pt-4 border-t flex justify-between items-center text-sm font-semibold">
           <span>Total Counted:</span>
           <span className={type === 'in' ? 'text-green-600' : 'text-red-500'}>
              {type === 'in' ? '+' : '-'}${data.reduce((sum, tx) => sum + tx.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
           </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
