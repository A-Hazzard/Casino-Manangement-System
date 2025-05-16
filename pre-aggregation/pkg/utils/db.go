package db

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	clientInstance *mongo.Client
	clientOnce     sync.Once
)

// ConnectDB - Establish a MongoDB connection & return the database instance
func ConnectDB() (*mongo.Database, error) {
	clientOnce.Do(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// Use full connection string with DB name
		mongoURI := "mongodb://sunny1:87ydaiuhdsia2e@147.182.210.65:32017/sas-prod?authSource=admin"
		clientOptions := options.Client().ApplyURI(mongoURI)

		client, err := mongo.Connect(ctx, clientOptions)
		if err != nil {
			log.Fatalf("❌ MongoDB connection failed: %v", err)
		}

		if err := client.Ping(ctx, nil); err != nil {
			log.Fatalf("❌ Failed to ping MongoDB: %v", err)
		}

		clientInstance = client
		fmt.Println("✅ Connected to MongoDB")
	})

	// MongoDB will automatically use "sas-prod" from the URI
	return clientInstance.Database("sas-prod"), nil
}
