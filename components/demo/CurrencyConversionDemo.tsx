"use client";

import React, { useState } from 'react';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { convertCurrency, getCurrencySymbol, getCurrencyName } from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';

/**
 * Demo component to showcase currency conversion functionality
 * This component demonstrates how the currency conversion system works
 */
export function CurrencyConversionDemo() {
  const { displayCurrency, isAllLicensee } = useCurrency();
  const [testAmount, setTestAmount] = useState(100);
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>('USD');
  const [toCurrency, _setToCurrency] = useState<CurrencyCode>('TTD');

  const currencies: CurrencyCode[] = ['USD', 'TTD', 'GYD', 'BBD'];

  const convertedAmount = convertCurrency(testAmount, fromCurrency, toCurrency);

  if (!isAllLicensee) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          Currency Conversion Demo
        </h3>
        <p className="text-blue-600">
          Currency conversion is only available when &quot;All Licensee&quot; is selected.
          Please select &quot;All Licensee&quot; to see the currency conversion functionality.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Currency Conversion Demo
      </h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Currency
            </label>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value as CurrencyCode)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {currencies.map(currency => (
                <option key={currency} value={currency}>
                  {getCurrencySymbol(currency)} {currency} - {getCurrencyName(currency)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">
            {getCurrencySymbol(fromCurrency)}{testAmount.toFixed(2)} {fromCurrency}
          </div>
          <div className="text-lg text-gray-600 my-2">↓</div>
          <div className="text-2xl font-bold text-green-600">
            {getCurrencySymbol(toCurrency)}{convertedAmount.toFixed(2)} {toCurrency}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">Exchange Rates (USD Base)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
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
          <p><strong>Current Display Currency:</strong> {getCurrencySymbol(displayCurrency)} {displayCurrency}</p>
          <p><strong>Conversion Status:</strong> {isAllLicensee ? 'Active' : 'Inactive'}</p>
        </div>
      </div>
    </div>
  );
}

export default CurrencyConversionDemo;
