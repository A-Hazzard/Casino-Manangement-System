'use client';

import { motion } from 'framer-motion';

type CabinetSection = 'cabinets' | 'smib' | 'movement' | 'firmware';

type CabinetTab = {
  id: CabinetSection;
  label: string;
  icon: string;
};

type Props = {
  tabs: CabinetTab[];
  activeSection: CabinetSection;
  onChange: (section: CabinetSection) => void;
  isLoading?: boolean;
};

export default function CabinetsNavigation({
  tabs,
  activeSection,
  onChange,
  isLoading = false,
}: Props) {
  return (
    <div className="rounded-lg border-b border-gray-200 bg-white shadow-sm">
      {/* Desktop - md: and above */}
      <nav className="hidden space-x-8 px-6 md:flex">
        {tabs.map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`navigation-button flex cursor-pointer items-center space-x-2 whitespace-nowrap border-b-2 px-2 py-4 text-sm font-medium transition-all duration-200 ${
              activeSection === tab.id
                ? 'border-buttonActive bg-buttonActive/5 text-buttonActive'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
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
      <div className="px-4 py-2 md:hidden">
        <select
          value={activeSection}
          onChange={e => onChange(e.target.value as CabinetSection)}
          className="navigation-button w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
          disabled={isLoading}
        >
          {tabs.map(t => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
