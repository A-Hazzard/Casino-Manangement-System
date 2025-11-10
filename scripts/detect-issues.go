package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type SasMeters struct {
	Machine              string    `bson:"machine"`
	Drop                 float64   `bson:"drop"`
	TotalCancelledCredits float64  `bson:"totalCancelledCredits"`
	Gross                float64   `bson:"gross"`
	GamesPlayed          int       `bson:"gamesPlayed"`
	Jackpot              float64   `bson:"jackpot"`
	SasStartTime         string    `bson:"sasStartTime"`
	SasEndTime           string    `bson:"sasEndTime"`
}

type Collection struct {
	ID               string          `bson:"_id"`
	MachineID        string          `bson:"machineId"`
	MachineName      string          `bson:"machineName"`
	MachineCustomName string         `bson:"machineCustomName"`
	SerialNumber     string          `bson:"serialNumber"`
	Location         string          `bson:"location"`
	LocationReportID string          `bson:"locationReportId"`
	IsCompleted      bool            `bson:"isCompleted"`
	MetersIn         interface{}     `bson:"metersIn"`
	MetersOut        interface{}     `bson:"metersOut"`
	PrevIn           interface{}     `bson:"prevIn"`
	PrevOut          interface{}     `bson:"prevOut"`
	Timestamp        time.Time       `bson:"timestamp"`
	SasMeters        *SasMeters      `bson:"sasMeters"`
}

type CollectionReport struct {
	ID               string    `bson:"_id"`
	LocationReportID string    `bson:"locationReportId"`
	Location         string    `bson:"location"`
	Timestamp        time.Time `bson:"timestamp"`
	Collector        string    `bson:"collector"`
}

type HistoryEntry struct {
	LocationReportID string      `bson:"locationReportId"`
	MetersIn         interface{} `bson:"metersIn"`
	MetersOut        interface{} `bson:"metersOut"`
	PrevMetersIn     interface{} `bson:"prevMetersIn"`
	PrevMetersOut    interface{} `bson:"prevMetersOut"`
}

type Machine struct {
	ID                      string         `bson:"_id"`
	CollectionMetersHistory []HistoryEntry `bson:"collectionMetersHistory"`
}

type IssueDetail struct {
	Type              string                 `json:"type"`
	Message           string                 `json:"message"`
	Expected          interface{}            `json:"expected,omitempty"`
	Actual            interface{}            `json:"actual,omitempty"`
	DifferenceMinutes int                    `json:"differenceMinutes,omitempty"`
	History           interface{}            `json:"history,omitempty"`
	Collection        interface{}            `json:"collection,omitempty"`
}

type MachineIssue struct {
	MachineID                string        `json:"machineId"`
	MachineName              string        `json:"machineName"`
	SerialNumber             string        `json:"serialNumber"`
	CollectionID             string        `json:"collectionId"`
	SasTimeIssues            []IssueDetail `json:"sasTimeIssues"`
	CollectionHistoryIssues  []IssueDetail `json:"collectionHistoryIssues"`
}

type ReportIssue struct {
	LocationReportID   string         `json:"locationReportId"`
	Location           string         `json:"location"`
	Timestamp          time.Time      `json:"timestamp"`
	Collector          string         `json:"collector"`
	TotalMachines      int            `json:"totalMachines"`
	MachinesWithIssues int            `json:"machinesWithIssues"`
	Issues             []MachineIssue `json:"issues"`
}

type IssueReport struct {
	Timestamp        string                 `json:"timestamp"`
	TotalReports     int                    `json:"totalReports"`
	ReportsWithIssues int                   `json:"reportsWithIssues"`
	TotalIssues      int                    `json:"totalIssues"`
	IssuesByType     map[string]int         `json:"issuesByType"`
	DetailedReports  []ReportIssue          `json:"detailedReports"`
}

