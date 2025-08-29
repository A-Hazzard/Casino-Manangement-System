package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// getUserInput prompts the user for input and returns the trimmed string.
func getUserInput(prompt string) string {
	fmt.Print(prompt)
	reader := bufio.NewReader(os.Stdin)
	input, _ := reader.ReadString('\n')
	return strings.TrimSpace(input)
}

// getDateRangeInput prompts the user for a date range and returns the start and end time.
func getDateRangeInput() (time.Time, time.Time) {
	for {
		input := getUserInput("Enter date range (today/yesterday/7d/YYYY-MM-DD): ")

		now := time.Now().UTC()
		var startDate, endDate time.Time

		switch strings.ToLower(input) {
		case "today":
			startDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
			endDate = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, time.UTC)
		case "yesterday":
			yesterday := now.AddDate(0, 0, -1)
			startDate = time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, time.UTC)
			endDate = time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 23, 59, 59, 999999999, time.UTC)
		case "7d", "7days":
			sevenDaysAgo := now.AddDate(0, 0, -7)
			startDate = time.Date(sevenDaysAgo.Year(), sevenDaysAgo.Month(), sevenDaysAgo.Day(), 0, 0, 0, 0, time.UTC)
			endDate = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, time.UTC)
		default:
			// Try to parse as YYYY-MM-DD for specific date
			parsedDate, err := time.Parse("2006-01-02", input)
			if err == nil {
				startDate = time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 0, 0, 0, 0, time.UTC)
				endDate = time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 23, 59, 59, 999999999, time.UTC)
			} else {
				fmt.Println("❌ Invalid input. Please use: today, yesterday, 7d, or YYYY-MM-DD")
				continue
			}
		}
		return startDate, endDate
	}
}

// getLicenceeSelection retrieves and displays available licencees, then prompts the user for a selection.
func getLicenceeSelection(ctx context.Context, machines *mongo.Collection) (primitive.ObjectID, string) {
	licencees := machines.Database().Collection("licencees")
	cursor, err := licencees.Find(ctx, bson.M{})
	if err != nil {
		log.Fatal("Failed to get licencees:", err)
	}
	defer cursor.Close(ctx)

	var allLicencees []bson.M
	if err := cursor.All(ctx, &allLicencees); err != nil {
		log.Fatal("Failed to process licencees:", err)
	}

	fmt.Println("\n📋 Available Licencees:")
	for i, licencee := range allLicencees {
		name := licencee["name"]
		id := licencee["_id"]
		fmt.Printf("  %d. %v (ID: %v)\n", i+1, name, id)
	}

	for {
		input := getUserInput("\nSelect licencee number: ")
		selection, err := strconv.Atoi(input)
		if err == nil && selection > 0 && selection <= len(allLicencees) {
			licencee := allLicencees[selection-1]
			// Assume _id is string, convert to ObjectID if needed for other operations, but here we need string for Hex()
			licenceeIDStr := licencee["_id"].(string)
			licenceeName := licencee["name"].(string)
			objID, _ := primitive.ObjectIDFromHex(licenceeIDStr) // Convert to ObjectID for return type
			return objID, licenceeName
		}
		fmt.Printf("❌ Invalid selection. Please enter a number between 1 and %d\n", len(allLicencees))
	}
}

// getLocationSelection retrieves and displays available locations, then prompts the user for a selection.
func getLocationSelection(ctx context.Context, machines *mongo.Collection) (string, string) {
	locations := machines.Database().Collection("gaminglocations")
	cursor, err := locations.Find(ctx, bson.M{})
	if err != nil {
		log.Fatal("Failed to get locations:", err)
	}
	defer cursor.Close(ctx)

	var allLocations []bson.M
	if err := cursor.All(ctx, &allLocations); err != nil {
		log.Fatal("Failed to process locations:", err)
	}

	fmt.Println("\n📋 Available Locations:")
	for i, location := range allLocations {
		name := location["name"]
		id := location["_id"]
		fmt.Printf("  %d. %v (ID: %v)\n", i+1, name, id)
	}

	for {
		input := getUserInput("\nSelect location number: ")
		selection, err := strconv.Atoi(input)
		if err == nil && selection > 0 && selection <= len(allLocations) {
			location := allLocations[selection-1]
			locationID := location["_id"].(string) // _id is expected to be a string here
			locationName := location["name"].(string)
			return locationID, locationName
		}
		fmt.Printf("❌ Invalid selection. Please enter a number between 1 and %d\n", len(allLocations))
	}
}

// searchBySerialNumber searches for a machine by its serial number and retrieves its location and licencee info.
func searchBySerialNumber(ctx context.Context, machines *mongo.Collection) {
	serialNumber := getUserInput("Enter machine serial number: ")

	fmt.Printf("\n🔍 Searching for machine: %s\n", serialNumber)

	// Pipeline to find machine and get location details
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"serialNumber": serialNumber,
		}}},
		// Removed $addFields for locationObjectId, assuming gaminglocations._id is also a string
		{{Key: "$lookup", Value: bson.M{
			"from":         "gaminglocations",
			"localField":   "gamingLocation", // Join directly on string ID
			"foreignField": "_id",            // Assuming gaminglocations._id is a string
			"as":           "location",
		}}},
		{{Key: "$unwind", Value: "$location"}},
		{{Key: "$project", Value: bson.M{
			"_id":           0,
			"Serial Number": "$serialNumber",
			"Game":          "$game",
			"Asset Status":  "$assetStatus",
			"Location Name": "$location.name",
			"Location ID":   "$gamingLocation",
			"Licencee":      "$location.rel.licencee", // Corrected path to licencee
		}}},
	}

	executePipeline(ctx, machines, pipeline, "Machine with Location Info")
}

// searchBySerialNumberWithMeters searches for a machine with meter data by date range.
func searchBySerialNumberWithMeters(ctx context.Context, machines *mongo.Collection) {
	serialNumber := getUserInput("Enter machine serial number: ")
	startDate, endDate := getDateRangeInput()

	fmt.Printf("\n🔍 Searching for machine: %s\n", serialNumber)
	fmt.Printf("📅 Date range: %s to %s\n", startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))

	// Query with meter data filtering by date
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"serialNumber": serialNumber,
			// Filter for "not deleted" machines.
			// Assumes that a deletedAt value of {"$date": {"$numberLong": "-1"}} signifies not deleted.
			// Also considers cases where deletedAt might be null or not exist for older documents.
			"$or": []bson.M{
				{"deletedAt": nil},
				{"deletedAt": bson.M{"$exists": false}},
				{"deletedAt": primitive.NewDateTimeFromTime(time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC))}, // Represents NumberLong(-1)
			},
		}}},
		// Removed $addFields for locationObjectId, assuming gaminglocations._id is also a string
		{{Key: "$lookup", Value: bson.M{
			"from":         "gaminglocations",
			"localField":   "gamingLocation", // Join directly on string ID
			"foreignField": "_id",            // Assuming gaminglocations._id is a string
			"as":           "location",
		}}},
		{{Key: "$unwind", Value: "$location"}},
		{{Key: "$lookup", Value: bson.M{
			"from": "meters",
			"let":  bson.M{"serial": "$serialNumber"},
			"pipeline": mongo.Pipeline{
				{{Key: "$match", Value: bson.M{
					"$expr": bson.M{
						"$and": []interface{}{
							bson.M{"$eq": []string{"$machine", "$$serial"}},
							bson.M{"$gte": []interface{}{"$readAt", startDate}},
							bson.M{"$lte": []interface{}{"$readAt", endDate}},
						},
					},
				}}},
			},
			"as": "meterData",
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":               0,
			"Serial Number":     "$serialNumber",
			"Location Name":     "$location.name",
			"Game":              "$game",
			"Asset Status":      "$assetStatus",
			"Meter Records":     bson.M{"$size": "$meterData"},
			"Collection Meters": "$collectionMeters",
			"SAS Meters":        "$sasMeters",
		}}},
	}

	executePipeline(ctx, machines, pipeline, "Machine with Meter Data Results")
}

