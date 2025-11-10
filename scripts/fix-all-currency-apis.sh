#!/bin/bash

# List of API files that need the role check added
API_FILES=(
  "app/api/locations/search-all/route.ts"
  "app/api/analytics/machine-hourly/route.ts"
  "app/api/analytics/locations/route.ts"
  "app/api/analytics/location-trends/route.ts"
  "app/api/reports/meters/route.ts"
  "app/api/reports/machines/route.ts"
  "app/api/analytics/dashboard/route.ts"
  "app/api/analytics/charts/route.ts"
)

echo "Files with shouldApplyCurrencyConversion that need role checks:"
for file in "${API_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  - $file"
  fi
done

