"use client";

import { motion } from "framer-motion";
import type {
  AdministrationSection,
  AdministrationTab,
} from "@/lib/constants/administration";

type Props = {
  tabs: AdministrationTab[];
  activeSection: AdministrationSection;
  onChange: (section: AdministrationSection) => void;
  isLoading?: boolean;
};

export default function AdministrationNavigation({
  tabs,
  activeSection,
  onChange,
  isLoading = false,
}: Props) {
  return (
    <div className="border-b border-gray-200 bg-white rounded-lg shadow-sm">
      {/* Desktop */}
      <nav className="hidden xl:flex space-x-8 overflow-x-auto px-6">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`navigation-button flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
              activeSection === tab.id
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

      {/* Mobile */}
      <div className="xl:hidden px-4 py-2">
        <select
          value={activeSection}
          onChange={(e) => onChange(e.target.value as AdministrationSection)}
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