// searchByLicencee searches for machines under a specific licencee.
func searchByLicencee(ctx context.Context, machines *mongo.Collection) {
	licenceeID, licenceeName := getLicenceeSelection(ctx, machines)
	startDate, endDate := getDateRangeInput()

	fmt.Printf("\n🔍 Searching for machines under licencee: %s\n", licenceeName)
	fmt.Printf("📅 Date range: %s to %s\n", startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))

	pipeline := mongo.Pipeline{
		// Removed $addFields for locationObjectId, assuming gaminglocations._id is also a string
		{{Key: "$lookup", Value: bson.M{
			"from":         "gaminglocations",
			"localField":   "gamingLocation", // Join directly on string ID
			"foreignField": "_id",            // Assuming gaminglocations._id is a string
			"as":           "location",
		}}},
		{{Key: "$unwind", Value: "$location"}},
		{{Key: "$match", Value: bson.M{
			"location.rel.licencee": licenceeID.Hex(), // licenceeID is ObjectID, Hex() converts to string
			// Filter for "not deleted" machines.
			"$or": []bson.M{
				{"deletedAt": nil},
				{"deletedAt": bson.M{"$exists": false}},
				{"deletedAt": primitive.NewDateTimeFromTime(time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC))}, // Represents NumberLong(-1)
			},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from": "meters",
			"let":  bson.M{"serial": "$serialNumber"},
			"pipeline": mongo.Pipeline{
				{{Key: "$match", Value: bson.M{
					"$expr": bson.M{
						"$and": []interface{}{
							bson.M{"$eq": []string{"$machine", "$$serial"}},
							bson.M{"$gte": []interface{}{"$readAt", startDate}},
							bson.M{"$lte": []interface{}{"$readAt", endDate}},
						},
					},
				}}},
			},
			"as": "meterData",
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":               0,
			"Serial Number":     "$serialNumber",
			"Location Name":     "$location.name",
			"Game":              "$game",
			"Asset Status":      "$assetStatus",
			"Meter Records":     bson.M{"$size": "$meterData"},
			"Collection Meters": "$collectionMeters",
			"SAS Meters":        "$sasMeters",
		}}},
	}

	executePipeline(ctx, machines, pipeline, "Licencee Search Results")
}

// searchByLocation searches for machines at a specific location and retrieves licencee info.
func searchByLocation(ctx context.Context, machines *mongo.Collection) {
	locationID, locationName := getLocationSelection(ctx, machines)

	fmt.Printf("\n🔍 Searching for machines at location: %s\n", locationName)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"gamingLocation": locationID, // gamingLocation is a string
			// Filter for "not deleted" machines.
			"$or": []bson.M{
				{"deletedAt": nil},
				{"deletedAt": bson.M{"$exists": false}},
				{"deletedAt": primitive.NewDateTimeFromTime(time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC))}, // Represents NumberLong(-1)
			},
		}}},
		// Removed $addFields for locationObjectId, assuming gaminglocations._id is also a string
		{{Key: "$lookup", Value: bson.M{
			"from":         "gaminglocations",
			"localField":   "gamingLocation", // Join directly on string ID
			"foreignField": "_id",            // Assuming gaminglocations._id is a string
			"as":           "location",
		}}},
		{{Key: "$unwind", Value: "$location"}},
		{{Key: "$project", Value: bson.M{
			"_id":               0,
			"Serial Number":     "$serialNumber",
			"Location Name":     "$location.name",
			"Licencee":          "$location.rel.licencee", // Corrected path to licencee
			"Game":              "$game",
			"Asset Status":      "$assetStatus",
			"Collection Meters": "$collectionMeters",
			"SAS Meters":        "$sasMeters",
		}}},
	}

	executePipeline(ctx, machines, pipeline, "Machines at Location with Licencee Info")
}

// searchByLocationAndLicencee searches for machines at a specific location under a specific licencee.
func searchByLocationAndLicencee(ctx context.Context, machines *mongo.Collection) {
	licenceeID, licenceeName := getLicenceeSelection(ctx, machines)
	locationID, locationName := getLocationSelection(ctx, machines)
	startDate, endDate := getDateRangeInput()

	fmt.Printf("\n🔍 Searching for machines at location: %s under licencee: %s\n", locationName, licenceeName)
	fmt.Printf("📅 Date range: %s to %s\n", startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"gamingLocation": locationID, // gamingLocation is a string
			// Filter for "not deleted" machines.
			"$or": []bson.M{
				{"deletedAt": nil},
				{"deletedAt": bson.M{"$exists": false}},
				{"deletedAt": primitive.NewDateTimeFromTime(time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC))}, // Represents NumberLong(-1)
			},
		}}},
		// Removed $addFields for locationObjectId, assuming gaminglocations._id is also a string
		{{Key: "$lookup", Value: bson.M{
			"from":         "gaminglocations",
			"localField":   "gamingLocation", // Join directly on string ID
			"foreignField": "_id",            // Assuming gaminglocations._id is a string
			"as":           "location",
		}}},
		{{Key: "$unwind", Value: "$location"}},
		{{Key: "$match", Value: bson.M{
			"location.rel.licencee": licenceeID.Hex(), // licenceeID is ObjectID, Hex() converts to string
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from": "meters",
			"let":  bson.M{"serial": "$serialNumber"},
			"pipeline": mongo.Pipeline{
				{{Key: "$match", Value: bson.M{
					"$expr": bson.M{
						"$and": []interface{}{
							bson.M{"$eq": []string{"$machine", "$$serial"}},
							bson.M{"$gte": []interface{}{"$readAt", startDate}},
							bson.M{"$lte": []interface{}{"$readAt", endDate}},
						},
					},
				}}},
			},
			"as": "meterData",
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":               0,
			"Serial Number":     "$serialNumber",
			"Location Name":     "$location.name",
			"Game":              "$game",
			"Asset Status":      "$assetStatus",
			"Meter Records":     bson.M{"$size": "$meterData"},
			"Collection Meters": "$collectionMeters",
			"SAS Meters":        "$sasMeters",
		}}},
	}

	executePipeline(ctx, machines, pipeline, "Location & Licencee Search Results")
}