type BackupSummary struct {
	Timestamp      string                 `json:"timestamp"`
	Collections    []string               `json:"collections"`
	DocumentCounts map[string]int64       `json:"documentCounts"`
	BackupDir      string                 `json:"backupDir"`
}

func createBackup(ctx context.Context, db *mongo.Database) (string, error) {
	fmt.Println("\n" + strings.Repeat("=", 80))
	fmt.Println("🔒 CREATING BACKUP BEFORE DETECTION")
	fmt.Println(strings.Repeat("=", 80) + "\n")
	
	// Create timestamped backup directory
	timestamp := time.Now().Format("2006-01-02T15-04-05-000Z")
	backupDir := filepath.Join("backups", timestamp)
	
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create backup directory: %w", err)
	}
	
	fmt.Printf("📁 Backup directory: %s\n\n", backupDir)
	
	// Collections to backup
	collectionsToBackup := []string{"machines", "collectionreports", "collections"}
	
	summary := BackupSummary{
		Timestamp:      time.Now().Format(time.RFC3339),
		Collections:    collectionsToBackup,
		DocumentCounts: make(map[string]int64),
		BackupDir:      backupDir,
	}
	
	// Backup each collection
	for _, collectionName := range collectionsToBackup {
		startTime := time.Now()
		fmt.Printf("📦 Backing up %s...\n", collectionName)
		
		collection := db.Collection(collectionName)
		
		// Get document count
		count, err := collection.CountDocuments(ctx, bson.M{})
		if err != nil {
			return "", fmt.Errorf("failed to count documents in %s: %w", collectionName, err)
		}
		
		fmt.Printf("   📊 Total documents: %d\n", count)
		summary.DocumentCounts[collectionName] = count
		
		// Fetch all documents
		cursor, err := collection.Find(ctx, bson.M{})
		if err != nil {
			return "", fmt.Errorf("failed to fetch documents from %s: %w", collectionName, err)
		}
		
		var documents []bson.M
		if err := cursor.All(ctx, &documents); err != nil {
			cursor.Close(ctx)
			return "", fmt.Errorf("failed to read documents from %s: %w", collectionName, err)
		}
		cursor.Close(ctx)
		
		// Write to JSON file
		filePath := filepath.Join(backupDir, collectionName+".json")
		jsonData, err := json.MarshalIndent(documents, "", "  ")
		if err != nil {
			return "", fmt.Errorf("failed to marshal %s to JSON: %w", collectionName, err)
		}
		
		if err := os.WriteFile(filePath, jsonData, 0644); err != nil {
			return "", fmt.Errorf("failed to write %s backup: %w", collectionName, err)
		}
		
		duration := time.Since(startTime)
		fileInfo, _ := os.Stat(filePath)
		fileSizeMB := float64(fileInfo.Size()) / (1024 * 1024)
		
		fmt.Printf("   ✅ Backed up %d documents\n", len(documents))
		fmt.Printf("   💾 File size: %.2f MB\n", fileSizeMB)
		fmt.Printf("   ⏱️  Time taken: %.2fs\n\n", duration.Seconds())
	}
	
	// Save backup summary
	summaryData, _ := json.MarshalIndent(summary, "", "  ")
	summaryPath := filepath.Join(backupDir, "backup-summary.json")
	os.WriteFile(summaryPath, summaryData, 0644)
	
	// Create restore instructions
	restoreInstructions := fmt.Sprintf(`# Restore Instructions

## Backup Details
- **Timestamp:** %s
- **Total Collections:** %d
- **Backup Directory:** %s

## Collections Backed Up
`, summary.Timestamp, len(collectionsToBackup), backupDir)
	
	for _, collName := range collectionsToBackup {
		restoreInstructions += fmt.Sprintf("- %s: %d documents\n", collName, summary.DocumentCounts[collName])
	}
	
	restoreInstructions += `
## How to Restore

### Using mongoimport:
` + "`" + `bash
mongoimport --uri="$MONGO_URI" --collection=machines --file=` + backupDir + `/machines.json --jsonArray --drop
mongoimport --uri="$MONGO_URI" --collection=collections --file=` + backupDir + `/collections.json --jsonArray --drop
mongoimport --uri="$MONGO_URI" --collection=collectionreports --file=` + backupDir + `/collectionreports.json --jsonArray --drop
` + "`" + `

⚠️ The --drop flag will DELETE existing data before restoring!
`
	
	os.WriteFile(filepath.Join(backupDir, "RESTORE_INSTRUCTIONS.md"), []byte(restoreInstructions), 0644)
	
	fmt.Println(strings.Repeat("=", 80))
	fmt.Println("✅ BACKUP COMPLETED SUCCESSFULLY!\n")
	fmt.Printf("📁 Backup location: %s\n", backupDir)
	fmt.Println("📄 Files created:")
	for _, collName := range collectionsToBackup {
		fmt.Printf("   - %s.json\n", collName)
	}
	fmt.Println("   - backup-summary.json")
	fmt.Println("   - RESTORE_INSTRUCTIONS.md")
	fmt.Println("\n" + strings.Repeat("=", 80) + "\n")
	
	return backupDir, nil
}

