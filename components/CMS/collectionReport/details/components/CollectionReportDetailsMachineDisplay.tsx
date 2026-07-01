/**
 * CollectionReportDetailsMachineDisplay Component
 *
 * Formats a machine display name by bolding content within parentheses.
 * When href is provided, renders as a link for native open-in-new-tab support.
 * When onClick is provided, renders as a button for in-app actions.
 */

'use client';

import Link from 'next/link';
import { FC } from 'react';
import CopyMachineFieldsButtons from '@/components/shared/ui/CopyMachineFieldsButtons';

type CollectionReportDetailsMachineDisplayProps = {
  name: string;
  machineId?: string;
  gmNumber?: string;
  serialNumber?: string;
  href?: string;
  onClick?: () => void;
};

export const CollectionReportDetailsMachineDisplay: FC<
  CollectionReportDetailsMachineDisplayProps
> = ({ name, machineId, gmNumber, serialNumber, href, onClick }) => {
  const parts = name.split(/(\(.+?\))/g);
  const content = parts.map((part, index) =>
    part.startsWith('(') && part.endsWith(')') ? (
      <span key={index} className="font-bold">
        {part}
      </span>
    ) : (
      part
    )
  );

  const className =
    'cursor-pointer text-left font-medium text-gray-900 decoration-gray-300 transition-colors hover:text-black hover:underline focus:outline-none';

  const display = onClick ? (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  ) : href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <span className="font-medium text-gray-900">{content}</span>
  );

  const hasCopyFields = Boolean(machineId || gmNumber || serialNumber);

  return (
    <div className="flex items-start gap-1">
      {display}
      {hasCopyFields && (
        <CopyMachineFieldsButtons
          machineId={machineId}
          gmNumber={gmNumber}
          serialNumber={serialNumber}
        />
      )}
    </div>
  );
};