// Function to search for all locations under a specific licencee
func searchLocationsByLicencee(ctx context.Context, machines *mongo.Collection) {
	licenceeID, licenceeName := getLicenceeSelection(ctx, machines)

	fmt.Printf("\n🔍 Searching for all locations under licencee: %s\n", licenceeName)

	// Pipeline to find all locations for a specific licencee
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"rel.licencee": licenceeID.Hex(),
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":         0,
			"Location ID": "$_id",
			"Name":        "$name",
			"Licencee":    "$rel.licencee",
		}}},
	}

	// Execute on gaminglocations collection
	locations := machines.Database().Collection("gaminglocations")
	executePipeline(ctx, locations, pipeline, "Locations under Licencee")
}

// executePipeline runs the given aggregation pipeline and prints the results.
func executePipeline(ctx context.Context, machines *mongo.Collection, pipeline mongo.Pipeline, title string) {
	fmt.Println("🚀 Starting aggregation query...")
	startTime := time.Now()

	// Create a progress ticker
	progressTicker := time.NewTicker(10 * time.Second)
	defer progressTicker.Stop()

	// Start progress monitoring in a goroutine
	done := make(chan bool)
	go func() {
		for {
			select {
			case <-progressTicker.C:
				elapsed := time.Since(startTime)
				fmt.Printf("⏳ Query still running... (%v elapsed)\n", elapsed)
			case <-done:
				return
			}
		}
	}()

	cursor, err := machines.Aggregate(ctx, pipeline)
	if err != nil {
		log.Fatal("Aggregation failed:", err)
	}
	defer cursor.Close(ctx)

	// Signal that query is done
	done <- true

	fmt.Println("📊 Processing results...")
	var results []bson.M
	if err := cursor.All(ctx, &results); err != nil {
		log.Fatal("Failed to process results:", err)
	}

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Query completed in %v\n", elapsed)

	if len(results) == 0 {
		fmt.Println("❌ No results found.")
		return
	}

	fmt.Printf("📈 %s - Found %d result(s)\n", title, len(results))
	fmt.Println(strings.Repeat("=", 50))

	for i, res := range results {
		fmt.Printf("Result %d:\n", i+1)
		for key, value := range res {
			fmt.Printf("  %s: %v\n", key, value)
		}
		fmt.Println()
	}
}

// TestDashboardGlobalStats tests dashboard global statistics aggregation
func TestDashboardGlobalStats(ctx context.Context, machines *mongo.Collection, licensee string) {
	fmt.Println("\n🧪 Testing Dashboard Global Stats (DASH-001)")

	startTime := time.Now()

	pipeline := mongo.Pipeline{
		{{Key: "$lookup", Value: bson.M{
			"from":         "gaminglocations",
			"localField":   "gamingLocation",
			"foreignField": "_id",
			"as":           "locationDetails",
		}}},
		{{Key: "$unwind", Value: "$locationDetails"}},
		{{Key: "$match", Value: bson.M{
			"locationDetails.rel.licencee": licensee,
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":                   bson.M{"$literal": nil},
			"totalDrop":             bson.M{"$sum": bson.M{"$ifNull": []interface{}{"$sasMeters.drop", 0}}},
			"totalCancelledCredits": bson.M{"$sum": bson.M{"$ifNull": []interface{}{"$sasMeters.totalCancelledCredits", 0}}},
			"totalGross": bson.M{"$sum": bson.M{"$subtract": []interface{}{
				bson.M{"$ifNull": []interface{}{"$sasMeters.drop", 0}},
				bson.M{"$ifNull": []interface{}{"$sasMeters.totalCancelledCredits", 0}},
			}}},
			"totalMachines": bson.M{"$sum": 1},
			"onlineMachines": bson.M{"$sum": bson.M{"$cond": []interface{}{
				bson.M{"$eq": []interface{}{"$assetStatus", "active"}},
				1,
				0,
			}}},
			"sasMachines": bson.M{"$sum": bson.M{"$cond": []interface{}{
				"$isSasMachine",
				1,
				0,
			}}},
		}}},
	}

	executePipeline(ctx, machines, pipeline, "Dashboard Global Stats Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Dashboard Global Stats Test completed in %v\n", elapsed)
}

// TestLocationAggregation tests location aggregation with financial metrics
func TestLocationAggregation(ctx context.Context, machines *mongo.Collection, timePeriod string) {
	fmt.Println("\n🧪 Testing Location Aggregation (LOC-001)")

	startTime := time.Now()

	// Get date range for time period
	startDate, endDate := getDateRangeForTimePeriod(timePeriod)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"deletedAt": bson.M{"$in": []interface{}{nil, time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC)}},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "machines",
			"localField":   "_id",
			"foreignField": "gamingLocation",
			"as":           "machines",
		}}},
		{{Key: "$unwind", Value: bson.M{
			"path":                       "$machines",
			"preserveNullAndEmptyArrays": false,
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from": "meters",
			"let":  bson.M{"serial": "$machines.serialNumber"},
			"pipeline": mongo.Pipeline{
				{{Key: "$match", Value: bson.M{
					"$expr": bson.M{
						"$and": []interface{}{
							bson.M{"$eq": []string{"$machine", "$$serial"}},
							bson.M{"$gte": []interface{}{"$readAt", startDate}},
							bson.M{"$lte": []interface{}{"$readAt", endDate}},
						},
					},
				}}},
			},
			"as": "meterData",
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":           "$_id",
			"locationName":  bson.M{"$first": "$name"},
			"totalMachines": bson.M{"$sum": 1},
			"sasMachines": bson.M{"$sum": bson.M{"$cond": []interface{}{
				"$machines.isSasMachine",
				1,
				0,
			}}},
			"moneyIn": bson.M{"$sum": bson.M{"$add": []interface{}{
				bson.M{"$sum": "$meterData.movement.coinIn"},
				bson.M{"$sum": "$meterData.movement.drop"},
			}}},
			"moneyOut": bson.M{"$sum": bson.M{"$sum": "$meterData.movement.totalCancelledCredits"}},
			"gross": bson.M{"$sum": bson.M{"$subtract": []interface{}{
				bson.M{"$add": []interface{}{
					bson.M{"$sum": "$meterData.movement.coinIn"},
					bson.M{"$sum": "$meterData.movement.drop"},
				}},
				bson.M{"$sum": "$meterData.movement.totalCancelledCredits"},
			}}},
		}}},
	}

	// Execute on gaminglocations collection
	locations := machines.Database().Collection("gaminglocations")
	executePipeline(ctx, locations, pipeline, "Location Aggregation Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Location Aggregation Test completed in %v\n", elapsed)
}