func toFloat64(val interface{}) float64 {
	switch v := val.(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int:
		return float64(v)
	case int32:
		return float64(v)
	case int64:
		return float64(v)
	case string:
		// Try to parse string as float
		var f float64
		fmt.Sscanf(v, "%f", &f)
		return f
	default:
		return 0
	}
}

func main() {
	// Load .env file
	if err := godotenv.Load("../.env"); err != nil {
		log.Fatal("Error loading .env file")
	}

	ctx := context.Background()
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		log.Fatal("MONGO_URI not found in environment variables")
	}

	fmt.Println("🔍 Starting parallel collection issue detection...")
	fmt.Println("📊 Connecting to MongoDB...")

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(ctx)

	db := client.Database("sas-prod")
	
	// 🔒 STEP 1: CREATE BACKUP BEFORE DETECTION
	backupDir, err := createBackup(ctx, db)
	if err != nil {
		log.Fatalf("❌ BACKUP FAILED: %v\n⚠️  Stopping detection. DO NOT proceed without backup!", err)
	}
	fmt.Printf("✅ Backup saved to: %s\n", backupDir)
	fmt.Println("🔍 Proceeding with issue detection...\n")
	
	collectionsCol := db.Collection("collections")
	reportsCol := db.Collection("collectionreports")
	machinesCol := db.Collection("machines")

	// Get all collection reports
	cursor, err := reportsCol.Find(ctx, bson.M{}, options.Find().SetSort(bson.M{"timestamp": -1}))
	if err != nil {
		log.Fatal(err)
	}

	var reports []CollectionReport
	if err := cursor.All(ctx, &reports); err != nil {
		log.Fatal(err)
	}
	cursor.Close(ctx)

	fmt.Printf("📊 Found %d total collection reports\n\n", len(reports))

	// Load ALL collections once (for SAS time checking)
	fmt.Println("📥 Loading all collections for SAS time validation...")
	allCollectionsCursor, err := collectionsCol.Find(ctx, bson.M{
		"isCompleted":      true,
		"locationReportId": bson.M{"$exists": true, "$ne": ""},
	}, options.Find().SetSort(bson.M{"timestamp": 1}))
	if err != nil {
		log.Fatal(err)
	}

	var allCollections []Collection
	if err := allCollectionsCursor.All(ctx, &allCollections); err != nil {
		log.Fatal(err)
	}
	allCollectionsCursor.Close(ctx)
	fmt.Printf("✅ Loaded %d total collections\n\n", len(allCollections))

	// Build machine collection map for fast lookup
	machineCollections := make(map[string][]Collection)
	for _, col := range allCollections {
		machineCollections[col.MachineID] = append(machineCollections[col.MachineID], col)
	}

	// Shared issue report
	issueReport := &IssueReport{
		Timestamp:        time.Now().Format(time.RFC3339),
		TotalReports:     len(reports),
		ReportsWithIssues: 0,
		TotalIssues:      0,
		IssuesByType: map[string]int{
			"sasTimeIssues":              0,
			"collectionHistoryIssues":    0,
			"invertedSasTimes":           0,
			"missingSasStartTime":        0,
		},
		DetailedReports: []ReportIssue{},
	}

	var mu sync.Mutex
	var processed int32
	var wg sync.WaitGroup

	// Process reports in parallel batches
	workerCount := 20 // Number of parallel workers
	reportChan := make(chan CollectionReport, workerCount)

	// Progress ticker
	ticker := time.NewTicker(2 * time.Second)
	done := make(chan bool)
	go func() {
		for {
			select {
			case <-ticker.C:
				current := atomic.LoadInt32(&processed)
				percentage := float64(current) / float64(len(reports)) * 100
				fmt.Printf("\r⏳ Progress: %d/%d (%.1f%%) - Reports with issues: %d", 
					current, len(reports), percentage, issueReport.ReportsWithIssues)
			case <-done:
				ticker.Stop()
				return
			}
		}
	}()

	// Start workers
	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for report := range reportChan {
				processReport(ctx, report, collectionsCol, machinesCol, machineCollections, issueReport, &mu)
				atomic.AddInt32(&processed, 1)
			}
		}(i)
	}

	// Send reports to workers
	for _, report := range reports {
		reportChan <- report
	}
	close(reportChan)

	// Wait for all workers to finish
	wg.Wait()
	done <- true

	fmt.Println("\n\n" + "================================================================================")
	fmt.Println("📊 DETECTION SUMMARY")
	fmt.Println("================================================================================")
	fmt.Printf("Total Reports Scanned: %d\n", issueReport.TotalReports)
	fmt.Printf("Reports with Issues: %d\n", issueReport.ReportsWithIssues)
	fmt.Printf("Total Issues Found: %d\n\n", issueReport.TotalIssues)
	fmt.Println("Issues by Type:")
	fmt.Printf("  SAS Time Issues: %d\n", issueReport.IssuesByType["sasTimeIssues"])
	fmt.Printf("  Collection History Issues: %d\n", issueReport.IssuesByType["collectionHistoryIssues"])
	fmt.Printf("  Inverted SAS Times: %d\n", issueReport.IssuesByType["invertedSasTimes"])
	fmt.Printf("  Missing SAS Start Time: %d\n", issueReport.IssuesByType["missingSasStartTime"])
	fmt.Println("================================================================================")

	// Save JSON report
	jsonPath := "COLLECTION_ISSUES_REPORT.json"
	jsonData, _ := json.MarshalIndent(issueReport, "", "  ")
	os.WriteFile(jsonPath, jsonData, 0644)
	fmt.Printf("\n✅ Full report saved to: %s\n", jsonPath)

	// Generate markdown summary
	generateMarkdownSummary(issueReport)
}

