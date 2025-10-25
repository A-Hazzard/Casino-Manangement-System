import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatLastOnline,
} from './utils/formatting';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { formatCurrency, formatNumber, formatDate, formatLastOnline };
