"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DesktopDateTimePicker } from "@mui/x-date-pickers/DesktopDateTimePicker";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import "./pc-date-time-picker.css";

export type PCDateTimePickerProps = {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function PCDateTimePicker({
  date,
  setDate,
  disabled = false,
  className,
}: PCDateTimePickerProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDateChange = (newDate: Date | null) => {
    if (newDate) {
      setDate(newDate);
      // Don't close immediately - let user select time or click outside
    }
  };

  const handleClose = (event?: unknown, reason?: string) => {
    // Don't close on backdrop click or other internal actions
    if (reason === "backdropClick" || reason === "escapeKeyDown") {
      return;
    }
    setOpen(false);
  };

  // Handle click outside to close picker - but only for clicks outside the MUI picker itself
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!open) return;

      const target = event.target as HTMLElement;

      // Don't close if clicking inside the date picker popper
      const isClickInsideDatePicker = target.closest(
        ".MuiPickersPopper-root, .MuiDialog-root, .MuiModal-root"
      );

      if (isClickInsideDatePicker) {
        return; // Allow clicks inside the picker
      }

      // Close if clicking outside the container and outside the picker
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };

    if (open) {
      // Use capture phase to handle clicks before they bubble
      document.addEventListener("mousedown", handleClickOutside, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [open]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div ref={containerRef} className={cn("relative", className)}>
        <DesktopDateTimePicker
          value={date || null}
          onChange={handleDateChange}
          open={open}
          onOpen={() => setOpen(true)}
          onClose={handleClose}
          disabled={disabled}
          ampm={true}
          format="MM/dd/yyyy hh:mm a"
          slotProps={{
            textField: {
              InputProps: {
                readOnly: true,
                startAdornment: (
                  <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                ),
                sx: {
                  cursor: disabled ? "not-allowed" : "pointer",
                  "& .MuiInputBase-input": {
                    cursor: disabled ? "not-allowed" : "pointer",
                    padding: "8px 12px",
                    fontSize: "14px",
                    color: date ? "inherit" : "#9CA3AF",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#D1D5DB",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: disabled ? "#D1D5DB" : "#9CA3AF",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#3B82F6",
                    borderWidth: "2px",
                  },
                },
              },
            },
            popper: {
              sx: {
                zIndex: 9999,
                "& .MuiPaper-root": {
                  boxShadow:
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  borderRadius: "8px",
                },
                // Force pointer events on all elements
                "& *": {
                  pointerEvents: "auto !important",
                },
                // Calendar day cells
                "& .MuiPickersDay-root": {
                  cursor: "pointer !important",
                  pointerEvents: "auto !important",
                  "&:hover": {
                    backgroundColor: "#f3f4f6 !important",
                  },
                },
                // Month/year navigation
                "& .MuiPickersArrowSwitcher-root button": {
                  cursor: "pointer !important",
                  pointerEvents: "auto !important",
                  "&:hover": {
                    backgroundColor: "#f3f4f6 !important",
                  },
                },
                // Time picker elements
                "& .MuiClock-root *": {
                  cursor: "pointer !important",
                  pointerEvents: "auto !important",
                },
                "& .MuiClock-meridiemButton": {
                  cursor: "pointer !important",
                  "&:hover": {
                    backgroundColor: "#f3f4f6 !important",
                  },
                },
                // Hour and minute selectors
                "& .MuiTimePickerToolbar-root .MuiTypography-root": {
                  cursor: "pointer !important",
                  pointerEvents: "auto !important",
                  "&:hover": {
                    backgroundColor: "#f3f4f6 !important",
                    borderRadius: "4px !important",
                  },
                },
                // Action buttons
                "& .MuiPickersActionBar-root button": {
                  cursor: "pointer !important",
                  pointerEvents: "auto !important",
                  "&:hover": {
                    backgroundColor: "#f3f4f6 !important",
                  },
                },
                // All buttons
                "& button": {
                  cursor: "pointer !important",
                  pointerEvents: "auto !important",
                  "&:hover": {
                    backgroundColor: "#f3f4f6 !important",
                  },
                },
              },
              placement: "bottom-start",
            },
          }}
        />
      </div>
    </LocalizationProvider>
  );
}
