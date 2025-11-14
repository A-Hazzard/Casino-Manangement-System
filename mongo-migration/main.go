package main

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const maxRetries = 5
const retryDelay = 2 * time.Second

const (
	srcMongoURI = "mongodb://sunny1:87ydaiuhdsia2e@147.182.210.65:32017/sas-prod?authSource=admin"
	dstMongoURI = "mongodb://sunny1:87ydaiuhdsia2e@147.182.210.65:32016/sas-prod?authSource=admin"
)

const resumeStateFile = "resume_state.json"

var (
	resumeState   map[string]string
	resumeStateMu sync.Mutex
)

func initResumeState() {
	resumeStateMu.Lock()
	defer resumeStateMu.Unlock()

	if resumeState != nil {
		return
	}

	resumeState = make(map[string]string)

	data, err := os.ReadFile(resumeStateFile)
	if err != nil {
		if os.IsNotExist(err) {
			return
		}
		log.Printf("⚠️  Unable to read resume state file: %v\n", err)
		return
	}

	if len(data) == 0 {
		return
	}

	if err := json.Unmarshal(data, &resumeState); err != nil {
		log.Printf("⚠️  Unable to parse resume state file: %v\n", err)
		resumeState = make(map[string]string)
	}
}

func saveResumeStateLocked() error {
	file, err := os.Create(resumeStateFile)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	return encoder.Encode(resumeState)
}

func getResumeID(collection string) string {
	resumeStateMu.Lock()
	defer resumeStateMu.Unlock()

	if resumeState == nil {
		resumeState = make(map[string]string)
	}

	return resumeState[collection]
}

func setResumeID(collection, id string) {
	resumeStateMu.Lock()
	defer resumeStateMu.Unlock()

	if resumeState == nil {
		resumeState = make(map[string]string)
	}

	if current, exists := resumeState[collection]; exists && current == id {
		return
	}

	resumeState[collection] = id
	if err := saveResumeStateLocked(); err != nil {
		log.Printf("⚠️  Unable to persist resume state for %s: %v\n", collection, err)
	}
}

func clearResumeID(collection string) {
	resumeStateMu.Lock()
	defer resumeStateMu.Unlock()

	if resumeState == nil {
		return
	}

	if _, exists := resumeState[collection]; !exists {
		return
	}

	delete(resumeState, collection)
	if err := saveResumeStateLocked(); err != nil {
		log.Printf("⚠️  Unable to clear resume state for %s: %v\n", collection, err)
	}
}

func parseResumeValue(id string) interface{} {
	if oid, err := primitive.ObjectIDFromHex(id); err == nil {
		return oid
	}
	return id
}

func extractIDString(id interface{}) string {
	switch v := id.(type) {
	case primitive.ObjectID:
		return v.Hex()
	case string:
		return v
	default:
		return fmt.Sprint(v)
	}
}

var singleVerificationTarget string

func main() {
	initResumeState()

	singleVerificationTarget = strings.TrimSpace(os.Getenv("SINGLE_VERIFY_ID"))
	if singleVerificationTarget != "" {
		log.Printf("Single verification target: %s\n", singleVerificationTarget)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 9*time.Hour)
	defer cancel()

	// Set up signal handling to gracefully shut down
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		fmt.Println("\nReceived interrupt signal, shutting down...")
		cancel()
	}()

	// Use hard-coded MongoDB URIs
	srcURI := srcMongoURI
	dstURI := dstMongoURI

	if srcURI == "" || dstURI == "" {
		log.Fatal("MongoDB URIs are not configured")
	}

	srcClient, err := connectWithRetries(ctx, srcURI)
	if err != nil {
		log.Fatalf("Failed to connect to source DB: %v", err)
	}
	defer disconnectWithLogging(ctx, srcClient)

	dstClient, err := connectWithRetries(ctx, dstURI)
	if err != nil {
		log.Fatalf("Failed to connect to destination DB: %v", err)
	}
	defer disconnectWithLogging(ctx, dstClient)

	srcDB := srcClient.Database("sas-prod")
	dstDB := dstClient.Database("sas-prod")

	collections := []string{
		"acceptedbills",
		"activityLogs",
		"collections",
		"collectionreports",
		"countries",
		"firmwares",
		"gaminglocations",
		"licencees",
		"machineevents",
		"machinesessions",
		"machines",
		"meters",
		"members",
		"movementrequests",
		"relaymessages",
		"schedulers",
		"users",
		"workerstates",
	}

	useGoroutines := askUseGoroutines()

	if useGoroutines {
		var wg sync.WaitGroup
		for _, collName := range collections {
			wg.Add(1)
			go func(name string) {
				defer wg.Done()
				migrateCollection(ctx, srcDB, dstDB, name)
			}(collName)
		}

		if containsCollection(collections, "meters") {
			wg.Add(1)
			go func() {
				defer wg.Done()
				migrateMeters(ctx, srcDB, dstDB)
			}()
		}

		wg.Wait()
	} else {
		for _, collName := range collections {
			migrateCollection(ctx, srcDB, dstDB, collName)
		}

		if containsCollection(collections, "meters") {
			migrateMeters(ctx, srcDB, dstDB)
		}
	}

	fmt.Println("✅ All collections migrated successfully. Exiting now.")
	os.Exit(0)
}

