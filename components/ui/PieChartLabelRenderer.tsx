/**
 * Pie Chart Label Renderer Component
 * Component for rendering custom labels on pie charts.
 *
 * Features:
 * - Custom label positioning
 * - Label data calculation
 * - Text styling
 * - SVG text rendering
 *
 * @param props - Customized label props from Recharts
 */
import { calculatePieChartLabelData } from '@/lib/utils/chart';
import { CustomizedLabelProps } from '@/lib/types/componentProps';

type PieChartLabelRendererProps = {
  props: CustomizedLabelProps;
};

export const PieChartLabelRenderer = ({
  props,
}: PieChartLabelRendererProps) => {
  const labelData = calculatePieChartLabelData(props);

  return (
    <text
      x={labelData.x}
      y={labelData.y}
      fill={labelData.fill}
      textAnchor={labelData.textAnchor}
      dominantBaseline={labelData.dominantBaseline}
      fontSize={labelData.fontSize}
      fontWeight={labelData.fontWeight}
    >
      {labelData.text}
    </text>
  );
};
