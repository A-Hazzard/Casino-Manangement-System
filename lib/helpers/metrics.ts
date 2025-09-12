import { dashboardData, Metrics } from "@/lib/types";
import { TimePeriod } from "@shared/types";
import axios from "axios";
import { formatISODate } from "@/shared/utils/dateFormat";

/**
 * Fetches and aggregates metric data from the API endpoint.
 *
 * The function calls the `/api/metrics/meters` endpoint using a time period,
 * and optionally a Custom date range (startDate/endDate). It then normalizes the
 * data into the `dashboardData` shape, groups records by either day or by hour (if
 * the time period is "Today" or "Yesterday"), and finally sorts the results
 * chronologically.
 *
 * @param {TimePeriod} [timePeriod="7d"] - The time period to fetch metrics for.
 *                                     Options include "Today", "Yesterday",
 *                                     "7d", "30d", or "Custom" (when used with startDate/endDate).
 * @param {Date} [startDate] - The start date for a Custom date range (used when timePeriod is "Custom").
 * @param {Date} [endDate] - The end date for a Custom date range (used when timePeriod is "Custom").
 * @returns {Promise<dashboardData[]>} A promise that resolves to an array of aggregated dashboardData objects.
 */
/**
 * Fetches and aggregates metric data from the API endpoint.
 *
 * Calls the `/api/metrics/meters` endpoint using a time period, and optionally a custom date range and licencee filter.
 * Normalizes the data into the dashboardData shape, groups records by day or hour, and sorts chronologically.
 *
 * @param timePeriod - The time period to fetch metrics for.
 * @param startDate - (Optional) Start date for a custom range.
 * @param endDate - (Optional) End date for a custom range.
 * @param licencee - (Optional) Licencee ID to filter metrics.
 * @returns Promise resolving to an array of aggregated dashboardData objects.
 */
export async function getMetrics(
  timePeriod: TimePeriod,
  startDate?: Date | string,
  endDate?: Date | string,
  licencee?: string
): Promise<dashboardData[]> {
  try {
    let url = `/api/metrics/meters?timePeriod=${timePeriod}`;
    let normalizedStart: Date | undefined;
    let normalizedEnd: Date | undefined;
    if (timePeriod === "Custom" && startDate && endDate) {
      const sd = startDate instanceof Date ? startDate : new Date(startDate);
      const ed = endDate instanceof Date ? endDate : new Date(endDate);
      normalizedStart = sd;
      normalizedEnd = ed;
      url += `&startDate=${sd.toISOString()}&endDate=${ed.toISOString()}`;
    }
    if (licencee && licencee !== "all") {
      url += `&licencee=${licencee}`;
    }

    const { data } = await axios.get<Metrics[]>(url);
    if (!Array.isArray(data) || data.length === 0) return [];

    const groupByHour = timePeriod === "Today" || timePeriod === "Yesterday";

    const rawData = data.map((doc): dashboardData => {
      const day = doc.day;
      let time = "";
      if (groupByHour && doc.time) {
        const [hh] = doc.time.split(":");
        time = `${hh.padStart(2, "0")}:00`;
      }
      const xValue = groupByHour ? time : day;
      return {
        xValue,
        day,
        time,
        moneyIn: doc.drop,
        moneyOut: doc.totalCancelledCredits,
        gross: doc.gross,
        location: doc.location,
        machine: doc.machine,
        geoCoords: doc.geoCoords,
      };
    });

    const grouped: Record<string, dashboardData> = {};
    rawData.forEach((item) => {
      const key = groupByHour ? `${item.day}_${item.time}` : item.day;
      if (!grouped[key]) {
        grouped[key] = { ...item };
      } else {
        grouped[key].moneyIn += item.moneyIn;
        grouped[key].moneyOut += item.moneyOut;
        grouped[key].gross += item.gross;
      }
    });

    const sortedData = Object.values(grouped).sort((a, b) => {
      const dayA = a.day ?? "";
      const dayB = b.day ?? "";
      if (dayA === dayB) {
        const xA = a.xValue ?? "";
        const xB = b.xValue ?? "";
        return xA.localeCompare(xB);
      }
      return dayA.localeCompare(dayB);
    });

    // Fill missing intervals to ensure consistent chart display
    const filledData = fillMissingIntervals(
      sortedData,
      timePeriod,
      normalizedStart,
      normalizedEnd
    );

    return filledData;
  } catch (error) {
    // Log error for debugging in development
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to fetch metrics:", error);
    }
    return [];
  }
}

/**
 * Fills missing time intervals in chart data with zero values
 * @param data - The existing chart data
 * @param timePeriod - The time period to determine interval type
 * @param startDate - Start date for the period
 * @param endDate - End date for the period
 * @returns Complete chart data with filled intervals
 */
function fillMissingIntervals(
  data: dashboardData[],
  timePeriod: TimePeriod,
  startDate?: Date,
  endDate?: Date
): dashboardData[] {
  if (data.length === 0) return [];

  const isHourly = timePeriod === "Today" || timePeriod === "Yesterday";
  const filledData: dashboardData[] = [];

  if (isHourly) {
    // Fill hourly intervals (0:00 to 23:00)
    const baseDay = data[0]?.day || formatISODate(new Date());

    for (let hour = 0; hour < 24; hour++) {
      const timeKey = `${hour.toString().padStart(2, "0")}:00`;
      const existingData = data.find(
        (item) => item.time === timeKey && item.day === baseDay
      );

      if (existingData) {
        filledData.push(existingData);
      } else {
        filledData.push({
          xValue: timeKey,
          day: baseDay,
          time: timeKey,
          moneyIn: 0,
          moneyOut: 0,
          gross: 0,
        });
      }
    }
  } else {
    // Fill daily intervals
    let start: Date;
    let end: Date;

    if (timePeriod === "Custom" && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (timePeriod === "7d") {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 6);
    } else if (timePeriod === "30d") {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 29);
    } else {
      // Default to 7 days if unknown
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 6);
    }

    const current = new Date(start);
    while (current <= end) {
      const dayKey = formatISODate(current);
      const existingData = data.find((item) => item.day === dayKey);

      if (existingData) {
        filledData.push(existingData);
      } else {
        filledData.push({
          xValue: dayKey,
          day: dayKey,
          time: "",
          moneyIn: 0,
          moneyOut: 0,
          gross: 0,
        });
      }

      current.setDate(current.getDate() + 1);
    }
  }

  return filledData;
}