func processReport(
	ctx context.Context,
	report CollectionReport,
	collectionsCol *mongo.Collection,
	machinesCol *mongo.Collection,
	machineCollections map[string][]Collection,
	issueReport *IssueReport,
	mu *sync.Mutex,
) {
	// Get collections for this report
	cursor, err := collectionsCol.Find(ctx, bson.M{
		"locationReportId": report.LocationReportID,
		"isCompleted":      true,
	}, options.Find().SetSort(bson.M{"timestamp": 1}))
	if err != nil {
		return
	}

	var reportCollections []Collection
	cursor.All(ctx, &reportCollections)
	cursor.Close(ctx)

	if len(reportCollections) == 0 {
		return
	}

	reportIssue := ReportIssue{
		LocationReportID:   report.LocationReportID,
		Location:           report.Location,
		Timestamp:          report.Timestamp,
		Collector:          report.Collector,
		TotalMachines:      len(reportCollections),
		MachinesWithIssues: 0,
		Issues:             []MachineIssue{},
	}

	// Check each collection
	for _, collection := range reportCollections {
		// Build machine display name using correct priority: custom name > serial number > machine name
		machineName := collection.MachineName
		if machineName == "" {
			// Try custom name first
			if collection.MachineCustomName != "" {
				machineName = collection.MachineCustomName
			} else if collection.SerialNumber != "" {
				machineName = collection.SerialNumber
			} else {
				machineName = "Unknown Machine"
			}
		}
		
		machineIssue := MachineIssue{
			MachineID:               collection.MachineID,
			MachineName:             machineName,
			SerialNumber:            collection.SerialNumber,
			CollectionID:            collection.ID,
			SasTimeIssues:           []IssueDetail{},
			CollectionHistoryIssues: []IssueDetail{},
		}

		hasIssues := false

		// 1. Check SAS Times
		if collection.SasMeters != nil {
			sasStart := collection.SasMeters.SasStartTime
			sasEnd := collection.SasMeters.SasEndTime

			// Find previous collection for this machine
			var previousCollection *Collection
			machineColls := machineCollections[collection.MachineID]
			for i := len(machineColls) - 1; i >= 0; i-- {
				if machineColls[i].Timestamp.Before(collection.Timestamp) && 
				   machineColls[i].ID != collection.ID {
					previousCollection = &machineColls[i]
					break
				}
			}

			// No previous collection is OK - it means this is the first collection for this machine
			// Only check SAS times if we have both start and end times
			if sasStart != "" && sasEnd != "" {
				sasStartTime, err1 := time.Parse(time.RFC3339, sasStart)
				sasEndTime, err2 := time.Parse(time.RFC3339, sasEnd)

				if err1 == nil && err2 == nil {
					// Check for inverted times
					if sasStartTime.After(sasEndTime) {
						machineIssue.SasTimeIssues = append(machineIssue.SasTimeIssues, IssueDetail{
							Type:    "INVERTED_SAS_TIMES",
							Message: "SAS start time is after SAS end time",
							Actual: map[string]string{
								"start": sasStart,
								"end":   sasEnd,
							},
						})
						hasIssues = true
						mu.Lock()
						issueReport.IssuesByType["invertedSasTimes"]++
						mu.Unlock()
					}

					// Check if SAS start matches previous SAS end (only if previous collection exists)
					if previousCollection != nil && previousCollection.SasMeters != nil && previousCollection.SasMeters.SasEndTime != "" {
						expectedStart, err := time.Parse(time.RFC3339, previousCollection.SasMeters.SasEndTime)
						if err == nil {
							timeDiff := sasStartTime.Sub(expectedStart)
							if timeDiff < 0 {
								timeDiff = -timeDiff
							}
							diffMinutes := int(timeDiff.Minutes())

							if diffMinutes > 5 { // Allow 5 minutes tolerance
								machineIssue.SasTimeIssues = append(machineIssue.SasTimeIssues, IssueDetail{
									Type:              "SAS_START_MISMATCH",
									Message:           "SAS start time doesn't match previous end time",
									Expected:          previousCollection.SasMeters.SasEndTime,
									Actual:            sasStart,
									DifferenceMinutes: diffMinutes,
								})
								hasIssues = true
								mu.Lock()
								issueReport.IssuesByType["sasTimeIssues"]++
								mu.Unlock()
							}
						}
					}
				}
			} else if sasStart == "" {
				machineIssue.SasTimeIssues = append(machineIssue.SasTimeIssues, IssueDetail{
					Type:    "MISSING_SAS_START_TIME",
					Message: "Missing SAS start time",
				})
				hasIssues = true
				mu.Lock()
				issueReport.IssuesByType["missingSasStartTime"]++
				mu.Unlock()
			}
		}

		// 2. Check Collection History
		var machine Machine
		err := machinesCol.FindOne(ctx, bson.M{"_id": collection.MachineID}).Decode(&machine)
		if err == nil && machine.CollectionMetersHistory != nil {
			var historyEntry *HistoryEntry
			for _, entry := range machine.CollectionMetersHistory {
				if entry.LocationReportID == report.LocationReportID {
					historyEntry = &entry
					break
				}
			}

			if historyEntry != nil {
				histMetersIn := toFloat64(historyEntry.MetersIn)
				collMetersIn := toFloat64(collection.MetersIn)
				if histMetersIn != collMetersIn {
					machineIssue.CollectionHistoryIssues = append(machineIssue.CollectionHistoryIssues, IssueDetail{
						Type:       "METERS_IN_MISMATCH",
						Message:    "History metersIn doesn't match collection",
						History:    histMetersIn,
						Collection: collMetersIn,
					})
					hasIssues = true
					mu.Lock()
					issueReport.IssuesByType["collectionHistoryIssues"]++
					mu.Unlock()
				}

				histMetersOut := toFloat64(historyEntry.MetersOut)
				collMetersOut := toFloat64(collection.MetersOut)
				if histMetersOut != collMetersOut {
					machineIssue.CollectionHistoryIssues = append(machineIssue.CollectionHistoryIssues, IssueDetail{
						Type:       "METERS_OUT_MISMATCH",
						Message:    "History metersOut doesn't match collection",
						History:    histMetersOut,
						Collection: collMetersOut,
					})
					hasIssues = true
					mu.Lock()
					issueReport.IssuesByType["collectionHistoryIssues"]++
					mu.Unlock()
				}

				histPrevIn := toFloat64(historyEntry.PrevMetersIn)
				collPrevIn := toFloat64(collection.PrevIn)
				if histPrevIn != collPrevIn {
					machineIssue.CollectionHistoryIssues = append(machineIssue.CollectionHistoryIssues, IssueDetail{
						Type:       "PREV_METERS_IN_MISMATCH",
						Message:    "History prevMetersIn doesn't match collection prevIn",
						History:    histPrevIn,
						Collection: collPrevIn,
					})
					hasIssues = true
					mu.Lock()
					issueReport.IssuesByType["collectionHistoryIssues"]++
					mu.Unlock()
				}

				histPrevOut := toFloat64(historyEntry.PrevMetersOut)
				collPrevOut := toFloat64(collection.PrevOut)
				if histPrevOut != collPrevOut {
					machineIssue.CollectionHistoryIssues = append(machineIssue.CollectionHistoryIssues, IssueDetail{
						Type:       "PREV_METERS_OUT_MISMATCH",
						Message:    "History prevMetersOut doesn't match collection prevOut",
						History:    histPrevOut,
						Collection: collPrevOut,
					})
					hasIssues = true
					mu.Lock()
					issueReport.IssuesByType["collectionHistoryIssues"]++
					mu.Unlock()
				}
			}
		}

		if hasIssues {
			reportIssue.Issues = append(reportIssue.Issues, machineIssue)
			reportIssue.MachinesWithIssues++
			mu.Lock()
			issueReport.TotalIssues += len(machineIssue.SasTimeIssues) + len(machineIssue.CollectionHistoryIssues)
			mu.Unlock()
		}
	}

	if reportIssue.MachinesWithIssues > 0 {
		mu.Lock()
		issueReport.ReportsWithIssues++
		issueReport.DetailedReports = append(issueReport.DetailedReports, reportIssue)
		mu.Unlock()
	}
}

