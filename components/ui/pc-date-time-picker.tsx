'use client';

import { cn } from '@/lib/utils';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DesktopDateTimePicker } from '@mui/x-date-pickers/DesktopDateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { useEffect, useRef } from 'react';
import './pc-date-time-picker.css';

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

  const handleClose = () => {
    // Let MUI handle the close behavior naturally
    setOpen(false);
  };

  // Handle click outside to close picker - only when clicking outside both input and picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!open) return;

      const target = event.target as HTMLElement;

      // Check if clicking inside the input container
      const isClickInsideContainer = containerRef.current?.contains(target);

      // Check if clicking inside the date picker popper (rendered in portal)
      const isClickInsideDatePicker = target.closest(
        '.MuiPickersPopper-root, .MuiDialog-root, .MuiModal-root, .MuiPaper-root, .MuiPickersLayout-root'
      );

      // Check if clicking on any MUI interactive element
      const isClickOnMuiElement = target.closest(
        'button, [role="button"], .MuiPickersDay-root, .MuiClockNumber-root, .MuiPickersCalendarHeader-switchViewButton'
      );

      // Only close if clicking outside BOTH the container AND the picker
      if (
        !isClickInsideContainer &&
        !isClickInsideDatePicker &&
        !isClickOnMuiElement
      ) {
        setOpen(false);
      }
    };

    if (open) {
      // Use timeout to ensure picker is rendered before attaching listener
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }

    return () => {
      // Cleanup function for when picker is not open
    };
  }, [open]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div ref={containerRef} className={cn('relative', className)}>
        <DesktopDateTimePicker
          value={date || null}
          onChange={handleDateChange}
          open={open}
          onOpen={() => setOpen(true)}
          onClose={handleClose}
          disabled={disabled}
          ampm={true}
          format="MM/dd/yyyy hh:mm a"
          closeOnSelect={false}
          views={['year', 'month', 'day', 'hours', 'minutes']}
          openTo="day"
          timeSteps={{ hours: 1, minutes: 1 }}
          slotProps={{
            textField: {
              InputProps: {
                readOnly: true,
                startAdornment: (
                  <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                ),
                sx: {
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  '& .MuiInputBase-input': {
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    padding: '8px 12px',
                    fontSize: '14px',
                    color: date ? 'inherit' : '#9CA3AF',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#D1D5DB',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: disabled ? '#D1D5DB' : '#9CA3AF',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#3B82F6',
                    borderWidth: '2px',
                  },
                },
              },
            },
            popper: {
              disablePortal: false,
              sx: {
                zIndex: 9999,
                // Mobile responsiveness - constrain width and enable vertical layout
                maxWidth: 'calc(100vw - 2rem)',
                '& .MuiPaper-root': {
                  boxShadow:
                    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  borderRadius: '8px',
                  maxWidth: '100%',
                  // Prevent any unwanted pointer events that close the picker
                  userSelect: 'none',
                },
                // Mobile-friendly calendar layout
                '& .MuiDateCalendar-root': {
                  maxWidth: 'min(320px, calc(100vw - 2rem))',
                  margin: '0 auto',
                },
                // Stack calendar and time picker vertically
                '& .MuiPickersLayout-root': {
                  flexDirection: 'column !important',
                  maxWidth: '100%',
                  display: 'flex !important',
                },
                '& .MuiPickersLayout-contentWrapper': {
                  maxWidth: '100%',
                  display: 'flex',
                  flexDirection: 'column !important',
                },
                // Force vertical stacking of calendar and time sections
                '& .MuiDateTimePickerTabs-root': {
                  display: 'none', // Hide tabs if present
                },
                '& .MuiPickersLayout-toolbar': {
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                },
                // Hide analog clock - we want digital scrollable lists only
                '& .MuiTimeClock-root': {
                  display: 'none !important',
                },
                // Hide clock pointer and numbers
                '& .MuiClock-root': {
                  display: 'none !important',
                },
                // Digital time input below calendar - three columns (hour | minute | AM/PM)
                '& .MuiMultiSectionDigitalClock-root': {
                  width: '100%',
                  marginTop: '16px',
                  display: 'flex !important',
                  flexDirection: 'row !important',
                  justifyContent: 'center',
                  gap: '0px',
                  padding: '0 8px',
                  borderTop: '1px solid #E5E7EB',
                  paddingTop: '16px',
                },
                // Individual time section (hours, minutes, AM/PM) - vertical scrollable columns
                '& .MuiMultiSectionDigitalClockSection-root': {
                  flex: '1 1 0',
                  maxWidth: '80px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                },
                // Section labels (Hour, Minute, AM/PM)
                '& .MuiTypography-overline': {
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#6B7280',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                },
                // Scrollable list container - vertical scroll for each column
                '& .MuiMultiSectionDigitalClockSection-root .MuiList-root': {
                  maxHeight: '180px',
                  overflowY: 'auto',
                  scrollbarWidth: 'thin',
                  width: '100%',
                  padding: '4px',
                  '&::-webkit-scrollbar': {
                    width: '4px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#F3F4F6',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#D1D5DB',
                    borderRadius: '2px',
                  },
                },
                // Time option styling - larger touch targets
                '& .MuiMenuItem-root': {
                  justifyContent: 'center',
                  padding: '10px 12px',
                  minHeight: '44px',
                  fontSize: '16px',
                  borderRadius: '6px',
                  margin: '2px 4px',
                  transition: 'all 0.2s',
                  '&.Mui-selected': {
                    backgroundColor: '#3B82F6 !important',
                    color: '#FFFFFF !important',
                    fontWeight: 700,
                    transform: 'scale(1.05)',
                  },
                  '&:hover': {
                    backgroundColor: '#DBEAFE !important',
                    cursor: 'pointer !important',
                  },
                },
                // Time toolbar below calendar
                '& .MuiPickersToolbar-root': {
                  width: '100%',
                  marginTop: '8px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                },
                // Ensure single column month view
                '& .MuiPickersCalendarHeader-root': {
                  maxWidth: '100%',
                  paddingLeft: '8px',
                  paddingRight: '8px',
                },
                // Adjust day grid
                '& .MuiDayCalendar-weekContainer': {
                  justifyContent: 'space-around',
                },
                // Calendar and time sections stacked vertically
                '& .MuiDateCalendar-root + *': {
                  marginTop: '16px !important',
                },
                // Force pointer events on all elements
                '& *': {
                  pointerEvents: 'auto !important',
                },
                // Calendar day cells - larger touch targets
                '& .MuiPickersDay-root': {
                  cursor: 'pointer !important',
                  pointerEvents: 'auto !important',
                  fontSize: '15px',
                  width: '40px',
                  height: '40px',
                  margin: '2px',
                  '&:hover': {
                    backgroundColor: '#DBEAFE !important',
                  },
                  '&.Mui-selected': {
                    backgroundColor: '#3B82F6 !important',
                    '&:hover': {
                      backgroundColor: '#2563EB !important',
                    },
                  },
                },
                // Month/year navigation - larger buttons
                '& .MuiPickersArrowSwitcher-root button': {
                  cursor: 'pointer !important',
                  pointerEvents: 'auto !important',
                  padding: '12px',
                  '&:hover': {
                    backgroundColor: '#F3F4F6 !important',
                  },
                },
                // Action buttons
                '& .MuiPickersActionBar-root button': {
                  cursor: 'pointer !important',
                  pointerEvents: 'auto !important',
                  '&:hover': {
                    backgroundColor: '#f3f4f6 !important',
                  },
                },
                // All buttons
                '& button': {
                  cursor: 'pointer !important',
                  pointerEvents: 'auto !important',
                  '&:hover': {
                    backgroundColor: '#f3f4f6 !important',
                  },
                },
                // Action bar buttons styling
                '& .MuiDialogActions-root': {
                  padding: '16px',
                  gap: '8px',
                },
                '& .MuiDialogActions-root button': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  minWidth: '80px',
                },
              },
              placement: 'bottom-start',
              modifiers: [
                {
                  name: 'preventOverflow',
                  options: {
                    padding: 8,
                  },
                },
                {
                  name: 'flip',
                  options: {
                    fallbackPlacements: ['top-start', 'bottom-end', 'top-end'],
                  },
                },
              ],
            },
            actionBar: {
              actions: ['accept', 'cancel'],
            },
          }}
        />
      </div>
    </LocalizationProvider>
  );
}
