/**
 * Chart utility functions for rendering and calculating chart data
 */

import { CustomizedLabelProps } from '@/lib/types/componentProps';

const RADIAN = Math.PI / 180;

/**
 * Calculates pie chart label data based on props
 * @param props - Chart props containing positioning data
 * @returns Label positioning and text data
 */
export function calculatePieChartLabelData(props: CustomizedLabelProps) {
  const radius =
    props.innerRadius + (props.outerRadius - props.innerRadius) * 0.7;
  const x = props.cx + radius * Math.cos(-props.midAngle * RADIAN);
  const y = props.cy + radius * Math.sin(-props.midAngle * RADIAN);

  return {
    x,
    y,
    textAnchor: 'middle' as const,
    dominantBaseline: 'central' as const,
    fontSize: props.percent < 0.1 ? '12px' : '14px',
    fontWeight: 'bold' as const,
    fill: 'white',
    text: `${(props.percent * 100).toFixed(0)}%`,
  };
}
