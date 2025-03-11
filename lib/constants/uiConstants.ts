import {TimeFrames} from "../types"
import { licenceeOption } from "../types";

export const colorPalette = [
    "#94F394", // Green
    "#96E3D4", // Teal
    "#FFA203", // Orange
    "#5A69E7", // Blue
    "#F9687D", // Red
    "#8A7FFF", // Purple
    "#E8A837", // Yellow
    "#FF6B93", // Pink
    "#53B3E7", // Light Blue
    "#F4C542", // Gold
]


export const timeFrames: TimeFrames[] = [
    {time: "Today", value: "Today"},
    {time: "Yesterday", value: "Yesterday"},
    {time: "Last 7 days", value: "7d"},
    {time: "Last 30 days", value: "30d"},
    {time: "Custom", value: "Custom"},
]

export const filterValueMap = {
    Today: "Today",
    Yesterday: "Yesterday",
    last7days: "7d",
    last30days: "30d",
    Custom: "Custom"
}

export const licenceeOptions: licenceeOption[] = [
    { label: "All Licencee", value: "" },
    { label: "TTG", value: "9a5db2cb29ffd2d962fd1d91" },
    { label: "Cabana", value: "c03b094083226f216b3fc39c" },
    { label: "Barbados", value: "732b094083226f216b3fc11a" },
];

export const RADIAN = Math.PI / 180
  