func askUseGoroutines() bool {
	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Use goroutines for migration? (Y/n): ")
	response, err := reader.ReadString('\n')
	if err != nil {
		log.Printf("Error reading input, defaulting to goroutines: %v\n", err)
		return true
	}

	response = strings.TrimSpace(response)
	if response == "" {
		return true
	}

	switch strings.ToLower(response) {
	case "y", "yes":
		return true
	default:
		return false
	}
}

func containsCollection(collections []string, target string) bool {
	for _, coll := range collections {
		if coll == target {
			return true
		}
	}
	return false
}

func connectWithRetries(ctx context.Context, uri string) (*mongo.Client, error) {
	var client *mongo.Client
	var err error
	for i := 0; i < maxRetries; i++ {
		client, err = mongo.Connect(ctx, options.Client().ApplyURI(uri))
		if err == nil {
			return client, nil
		}
		log.Printf("❌ Connection attempt %d failed: %v. Retrying in %v...", i+1, err, retryDelay)
		time.Sleep(retryDelay)
	}
	return nil, fmt.Errorf("failed to connect after %d attempts: %w", maxRetries, err)
}

func disconnectWithLogging(ctx context.Context, client *mongo.Client) {
	if err := client.Disconnect(ctx); err != nil {
		log.Printf("Error disconnecting client: %v", err)
	}
}

func migrateCollection(ctx context.Context, srcDB, dstDB *mongo.Database, collName string) {
	fmt.Printf("⏳ Migrating collection: %s\n", collName)

	srcColl := srcDB.Collection(collName)
	dstColl := dstDB.Collection(collName)

	// Check if source collection exists and has documents
	count, countErr := srcColl.CountDocuments(ctx, bson.D{})
	if countErr != nil {
		log.Printf("❌ Error counting docs in source %s: %v\n", collName, countErr)
		return
	}
	fmt.Printf("📊 Source collection %s has %d documents\n", collName, count)

	if count == 0 {
		clearResumeID(collName)
		fmt.Printf("⚠️ Source collection %s is empty, skipping migration\n", collName)
		return
	}

	filter := bson.D{}
	resumeID := getResumeID(collName)
	if resumeID != "" {
		fmt.Printf("🔁 Resuming %s from _id greater than %s\n", collName, resumeID)
		filter = append(filter, bson.E{Key: "_id", Value: bson.M{"$gt": parseResumeValue(resumeID)}})
	}

	findOptions := options.Find().SetSort(bson.D{{Key: "_id", Value: 1}})

	cursor, err := srcColl.Find(ctx, filter, findOptions)
	if err != nil {
		log.Printf("❌ Error finding docs in %s: %v\n", collName, err)
		return
	}
	defer cursor.Close(ctx)

	migratedCount := 0
	hadFatalError := false
	lastProcessedID := resumeID

	for cursor.Next(ctx) {
		var doc bson.M
		if err := cursor.Decode(&doc); err != nil {
			log.Printf("⚠️ Error decoding doc from %s: %v\n", collName, err)
			continue
		}

		log.Printf("📦 [%s] writing to %s.%s (id=%v)\n", collName, dstDB.Name(), dstColl.Name(), doc["_id"])

		// Special handling for licencees collection to fix licenseKey issues
		if collName == "licencees" {
			// Remove licenseKey field if it's null or empty to avoid unique constraint issues
			if licenseKey, exists := doc["licenseKey"]; exists {
				if licenseKey == nil || licenseKey == "" {
					delete(doc, "licenseKey")
				}
			}
		}

		id := doc["_id"]
		filter := bson.M{"_id": id}
		opts := options.Replace().SetUpsert(true)

		result, err := dstColl.ReplaceOne(ctx, filter, doc, opts)
		if err != nil {
			log.Printf("❌ Error upserting into %s: %v\n", collName, err)
			if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
				hadFatalError = true
				break
			}
			continue
		}
		log.Printf("📝 [%s] write result => matched:%d modified:%d upserted:%d upsertedID:%v\n",
			collName, result.MatchedCount, result.ModifiedCount, result.UpsertedCount, result.UpsertedID)

		if singleVerificationTarget != "" && fmt.Sprint(doc["_id"]) == singleVerificationTarget {
			var verifyDoc bson.M
			if err := dstColl.FindOne(ctx, filter).Decode(&verifyDoc); err != nil {
				log.Printf("❗ [%s] verification FAILED for id=%v: %v\n", collName, doc["_id"], err)
			} else {
				log.Printf("🔍 [%s] verification document:\n%v\n", collName, verifyDoc)
			}
		}

		idStr := extractIDString(id)
		if idStr != "" {
			setResumeID(collName, idStr)
			lastProcessedID = idStr
		}

		migratedCount++
	}

	if err := cursor.Err(); err != nil {
		log.Printf("❌ Cursor error during %s migration: %v\n", collName, err)
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
			hadFatalError = true
		}
	}

	if hadFatalError {
		if lastProcessedID != "" {
			fmt.Printf("⚠️ Migration for %s halted. Progress saved at _id %s. You can rerun to resume.\n", collName, lastProcessedID)
		} else {
			fmt.Printf("⚠️ Migration for %s halted early. Progress saved.\n", collName)
		}
		return
	}

	clearResumeID(collName)
	fmt.Printf("✅ Migrated %d documents from %s\n", migratedCount, collName)
}