// TestCabinetAggregation tests cabinet aggregation with financial metrics
func TestCabinetAggregation(ctx context.Context, machines *mongo.Collection, timePeriod string) {
	fmt.Println("\n🧪 Testing Cabinet Aggregation (CAB-001)")

	startTime := time.Now()

	// Get date range for time period
	startDate, endDate := getDateRangeForTimePeriod(timePeriod)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"deletedAt": bson.M{"$in": []interface{}{nil, time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC)}},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from": "meters",
			"let":  bson.M{"serial": "$serialNumber"},
			"pipeline": mongo.Pipeline{
				{{Key: "$match", Value: bson.M{
					"$expr": bson.M{
						"$and": []interface{}{
							bson.M{"$eq": []string{"$machine", "$$serial"}},
							bson.M{"$gte": []interface{}{"$readAt", startDate}},
							bson.M{"$lte": []interface{}{"$readAt", endDate}},
						},
					},
				}}},
			},
			"as": "meterData",
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":          "$_id",
			"serialNumber": bson.M{"$first": "$serialNumber"},
			"game":         bson.M{"$first": "$game"},
			"locationId":   bson.M{"$first": "$gamingLocation"},
			"moneyIn": bson.M{"$sum": bson.M{"$add": []interface{}{
				bson.M{"$sum": "$meterData.movement.coinIn"},
				bson.M{"$sum": "$meterData.movement.drop"},
			}}},
			"moneyOut": bson.M{"$sum": bson.M{"$sum": "$meterData.movement.totalCancelledCredits"}},
			"gross": bson.M{"$sum": bson.M{"$subtract": []interface{}{
				bson.M{"$add": []interface{}{
					bson.M{"$sum": "$meterData.movement.coinIn"},
					bson.M{"$sum": "$meterData.movement.drop"},
				}},
				bson.M{"$sum": "$meterData.movement.totalCancelledCredits"},
			}}},
		}}},
	}

	executePipeline(ctx, machines, pipeline, "Cabinet Aggregation Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Cabinet Aggregation Test completed in %v\n", elapsed)
}

// TestMachineStats tests machine statistics
func TestMachineStats(ctx context.Context, machines *mongo.Collection) {
	fmt.Println("\n🧪 Testing Machine Stats (LOC-003)")

	startTime := time.Now()

	onlineThreshold := time.Now().Add(-3 * time.Minute)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"deletedAt": bson.M{"$in": []interface{}{nil, time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC)}},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":           bson.M{"$literal": nil},
			"totalMachines": bson.M{"$sum": 1},
			"onlineMachines": bson.M{"$sum": bson.M{"$cond": []interface{}{
				bson.M{"$gte": []interface{}{"$lastActivity", onlineThreshold}},
				1,
				0,
			}}},
			"offlineMachines": bson.M{"$sum": bson.M{"$cond": []interface{}{
				bson.M{"$lt": []interface{}{"$lastActivity", onlineThreshold}},
				1,
				0,
			}}},
		}}},
	}

	executePipeline(ctx, machines, pipeline, "Machine Stats Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Machine Stats Test completed in %v\n", elapsed)
}

// TestFinancialCalculations validates financial calculation formulas
func TestFinancialCalculations(ctx context.Context, machines *mongo.Collection, timePeriod string) {
	fmt.Println("\n🧪 Testing Financial Calculations")

	startTime := time.Now()

	// Get date range for time period
	startDate, endDate := getDateRangeForTimePeriod(timePeriod)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"deletedAt": bson.M{"$in": []interface{}{nil, time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC)}},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from": "meters",
			"let":  bson.M{"serial": "$serialNumber"},
			"pipeline": mongo.Pipeline{
				{{Key: "$match", Value: bson.M{
					"$expr": bson.M{
						"$and": []interface{}{
							bson.M{"$eq": []string{"$machine", "$$serial"}},
							bson.M{"$gte": []interface{}{"$readAt", startDate}},
							bson.M{"$lte": []interface{}{"$readAt", endDate}},
						},
					},
				}}},
			},
			"as": "meterData",
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":                   bson.M{"$literal": nil},
			"totalCoinIn":           bson.M{"$sum": bson.M{"$sum": "$meterData.movement.coinIn"}},
			"totalDrop":             bson.M{"$sum": bson.M{"$sum": "$meterData.movement.drop"}},
			"totalCancelledCredits": bson.M{"$sum": bson.M{"$sum": "$meterData.movement.totalCancelledCredits"}},
			"calculatedMoneyIn": bson.M{"$sum": bson.M{"$add": []interface{}{
				bson.M{"$sum": "$meterData.movement.coinIn"},
				bson.M{"$sum": "$meterData.movement.drop"},
			}}},
			"calculatedGross": bson.M{"$sum": bson.M{"$subtract": []interface{}{
				bson.M{"$add": []interface{}{
					bson.M{"$sum": "$meterData.movement.coinIn"},
					bson.M{"$sum": "$meterData.movement.drop"},
				}},
				bson.M{"$sum": "$meterData.movement.totalCancelledCredits"},
			}}},
		}}},
	}

	executePipeline(ctx, machines, pipeline, "Financial Calculations Validation")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Financial Calculations Test completed in %v\n", elapsed)
}

// TestDataIntegrity checks for data integrity issues
func TestDataIntegrity(ctx context.Context, machines *mongo.Collection) {
	fmt.Println("\n🧪 Testing Data Integrity")

	startTime := time.Now()

	// Test 1: Check for machines without locations
	pipeline1 := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"gamingLocation": bson.M{"$exists": false},
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":          0,
			"serialNumber": 1,
			"game":         1,
		}}},
	}

	executePipeline(ctx, machines, pipeline1, "Machines Without Locations")

	// Test 2: Check for machines with invalid locations
	pipeline2 := mongo.Pipeline{
		{{Key: "$lookup", Value: bson.M{
			"from":         "gaminglocations",
			"localField":   "gamingLocation",
			"foreignField": "_id",
			"as":           "locationDetails",
		}}},
		{{Key: "$match", Value: bson.M{
			"locationDetails": bson.M{"$size": 0},
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":            0,
			"serialNumber":   1,
			"gamingLocation": 1,
		}}},
	}

	executePipeline(ctx, machines, pipeline2, "Machines With Invalid Locations")

	// Test 3: Check for negative financial values
	pipeline3 := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"$or": []bson.M{
				{"sasMeters.drop": bson.M{"$lt": 0}},
				{"sasMeters.totalCancelledCredits": bson.M{"$lt": 0}},
				{"sasMeters.coinIn": bson.M{"$lt": 0}},
			},
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":          0,
			"serialNumber": 1,
			"sasMeters":    1,
		}}},
	}

	executePipeline(ctx, machines, pipeline3, "Machines With Negative Financial Values")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Data Integrity Test completed in %v\n", elapsed)
}

