import { useState } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";
import { Calendar } from "lucide-react";

const getLastMonthRange = () => {
  const now = new Date();
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: firstDayLastMonth, to: lastDayLastMonth };
};

export default function ActivityDateRangeFilter({
  value,
  onChange,
  onGo,
}: {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  onGo: () => void;
}) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [month, setMonth] = useState(value?.from || new Date());

  const handleLastMonth = () => {
    const range = getLastMonthRange();
    onChange(range);
  };

  const formattedRange =
    value?.from && value?.to
      ? `${format(value.from, "MMM d, yyyy")} - ${format(
          value.to,
          "MMM d, yyyy"
        )}`
      : "Select date range";

  return (
    <div className="w-full px-4 sm:px-8 mb-6">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 w-full">
        <button
          className="bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg px-6 py-3 text-base whitespace-nowrap transition-colors shadow-sm"
          onClick={handleLastMonth}
          type="button"
        >
          Last Month
        </button>
        <div className="relative flex-1 min-w-0">
          <button
            className="flex items-center justify-between w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            onClick={() => setShowCalendar((v) => !v)}
            type="button"
          >
            <span className="truncate text-left font-medium">
              {formattedRange}
            </span>
            <Calendar className="ml-3 w-5 h-5 text-blue-600 flex-shrink-0" />
          </button>
          {showCalendar && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowCalendar(false)}
              />
              <div className="absolute z-50 mt-2 left-0 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden min-w-[320px] max-w-[680px] w-max">
                <div className="p-4">
                  <style
                    dangerouslySetInnerHTML={{
                      __html: `
                      .custom-calendar .rdp {
                        margin: 0;
                        font-family: inherit;
                      }
                      
                      .custom-calendar .rdp-months {
                        display: flex;
                        gap: 1.5rem;
                      }
                      
                      .custom-calendar .rdp-month {
                        margin: 0;
                      }
                      
                      .custom-calendar .rdp-caption {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding-bottom: 0.75rem;
                        margin-bottom: 0.25rem;
                      }
                      
                      .custom-calendar .rdp-caption_label {
                        font-size: 1rem;
                        font-weight: 600;
                        color: #1f2937;
                      }
                      
                      .custom-calendar .rdp-nav {
                        display: flex;
                        gap: 0.25rem;
                      }
                      
                      .custom-calendar .rdp-nav_button {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 28px;
                        height: 28px;
                        border-radius: 4px;
                        border: 1px solid #d1d5db;
                        background: white;
                        color: #6b7280;
                        cursor: pointer;
                        transition: all 0.2s;
                      }
                      
                      .custom-calendar .rdp-nav_button:hover {
                        background: #f3f4f6;
                        border-color: #9ca3af;
                      }
                      
                      .custom-calendar .rdp-table {
                        width: 100%;
                        border-collapse: separate;
                        border-spacing: 1px;
                      }
                      
                      .custom-calendar .rdp-head_cell {
                        width: 32px;
                        height: 24px;
                        text-align: center;
                        font-size: 0.75rem;
                        font-weight: 500;
                        color: #6b7280;
                        padding: 0;
                      }
                      
                      .custom-calendar .rdp-cell {
                        width: 32px;
                        height: 32px;
                        text-align: center;
                        position: relative;
                        padding: 0;
                      }
                      
                      .custom-calendar .rdp-button {
                        width: 100%;
                        height: 100%;
                        border: none;
                        background: transparent;
                        font-size: 0.75rem;
                        font-weight: 500;
                        color: #374151;
                        cursor: pointer;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s;
                        position: relative;
                        z-index: 2;
                      }
                      
                      .custom-calendar .rdp-button:hover {
                        background: #f3f4f6;
                      }
                      
                      .custom-calendar .rdp-button:disabled {
                        color: #d1d5db;
                        cursor: not-allowed;
                      }
                      
                      .custom-calendar .rdp-button:disabled:hover {
                        background: transparent;
                      }
                      
                      /* Range start and end styling - solid blue circles */
                      .custom-calendar .rdp-day_range_start .rdp-button,
                      .custom-calendar .rdp-day_range_end .rdp-button {
                        background: #3b82f6 !important;
                        color: white !important;
                        font-weight: 600;
                      }
                      
                      /* Range middle styling - light blue background */
                      .custom-calendar .rdp-day_range_middle {
                        position: relative;
                      }
                      
                      .custom-calendar .rdp-day_range_middle::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: #dbeafe;
                        z-index: 1;
                      }
                      
                      .custom-calendar .rdp-day_range_middle .rdp-button {
                        background: transparent;
                        color: #1e40af;
                        font-weight: 500;
                        border-radius: 50%;
                      }
                      
                      /* Selected single day */
                      .custom-calendar .rdp-day_selected .rdp-button {
                        background: #3b82f6 !important;
                        color: white !important;
                        font-weight: 600;
                      }
                      
                      /* Today styling */
                      .custom-calendar .rdp-day_today .rdp-button {
                        font-weight: 600;
                        color: #3b82f6;
                      }
                      
                      /* Range start background extension */
                      .custom-calendar .rdp-day_range_start::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 50%;
                        right: 0;
                        bottom: 0;
                        background: #dbeafe;
                        z-index: 1;
                      }
                      
                      /* Range end background extension */
                      .custom-calendar .rdp-day_range_end::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 50%;
                        bottom: 0;
                        background: #dbeafe;
                        z-index: 1;
                      }
                      
                      /* Single day selection (start and end same day) */
                      .custom-calendar .rdp-day_range_start.rdp-day_range_end::before {
                        display: none;
                      }
                      
                      @media (max-width: 1024px) {
                        .custom-calendar .rdp-months {
                          flex-direction: column;
                          gap: 1rem;
                        }
                      }
                      
                      @media (max-width: 640px) {
                        .custom-calendar .rdp-cell,
                        .custom-calendar .rdp-head_cell {
                          width: 28px;
                        }
                        
                        .custom-calendar .rdp-cell {
                          height: 28px;
                        }
                        
                        .custom-calendar .rdp-head_cell {
                          height: 20px;
                        }
                        
                        .custom-calendar .rdp-button {
                          font-size: 0.7rem;
                        }
                        
                        .custom-calendar .rdp-caption_label {
                          font-size: 0.9rem;
                        }
                      }
                    `,
                    }}
                  />
                  <div className="custom-calendar">
                    <DayPicker
                      mode="range"
                      selected={value}
                      onSelect={onChange}
                      numberOfMonths={
                        typeof window !== "undefined" &&
                        window.innerWidth >= 1024
                          ? 2
                          : 1
                      }
                      month={month}
                      onMonthChange={setMonth}
                      showOutsideDays={false}
                      fixedWeeks={false}
                      classNames={{
                        months: "rdp-months",
                        month: "rdp-month",
                        caption: "rdp-caption",
                        caption_label: "rdp-caption_label",
                        nav: "rdp-nav",
                        nav_button: "rdp-nav_button",
                        nav_button_previous: "rdp-nav_button_previous",
                        nav_button_next: "rdp-nav_button_next",
                        table: "rdp-table",
                        head_row: "rdp-head_row",
                        head_cell: "rdp-head_cell",
                        row: "rdp-row",
                        cell: "rdp-cell",
                        button: "rdp-button",
                        day: "rdp-day",
                        day_range_start: "rdp-day_range_start",
                        day_range_end: "rdp-day_range_end",
                        day_range_middle: "rdp-day_range_middle",
                        day_selected: "rdp-day_selected",
                        day_today: "rdp-day_today",
                        day_outside: "rdp-day_outside",
                        day_disabled: "rdp-day_disabled",
                        day_hidden: "rdp-day_hidden",
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <button
          className="bg-buttonActive hover:bg-blue-700 text-white font-semibold rounded-lg px-8 py-3 text-base whitespace-nowrap transition-colors shadow-sm"
          onClick={onGo}
          type="button"
        >
          Go
        </button>
      </div>
    </div>
  );
}
 