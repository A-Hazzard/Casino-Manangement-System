package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"runtime"
	"sync"
	"time"

	"pre-aggregation/db"
	"pre-aggregation/types"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// aggregateMeters builds the aggregation pipeline for the meters collection.
func aggregateMeters(filter bson.M) mongo.Pipeline {
	return mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$sort", Value: bson.M{"readAt": -1}}},
		{{Key: "$group", Value: bson.M{
			"_id":                                bson.M{"location": "$location"},
			"movementTotalDrop":                  bson.M{"$sum": bson.M{"$ifNull": []interface{}{"$movement.drop", 0}}},
			"movementTotalTotalCancelledCredits": bson.M{"$sum": bson.M{"$ifNull": []interface{}{"$movement.totalCancelledCredits", 0}}},
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":                                0,
			"location":                           "$_id.location",
			"movementTotalDrop":                  1,
			"movementTotalTotalCancelledCredits": 1,
			"gross":                              bson.M{"$subtract": []interface{}{"$movementTotalDrop", "$movementTotalTotalCancelledCredits"}},
		}}},
	}
}

// getAggregatedMetrics runs the aggregation on the meters collection and returns metrics.
func getAggregatedMetrics(
	db *mongo.Database,
	locationIds []string,
	startTime,
	endTime time.Time,
) ([]types.LocationMetricsType, error) {
	filter := bson.M{
		"location": bson.M{"$in": locationIds},
		"readAt":   bson.M{"$gte": startTime, "$lte": endTime},
	}

	cursor, err := db.Collection("meters").Aggregate(context.TODO(), aggregateMeters(filter))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var results []types.LocationMetricsType
	if err := cursor.All(context.TODO(), &results); err != nil {
		return nil, err
	}

	return results, nil
}

// sumMetrics aggregates a slice of LocationMetricsType into a single summary object.
func sumMetrics(metrics []types.LocationMetricsType) map[string]interface{} {
	totalDrop := 0.0
	totalCancelled := 0.0
	totalGross := 0.0
	for _, m := range metrics {
		totalDrop += m.MovementTotalDrop
		totalCancelled += m.MovementTotalTotalCancelledCredits
		totalGross += m.Gross
	}
	return map[string]interface{}{
		"movementTotalDrop":                  totalDrop,
		"movementTotalTotalCancelledCredits": totalCancelled,
		"gross":                              totalGross,
	}
}

