import { Button } from "./button";
import { DateRangeProps } from "@/lib/types/componentProps";

export default function DateRange({
  CustomDateRange,
  setCustomDateRange,
  setActiveFilters,
}: Pick<
  DateRangeProps,
  "CustomDateRange" | "setCustomDateRange" | "setActiveFilters"
>) {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-4">
      <input
        type="date"
        value={(
          CustomDateRange.startDate instanceof Date
            ? CustomDateRange.startDate
            : new Date(CustomDateRange.startDate || new Date())
        )
          .toISOString()
          .split("T")[0]}
        onChange={(e) =>
          setCustomDateRange({
            ...CustomDateRange,
            startDate: new Date(e.target.value),
          })
        }
        className="border border-gray-300 rounded-lg p-2"
      />
      <input
        type="date"
        value={CustomDateRange.endDate.toISOString().split("T")[0]}
        onChange={(e) =>
          setCustomDateRange({
            ...CustomDateRange,
            endDate: new Date(e.target.value),
          })
        }
        className="border border-gray-300 rounded-lg p-2"
      />
      <Button
        onClick={() => {
          setActiveFilters({
            Today: false,
            Yesterday: false,
            last7days: false,
            last30days: false,
            Custom: true,
          });
        }}
        className="bg-buttonActive text-white px-4 py-2 rounded-lg self-center"
      >
        Apply
      </Button>
    </div>
  );
}
