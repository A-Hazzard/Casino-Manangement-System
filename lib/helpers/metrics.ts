import {dashboardData, Metrics} from "@/lib/types";
import axios from "axios";

/**
 * Fetches and aggregates metric data from the API endpoint.
 *
 * The function calls the `/api/metrics/meters` endpoint using a time period,
 * and optionally a Custom date range (startDate/endDate). It then normalizes the
 * data into the `dashboardData` shape, groups records by either day or by hour (if
 * the time period is "Today" or "Yesterday"), and finally sorts the results
 * chronologically.
 *
 * @param {string} [timePeriod="7d"] - The time period to fetch metrics for.
 *                                     Options include "Today", "Yesterday",
 *                                     "7d", "30d", or "Custom" (when used with startDate/endDate).
 * @param {Date} [startDate] - The start date for a Custom date range (used when timePeriod is "Custom").
 * @param {Date} [endDate] - The end date for a Custom date range (used when timePeriod is "Custom").
 * @returns {Promise<dashboardData[]>} A promise that resolves to an array of aggregated dashboardData objects.
 */
/**
 * Fetches and aggregates metric data from the API endpoint.
 *
 * The function calls the `/api/metrics/meters` endpoint using a time period,
 * and optionally a Custom date range (startDate/endDate) as well as an optional licencee filter.
 * It then normalizes the data into the `dashboardData` shape, groups records by either day or by hour
 * (if the time period is "Today" or "Yesterday"), and finally sorts the results chronologically.
 *
 * @param {string} [timePeriod="7d"] - The time period to fetch metrics for.
 *                                     Options include "Today", "Yesterday", "7d", "30d", or "Custom" (when used with startDate/endDate).
 * @param {Date} [startDate] - The start date for a Custom date range (used when timePeriod is "Custom").
 * @param {Date} [endDate] - The end date for a Custom date range (used when timePeriod is "Custom").
 * @param {string} [licencee] - (Optional) The licencee ID to filter the metrics by. When provided,
 *                              only metrics for gaming locations belonging to this licencee will be returned.
 * @returns {Promise<dashboardData[]>} A promise that resolves to an array of aggregated dashboardData objects.
 */
export async function getMetrics(
    timePeriod: string = "7d",
    startDate?: Date,
    endDate?: Date,
    licencee?: string
): Promise<dashboardData[]> {
  try {
    let url = `/api/metrics/meters?timePeriod=${timePeriod}`;
    if (timePeriod === "Custom" && startDate && endDate) {
      url += `&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
    }
    if (licencee) {
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

    return Object.values(grouped).sort((a, b) => {
      const dayA = a.day ?? "";
      const dayB = b.day ?? "";
      if (dayA === dayB) {
        const xA = a.xValue ?? "";
        const xB = b.xValue ?? "";
        return xA.localeCompare(xB);
      }
      return dayA.localeCompare(dayB);
    });
  } catch (error) {
    console.error("Failed to fetch metrics:", error);
    return [];
  }
}