// TestPerformance validates query performance
func TestPerformance(ctx context.Context, machines *mongo.Collection) {
	fmt.Println("\n🧪 Testing Query Performance")

	startTime := time.Now()

	// Test 1: Simple find query
	findStart := time.Now()
	cursor, err := machines.Find(ctx, bson.M{})
	if err != nil {
		log.Printf("❌ Simple find query failed: %v", err)
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err := cursor.All(ctx, &results); err != nil {
		log.Printf("❌ Failed to process find results: %v", err)
		return
	}
	findElapsed := time.Since(findStart)

	fmt.Printf("📊 Simple Find Query: %d results in %v\n", len(results), findElapsed)

	// Test 2: Aggregation query
	aggStart := time.Now()
	pipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.M{
			"_id":   bson.M{"$literal": nil},
			"count": bson.M{"$sum": 1},
		}}},
	}

	aggCursor, err := machines.Aggregate(ctx, pipeline)
	if err != nil {
		log.Printf("❌ Aggregation query failed: %v", err)
		return
	}
	defer aggCursor.Close(ctx)

	var aggResults []bson.M
	if err := aggCursor.All(ctx, &aggResults); err != nil {
		log.Printf("❌ Failed to process aggregation results: %v", err)
		return
	}
	aggElapsed := time.Since(aggStart)

	fmt.Printf("📊 Aggregation Query: %v results in %v\n", aggResults, aggElapsed)

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Performance Test completed in %v\n", elapsed)
}

// TestTopPerformingMachines tests top performing machines aggregation
func TestTopPerformingMachines(ctx context.Context, machines *mongo.Collection, timePeriod string) {
	fmt.Println("\n🧪 Testing Top Performing Machines (DASH-002)")

	startTime := time.Now()

	// Get date range for time period
	startDate, endDate := getDateRangeForTimePeriod(timePeriod)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"deletedAt": bson.M{"$in": []interface{}{nil, time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC)}},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from": "meters",
			"let":  bson.M{"serial": "$serialNumber"},
			"pipeline": mongo.Pipeline{
				{{Key: "$match", Value: bson.M{
					"$expr": bson.M{
						"$and": []interface{}{
							bson.M{"$eq": []string{"$machine", "$$serial"}},
							bson.M{"$gte": []interface{}{"$readAt", startDate}},
							bson.M{"$lte": []interface{}{"$readAt", endDate}},
						},
					},
				}}},
			},
			"as": "meterData",
		}}},
		{{Key: "$addFields", Value: bson.M{
			"totalRevenue": bson.M{"$subtract": []interface{}{
				bson.M{"$add": []interface{}{
					bson.M{"$sum": "$meterData.movement.coinIn"},
					bson.M{"$sum": "$meterData.movement.drop"},
				}},
				bson.M{"$sum": "$meterData.movement.totalCancelledCredits"},
			}},
		}}},
		{{Key: "$sort", Value: bson.M{"totalRevenue": -1}}},
		{{Key: "$limit", Value: 5}},
		{{Key: "$project", Value: bson.M{
			"_id":          0,
			"serialNumber": 1,
			"game":         1,
			"totalRevenue": 1,
			"assetStatus":  1,
		}}},
	}

	executePipeline(ctx, machines, pipeline, "Top Performing Machines Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Top Performing Machines Test completed in %v\n", elapsed)
}

// TestGamingLocationsMap tests location data for map display
func TestGamingLocationsMap(ctx context.Context, machines *mongo.Collection) {
	fmt.Println("\n🧪 Testing Gaming Locations Map (DASH-003)")

	startTime := time.Now()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"deletedAt": bson.M{"$in": []interface{}{nil, time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC)}},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "machines",
			"localField":   "_id",
			"foreignField": "gamingLocation",
			"as":           "machines",
		}}},
		{{Key: "$addFields", Value: bson.M{
			"machineCount": bson.M{"$size": "$machines"},
			"onlineMachines": bson.M{"$size": bson.M{"$filter": bson.M{
				"input": "$machines",
				"cond":  bson.M{"$eq": []interface{}{"$$this.assetStatus", "active"}},
			}}},
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":            0,
			"locationId":     "$_id",
			"name":           1,
			"coordinates":    1,
			"machineCount":   1,
			"onlineMachines": 1,
			"licencee":       "$rel.licencee",
		}}},
	}

	// Execute on gaminglocations collection
	locations := machines.Database().Collection("gaminglocations")
	executePipeline(ctx, locations, pipeline, "Gaming Locations Map Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Gaming Locations Map Test completed in %v\n", elapsed)
}

// TestLocationSearch tests location search functionality
func TestLocationSearch(ctx context.Context, machines *mongo.Collection) {
	fmt.Println("\n🧪 Testing Location Search (LOC-002)")

	startTime := time.Now()

	// Test search by partial name
	searchTerm := getUserInput("Enter location search term (or press Enter for default 'Big'): ")
	if searchTerm == "" {
		searchTerm = "Big"
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"$and": []bson.M{
				{"deletedAt": bson.M{"$in": []interface{}{nil, time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC)}}},
				{"name": bson.M{"$regex": searchTerm, "$options": "i"}},
			},
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":        0,
			"locationId": "$_id",
			"name":       1,
			"licencee":   "$rel.licencee",
		}}},
		{{Key: "$limit", Value: 10}},
	}

	// Execute on gaminglocations collection
	locations := machines.Database().Collection("gaminglocations")
	executePipeline(ctx, locations, pipeline, "Location Search Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Location Search Test completed in %v\n", elapsed)
}

// TestCabinetDetails tests individual cabinet details
func TestCabinetDetails(ctx context.Context, machines *mongo.Collection) {
	fmt.Println("\n🧪 Testing Cabinet Details (CAB-002)")

	startTime := time.Now()

	// Get a sample machine for testing
	cursor, err := machines.Find(ctx, bson.M{}, options.Find().SetLimit(1))
	if err != nil {
		log.Printf("❌ Failed to get sample machine: %v", err)
		return
	}
	defer cursor.Close(ctx)

	var sampleMachine bson.M
	if cursor.Next(ctx) {
		if err := cursor.Decode(&sampleMachine); err != nil {
			log.Printf("❌ Failed to decode sample machine: %v", err)
			return
		}
	} else {
		fmt.Println("❌ No machines found for testing")
		return
	}

	machineID := sampleMachine["_id"]

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"_id": machineID}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "gaminglocations",
			"localField":   "gamingLocation",
			"foreignField": "_id",
			"as":           "location",
		}}},
		{{Key: "$unwind", Value: "$location"}},
		{{Key: "$project", Value: bson.M{
			"_id":              0,
			"serialNumber":     1,
			"game":             1,
			"assetStatus":      1,
			"smibId":           1,
			"firmware":         1,
			"locationName":     "$location.name",
			"licencee":         "$location.rel.licencee",
			"sasMeters":        1,
			"collectionMeters": 1,
		}}},
	}

	executePipeline(ctx, machines, pipeline, "Cabinet Details Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Cabinet Details Test completed in %v\n", elapsed)
}

