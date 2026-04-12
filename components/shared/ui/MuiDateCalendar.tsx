'use client';
// === Imports ===
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { Paper, ThemeProvider, createTheme, Box, Typography, Button, Divider, Stack, styled } from '@mui/material';
import { useMemo, useState, useEffect, ChangeEvent } from 'react';
import { isWithinInterval, isSameDay, startOfDay, endOfDay } from 'date-fns';

// === Types ===
type MuiDateCalendarProps = {
  date?: Date | null;
  onSelect?: (date?: { from: Date; to: Date }) => void;
  className?: string;
  gameDayOffset?: number;
  /** Label for the apply/go button. Defaults to "Get Meters". */
  buttonLabel?: string;
};

// === Styled Components for Range Highlighting ===
const CustomPickersDay = styled(PickersDay, {
  shouldForwardProp: (prop) => prop !== 'isWithinRange' && prop !== 'isFirstDay' && prop !== 'isLastDay',
})<{
  isWithinRange?: boolean;
  isFirstDay?: boolean;
  isLastDay?: boolean;
}>(({ theme, isWithinRange, isFirstDay, isLastDay }) => ({
  ...(isWithinRange && {
    borderRadius: 0,
    backgroundColor: '#BBDEFB', // More saturated light blue for better visibility
    color: '#0D47A1',           // Dark blue text for high contrast on light blue
    fontWeight: 600,
    '&:hover, &:focus': {
      backgroundColor: theme.palette.primary.main,
      color: '#ffffff',
    },
  }),
  ...(isFirstDay && {
    borderTopLeftRadius: '50%',
    borderBottomLeftRadius: '50%',
    backgroundColor: theme.palette.primary.main + ' !important',
    color: '#ffffff !important',
  }),
  ...(isLastDay && {
    borderTopRightRadius: '50%',
    borderBottomRightRadius: '50%',
    backgroundColor: theme.palette.primary.main + ' !important',
    color: '#ffffff !important',
  }),
}));

// === Helpers ===
// === Sub-components ===
/**
 * Time input component with 12-hour format display and AM/PM selector.
 */
const TimeInput = ({ hours, minutes, onChange, label, color = 'primary.main' }: { 
  hours: number; 
  minutes: number; 
  onChange: (h: number, m: number) => void;
  label: string;
  color?: string;
}) => {
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const isPM = hours >= 12;

  const [hourInput, setHourInput] = useState(displayHour.toString());
  const [minuteInput, setMinuteInput] = useState(minutes.toString().padStart(2, '0'));
  const [isHourFocused, setIsHourFocused] = useState(false);
  const [isMinuteFocused, setIsMinuteFocused] = useState(false);

  useEffect(() => {
    if (!isHourFocused) setHourInput(displayHour.toString());
  }, [displayHour, isHourFocused]);

  useEffect(() => {
    if (!isMinuteFocused) setMinuteInput(minutes.toString().padStart(2, '0'));
  }, [minutes, isMinuteFocused]);

  const handleHoursChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
    setHourInput(value);
    if (value === '') return;
    const parsedHour = parseInt(value);
    if (parsedHour > 0 && parsedHour <= 12) {
      const newHours24 = isPM ? (parsedHour === 12 ? 12 : parsedHour + 12) : (parsedHour === 12 ? 0 : parsedHour);
      onChange(newHours24, minutes);
    }
  };

  const handleMinutesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
    setMinuteInput(value);
    if (value === '') return;
    const parsedMinutes = parseInt(value);
    if (parsedMinutes >= 0 && parsedMinutes <= 59) {
      onChange(hours, parsedMinutes);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <input
          type="text"
          value={hourInput}
          onFocus={() => setIsHourFocused(true)}
          onChange={handleHoursChange}
          onBlur={() => setIsHourFocused(false)}
          style={{ width: '40px', padding: '4px', borderRadius: '4px', border: '1px solid #ddd', textAlign: 'center', fontSize: '13px' }}
        />
        <Typography variant="body2">:</Typography>
        <input
          type="text"
          value={minuteInput}
          onFocus={() => setIsMinuteFocused(true)}
          onChange={handleMinutesChange}
          onBlur={() => setIsMinuteFocused(false)}
          style={{ width: '40px', padding: '4px', borderRadius: '4px', border: '1px solid #ddd', textAlign: 'center', fontSize: '13px' }}
        />
        <select
          value={isPM ? 'PM' : 'AM'}
          onChange={(e) => {
            const newIsPM = e.target.value === 'PM';
            const newHours24 = newIsPM ? (displayHour === 12 ? 12 : displayHour + 12) : (displayHour === 12 ? 0 : displayHour);
            onChange(newHours24, minutes);
          }}
          style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px', background: '#f8f9fa' }}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </Box>
    </Box>
  );
};

