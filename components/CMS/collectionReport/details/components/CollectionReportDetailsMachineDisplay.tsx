/**
 * CollectionReportDetailsMachineDisplay Component
 *
 * Formats a machine display name by bolding content within parentheses.
 * Supports a clickable interaction for navigation.
 */

'use client';

import { FC } from 'react';

type CollectionReportDetailsMachineDisplayProps = {
  name: string;
  onClick: () => void;
};

export const CollectionReportDetailsMachineDisplay: FC<
  CollectionReportDetailsMachineDisplayProps
> = ({ name, onClick }) => {
  // Split the name by parenthesized parts to bold them all
  const parts = name.split(/(\(.+?\))/g);

  return (
    <span
      onClick={onClick}
      className="cursor-pointer font-medium text-gray-900 decoration-gray-300 transition-colors hover:text-black hover:underline"
    >
      {parts.map((part, i) =>
        part.startsWith('(') && part.endsWith(')') ? (
          <span key={i} className="font-bold">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
};