// TestCabinetEvents tests cabinet event logging
func TestCabinetEvents(ctx context.Context, machines *mongo.Collection) {
	fmt.Println("\n🧪 Testing Cabinet Events (CAB-003)")

	startTime := time.Now()

	// Get a sample machine for testing
	cursor, err := machines.Find(ctx, bson.M{}, options.Find().SetLimit(1))
	if err != nil {
		log.Printf("❌ Failed to get sample machine: %v", err)
		return
	}
	defer cursor.Close(ctx)

	var sampleMachine bson.M
	if cursor.Next(ctx) {
		if err := cursor.Decode(&sampleMachine); err != nil {
			log.Printf("❌ Failed to decode sample machine: %v", err)
			return
		}
	} else {
		fmt.Println("❌ No machines found for testing")
		return
	}

	serialNumber := sampleMachine["serialNumber"]

	// Test events collection
	events := machines.Database().Collection("events")

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"machine": serialNumber}}},
		{{Key: "$sort", Value: bson.M{"timestamp": -1}}},
		{{Key: "$limit", Value: 10}},
		{{Key: "$project", Value: bson.M{
			"_id":       0,
			"eventType": 1,
			"timestamp": 1,
			"data":      1,
		}}},
	}

	executePipeline(ctx, events, pipeline, "Cabinet Events Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Cabinet Events Test completed in %v\n", elapsed)
}

// TestLocationCabinets tests cabinets for specific location
func TestLocationCabinets(ctx context.Context, machines *mongo.Collection) {
	fmt.Println("\n🧪 Testing Location Cabinets (LOC-DET-001)")

	startTime := time.Now()

	// Get a sample location for testing
	locations := machines.Database().Collection("gaminglocations")
	locCursor, err := locations.Find(ctx, bson.M{}, options.Find().SetLimit(1))
	if err != nil {
		log.Printf("❌ Failed to get sample location: %v", err)
		return
	}
	defer locCursor.Close(ctx)

	var sampleLocation bson.M
	if locCursor.Next(ctx) {
		if err := locCursor.Decode(&sampleLocation); err != nil {
			log.Printf("❌ Failed to decode sample location: %v", err)
			return
		}
	} else {
		fmt.Println("❌ No locations found for testing")
		return
	}

	locationID := sampleLocation["_id"]

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"gamingLocation": locationID,
			"deletedAt":      bson.M{"$in": []interface{}{nil, time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC)}},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "gaminglocations",
			"localField":   "gamingLocation",
			"foreignField": "_id",
			"as":           "location",
		}}},
		{{Key: "$unwind", Value: "$location"}},
		{{Key: "$project", Value: bson.M{
			"_id":          0,
			"serialNumber": 1,
			"game":         1,
			"assetStatus":  1,
			"locationName": "$location.name",
			"sasMeters":    1,
		}}},
	}

	executePipeline(ctx, machines, pipeline, "Location Cabinets Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Location Cabinets Test completed in %v\n", elapsed)
}

// TestLocationDetails tests location information
func TestLocationDetails(ctx context.Context, machines *mongo.Collection) {
	fmt.Println("\n🧪 Testing Location Details (LOC-DET-002)")

	startTime := time.Now()

	// Get a sample location for testing
	locations := machines.Database().Collection("gaminglocations")
	locCursor, err := locations.Find(ctx, bson.M{}, options.Find().SetLimit(1))
	if err != nil {
		log.Printf("❌ Failed to get sample location: %v", err)
		return
	}
	defer locCursor.Close(ctx)

	var sampleLocation bson.M
	if locCursor.Next(ctx) {
		if err := locCursor.Decode(&sampleLocation); err != nil {
			log.Printf("❌ Failed to decode sample location: %v", err)
			return
		}
	} else {
		fmt.Println("❌ No locations found for testing")
		return
	}

	locationID := sampleLocation["_id"]

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"_id": locationID}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "machines",
			"localField":   "_id",
			"foreignField": "gamingLocation",
			"as":           "machines",
		}}},
		{{Key: "$addFields", Value: bson.M{
			"totalMachines": bson.M{"$size": "$machines"},
			"onlineMachines": bson.M{"$size": bson.M{"$filter": bson.M{
				"input": "$machines",
				"cond":  bson.M{"$eq": []interface{}{"$$this.assetStatus", "active"}},
			}}},
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":            0,
			"locationId":     "$_id",
			"name":           1,
			"coordinates":    1,
			"totalMachines":  1,
			"onlineMachines": 1,
			"licencee":       "$rel.licencee",
			"status":         1,
		}}},
	}

	executePipeline(ctx, locations, pipeline, "Location Details Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Location Details Test completed in %v\n", elapsed)
}

// TestReportsAggregation tests reports data aggregation
func TestReportsAggregation(ctx context.Context, machines *mongo.Collection, timePeriod string) {
	fmt.Println("\n🧪 Testing Reports Aggregation (REP-001)")

	startTime := time.Now()

	// Get date range for time period
	startDate, endDate := getDateRangeForTimePeriod(timePeriod)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"deletedAt": bson.M{"$in": []interface{}{nil, time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC)}},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "gaminglocations",
			"localField":   "gamingLocation",
			"foreignField": "_id",
			"as":           "location",
		}}},
		{{Key: "$unwind", Value: "$location"}},
		{{Key: "$lookup", Value: bson.M{
			"from": "meters",
			"let":  bson.M{"serial": "$serialNumber"},
			"pipeline": mongo.Pipeline{
				{{Key: "$match", Value: bson.M{
					"$expr": bson.M{
						"$and": []interface{}{
							bson.M{"$eq": []string{"$machine", "$$serial"}},
							bson.M{"$gte": []interface{}{"$readAt", startDate}},
							bson.M{"$lte": []interface{}{"$readAt", endDate}},
						},
					},
				}}},
			},
			"as": "meterData",
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":           bson.M{"$literal": nil},
			"totalMachines": bson.M{"$sum": 1},
			"totalRevenue": bson.M{"$sum": bson.M{"$subtract": []interface{}{
				bson.M{"$add": []interface{}{
					bson.M{"$sum": "$meterData.movement.coinIn"},
					bson.M{"$sum": "$meterData.movement.drop"},
				}},
				bson.M{"$sum": "$meterData.movement.totalCancelledCredits"},
			}}},
			"totalDrop":             bson.M{"$sum": bson.M{"$sum": "$meterData.movement.drop"}},
			"totalCancelledCredits": bson.M{"$sum": bson.M{"$sum": "$meterData.movement.totalCancelledCredits"}},
			"avgRevenuePerMachine": bson.M{"$avg": bson.M{"$subtract": []interface{}{
				bson.M{"$add": []interface{}{
					bson.M{"$sum": "$meterData.movement.coinIn"},
					bson.M{"$sum": "$meterData.movement.drop"},
				}},
				bson.M{"$sum": "$meterData.movement.totalCancelledCredits"},
			}}},
		}}},
	}

	executePipeline(ctx, machines, pipeline, "Reports Aggregation Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Reports Aggregation Test completed in %v\n", elapsed)
}

