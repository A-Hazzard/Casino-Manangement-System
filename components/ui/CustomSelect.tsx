"use client";

import { CustomSelectProps } from "@/lib/types/componentProps";
import { TimePeriod } from "@/lib/types/api";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

export default function CustomSelect(props: CustomSelectProps) {
  return (
    <Select
      value={props.selectedFilter}
      onValueChange={(value) => {
        props.onSelect(value as TimePeriod);
        if (props.isMobile && props.setShowDatePicker) {
          if (value.toLowerCase() === "custom") {
            props.setShowDatePicker(true);
          } else {
            props.setShowDatePicker(false);
          }
        }
      }}
      disabled={props.disabled}
    >
      <SelectTrigger className="w-[180px] bg-buttonActive text-white text-xs rounded-lg border">
        <SelectValue placeholder="Sort by..." />
      </SelectTrigger>
      <SelectContent>
        {props.timeFrames.map((time: { time: string; value: string }) => (
          <SelectItem key={time.time} value={time.value} className="text-xs">
            {time.time}
          </SelectItem>
        ))} 
      </SelectContent>
    </Select>
  );
}
