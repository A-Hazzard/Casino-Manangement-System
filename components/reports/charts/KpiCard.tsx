import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

type KpiCardProps = {
  title: string;
  value: number | string;
  format: "currency" | "number" | "fraction";
  icon: React.ReactElement<LucideIcon>;
  change?: number;
  trend?: "up" | "down" | "stable";
};

export const KpiCard = ({ title, value, format, icon }: KpiCardProps) => {
  const formatValue = () => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value as number);
    }
    if (format === 'number') {
      return new Intl.NumberFormat('en-US').format(value as number);
    }
    return value;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue()}</div>
      </CardContent>
    </Card>
  );
};