// TestAnalyticsCharts tests chart data generation
func TestAnalyticsCharts(ctx context.Context, machines *mongo.Collection, timePeriod string) {
	fmt.Println("\n🧪 Testing Analytics Charts (REP-002)")

	startTime := time.Now()

	// Get date range for time period
	startDate, endDate := getDateRangeForTimePeriod(timePeriod)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"deletedAt": bson.M{"$in": []interface{}{nil, time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC)}},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from": "meters",
			"let":  bson.M{"serial": "$serialNumber"},
			"pipeline": mongo.Pipeline{
				{{Key: "$match", Value: bson.M{
					"$expr": bson.M{
						"$and": []interface{}{
							bson.M{"$eq": []string{"$machine", "$$serial"}},
							bson.M{"$gte": []interface{}{"$readAt", startDate}},
							bson.M{"$lte": []interface{}{"$readAt", endDate}},
						},
					},
				}}},
			},
			"as": "meterData",
		}}},
		{{Key: "$unwind", Value: "$meterData"}},
		{{Key: "$addFields", Value: bson.M{
			"dailyRevenue": bson.M{"$subtract": []interface{}{
				bson.M{"$add": []interface{}{
					bson.M{"$ifNull": []interface{}{"$meterData.movement.coinIn", 0}},
					bson.M{"$ifNull": []interface{}{"$meterData.movement.drop", 0}},
				}},
				bson.M{"$ifNull": []interface{}{"$meterData.movement.totalCancelledCredits", 0}},
			}},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":          bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$meterData.readAt"}},
			"totalRevenue": bson.M{"$sum": "$dailyRevenue"},
			"machineCount": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
		{{Key: "$limit", Value: 7}},
	}

	executePipeline(ctx, machines, pipeline, "Analytics Charts Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Analytics Charts Test completed in %v\n", elapsed)
}

// TestCollectionData tests collection data aggregation
func TestCollectionData(ctx context.Context, machines *mongo.Collection, timePeriod string) {
	fmt.Println("\n🧪 Testing Collection Data (COL-001)")

	startTime := time.Now()

	// Get date range for time period
	startDate, endDate := getDateRangeForTimePeriod(timePeriod)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"deletedAt": bson.M{"$in": []interface{}{nil, time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC)}},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "gaminglocations",
			"localField":   "gamingLocation",
			"foreignField": "_id",
			"as":           "location",
		}}},
		{{Key: "$unwind", Value: "$location"}},
		{{Key: "$lookup", Value: bson.M{
			"from": "meters",
			"let":  bson.M{"serial": "$serialNumber"},
			"pipeline": mongo.Pipeline{
				{{Key: "$match", Value: bson.M{
					"$expr": bson.M{
						"$and": []interface{}{
							bson.M{"$eq": []string{"$machine", "$$serial"}},
							bson.M{"$gte": []interface{}{"$readAt", startDate}},
							bson.M{"$lte": []interface{}{"$readAt", endDate}},
						},
					},
				}}},
			},
			"as": "meterData",
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":                   "$location.name",
			"locationId":            bson.M{"$first": "$gamingLocation"},
			"totalMachines":         bson.M{"$sum": 1},
			"totalCollection":       bson.M{"$sum": bson.M{"$sum": "$meterData.movement.drop"}},
			"totalCancelledCredits": bson.M{"$sum": bson.M{"$sum": "$meterData.movement.totalCancelledCredits"}},
			"netCollection": bson.M{"$sum": bson.M{"$subtract": []interface{}{
				bson.M{"$sum": "$meterData.movement.drop"},
				bson.M{"$sum": "$meterData.movement.totalCancelledCredits"},
			}}},
		}}},
		{{Key: "$sort", Value: bson.M{"netCollection": -1}}},
	}

	executePipeline(ctx, machines, pipeline, "Collection Data Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Collection Data Test completed in %v\n", elapsed)
}

// TestMemberData tests member data retrieval
func TestMemberData(ctx context.Context, machines *mongo.Collection) {
	fmt.Println("\n🧪 Testing Member Data (MEM-001)")

	startTime := time.Now()

	// Test members collection
	members := machines.Database().Collection("members")

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"deletedAt": bson.M{"$in": []interface{}{nil, time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC)}},
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":       0,
			"memberId":  "$_id",
			"name":      1,
			"email":     1,
			"status":    1,
			"createdAt": 1,
		}}},
		{{Key: "$limit", Value: 10}},
	}

	executePipeline(ctx, members, pipeline, "Member Data Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Member Data Test completed in %v\n", elapsed)
}

// TestMemberSessions tests member session history
func TestMemberSessions(ctx context.Context, machines *mongo.Collection) {
	fmt.Println("\n🧪 Testing Member Sessions (MEM-002)")

	startTime := time.Now()

	// Get a sample member for testing
	members := machines.Database().Collection("members")
	memberCursor, err := members.Find(ctx, bson.M{}, options.Find().SetLimit(1))
	if err != nil {
		log.Printf("❌ Failed to get sample member: %v", err)
		return
	}
	defer memberCursor.Close(ctx)

	var sampleMember bson.M
	if memberCursor.Next(ctx) {
		if err := memberCursor.Decode(&sampleMember); err != nil {
			log.Printf("❌ Failed to decode sample member: %v", err)
			return
		}
	} else {
		fmt.Println("❌ No members found for testing")
		return
	}

	memberID := sampleMember["_id"]

	// Test sessions collection
	sessions := machines.Database().Collection("sessions")

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"memberId": memberID}}},
		{{Key: "$sort", Value: bson.M{"startTime": -1}}},
		{{Key: "$limit", Value: 5}},
		{{Key: "$project", Value: bson.M{
			"_id":       0,
			"sessionId": "$_id",
			"startTime": 1,
			"endTime":   1,
			"machineId": 1,
			"duration":  1,
		}}},
	}

	executePipeline(ctx, sessions, pipeline, "Member Sessions Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Member Sessions Test completed in %v\n", elapsed)
}

// TestSessionData tests session data retrieval
func TestSessionData(ctx context.Context, machines *mongo.Collection) {
	fmt.Println("\n🧪 Testing Session Data (SES-001)")

	startTime := time.Now()

	// Test sessions collection
	sessions := machines.Database().Collection("sessions")

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"deletedAt": bson.M{"$in": []interface{}{nil, time.Date(1969, 12, 31, 23, 59, 59, 999999999, time.UTC)}},
		}}},
		{{Key: "$sort", Value: bson.M{"startTime": -1}}},
		{{Key: "$limit", Value: 10}},
		{{Key: "$project", Value: bson.M{
			"_id":       0,
			"sessionId": "$_id",
			"memberId":  1,
			"machineId": 1,
			"startTime": 1,
			"endTime":   1,
			"duration":  1,
		}}},
	}

	executePipeline(ctx, sessions, pipeline, "Session Data Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Session Data Test completed in %v\n", elapsed)
}

