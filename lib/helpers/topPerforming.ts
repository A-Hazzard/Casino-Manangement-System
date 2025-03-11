import axios from "axios"
import { ActiveTab, TopPerformingData } from "@/lib/types"
import { colorPalette } from "@/lib/constants/uiConstants"

/**
 * Fetches top-performing locations or Cabinets and assigns colors dynamically.
 *
 * @param activeTab - Either `"locations"` or `"Cabinets"`
 * @param timePeriod - The time period (e.g., `"7d"`, `"30d"`)
 * @returns Promise resolving to an array of top-performing locations or Cabinets
 */
export async function fetchTopPerformingData(
  activeTab: ActiveTab,
  timePeriod: string = "7d"
): Promise<TopPerformingData[]> {
  try {
    // console.log(`📊 Fetching top-performing ${activeTab} for ${timePeriod}...`)

    const params = { activeTab, timePeriod }
    const headers = { "Content-Type": "application/json" }
    const response = await axios.get(`/api/metrics/top-performing`, { params, headers })

    const rawData: TopPerformingData[] = response.data.data || []
    // console.log(`✅ Raw API Response for ${activeTab}:`, rawData)

    if (!rawData.length) {
      console.log(`🚫 No data found for ${activeTab} in the specified time period.`)
    }

    // Dynamically assign colors from the colorPalette
    return rawData.map((item, index) => ({
      ...item,
      color: colorPalette[index % colorPalette.length], // Cycle through colors
    }))
  } catch (error) {
    console.error(`❌ Failed to fetch top-performing ${activeTab}:`, error)
    return []
  }
}
