# 📊 Fix Report Summaries

This directory contains detailed JSON reports generated each time you run the Fix Report API.

## 📁 File Format

```
fix-report-{locationReportId}-{timestamp}.json
```

Example:
```
fix-report-b738bdf0-5928-4185-b96a-7758acdff2db-2025-01-17T10-30-45-123Z.json
```

## 📋 Report Structure

```json
{
  "reportId": "Report ID that was fixed",
  "timestamp": "When the fix was run",
  "summary": {
    "collectionsProcessed": "Total collections checked",
    "totalIssuesFixed": "Total issues that were fixed",
    "issueBreakdown": {
      "sasTimesFixed": "Number of SAS times fixed",
      "prevMetersFixed": "Number of prev meters fixed",
      "movementCalculationsFixed": "Number of movements fixed",
      "machineHistoryFixed": "Number of history entries fixed",
      "historyEntriesFixed": "Number of entry issues fixed"
    },
    "totalErrors": "Number of errors encountered",
    "timeTakenSeconds": "Time to complete"
  },
  "errors": [
    {
      "collectionId": "ID of problematic collection",
      "machineId": "Machine ID (or 'Missing' if unknown)",
      "machineCustomName": "Machine name (e.g., GM00042)",
      "phase": "Which fix phase failed",
      "error": "Error message",
      "details": "Additional context (optional)"
    }
  ]
}
```

## 🔍 Common Error Patterns

### 1. Machine Not Found
```json
{
  "machineId": "2f68eef8390b0887307facd6",
  "machineCustomName": "7491",
  "phase": "SAS Times",
  "error": "Machine not found: 2f68eef8390b0887307facd6"
}
```
**Meaning:** Machine was deleted or doesn't exist in database  
**Action:** Check if machine was intentionally removed or data migration issue

### 2. Missing Machine Identifier
```json
{
  "machineId": "Missing",
  "machineCustomName": "7926",
  "phase": "SAS Times",
  "error": "Missing machine identifier (both machineId and sasMeters.machine are undefined)"
}
```
**Meaning:** Collection has no reference to its machine  
**Action:** Data integrity issue - may need manual collection cleanup

### 3. SAS Times Calculation Error
```json
{
  "machineId": "abc123",
  "machineCustomName": "GM00001",
  "phase": "SAS Times",
  "error": "Cannot calculate SAS metrics: Invalid date range"
}
```
**Meaning:** Unable to determine proper time window for SAS calculations  
**Action:** Check collection timestamps and previous collection data

## 📊 Analysis Examples

### PowerShell

#### Count Errors by Phase
```powershell
$report = Get-Content "fix-report-*.json" | ConvertFrom-Json
$report.errors | Group-Object phase | Select-Object Name, Count
```

#### Find Errors for Specific Machine
```powershell
$report = Get-Content "fix-report-*.json" | ConvertFrom-Json
$report.errors | Where-Object {$_.machineCustomName -eq "GM00042"}
```

#### List All Machines with Errors
```powershell
$report = Get-Content "fix-report-*.json" | ConvertFrom-Json
$report.errors | Select-Object machineCustomName, machineId -Unique
```

### Using jq (JSON Query Tool)

#### Get Error Summary
```bash
jq '.summary' fix-report-*.json
```

#### Filter Errors by Phase
```bash
jq '.errors[] | select(.phase == "SAS Times")' fix-report-*.json
```

#### Count Errors by Machine
```bash
jq '.errors | group_by(.machineCustomName) | map({machine: .[0].machineCustomName, count: length}) | sort_by(.count) | reverse' fix-report-*.json
```

#### Export Errors to CSV
```bash
jq -r '.errors[] | [.collectionId, .machineId, .machineCustomName, .phase, .error] | @csv' fix-report-*.json > errors.csv
```

## 📈 Tracking Over Time

Compare multiple reports to see if errors are decreasing:

```powershell
Get-ChildItem "fix-report-*.json" | ForEach-Object {
    $report = Get-Content $_.FullName | ConvertFrom-Json
    [PSCustomObject]@{
        File = $_.Name
        Timestamp = $report.timestamp
        TotalErrors = $report.summary.totalErrors
        IssuesFixed = $report.summary.totalIssuesFixed
    }
} | Sort-Object Timestamp
```

## 🎯 Action Items Workflow

1. **Run Fix** → Generate report
2. **Review Summary** → Check error count
3. **Analyze Errors** → Group by machine/phase
4. **Prioritize** → Focus on machines with most errors
5. **Investigate** → Check specific collections in database
6. **Fix Root Cause** → Data migration, cleanup, etc.
7. **Re-run Fix** → Verify errors decrease
8. **Document** → Add to knowledge base

## 📁 File Management

Reports are automatically created each time you run the Fix Report API. Old reports are kept for historical tracking.

**Recommended:** Archive reports older than 30 days to keep directory clean:

```powershell
# Create archive directory
New-Item -ItemType Directory -Path "archive" -Force

# Move old reports
Get-ChildItem "fix-report-*.json" | 
    Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} |
    Move-Item -Destination "archive\"
```

## 🔗 Related Files

- `app/api/collection-reports/fix-report/route.ts` - Main fix API
- `app/api/collection-reports/fix-report/generateSummaryReport.ts` - Report generator
- `lib/types/fixReport.ts` - Type definitions
- `FIX_REPORT_FINAL_SUMMARY.md` - Complete implementation guide

---

**Need help?** Check the main project documentation or contact the development team.

