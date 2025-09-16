import React from "react";
import { calculatePieChartLabelPosition } from "@/lib/utils/components";
import { CustomizedLabelProps } from "@/lib/types/componentProps";

// Use the defined type from componentProps
const PieChartLabel = (props: CustomizedLabelProps) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  const { x, y, textAnchor } = calculatePieChartLabelPosition(
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius
  );

  const svgTextAnchor = textAnchor as unknown as
    | "start"
    | "middle"
    | "end"
    | undefined;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={svgTextAnchor}
      dominantBaseline="central"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default PieChartLabel;
