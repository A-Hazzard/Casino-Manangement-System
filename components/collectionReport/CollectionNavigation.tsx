"use client";

import { motion } from "framer-motion";
import type { CollectionView, CollectionTab } from "@/lib/types/collection";

type Props = {
  tabs: CollectionTab[];
  activeView: CollectionView;
  onChange: (view: CollectionView) => void;
  isLoading?: boolean;
};

export default function CollectionNavigation({
  tabs,
  activeView,
  onChange,
  isLoading = false,
}: Props) {
  return (
    <div className="border-b border-gray-200 bg-white rounded-lg shadow-sm">
      {/* Desktop - md: and above */}
      <nav className="hidden md:flex space-x-1 md:space-x-2 lg:justify-between lg:space-x-0 px-1 md:px-2 lg:px-6">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`navigation-button flex items-center space-x-0.5 md:space-x-1 lg:space-x-2 py-1 md:py-2 lg:py-4 px-0.5 md:px-1 lg:px-2 border-b-2 font-medium text-xs xl:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
              activeView === tab.id
                ? "border-buttonActive text-buttonActive bg-buttonActive/5"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading}
            type="button"
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </motion.button>
        ))}
      </nav>

      {/* Mobile - below md: */}
      <div className="md:hidden px-4 py-2">
        <select
          value={activeView}
          onChange={(e) => onChange(e.target.value as CollectionView)}
          className="navigation-button w-full rounded-lg border border-gray-300 px-4 py-3 text-base font-semibold bg-white shadow-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive cursor-pointer"
          disabled={isLoading}
        >
          {tabs.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
