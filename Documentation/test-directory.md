# Test Directory Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview
The `test/` directory contains a **Go-based MongoDB query tool** designed for development, debugging, and data validation. This interactive CLI tool allows developers to test database queries directly without affecting the main application.

## Purpose and Benefits

### **Primary Use Cases**
- **Database Testing**: Test MongoDB queries directly against the production database
- **Data Validation**: Verify data structure and relationships
- **Query Optimization**: Test and optimize complex aggregation pipelines
- **Development Support**: Debug data issues without affecting the main application
- **Performance Testing**: Measure query performance with real data
- **Data Exploration**: Understand data relationships and structure

### **Why This Tool Exists**
- **Isolation**: Test queries without impacting the main application
- **Speed**: Direct database access for quick debugging
- **Flexibility**: Interactive tool for exploring different query scenarios
- **Safety**: Read-only operations to prevent accidental data changes
- **Learning**: Understand how the database queries work in the main application

## Installation and Setup

### **Prerequisites**
- **Go 1.18+**: Required to run the Go application
- **MongoDB Connection**: Access to the `sas-prod` database
- **Environment Variables**: Proper configuration in `.env` file

### **Setup Steps**
1. **Navigate to test directory:**
   ```bash
   cd test/
   ```

2. **Install Go dependencies:**
   ```bash
   go mod tidy
   ```

3. **Configure environment:**
   Create or update `.env` file with:
   ```env
   MONGO_URI=mongodb://your-connection-string
   ```

4. **Run the application:**
   ```bash
   go run main.go
   ```

## Available Query Types

### **1. Machine Search by Serial Number**
**Purpose:** Find a specific machine and get its location/licensee information

**What it does:**
- Searches for a machine by its serial number
- Returns basic machine information
- Shows which location the machine is at
- Displays which company owns the location

**Use case:** When you need to find a specific machine and verify its configuration

### **2. Machine Search with Meter Data**
**Purpose:** Find a machine and see its financial performance over a specific time period

**What it does:**
- Finds a machine by serial number
- Gets all meter readings for a specified date range
- Shows financial data (money in, out, jackpots)
- Displays how many meter records were found

**Use case:** When you need to verify a machine's financial performance or debug data issues

### **3. Licensee Search**
**Purpose:** Find all machines owned by a specific company

**What it does:**
- Lists all available licensees
- Shows all machines under the selected licensee
- Includes meter data for the specified time period
- Displays machine counts and financial summaries

**Use case:** When you need to analyze performance across a specific company's machines

### **4. Location Search**
**Purpose:** Find all machines at a specific casino location

**What it does:**
- Lists all available locations
- Shows all machines at the selected location
- Includes basic machine information and status
- Displays machine counts by status

**Use case:** When you need to audit machines at a specific location

### **5. Location & Licensee Combined Search**
**Purpose:** Find machines at a specific location under a specific licensee

**What it does:**
- Combines location and licensee filtering
- Shows machines that match both criteria
- Includes meter data for the specified time period
- Provides detailed financial analysis

**Use case:** When you need to analyze performance for a specific company at a specific location

### **6. Locations by Licensee**
**Purpose:** Find all locations owned by a specific company

**What it does:**
- Lists all locations under the selected licensee
- Shows location details and ownership information
- Provides location count and summary

**Use case:** When you need to understand a company's geographic footprint

## Date Range Options

### **Predefined Ranges**
- **today**: Current day (00:00 to 23:59)
- **yesterday**: Previous day (00:00 to 23:59)
- **7d/7days**: Last 7 days (00:00 to 23:59)

### **Custom Dates**
- **Format**: YYYY-MM-DD (e.g., "2024-01-15")
- **Range**: Single day (00:00 to 23:59)

### **Timezone Handling**
- **Database Storage**: All dates stored in UTC
- **Query Processing**: Converts to Trinidad timezone (UTC-4) for display
- **Date Range**: Automatically adjusts for timezone differences

## Database Collections Used

### **machines Collection**
**Purpose:** Stores basic machine information
**Key Fields:**
- `_id`: Unique machine identifier
- `serialNumber`: Machine's serial number
- `gamingLocation`: Location ID where machine is installed
- `game`: Game name installed on machine
- `assetStatus`: Current status (active, maintenance, etc.)
- `smibBoard`: SMIB controller identifier

### **gaminglocations Collection**
**Purpose:** Stores casino location information
**Key Fields:**
- `_id`: Unique location identifier
- `name`: Location name
- `rel.licencee`: Company that owns the location
- `geoCoords`: Geographic coordinates for mapping

### **meters Collection**
**Purpose:** Stores financial meter readings from machines
**Key Fields:**
- `machine`: Machine ID (references machines._id)
- `readAt`: When the reading was taken
- `movement.totalCancelledCredits`: Money that was cancelled/refunded
- `movement.coinIn`: Money players put into machine
- `movement.drop`: Money collected from machine
- `movement.jackpot`: Jackpot amounts

### **licencees Collection**
**Purpose:** Stores company/licensee information
**Key Fields:**
- `_id`: Unique licensee identifier
- `name`: Company name
- `status`: Licensee status

## Query Examples and Use Cases

### **Example 1: Debugging Missing Financial Data**
**Scenario:** A machine shows $0 in the main application but you know it should have data

