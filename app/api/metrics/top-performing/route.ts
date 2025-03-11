import { connectDB } from "@/app/api/lib/middleware/db"
import { NextRequest, NextResponse } from "next/server"
import { getTopPerformingMetrics } from "@/app/api/lib/helpers/top-performing"
import { ActiveTab } from "@/lib/types"

/**
 * Retrieves the TOP 5 Performing Locations or Gaming Cabinets (machines)** 
 * based on total moneyIn (`drop`) over a selected time period.
 * 
 * **Request Parameters**
 * - `type` (optional) - **"locations"** or **"Cabinets"** (defaults to `"locations"`)
 * - `timePeriod` (optional) - **"Today"**, **"Yesterday"**, **"7d"**, **"30d"** (defaults to `"7d"`)
 * 
 * **Response Format**
 * ```json
 * {
 *   "type": "locations",
 *   "timePeriod": "7d",
 *   "data": [
 *     { "location": "Mixture Brasileira 1MD", "totalDrop": 25000, "totalGamesPlayed": 1000, "totalJackpot": 5000 },
 *     { "location": "Big Shot", "totalDrop": 22000, "totalGamesPlayed": 900, "totalJackpot": 4500 }
 *   ]
 * }
 * ```
 * 
 * **Usage Examples**
 * Get The Top 5 Locations for the Last 7 Days**
 * ```
 * GET /api/metrics/top-performing?type=locations&timePeriod=7d
 * ```
 * 
 * @param req - The incoming HTTP request object
 * @returns JSON response containing the top-performing locations or Cabinets
 */
export async function GET(req: NextRequest) {
  try {
    console.log("🔌 Connecting to MongoDB...")
    const db = await connectDB()
    if (!db){
      console.error("❌Database connection failed")
      return NextResponse.json(
          { error: "Database connection failed" },
          { status: 500 }
      )
    }

    console.log("📩 Parsing request parameters...")
    const searchParams = req.nextUrl.searchParams
    
    const activeTab = (searchParams.get("activeTab") as ActiveTab) || "locations" 
    const timePeriod = searchParams.get("timePeriod") || "7d" 

    console.log(`📊 Fetching top 5 ${activeTab} for ${timePeriod}...`)

    const data = await getTopPerformingMetrics(db, activeTab, timePeriod)

    console.log(`✅ Top Performing Data Fetched Successfully`)
    return NextResponse.json({ activeTab, timePeriod, data })
  } catch (error) {
    console.error("❌ Error in top-performing API:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