func generateMarkdownSummary(report *IssueReport) {
	mdPath := "COLLECTION_ISSUES_SUMMARY.md"
	
	md := "# Collection Issues Detection Report\n\n"
	md += fmt.Sprintf("**Generated:** %s\n", time.Now().Format("January 2, 2006 at 3:04 PM MST"))
	md += fmt.Sprintf("**Total Reports Scanned:** %d\n", report.TotalReports)
	md += fmt.Sprintf("**Reports with Issues:** %d\n", report.ReportsWithIssues)
	md += fmt.Sprintf("**Total Issues Found:** %d\n\n", report.TotalIssues)
	
	md += "## Issues by Type\n\n"
	md += "| Issue Type | Count |\n"
	md += "|------------|-------|\n"
	md += fmt.Sprintf("| SAS Time Issues | %d |\n", report.IssuesByType["sasTimeIssues"])
	md += fmt.Sprintf("| Collection History Issues | %d |\n", report.IssuesByType["collectionHistoryIssues"])
	md += fmt.Sprintf("| Inverted SAS Times | %d |\n", report.IssuesByType["invertedSasTimes"])
	md += fmt.Sprintf("| Missing SAS Start Time | %d |\n\n", report.IssuesByType["missingSasStartTime"])
	
	if report.ReportsWithIssues > 0 {
		md += "## Reports with Issues\n\n"
		
		// Limit to first 50 reports with issues for readability
		maxReports := 50
		for i, reportDetail := range report.DetailedReports {
			if i >= maxReports {
				md += fmt.Sprintf("\n... and %d more reports with issues (see JSON file for full details)\n", 
					len(report.DetailedReports)-maxReports)
				break
			}
			
			md += fmt.Sprintf("### %s - %s\n", reportDetail.Location, reportDetail.Timestamp.Format("01/02/2006"))
			md += fmt.Sprintf("- **Report ID:** `%s`\n", reportDetail.LocationReportID)
			md += fmt.Sprintf("- **Collector:** %s\n", reportDetail.Collector)
			md += fmt.Sprintf("- **Total Machines:** %d\n", reportDetail.TotalMachines)
			md += fmt.Sprintf("- **Machines with Issues:** %d\n\n", reportDetail.MachinesWithIssues)
			
			for _, machineIssue := range reportDetail.Issues {
				md += fmt.Sprintf("#### Machine: %s (%s)\n", machineIssue.MachineName, machineIssue.SerialNumber)
				
				if len(machineIssue.SasTimeIssues) > 0 {
					md += "**SAS Time Issues:**\n"
					for _, issue := range machineIssue.SasTimeIssues {
						md += fmt.Sprintf("- %s: %s\n", issue.Type, issue.Message)
						if issue.Expected != nil {
							md += fmt.Sprintf("  - Expected: %v\n", issue.Expected)
						}
						if issue.Actual != nil {
							md += fmt.Sprintf("  - Actual: %v\n", issue.Actual)
						}
						if issue.DifferenceMinutes > 0 {
							md += fmt.Sprintf("  - Difference: %d minutes\n", issue.DifferenceMinutes)
						}
					}
					md += "\n"
				}
				
				if len(machineIssue.CollectionHistoryIssues) > 0 {
					md += "**Collection History Issues:**\n"
					for _, issue := range machineIssue.CollectionHistoryIssues {
						md += fmt.Sprintf("- %s: %s\n", issue.Type, issue.Message)
						// Format numbers properly (not scientific notation)
						histVal, collVal := issue.History, issue.Collection
						if hf, ok := histVal.(float64); ok {
							histVal = fmt.Sprintf("%.0f", hf)
						}
						if cf, ok := collVal.(float64); ok {
							collVal = fmt.Sprintf("%.0f", cf)
						}
						md += fmt.Sprintf("  - History: %v\n", histVal)
						md += fmt.Sprintf("  - Collection: %v\n", collVal)
					}
					md += "\n"
				}
			}
		}
	} else {
		md += "## ✅ No Issues Found\n\nAll collection reports are in good condition!\n"
	}
	
	os.WriteFile(mdPath, []byte(md), 0644)
	fmt.Printf("✅ Human-readable summary saved to: %s\n\n", mdPath)
}

