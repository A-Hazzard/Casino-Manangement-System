"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

type DropComparisonTableProps = {
  data: {
    headers: string[];
    rows: {
      label: string;
      reported: string;
      collected: string;
      variance: string;
    }[];
  };
};

export default function DropComparisonTable({
  data,
}: DropComparisonTableProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          Drop Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {data.headers.map((header, index) => (
                  <th
                    key={index}
                    className="text-left py-3 px-4 text-sm font-medium text-gray-700"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                    {row.label}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {row.reported}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {row.collected}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span
                      className={`font-medium ${
                        row.variance === "0%"
                          ? "text-green-600"
                          : row.variance.startsWith("-")
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    >
                      {row.variance}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
