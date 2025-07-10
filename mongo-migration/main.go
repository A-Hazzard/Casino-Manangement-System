package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const maxRetries = 5
const retryDelay = 2 * time.Second

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	// Set up signal handling to gracefully shut down
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		fmt.Println("\nReceived interrupt signal, shutting down...")
		cancel()
	}()

	// Get MongoDB URIs from environment variables
	srcURI := os.Getenv("SRC_MONGO_URI")
	dstURI := os.Getenv("DST_MONGO_URI")

	if srcURI == "" || dstURI == "" {
		log.Fatal("MongoDB URIs not found in environment variables")
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
	dstDB := dstClient.Database("sas-dev")

	collections := []string{
		"collections",
		"collectionreports",
		"machineevents",
		"acceptedbills",
		"gaminglocations",
		"machines",
		"countries",
		"users",
		"meters",
		"schedulers",
		"licencees",
		"movementrequests",
		"activityLogs",
		"firmwares",
	}

	var wg sync.WaitGroup
	for _, collName := range collections {
		wg.Add(1)
		go func(name string) {
			defer wg.Done()
			migrateCollection(ctx, srcDB, dstDB, name)
		}(collName)
	}

	wg.Add(1)
	go func() {
		defer wg.Done()
		migrateMeters(ctx, srcDB, dstDB)
	}()

	wg.Wait()
	fmt.Println("✅ All collections migrated successfully. Exiting now.")
	os.Exit(0)
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
		fmt.Printf("⚠️ Source collection %s is empty, skipping migration\n", collName)
		return
	}

	cursor, err := srcColl.Find(ctx, bson.D{})
	if err != nil {
		log.Printf("❌ Error finding docs in %s: %v\n", collName, err)
		return
	}
	defer cursor.Close(ctx)

	migratedCount := 0
	for cursor.Next(ctx) {
		var doc bson.M
		if err := cursor.Decode(&doc); err != nil {
			log.Printf("⚠️ Error decoding doc from %s: %v\n", collName, err)
			continue
		}

		id := doc["_id"]
		filter := bson.M{"_id": id}
		opts := options.Replace().SetUpsert(true)

		_, err := dstColl.ReplaceOne(ctx, filter, doc, opts)
		if err != nil {
			log.Printf("❌ Error upserting into %s: %v\n", collName, err)
			continue
		}
		migratedCount++
	}
	fmt.Printf("✅ Migrated %d documents from %s\n", migratedCount, collName)
}

func migrateMeters(ctx context.Context, srcDB, dstDB *mongo.Database) {
	fmt.Println("⏳ Starting migration of meters collection (last 7 days only)...")

	srcColl := srcDB.Collection("meters")
	dstColl := dstDB.Collection("meters")

	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	filter := bson.M{"createdAt": bson.M{"$gte": sevenDaysAgo}}

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

		id := doc["_id"]
		filter := bson.M{"_id": id}
		opts := options.Replace().SetUpsert(true)

		_, err := dstColl.ReplaceOne(ctx, filter, doc, opts)
		if err != nil {
			log.Printf("❌ Error upserting into meters: %v\n", err)
			continue
		}
		count++
	}

	if err := cursor.Err(); err != nil {
		log.Printf("❌ Cursor error during meters migration: %v\n", err)
	}

	fmt.Printf("✅ Completed migration of %d meters documents from last 7 days\n", count)
}
