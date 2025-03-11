import { connectDB } from "@/app/api/lib/middleware/db"
import { dashboardData, Meter } from "@/lib/types"
import { Meter as MeterModel } from "../models/meters"

/**
 * Fetches all meter records from the database.
 * Uses `.lean<Meter>()` to return plain JavaScript objects for efficiency.
 *
 * @returns {Promise<Meter[]>} List of meters
 */
export async function getAllMeters(): Promise<Meter[]> {
  try {
    await connectDB()
    console.log("📡 Fetching all meters...")

    // Fetch all meters as plain JS objects
    const rawMeters = await MeterModel.find({}).limit(10).lean<Meter>()

    // Check if MongoDB returned an array as expected
    // If not, log error and return empty array as fallback
    if (!Array.isArray(rawMeters)) {
      console.error("❌ Unexpected response from MongoDB, expected an array")
      return []
    }

    console.log(`✅ Successfully fetched ${rawMeters.length} meters`)
    return rawMeters
  } catch (error) {
    console.error("❌ Error fetching meters:", error)
    return []
  }
}

/**
 * Calculates the summary metrics from a list of meters.
 *
 * @param {Meter[]} meters - List of meters to process.
 * @returns {Partial<dashboardData>} Aggregated data for Wager, Games Won, and Gross.
 */
export function calculateMetrics(meters: Meter[]): Partial<dashboardData> {
  console.log("📊 Calculating metrics from meters...")

  let totalDrop = 0 // Total money inserted (Wager)
  let totalCancelledCredits = 0 // Total money removed (Games Won)
  let totalGross = 0 // Gross Profit (Drop - Cancelled Credits)

  meters.forEach((meter: Meter) => {
    const movement: Meter["movement"] =
      meter.movement || ({} as Meter["movement"])
    const drop = movement.drop || 0
    const totalCancelled = movement.totalCancelledCredits || 0
    const gross = drop - totalCancelledCredits

    totalDrop += drop
    totalCancelledCredits += totalCancelled
    totalGross += gross
  })


  return {
    moneyIn: totalDrop,
    moneyOut: totalCancelledCredits,
    gross: totalGross,
  } as Partial<dashboardData>
}