// TestSessionEvents tests session event data
func TestSessionEvents(ctx context.Context, machines *mongo.Collection) {
	fmt.Println("\n🧪 Testing Session Events (SES-002)")

	startTime := time.Now()

	// Get a sample session for testing
	sessions := machines.Database().Collection("sessions")
	sessionCursor, err := sessions.Find(ctx, bson.M{}, options.Find().SetLimit(1))
	if err != nil {
		log.Printf("❌ Failed to get sample session: %v", err)
		return
	}
	defer sessionCursor.Close(ctx)

	var sampleSession bson.M
	if sessionCursor.Next(ctx) {
		if err := sessionCursor.Decode(&sampleSession); err != nil {
			log.Printf("❌ Failed to decode sample session: %v", err)
			return
		}
	} else {
		fmt.Println("❌ No sessions found for testing")
		return
	}

	sessionID := sampleSession["_id"]
	machineID := sampleSession["machineId"]

	// Test events collection
	events := machines.Database().Collection("events")

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"sessionId": sessionID,
			"machineId": machineID,
		}}},
		{{Key: "$sort", Value: bson.M{"timestamp": 1}}},
		{{Key: "$limit", Value: 10}},
		{{Key: "$project", Value: bson.M{
			"_id":       0,
			"eventType": 1,
			"timestamp": 1,
			"data":      1,
		}}},
	}

	executePipeline(ctx, events, pipeline, "Session Events Test")

	elapsed := time.Since(startTime)
	fmt.Printf("✅ Session Events Test completed in %v\n", elapsed)
}

// RunAllTests executes all test scenarios
func RunAllTests(ctx context.Context, machines *mongo.Collection) {
	fmt.Println("\n🚀 Running All Tests")
	fmt.Println(strings.Repeat("=", 50))

	// Get a sample licensee for testing
	licenseeID, _ := getLicenceeSelection(ctx, machines)

	// Run tests with different time periods
	timePeriods := []string{"today", "yesterday", "7d"}

	for _, timePeriod := range timePeriods {
		fmt.Printf("\n📅 Testing with time period: %s\n", timePeriod)
		fmt.Println(strings.Repeat("-", 30))

		// Dashboard Tests
		TestDashboardGlobalStats(ctx, machines, licenseeID.Hex())
		TestTopPerformingMachines(ctx, machines, timePeriod)

		// Location Tests
		TestLocationAggregation(ctx, machines, timePeriod)
		TestLocationSearch(ctx, machines)

		// Cabinet Tests
		TestCabinetAggregation(ctx, machines, timePeriod)
		TestCabinetDetails(ctx, machines)
		TestCabinetEvents(ctx, machines)

		// Financial Tests
		TestFinancialCalculations(ctx, machines, timePeriod)

		// Reports Tests
		TestReportsAggregation(ctx, machines, timePeriod)
		TestAnalyticsCharts(ctx, machines, timePeriod)

		// Collection Tests
		TestCollectionData(ctx, machines, timePeriod)
	}

	// Location Detail Tests
	TestLocationCabinets(ctx, machines)
	TestLocationDetails(ctx, machines)

	// Gaming Locations Map Test
	TestGamingLocationsMap(ctx, machines)

	// Member Tests
	TestMemberData(ctx, machines)
	TestMemberSessions(ctx, machines)

	// Session Tests
	TestSessionData(ctx, machines)
	TestSessionEvents(ctx, machines)

	// Core Tests
	TestMachineStats(ctx, machines)
	TestDataIntegrity(ctx, machines)
	TestPerformance(ctx, machines)

	fmt.Println("\n🎉 All tests completed!")
}

// getDateRangeForTimePeriod converts time period string to date range
func getDateRangeForTimePeriod(timePeriod string) (time.Time, time.Time) {
	now := time.Now().UTC()
	var startDate, endDate time.Time

	switch timePeriod {
	case "today":
		startDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
		endDate = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, time.UTC)
	case "yesterday":
		yesterday := now.AddDate(0, 0, -1)
		startDate = time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, time.UTC)
		endDate = time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 23, 59, 59, 999999999, time.UTC)
	case "7d", "7days":
		sevenDaysAgo := now.AddDate(0, 0, -7)
		startDate = time.Date(sevenDaysAgo.Year(), sevenDaysAgo.Month(), sevenDaysAgo.Day(), 0, 0, 0, 0, time.UTC)
		endDate = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, time.UTC)
	default:
		// Default to today
		startDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
		endDate = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, time.UTC)
	}

	return startDate, endDate
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		log.Fatal("MONGO_URI not found in environment variables")
	}

	// Set connection timeout to 5 minutes for complex queries
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// Configure client with longer timeout for complex queries
	clientOptions := options.Client().ApplyURI(mongoURI).
		SetServerSelectionTimeout(5 * time.Minute).
		SetSocketTimeout(5 * time.Minute).
		SetConnectTimeout(5 * time.Minute)

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(context.Background())

	// Test connection
	fmt.Println("🔌 Testing MongoDB connection...")
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}
	fmt.Println("✅ Connected to MongoDB successfully")

	dbName := "sas-prod" // Ensure this is your correct database name
	machines := client.Database(dbName).Collection("machines")

	for {
		fmt.Println("\n" + strings.Repeat("=", 50))
		fmt.Println("🎰 Machine Search Tool")
		fmt.Println(strings.Repeat("=", 50))
		fmt.Println("1. Search for machine by serial number (get location & licencee)")
		fmt.Println("2. Search for machine with meter data by date range")
		fmt.Println("3. Search for machines under a specific licencee")
		fmt.Println("4. Search for machines at a specific location (get licencee)")
		fmt.Println("5. Search for machines at a location under a specific licencee")
		fmt.Println("6. Search for all locations under a specific licencee")
		fmt.Println("7. Run Automated Tests")
		fmt.Println("8. Exit")
		fmt.Println(strings.Repeat("=", 50))

		choice := getUserInput("Enter your choice (1-8): ")

		switch choice {
		case "1":
			searchBySerialNumber(ctx, machines)
		case "2":
			searchBySerialNumberWithMeters(ctx, machines)
		case "3":
			searchByLicencee(ctx, machines)
		case "4":
			searchByLocation(ctx, machines)
		case "5":
			searchByLocationAndLicencee(ctx, machines)
		case "6":
			searchLocationsByLicencee(ctx, machines)
		case "7":
			RunAllTests(ctx, machines)
		case "8":
			fmt.Println("👋 Goodbye!")
			return
		default:
			fmt.Println("❌ Invalid choice. Please enter a number between 1 and 8.")
		}

		// Ask if user wants to continue (skip for test runs)
		if choice != "7" {
			continueChoice := getUserInput("\nDo you want to perform another search? (y/n): ")
			if strings.ToLower(continueChoice) != "y" && strings.ToLower(continueChoice) != "yes" {
				fmt.Println("👋 Goodbye!")
				break
			}
		}
	}
}
