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
		fmt.Println("7. Exit")
		fmt.Println(strings.Repeat("=", 50))

		choice := getUserInput("Enter your choice (1-7): ")

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
			fmt.Println("👋 Goodbye!")
			return
		default:
			fmt.Println("❌ Invalid choice. Please enter a number between 1 and 7.")
		}

		// Ask if user wants to continue
		continueChoice := getUserInput("\nDo you want to perform another search? (y/n): ")
		if strings.ToLower(continueChoice) != "y" && strings.ToLower(continueChoice) != "yes" {
			fmt.Println("👋 Goodbye!")
			break
		}
	}
}
