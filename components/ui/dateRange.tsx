import {DateRangeProps} from "@/lib/types/componentProps"
import {switchFilter} from "@/lib/utils/metrics"
import {Button} from "./button"

export default function DateRange({
                                      CustomDateRange,
                                      setCustomDateRange,
                                      setTotals,
                                      setChartData,
                                  }: DateRangeProps) {
    return (
        <div className="mt-4 flex flex-wrap justify-center gap-4">
            <input
                type="date"
                value={CustomDateRange.startDate.toISOString().split("T")[0]}
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
                onClick={() =>
                    switchFilter(
                        "Custom",
                        setTotals,
                        setChartData,
                        CustomDateRange.startDate,
                        CustomDateRange.endDate
                    )
                }
                className="bg-buttonActive text-white px-4 py-2 rounded-lg self-center"
            >
                Apply
            </Button>
        </div>
    )
}