**Steps:**
1. Run the tool: `go run main.go`
2. Choose option 2 (Machine with Meter Data)
3. Enter the machine's serial number
4. Select "today" or "yesterday" for date range
5. Check if meter records exist and have financial data

**Expected Results:**
- If no meter records: Machine might be offline or not reporting
- If meter records exist but show $0: Data issue in the main application
- If meter records show correct data: Frontend display issue

### **Example 2: Verifying Location Assignment**
**Scenario:** A machine appears to be in the wrong location

**Steps:**
1. Run the tool: `go run main.go`
2. Choose option 1 (Machine Search)
3. Enter the machine's serial number
4. Verify the location assignment

**Expected Results:**
- Shows current location assignment
- Displays location name and licensee
- Helps identify if location data is correct

### **Example 3: Performance Analysis**
**Scenario:** You want to compare performance across different licensees

**Steps:**
1. Run the tool: `go run main.go`
2. Choose option 3 (Licensee Search)
3. Select a licensee
4. Choose a date range (e.g., "7d")
5. Analyze the results

**Expected Results:**
- Shows all machines under that licensee
- Displays financial performance for each machine
- Helps identify top-performing machines

### **Example 4: Data Validation**
**Scenario:** You want to verify that the main application is calculating financial data correctly

**Steps:**
1. Run the tool: `go run main.go`
2. Choose option 2 (Machine with Meter Data)
3. Enter a machine serial number
4. Select a date range
5. Manually calculate totals and compare with main application

**Expected Results:**
- Raw meter data for manual verification
- Ability to spot calculation errors
- Validation of aggregation logic

## Performance and Limitations

### **Query Performance**
- **Timeout**: 5-minute timeout for complex queries
- **Progress Monitoring**: Shows elapsed time for long-running queries
- **Index Usage**: Leverages existing database indexes
- **Memory Usage**: Efficient memory usage for large result sets

### **Limitations**
- **Read-Only**: Cannot modify data (safety feature)
- **Single Database**: Only connects to `sas-prod` database
- **No Authentication**: Uses direct database connection
- **Limited Export**: Results displayed in console only

### **Best Practices**
- **Use Specific Date Ranges**: Avoid querying very large date ranges
- **Limit Machine Count**: Use location/licensee filters to reduce result size
- **Monitor Performance**: Watch for timeout messages on complex queries
- **Validate Results**: Cross-reference with main application when possible

## Troubleshooting

### **Common Issues**

#### **Connection Problems**
**Symptoms:** "Failed to connect to MongoDB" error
**Solutions:**
- Verify `MONGO_URI` in `.env` file
- Check network connectivity
- Ensure database server is running
- Verify connection string format

#### **Timeout Errors**
**Symptoms:** Query takes too long and times out
**Solutions:**
- Use smaller date ranges
- Add location/licensee filters
- Check database performance
- Consider running during off-peak hours

#### **No Results Found**
**Symptoms:** Query returns empty results
**Solutions:**
- Verify serial number spelling
- Check date range (data might not exist for that period)
- Confirm location/licensee selection
- Check if machine exists in database

### **Debug Mode**
The tool includes built-in debugging features:
- **Progress Messages**: Shows query progress for long operations
- **Error Details**: Provides detailed error messages
- **Query Validation**: Validates inputs before execution
- **Result Counts**: Shows how many records were found

## Integration with Main Application

### **Data Consistency**
- **Same Database**: Uses the same `sas-prod` database as main application
- **Same Collections**: Queries the same collections and fields
- **Same Timezone**: Handles Trinidad timezone (UTC-4) consistently
- **Same Indexes**: Leverages the same database indexes

### **Development Workflow**
1. **Identify Issue**: Notice problem in main application
2. **Test with Tool**: Use test tool to verify data
3. **Debug Query**: Test different query approaches
4. **Implement Fix**: Apply solution to main application
5. **Verify Fix**: Use tool to confirm fix works

### **Query Validation**
- **Compare Results**: Cross-reference tool results with main application
- **Test Edge Cases**: Use tool to test unusual scenarios
- **Performance Testing**: Measure query performance before implementing
- **Data Verification**: Confirm data accuracy and completeness

## Future Enhancements

### **Planned Features**
- **Query Export**: Save query results to files
- **Query Templates**: Predefined queries for common scenarios
- **Batch Processing**: Run multiple queries in sequence
- **Visual Results**: Charts and graphs for data visualization
- **Query History**: Save and replay previous queries

### **Potential Improvements**
- **Web UI**: Browser-based query tool
- **Real-time Monitoring**: Live data monitoring capabilities
- **Alert System**: Notifications for data anomalies
- **Report Generation**: Automated report creation
- **API Integration**: REST API for programmatic access

## Conclusion

The test directory provides essential development and debugging capabilities for the Evolution1 CMS system. It enables developers to:

- **Validate Data**: Ensure data accuracy and consistency
- **Debug Issues**: Quickly identify and resolve data problems
- **Optimize Queries**: Test and improve database performance
- **Understand Data**: Explore data relationships and structure
- **Support Development**: Provide tools for ongoing development work

This tool is particularly valuable for a casino management system where data accuracy and financial calculations are critical for business operations and regulatory compliance.
