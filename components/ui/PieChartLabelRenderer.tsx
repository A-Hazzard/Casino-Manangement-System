/**
 * Pie Chart Label Renderer Component
 * Renders custom labels for pie chart components
 */

import { calculatePieChartLabelData } from "@/lib/utils/chart";
import { CustomizedLabelProps } from "@/lib/types/componentProps";

type PieChartLabelRendererProps = {
  props: CustomizedLabelProps;
};

export const PieChartLabelRenderer = ({ props }: PieChartLabelRendererProps) => {
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
