package types

// LocationMetricsType - Represents aggregated data for a location
type LocationMetricsType struct {
	Location                           string  `bson:"location"`
	MovementTotalDrop                  float64 `bson:"movementTotalDrop"`
	MovementTotalTotalCancelledCredits float64 `bson:"movementTotalTotalCancelledCredits"`
	Gross                              float64 `bson:"gross"`
}

// AggregateUserMetricsQueryFilter - Represents the MongoDB query filter
type AggregateUserMetricsQueryFilter struct {
	Location struct {
		In []string `bson:"$in"`
	} `bson:"location"`
	ReadAt struct {
		Gte string `bson:"$gte"`
		Lte string `bson:"$lte"`
	} `bson:"readAt"`
}
