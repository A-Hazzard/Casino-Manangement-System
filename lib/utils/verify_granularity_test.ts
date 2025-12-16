
// Standalone version of getDefaultChartGranularity logic for testing
type TimePeriod = 
  | 'Today'
  | 'Yesterday'
  | 'Week'
  | 'Month'
  | 'Quarterly'
  | 'Year'
  | 'All Time'
  | 'Custom';

function getDefaultChartGranularity(
  timePeriod: TimePeriod,
  startDate?: Date | string,
  endDate?: Date | string
): 'minute' | 'hourly' {
  const HOURS_THRESHOLD = 5;

  // For predefined periods, calculate the actual time range
  if (timePeriod === 'Today') {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    // Calculate exact hours elapsed since midnight (including minutes/seconds)
    const hoursElapsed =
      (now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
    // If <= 5 hours have elapsed, use minute granularity
    // If > 5 hours have elapsed, use hourly granularity
    return hoursElapsed <= HOURS_THRESHOLD ? 'minute' : 'hourly';
  }

  if (timePeriod === 'Yesterday') {
    // Yesterday is always 24 hours, so use hourly
    return 'hourly';
  }

  if (timePeriod === 'Quarterly') {
    // Quarterly is 90 days, so use hourly
    return 'hourly';
  }

  // For Custom time period, use provided dates
  if (timePeriod === 'Custom' && startDate && endDate) {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    const hoursDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    console.log(`Custom Range Diff: ${hoursDiff.toFixed(2)} hours`);
    return hoursDiff <= HOURS_THRESHOLD ? 'minute' : 'hourly';
  }

  // For other periodds (7d, 30d, All Time), default to hourly
  return 'hourly';
}

const runTests = () => {
    console.log('Running Granularity Tests (Standalone)...');

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const fiveHoursOneMinAgo = new Date(now.getTime() - (5 * 60 * 60 * 1000 + 60 * 1000));
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    // Test Case 1: Custom Range - 1 Hour (Should be minute)
    const result1 = getDefaultChartGranularity('Custom', oneHourAgo, now);
    console.log(`Test 1 (1 Hour): ${result1 === 'minute' ? 'PASS' : 'FAIL'} - Got ${result1}`);

    // Test Case 2: Custom Range - Exact 5 Hours (Should be minute)
    const result2 = getDefaultChartGranularity('Custom', fiveHoursAgo, now);
    console.log(`Test 2 (5 Hours): ${result2 === 'minute' ? 'PASS' : 'FAIL'} - Got ${result2}`);

    // Test Case 3: Custom Range - 5 Hours 1 Min (Should be hourly)
    const result3 = getDefaultChartGranularity('Custom', fiveHoursOneMinAgo, now);
    console.log(`Test 3 (5h 1m): ${result3 === 'hourly' ? 'PASS' : 'FAIL'} - Got ${result3}`);

    // Test Case 4: Custom Range - 6 Hours (Should be hourly)
    const result4 = getDefaultChartGranularity('Custom', sixHoursAgo, now);
    console.log(`Test 4 (6 Hours): ${result4 === 'hourly' ? 'PASS' : 'FAIL'} - Got ${result4}`);

    // Test Case 5: String Inputs
    const startStr = fiveHoursAgo.toISOString();
    const endStr = now.toISOString();
    const result5 = getDefaultChartGranularity('Custom', startStr, endStr);
    console.log(`Test 5 (String Inputs): ${result5 === 'minute' ? 'PASS' : 'FAIL'} - Got ${result5}`);
    
    // Test Case 6: Mixed Inputs (Date and String)
    const result6 = getDefaultChartGranularity('Custom', fiveHoursAgo, endStr);
    console.log(`Test 6 (Mixed Inputs): ${result6 === 'minute' ? 'PASS' : 'FAIL'} - Got ${result6}`);
};

runTests();
