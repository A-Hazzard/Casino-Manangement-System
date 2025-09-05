"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Globe } from "lucide-react";
import type { CurrencyCode } from "@/shared/types";
import { getCurrencySymbol, getCurrencyName } from "@/lib/utils/currency";

interface CurrencyFilterProps {
  selectedLicensee?: string;
  className?: string;
}

/**
 * Currency Filter Component
 * Allows users to toggle between different currencies for financial display
 * Defaults to licensee currency, but can be overridden by user
 */
export default function CurrencyFilter({
  selectedLicensee,
  className = "",
}: CurrencyFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("USD");
  const [isUserOverride, setIsUserOverride] = useState(false);

  // Get default currency for selected licensee
  const getDefaultCurrency = useCallback((): CurrencyCode => {
    if (!selectedLicensee) return "USD";

    // Import the constant dynamically to avoid build issues
    const licenseeDefaults: Record<string, CurrencyCode> = {
      TTG: "TTD",
      Cabana: "GYD",
      Barbados: "BBD",
    };

    return licenseeDefaults[selectedLicensee] || "USD";
  }, [selectedLicensee]);

  // Initialize currency from URL params, localStorage, or licensee default
  useEffect(() => {
    const urlCurrency = searchParams.get("currency") as CurrencyCode;
    const storedCurrency = localStorage.getItem(
      "selectedCurrency"
    ) as CurrencyCode;
    const defaultCurrency = getDefaultCurrency();

    let finalCurrency: CurrencyCode;
    let finalIsOverride: boolean;

    if (urlCurrency && ["TTD", "GYD", "BBD", "USD"].includes(urlCurrency)) {
      finalCurrency = urlCurrency;
      finalIsOverride = true;
    } else if (
      storedCurrency &&
      ["TTD", "GYD", "BBD", "USD"].includes(storedCurrency)
    ) {
      finalCurrency = storedCurrency;
      finalIsOverride = true;
    } else {
      finalCurrency = defaultCurrency;
      finalIsOverride = false;
    }

    setSelectedCurrency(finalCurrency);
    setIsUserOverride(finalIsOverride);

    // Update localStorage if not already set
    if (!localStorage.getItem("selectedCurrency")) {
      localStorage.setItem("selectedCurrency", finalCurrency);
    }
  }, [selectedLicensee, searchParams, getDefaultCurrency]);

  // Update URL and localStorage when currency changes
  const handleCurrencyChange = (currency: CurrencyCode) => {
    setSelectedCurrency(currency);
    setIsUserOverride(true);

    // Update localStorage
    localStorage.setItem("selectedCurrency", currency);

    // Update URL params
    const params = new URLSearchParams(searchParams);
    params.set("currency", currency);

    // Preserve other query params
    const newUrl = `${pathname}?${params.toString()}`;
    router.push(newUrl);
  };

  // Reset to licensee default
  const handleResetToDefault = () => {
    const defaultCurrency = getDefaultCurrency();
    setSelectedCurrency(defaultCurrency);
    setIsUserOverride(false);

    // Remove from localStorage and URL
    localStorage.removeItem("selectedCurrency");

    const params = new URLSearchParams(searchParams);
    params.delete("currency");

    const newUrl = `${pathname}?${params.toString()}`;
    router.push(newUrl);
  };

  const defaultCurrency = getDefaultCurrency();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-gray-700">Currency:</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`min-w-[120px] justify-between ${
              isUserOverride ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="font-medium">
                {getCurrencySymbol(selectedCurrency)} {selectedCurrency}
              </span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-xs text-gray-500 border-b">
            {isUserOverride ? "User Override" : "Licensee Default"}
          </div>

          {["TTD", "GYD", "BBD", "USD"].map((currency) => (
            <DropdownMenuItem
              key={currency}
              onClick={() => handleCurrencyChange(currency as CurrencyCode)}
              className={`flex items-center justify-between ${
                selectedCurrency === currency ? "bg-blue-50 text-blue-700" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {getCurrencySymbol(currency as CurrencyCode)}
                </span>
                <span>{currency}</span>
              </div>
              <span className="text-xs text-gray-500">
                {getCurrencyName(currency as CurrencyCode)}
              </span>
            </DropdownMenuItem>
          ))}

          {isUserOverride && (
            <>
              <div className="border-t my-1" />
              <DropdownMenuItem
                onClick={handleResetToDefault}
                className="text-gray-600 hover:text-gray-800"
              >
                <span className="text-sm">
                  Reset to Default ({getCurrencySymbol(defaultCurrency)}{" "}
                  {defaultCurrency})
                </span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {isUserOverride && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetToDefault}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Reset
        </Button>
      )}
    </div>
  );
}
