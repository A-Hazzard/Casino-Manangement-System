/**
 * CollectionReportDetailsMachineDisplay Component
 *
 * Formats a machine display name by bolding content within parentheses.
 * When href is provided, renders as a link for native open-in-new-tab support.
 */

'use client';

import Link from 'next/link';
import { FC } from 'react';

type CollectionReportDetailsMachineDisplayProps = {
  name: string;
  href?: string;
};

export const CollectionReportDetailsMachineDisplay: FC<
  CollectionReportDetailsMachineDisplayProps
> = ({ name, href }) => {
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

  if (href) {
    return (
      <Link
        href={href}
        className="cursor-pointer text-left font-medium text-gray-900 decoration-gray-300 transition-colors hover:text-black hover:underline focus:outline-none"
      >
        {content}
      </Link>
    );
  }

  return <span className="font-medium text-gray-900">{content}</span>;
};
