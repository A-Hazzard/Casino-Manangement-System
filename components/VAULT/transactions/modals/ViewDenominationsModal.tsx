import { Card, CardContent } from '@/components/shared/ui/card';
import {
    Dialog,
    DialogContent,
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
import type { Denomination } from '@/shared/types/vault';

type ViewDenominationsModalProps = {
  open: boolean;
  onClose: () => void;
  denominations: Denomination[];
  totalAmount: number;
};

export default function ViewDenominationsModal({
  open,
  onClose,
  denominations,
  totalAmount,
}: ViewDenominationsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Denomination Breakdown</DialogTitle>
        </DialogHeader>

        {/* Desktop Table View */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Denomination</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {denominations.map((denom) => (
                <TableRow key={denom.denomination}>
                  <TableCell>${denom.denomination}</TableCell>
                  <TableCell className="text-right">{denom.quantity}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${(denom.denomination * denom.quantity).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={2}>Total Amount</TableCell>
                <TableCell className="text-right">
                  ${totalAmount.toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3 max-h-[60vh] overflow-y-auto p-1">
          {denominations.map((denom) => (
            <Card key={denom.denomination} className="bg-card">
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Bill Value</span>
                  <span className="font-bold text-lg">${denom.denomination}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm text-muted-foreground">Count: {denom.quantity}</span>
                  <span className="font-bold text-lg">
                    ${(denom.denomination * denom.quantity).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="rounded-lg bg-muted p-4 flex justify-between items-center mt-4">
            <span className="font-bold">Total Amount</span>
            <span className="font-bold text-xl">${totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
