import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../lib/middleware/db";
import { getUserIdFromServer, getUserById } from "../../lib/helpers/users";
import { CollectionReport } from "../../lib/models/collectionReport";
import { Collections } from "../../lib/models/collections";
import { Machine } from "../../lib/models/machines";

// Type for machine document with collectionMetersHistory
type MachineWithHistory = {
  _id: string;
  collectionMetersHistory: Array<{
    _id: string;
    metersIn: number;
    metersOut: number;
    prevMetersIn?: number;
    prevMetersOut?: number;
    timestamp: Date;
    locationReportId?: string;
  }>;
};

/**
 * POST /api/collection-reports/fix-all-reports
 * Fix all collection reports with data integrity issues
 *
 * Author: Aaron Hazzard - Senior Software Engineer
 * Last Updated: January 18th, 2025
 */
export async function POST(_request: NextRequest) {
  try {
    await connectDB();
    console.warn("🔧 Starting fix all reports...");

    // Check authentication (skip in development)
    if (process.env.NODE_ENV === "development") {
      console.warn("🔧 Skipping authentication in development mode");
    } else {
      const userId = await getUserIdFromServer();
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await getUserById(userId);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (
        !user.roles?.includes("admin") &&
        !user.roles?.includes("developer")
      ) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    // Get all collection reports
    const reports = await CollectionReport.find({}).sort({ timestamp: -1 });

    console.warn(`📊 Found ${reports.length} total reports to check`);

    const fixResults = {
      totalReportsChecked: reports.length,
      reportsWithIssues: 0,
      reportsFixed: 0,
      totalIssuesFixed: 0,
      errors: [] as { reportId: string; error: string }[],
      details: [] as {
        reportId: string;
        reportName: string;
        issuesFixed: number;
      }[],
    };

    // Check which reports have issues first
    const reportsToFix: string[] = [];

    for (const report of reports) {
      const reportId = report.locationReportId;
      const collections = await Collections.find({
        locationReportId: reportId,
      });

      let hasIssues = false;

      // Quick check for issues
      for (const collection of collections) {
        // Check prevIn/prevOut using correct logic
        const machine = await Machine.findById(collection.machineId).lean();
        
        if (machine) {
          // Find the actual previous collection to get correct prevIn/prevOut values
          const actualPreviousCollection = await Collections.findOne({
            machineId: collection.machineId,
            $and: [
              {
                $or: [
                  { collectionTime: { $lt: collection.collectionTime || collection.timestamp } },
                  { timestamp: { $lt: collection.collectionTime || collection.timestamp } },
                ],
              },
              {
                $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
              },
              { isCompleted: true },
            ],
          })
            .sort({ collectionTime: -1, timestamp: -1 })
            .lean();

          if (actualPreviousCollection) {
            const expectedPrevIn = actualPreviousCollection.metersIn || 0;
            const expectedPrevOut = actualPreviousCollection.metersOut || 0;
            
            // Allow for minor precision differences (within 0.1)
            const prevInDiff = Math.abs(collection.prevIn - expectedPrevIn);
            const prevOutDiff = Math.abs(collection.prevOut - expectedPrevOut);
            
            if (prevInDiff > 0.1 || prevOutDiff > 0.1) {
              hasIssues = true;
              break;
            }
          } else {
            // No previous collection exists, so prevIn/prevOut should be 0
            if (collection.prevIn !== 0 || collection.prevOut !== 0) {
              hasIssues = true;
              break;
            }
          }
        }
      }

      // Check machine history issues
      if (!hasIssues) {
        const machineIds = [...new Set(collections.map((c) => c.machineId))];
        for (const machineId of machineIds) {
          const machine = (await Machine.findById(
            machineId
          ).lean()) as MachineWithHistory | null;
          if (machine && machine.collectionMetersHistory) {
            const history = machine.collectionMetersHistory;
            for (let i = 1; i < history.length; i++) {
              const entry = history[i];
              if (
                (!entry.prevMetersIn || entry.prevMetersIn === 0) &&
                (!entry.prevMetersOut || entry.prevMetersOut === 0)
              ) {
                hasIssues = true;
                break;
              }
            }
            if (hasIssues) break;
          }
        }
      }

      if (hasIssues) {
        reportsToFix.push(reportId);
      }
    }

    console.warn(`📊 Found ${reportsToFix.length} reports with issues to fix`);

    // Fix each report that has issues
    for (const reportId of reportsToFix) {
      try {
        const report = await CollectionReport.findOne({
          locationReportId: reportId,
        });
        if (!report) continue;

        console.warn(`\n🔧 Fixing report: ${reportId} (${report.location})`);

        // Get all collections for this report
        const collections = await Collections.find({
          locationReportId: reportId,
        }).lean();

        let issuesFixedForReport = 0;

        // Fix each collection in the report
        for (const collection of collections) {
          // Fix machine history issues
          const machine = (await Machine.findById(
            collection.machineId
          ).lean()) as MachineWithHistory | null;
          if (machine && machine.collectionMetersHistory) {
            const history = machine.collectionMetersHistory;
            const historyToKeep = [];
            
            for (let i = 0; i < history.length; i++) {
              const entry = history[i];
              
              // Check if the report referenced by this history entry exists
              if (entry.locationReportId) {
                const reportExists = await CollectionReport.findOne({
                  locationReportId: entry.locationReportId,
                }).lean();
                
                if (!reportExists) {
                  console.warn(`Removing orphaned history entry for non-existent report: ${entry.locationReportId}`);
                  issuesFixedForReport++;
                  continue; // Skip this entry
                }
              }
              
              historyToKeep.push(entry);
            }
            
            // Remove duplicate entries (same timestamp and locationReportId)
            const seenEntries = new Map();
            const finalHistory = [];
            
            for (const entry of historyToKeep) {
              const key = `${entry.timestamp}-${entry.locationReportId}`;
              if (!seenEntries.has(key)) {
                seenEntries.set(key, true);
                finalHistory.push(entry);
              } else {
                console.warn(`Removing duplicate history entry: ${key}`);
                issuesFixedForReport++;
              }
            }
            
            // Update the machine with the cleaned history
            if (finalHistory.length !== history.length) {
              await Machine.findByIdAndUpdate(collection.machineId, {
                $set: {
                  collectionMetersHistory: finalHistory,
                },
              });
              console.warn(`Cleaned machine ${collection.machineId} history: ${history.length} -> ${finalHistory.length} entries`);
            }
            
            // Fix incorrect prevMeters values
            for (let i = 1; i < finalHistory.length; i++) {
              const entry = finalHistory[i];
              const prevMetersIn = entry.prevMetersIn || 0;
              const prevMetersOut = entry.prevMetersOut || 0;

              if (prevMetersIn === 0 && prevMetersOut === 0) {
                const expectedPrevIn = finalHistory[i - 1]?.metersIn || 0;
                const expectedPrevOut = finalHistory[i - 1]?.metersOut || 0;

                await Machine.findByIdAndUpdate(collection.machineId, {
                  $set: {
                    [`collectionMetersHistory.${i}.prevMetersIn`]:
                      expectedPrevIn,
                    [`collectionMetersHistory.${i}.prevMetersOut`]:
                      expectedPrevOut,
                  },
                });

                issuesFixedForReport++;
              }
            }
          }

          // Fix collection prevIn/prevOut issues using correct logic
          const machineForFix = await Machine.findById(collection.machineId).lean();
          
          if (machineForFix) {
            // Find the actual previous collection to get correct prevIn/prevOut values
            const actualPreviousCollection = await Collections.findOne({
              machineId: collection.machineId,
              $and: [
                {
                  $or: [
                    { collectionTime: { $lt: collection.collectionTime || collection.timestamp } },
                    { timestamp: { $lt: collection.collectionTime || collection.timestamp } },
                  ],
                },
                {
                  $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
                },
                { isCompleted: true },
              ],
            })
              .sort({ collectionTime: -1, timestamp: -1 })
              .lean();

            if (actualPreviousCollection) {
              const expectedPrevIn = actualPreviousCollection.metersIn || 0;
              const expectedPrevOut = actualPreviousCollection.metersOut || 0;
              
              // Allow for minor precision differences (within 0.1)
              const prevInDiff = Math.abs(collection.prevIn - expectedPrevIn);
              const prevOutDiff = Math.abs(collection.prevOut - expectedPrevOut);
              
              if (prevInDiff > 0.1 || prevOutDiff > 0.1) {
                await Collections.findByIdAndUpdate(collection._id, {
                  $set: {
                    prevIn: expectedPrevIn,
                    prevOut: expectedPrevOut,
                  },
                });
                issuesFixedForReport++;
              }
            } else {
              // No previous collection exists, so prevIn/prevOut should be 0
              if (collection.prevIn !== 0 || collection.prevOut !== 0) {
                await Collections.findByIdAndUpdate(collection._id, {
                  $set: {
                    prevIn: 0,
                    prevOut: 0,
                  },
                });
                issuesFixedForReport++;
              }
            }
          }
        }

        // Handle duplicate reports on the same day
        const duplicateReports = await CollectionReport.find({
          location: report.location,
          $and: [
            {
              $or: [
                {
                  $and: [
                    { gamingDayStart: { $lte: new Date(report.timestamp) } },
                    { gamingDayEnd: { $gte: new Date(report.timestamp) } },
                  ],
                },
              ],
            },
            {
              $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
            },
            { _id: { $ne: report._id } },
          ],
        }).lean();

        if (duplicateReports.length > 0) {
          // Find the report with the most collections (most accurate)
          let bestReport: typeof report | typeof duplicateReports[0] = report;
          let maxCollections = collections.length;

          for (const duplicate of duplicateReports) {
            const duplicateCollections = await Collections.find({
              locationReportId: duplicate.locationReportId,
              $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
            }).lean();

            if (duplicateCollections.length > maxCollections) {
              bestReport = duplicate as typeof report;
              maxCollections = duplicateCollections.length;
            }
          }

          // Delete all other duplicate reports
          const reportsToDelete = duplicateReports.filter(r => r._id.toString() !== bestReport._id.toString());
          
          for (const reportToDelete of reportsToDelete) {
            // Delete the report and its collections
            await CollectionReport.findByIdAndDelete(reportToDelete._id);
            await Collections.deleteMany({ locationReportId: reportToDelete.locationReportId });
            
            // Revert machine collectionMeters to the previous collection's meters
            const collectionsToRevert = await Collections.find({
              locationReportId: reportToDelete.locationReportId,
            }).lean();

            for (const collection of collectionsToRevert) {
              const previousCollection = await Collections.findOne({
                machineId: collection.machineId,
                $and: [
                  {
                    $or: [
                      { collectionTime: { $lt: collection.collectionTime || collection.timestamp } },
                      { timestamp: { $lt: collection.collectionTime || collection.timestamp } },
                    ],
                  },
                  {
                    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
                  },
                  { isCompleted: true },
                ],
              })
                .sort({ collectionTime: -1, timestamp: -1 })
                .lean();

              if (previousCollection) {
                await Machine.findByIdAndUpdate(collection.machineId, {
                  $set: {
                    "collectionMeters.metersIn": previousCollection.metersIn || 0,
                    "collectionMeters.metersOut": previousCollection.metersOut || 0,
                  },
                });
              }
            }

            issuesFixedForReport++;
            console.warn(`   🗑️ Deleted duplicate report ${reportToDelete._id}`);
          }
        }

        if (issuesFixedForReport > 0) {
          fixResults.reportsWithIssues++;
          fixResults.reportsFixed++;
          fixResults.totalIssuesFixed += issuesFixedForReport;
          fixResults.details.push({
            reportId,
            reportName: report.location || "Unknown",
            issuesFixed: issuesFixedForReport,
          });
          console.warn(
            `   ✅ Fixed ${issuesFixedForReport} issues in report ${reportId}`
          );
        }
      } catch (error) {
        console.error(`   ❌ Error fixing report ${reportId}:`, error);
        fixResults.errors.push({
          reportId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.warn(`\n📊 Fix All Reports Summary:`);
    console.warn(`   Total Reports Checked: ${fixResults.totalReportsChecked}`);
    console.warn(`   Reports with Issues: ${fixResults.reportsWithIssues}`);
    console.warn(`   Reports Fixed: ${fixResults.reportsFixed}`);
    console.warn(`   Total Issues Fixed: ${fixResults.totalIssuesFixed}`);
    console.warn(`   Errors: ${fixResults.errors.length}`);

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixResults.totalIssuesFixed} issues across ${fixResults.reportsFixed} reports`,
      results: fixResults,
    });
  } catch (error) {
    console.error("Error fixing all reports:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