// worker processes users from the channel, aggregates metrics, and updates MongoDB.
func worker(ctx context.Context, dbInstance *mongo.Database, users <-chan bson.M, debugChan chan<- map[string]interface{}, wg *sync.WaitGroup) {
	defer wg.Done()

	now := time.Now()
	TodayStart := now.Truncate(24 * time.Hour)
	YesterdayStart := TodayStart.Add(-24 * time.Hour)
	last7DaysStart := TodayStart.Add(-7 * 24 * time.Hour)
	last30DaysStart := TodayStart.Add(-30 * 24 * time.Hour)

	for user := range users {
		select {
		case <-ctx.Done():
			return // Exit if context is canceled
		default:
			var userID string
			// Handle different types for _id.
			switch id := user["_id"].(type) {
			case string:
				userID = id
			case primitive.ObjectID:
				userID = id.Hex()
			default:
				fmt.Println("❌ Skipping user due to invalid _id format:", user["_id"])
				continue
			}

			// Extract assignedLocations.
			rawLocations, exists := user["assignedLocations"]
			if !exists || rawLocations == nil {
				fmt.Printf("🚧 Skipping user %v, no assigned locations.\n", user["username"])
				continue
			}

			// Convert assignedLocations to []string.
			var locationIds []string
			switch res := rawLocations.(type) {
			case []interface{}:
				for _, loc := range res {
					if str, ok := loc.(string); ok {
						locationIds = append(locationIds, str)
					} else {
						fmt.Printf("🚧 Skipping user %v, location element is not a string: %T\n", user["username"], loc)
					}
				}
			case primitive.A:
				for _, loc := range res {
					if str, ok := loc.(string); ok {
						locationIds = append(locationIds, str)
					} else {
						fmt.Printf("🚧 Skipping user %v, location element is not a string: %T\n", user["username"], loc)
					}
				}
			case []string:
				locationIds = res
			default:
				fmt.Printf("🚧 Skipping user %v, locations format incorrect. Got type: %T\n", user["username"], res)
				continue
			}

			if len(locationIds) == 0 {
				fmt.Printf("🚧 Skipping user %v, no assigned locations.\n", user["username"])
				continue
			}

			// Aggregate metrics for each timeframe.
			metricsToday, err := getAggregatedMetrics(dbInstance, locationIds, TodayStart, now)
			if err != nil {
				fmt.Printf("Error aggregating Today's metrics for user %v: %v\n", user["username"], err)
				continue
			}
			metricsYesterday, err := getAggregatedMetrics(dbInstance, locationIds, YesterdayStart, TodayStart)
			if err != nil {
				fmt.Printf("Error aggregating Yesterday's metrics for user %v: %v\n", user["username"], err)
				continue
			}
			metricsLast7Days, err := getAggregatedMetrics(dbInstance, locationIds, last7DaysStart, now)
			if err != nil {
				fmt.Printf("Error aggregating last 7 days metrics for user %v: %v\n", user["username"], err)
				continue
			}
			metricsLast30Days, err := getAggregatedMetrics(dbInstance, locationIds, last30DaysStart, now)
			if err != nil {
				fmt.Printf("Error aggregating last 30 days metrics for user %v: %v\n", user["username"], err)
				continue
			}

			// Sum up the arrays into single objects.
			aggToday := sumMetrics(metricsToday)
			aggYesterday := sumMetrics(metricsYesterday)
			aggLast7Days := sumMetrics(metricsLast7Days)
			aggLast30Days := sumMetrics(metricsLast30Days)

			// Build final metrics document.
			// Store the aggregated metrics in a field named "metrics" and add a "userId" field.
			locationMetrics := map[string]interface{}{
				"Today":      aggToday,
				"Yesterday":  aggYesterday,
				"last7Days":  aggLast7Days,
				"last30Days": aggLast30Days,
			}

			// Log that aggregation is built for the user.
			fmt.Printf("✅ Built aggregation for user: %v\n", user["username"])

			// Prepare update operation.
			update := bson.M{
				"$set": bson.M{
					"metrics":     locationMetrics,
					"lastUpdated": now,
					"userId":      userID,
				},
			}
			// Filter by the "userId" field.
			filter := bson.M{"userId": userID}

			// Execute update.
			_, err = dbInstance.Collection("casinoMetrics").UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
			if err != nil {
				fmt.Printf("Error updating metrics for user %v: %v\n", user["username"], err)
				continue
			}

			// Send debug log entry.
			debugChan <- map[string]interface{}{
				"userId":      userID,
				"metrics":     locationMetrics,
				"lastUpdated": now,
			}
		}
	}
}

// aggregateUserMetrics fetches all users, processes them concurrently using a worker pool,
// collects debug logs, and writes them to a file.
func aggregateUserMetrics() error {
	dbInstance, err := db.ConnectDB()
	if err != nil {
		return err
	}

	usersCollection := dbInstance.Collection("users")
	usersCursor, err := usersCollection.Find(context.TODO(), bson.M{})
	if err != nil {
		return err
	}
	defer usersCursor.Close(context.TODO())

	var users []bson.M
	if err := usersCursor.All(context.TODO(), &users); err != nil {
		return err
	}

	fmt.Printf("Found %d users.\n", len(users))

	// Create channels and a wait group for the worker pool.
	userChan := make(chan bson.M, 100)
	debugChan := make(chan map[string]interface{}, 100)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Set the number of workers based on logical processors.
	numWorkers := runtime.NumCPU() // e.g., 12 on your system.
	if numWorkers < 1 {
		numWorkers = 1
	}
	fmt.Printf("Starting %d workers.\n", numWorkers)
	var wg sync.WaitGroup

	// Start worker goroutines.
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go worker(ctx, dbInstance, userChan, debugChan, &wg)
	}

	// Feed users into the channel.
	go func() {
		for _, user := range users {
			userChan <- user
		}
		close(userChan)
	}()

	// Wait for all workers to finish.
	wg.Wait()
	close(debugChan)

	// Collect debug logs.
	var debugLogs []map[string]interface{}
	for logEntry := range debugChan {
		debugLogs = append(debugLogs, logEntry)
	}

	// Save debug logs to file.
	if err := os.MkdirAll("logs", os.ModePerm); err != nil {
		return err
	}
	file, err := os.Create("logs/aggregation_debug.json")
	if err != nil {
		return err
	}
	defer file.Close()

	if err := json.NewEncoder(file).Encode(debugLogs); err != nil {
		return err
	}

	fmt.Println("✅ Aggregation completed successfully.")
	return nil
}

func main() {
	if err := aggregateUserMetrics(); err != nil {
		log.Fatalf("❌ Aggregation failed: %v", err)
	}
}
