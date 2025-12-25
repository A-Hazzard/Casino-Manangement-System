'use client';

import { useState } from 'react';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import {
  convertCurrency,
  getCurrencySymbol,
  getCurrencyName,
} from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';

/**
 * Demo component to showcase currency conversion functionality
 * This component demonstrates how the currency conversion system works
 */
export function CurrencyConversionDemo() {
  const { displayCurrency, isAllLicensee } = useCurrency();
  const [testAmount, setTestAmount] = useState(100);
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>('USD');
  const [toCurrency] = useState<CurrencyCode>('TTD');

  const currencies: CurrencyCode[] = ['USD', 'TTD', 'GYD', 'BBD'];

  const convertedAmount = convertCurrency(testAmount, fromCurrency, toCurrency);

  if (!isAllLicensee) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 text-lg font-semibold text-blue-800">
          Currency Conversion Demo
        </h3>
        <p className="text-blue-600">
          Currency conversion is only available when &quot;All Licensee&quot; is
          selected. Please select &quot;All Licensee&quot; to see the currency
          conversion functionality.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-xl font-semibold text-gray-800">
        Currency Conversion Demo
      </h3>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Amount
            </label>
            <input
              type="number"
              value={testAmount}
              onChange={e => setTestAmount(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              From Currency
            </label>
            <select
              value={fromCurrency}
              onChange={e => setFromCurrency(e.target.value as CurrencyCode)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {currencies.map(currency => (
                <option key={currency} value={currency}>
                  {getCurrencySymbol(currency)} {currency} -{' '}
                  {getCurrencyName(currency)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">
            {getCurrencySymbol(fromCurrency)}
            {testAmount.toFixed(2)} {fromCurrency}
          </div>
          <div className="my-2 text-lg text-gray-600">↓</div>
          <div className="text-2xl font-bold text-green-600">
            {getCurrencySymbol(toCurrency)}
            {convertedAmount.toFixed(2)} {toCurrency}
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <h4 className="mb-2 font-semibold text-gray-700">
            Exchange Rates (USD Base)
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <div className="text-center">
              <div className="font-medium">USD</div>
              <div className="text-gray-600">1.00</div>
            </div>
            <div className="text-center">
              <div className="font-medium">TTD</div>
              <div className="text-gray-600">6.75</div>
            </div>
            <div className="text-center">
              <div className="font-medium">GYD</div>
              <div className="text-gray-600">209.5</div>
            </div>
            <div className="text-center">
              <div className="font-medium">BBD</div>
              <div className="text-gray-600">2.00</div>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p>
            <strong>Current Display Currency:</strong>{' '}
            {getCurrencySymbol(displayCurrency)} {displayCurrency}
          </p>
          <p>
            <strong>Conversion Status:</strong>{' '}
            {isAllLicensee ? 'Active' : 'Inactive'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default CurrencyConversionDemo;