func migrateMeters(ctx context.Context, srcDB, dstDB *mongo.Database) {
	fmt.Println("⏳ Starting migration of meters collection (from Nov 11, 2025 9:28 PM UTC onward)...")

	srcColl := srcDB.Collection("meters")
	dstColl := dstDB.Collection("meters")

	startTime := time.Date(2025, time.November, 11, 21, 28, 0, 0, time.UTC)
	now := time.Now().UTC()
	filter := bson.M{
		"createdAt": bson.M{
			"$gte": startTime,
			"$lte": now,
		},
	}

	cursor, err := srcColl.Find(ctx, filter)
	if err != nil {
		log.Printf("❌ Error finding meters docs: %v\n", err)
		return
	}
	defer cursor.Close(ctx)

	count := 0
	for cursor.Next(ctx) {
		var doc bson.M
		if err := cursor.Decode(&doc); err != nil {
			log.Printf("⚠️ Error decoding meters doc: %v\n", err)
			continue
		}

		log.Printf("📦 [meters] writing to %s.%s (id=%v)\n", dstDB.Name(), dstColl.Name(), doc["_id"])

		id := doc["_id"]
		filter := bson.M{"_id": id}
		opts := options.Replace().SetUpsert(true)

		result, err := dstColl.ReplaceOne(ctx, filter, doc, opts)
		if err != nil {
			log.Printf("❌ Error upserting into meters: %v\n", err)
			continue
		}
		log.Printf("📝 [meters] write result => matched:%d modified:%d upserted:%d upsertedID:%v\n",
			result.MatchedCount, result.ModifiedCount, result.UpsertedCount, result.UpsertedID)

		if singleVerificationTarget != "" && fmt.Sprint(doc["_id"]) == singleVerificationTarget {
			var verifyDoc bson.M
			if err := dstColl.FindOne(ctx, filter).Decode(&verifyDoc); err != nil {
				log.Printf("❗ [meters] verification FAILED for id=%v: %v\n", doc["_id"], err)
			} else {
				log.Printf("🔍 [meters] verification document:\n%v\n", verifyDoc)
			}
		}
		count++
	}

	if err := cursor.Err(); err != nil {
		log.Printf("❌ Cursor error during meters migration: %v\n", err)
	}

	fmt.Printf("✅ Completed migration of %d meters documents from specified date range\n", count)
}