// === Main Component ===
export function MuiDateCalendar({ date, onSelect, className, gameDayOffset = 8, buttonLabel = 'Get Meters' }: MuiDateCalendarProps) {
  const [fromDate, setFromDate] = useState<Date>(date || new Date());
  const [toDate, setToDate] = useState<Date>(date || new Date());
  
  const [fromTime, setFromTime] = useState({ hours: gameDayOffset, minutes: 0 });
  const [toTime, setToTime] = useState({ 
    hours: gameDayOffset === 0 ? 23 : (gameDayOffset - 1 + 24) % 24, 
    minutes: 59 
  });

  // Highlight component
  const Day = (props: PickersDayProps) => {
    const { day, ...other } = props;
    const isFirst = isSameDay(day, fromDate);
    const isLast = isSameDay(day, toDate);
    const isBetween = fromDate < toDate && isWithinInterval(day, { start: startOfDay(fromDate), end: endOfDay(toDate) });

    return (
      <CustomPickersDay 
        {...other} 
        day={day} 
        isWithinRange={isBetween} 
        isFirstDay={isFirst} 
        isLastDay={isLast} 
      />
    );
  };

  // Sync internal state with provided date prop when it changes
  useEffect(() => {
    if (date) {
      setFromDate(date);
      // If toDate is before new fromDate, sync it too
      if (toDate < date) setToDate(date);
    }
  }, [date]);

  const theme = useMemo(() => createTheme({
    palette: {
      primary: { main: '#1a73e8', light: '#e8f0fe' },
      secondary: { main: '#757575' }
    },
    typography: { fontFamily: 'inherit' },
  }), []);

  const handleApply = () => {
    const finalStart = new Date(fromDate);
    finalStart.setHours(fromTime.hours, fromTime.minutes, 0, 0);

    const finalEnd = new Date(toDate);
    finalEnd.setHours(toTime.hours, toTime.minutes, 59, 999);

    if (onSelect) {
      onSelect({ from: finalStart, to: finalEnd });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Paper 
        className={className} 
        elevation={10}
        sx={{ 
          borderRadius: 4, 
          overflow: 'hidden',
          display: 'inline-flex',
          flexDirection: 'column',
          border: '1px solid rgba(0,0,0,0.12)',
          background: '#ffffff',
          maxHeight: '90vh', // Prevent overflow on small screens
          maxWidth: '100%',
          overflowY: 'auto'
        }}
      >
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Stack 
            direction={{ xs: 'column', lg: 'row' }} 
            divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', lg: 'block' } }} />}
          >
            {/* Start Section */}
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ p: 1, mb: 1, bgcolor: 'primary.light', borderRadius: 2, width: '100%' }}>
                <TimeInput 
                  label="Start Date & Time" 
                  hours={fromTime.hours} 
                  minutes={fromTime.minutes} 
                  onChange={(h, m) => setFromTime({ hours: h, minutes: m })} 
                  color="primary.main"
                />
              </Box>
              <DateCalendar
                value={fromDate}
                onChange={(newDate) => { 
                  if (newDate) {
                    setFromDate(newDate);
                    if (newDate > toDate) setToDate(newDate);
                  } 
                }}
                slots={{ day: Day }}
                views={['year', 'month', 'day']}
                sx={{
                  margin: 0,
                  width: '320px',
                  '& .MuiPickersDay-root.Mui-selected': { 
                    backgroundColor: 'primary.main !important',
                    color: 'white !important'
                  },
                }}
              />
            </Box>
 
            {/* End Section */}
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: { xs: 'grey.50', lg: 'white' } }}>
              <Box sx={{ p: 1, mb: 1, bgcolor: 'grey.100', borderRadius: 2, width: '100%' }}>
                <TimeInput 
                  label="End Date & Time" 
                  hours={toTime.hours} 
                  minutes={toTime.minutes} 
                  onChange={(h, m) => setToTime({ hours: h, minutes: m })} 
                  color="text.secondary"
                />
              </Box>
              <DateCalendar
                value={toDate}
                onChange={(newDate) => { 
                  if (newDate) {
                    if (newDate < fromDate) {
                      // Prevent selecting end date before start date
                      setFromDate(newDate);
                    }
                    setToDate(newDate);
                  } 
                }}
                slots={{ day: Day }}
                views={['year', 'month', 'day']}
                sx={{
                  margin: 0,
                  width: '320px',
                  '& .MuiPickersDay-root.Mui-selected': { 
                    backgroundColor: 'secondary.main !important',
                    color: 'white !important'
                  },
                }}
              />
            </Box>
 
            {/* Action Section (Only on Desktop/Large screens) */}
            <Box sx={{ 
              p: 3, 
              display: { xs: 'none', lg: 'flex' }, 
              flexDirection: 'column', 
              justifyContent: 'center',
              minWidth: '160px',
              bgcolor: 'grey.50'
            }}>
              <Button
                variant="contained"
                onClick={handleApply}
                sx={{ 
                  py: 2, 
                  borderRadius: '12px', 
                  textTransform: 'none', 
                  fontWeight: 800,
                  fontSize: '1rem',
                  boxShadow: '0 4px 14px rgba(26, 115, 232, 0.4)',
                }}
              >
                {buttonLabel}
              </Button>
            </Box>
          </Stack>
 
          {/* Action Footer (Only on Mobile/Small screens) */}
          <Box sx={{ p: 2, display: { xs: 'block', lg: 'none' }, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleApply}
              sx={{ 
                py: 1.5, 
                borderRadius: '12px', 
                textTransform: 'none', 
                fontWeight: 800,
                fontSize: '1.1rem',
              }}
            >
              {buttonLabel}
            </Button>
          </Box>
        </LocalizationProvider>
      </Paper>
    </ThemeProvider>
  );
}
