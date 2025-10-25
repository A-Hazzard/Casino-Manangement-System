/**
 * Test Script: Last 7 Days Date Range Calculation
 *
 * This script shows what date range is used when clicking "Last 7 Days"
 * Assumes today is October 16th, 2025 and gaming day offset is 8 (8 AM)
 */

// Simulate the getGamingDayRangeForPeriod logic
function getGamingDayRangeForPeriod(
  timePeriod,
  gameDayStartHour = 8,
  timezoneOffset = -4
) {
  // Get current time in LOCAL timezone (Trinidad/Guyana/Barbados = UTC-4)
  const nowUtc = new Date();
  const nowLocal = new Date(nowUtc.getTime() + timezoneOffset * 60 * 60 * 1000);

  // Use the local date for "today" calculations in UTC
  const today = new Date(
    Date.UTC(
      nowLocal.getUTCFullYear(),
      nowLocal.getUTCMonth(),
      nowLocal.getUTCDate()
    )
  );

  console.log(`Current Time (UTC): ${nowUtc.toISOString()}`);
  console.log(`Current Time (Trinidad Local): ${nowLocal.toISOString()}`);
  console.log(`Today (UTC normalized): ${today.toISOString()}`);
  console.log('');

  if (timePeriod === '7d' || timePeriod === 'last7days') {
    // Last 7 gaming days, starting from 7 days ago at gameDayStartHour
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // -6 because today is day 1

    console.log(`Seven Days Ago (date): ${sevenDaysAgo.toISOString()}`);
    console.log('');

    // Gaming day start on the start date at gameDayStartHour
    const rangeStart = new Date(sevenDaysAgo);
    rangeStart.setUTCHours(gameDayStartHour - timezoneOffset, 0, 0, 0);

    // Gaming day end is 1 millisecond before the next gaming day starts (day after end date)
    const rangeEnd = new Date(today);
    rangeEnd.setDate(rangeEnd.getDate() + 1); // Move to day after end date
    rangeEnd.setUTCHours(gameDayStartHour - timezoneOffset, 0, 0, 0); // Set to start hour
    rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1); // Subtract 1ms

    return { rangeStart, rangeEnd };
  }

  return { rangeStart: new Date(), rangeEnd: new Date() };
}

// Test with October 16th, 2025
console.log("🔍 Testing 'Last 7 Days' Date Range");
console.log('='.repeat(60));
console.log("Scenario: User clicks 'Last 7 Days' on October 16th, 2025");
console.log('Gaming Day Offset: 8 (8:00 AM)');
console.log('Timezone: Trinidad (UTC-4)');
console.log('');

// Simulate different times of day on October 16th
const testCases = [
  {
    time: '2025-10-16T06:00:00.000Z',
    description: '6:00 AM Trinidad (before gaming day starts)',
  },
  {
    time: '2025-10-16T10:00:00.000Z',
    description: '6:00 AM Trinidad (before gaming day starts)',
  },
  {
    time: '2025-10-16T15:00:00.000Z',
    description: '11:00 AM Trinidad (after gaming day started)',
  },
  {
    time: '2025-10-16T20:00:00.000Z',
    description: '4:00 PM Trinidad (afternoon)',
  },
];

for (const testCase of testCases) {
  console.log(`\n📋 Test Case: ${testCase.description}`);
  console.log('='.repeat(40));

  // Mock the current time
  const originalDate = Date;
  global.Date = class extends originalDate {
    constructor(...args) {
      if (args.length === 0) {
        return new originalDate(testCase.time);
      }
      return new originalDate(...args);
    }
    static now() {
      return new originalDate(testCase.time).getTime();
    }
  };

  const result = getGamingDayRangeForPeriod('7d', 8, -4);

  console.log('\n📊 Result:');
  console.log(`Start (UTC): ${result.rangeStart.toISOString()}`);
  console.log(`End (UTC):   ${result.rangeEnd.toISOString()}`);

  // Convert to Trinidad time for display
  const startTrinidad = new Date(
    result.rangeStart.getTime() - 4 * 60 * 60 * 1000
  );
  const endTrinidad = new Date(result.rangeEnd.getTime() - 4 * 60 * 60 * 1000);

  console.log('\n📅 In Trinidad Time (for verification):');
  console.log(
    `Start: ${startTrinidad.toISOString()} (Oct 10, 8:00 AM Trinidad)`
  );
  console.log(
    `End:   ${endTrinidad.toISOString()} (Oct 17, 7:59:59.999 AM Trinidad)`
  );

  // Restore original Date
  global.Date = originalDate;
}

console.log('\n\n🎯 SUMMARY:');
console.log('='.repeat(60));
console.log("When you click 'Last 7 Days' on October 16th:");
console.log('');
console.log('📅 Date Range (Trinidad Time):');
console.log('   Start: October 10, 2025 at 8:00:00 AM');
console.log('   End:   October 17, 2025 at 7:59:59.999 AM');
console.log('');
console.log('🗓️  Days Included:');
console.log('   Day 1: Oct 10 (8 AM - 7:59 AM next day)');
console.log('   Day 2: Oct 11 (8 AM - 7:59 AM next day)');
console.log('   Day 3: Oct 12 (8 AM - 7:59 AM next day)');
console.log('   Day 4: Oct 13 (8 AM - 7:59 AM next day)');
console.log('   Day 5: Oct 14 (8 AM - 7:59 AM next day)');
console.log('   Day 6: Oct 15 (8 AM - 7:59 AM next day)');
console.log('   Day 7: Oct 16 (8 AM - 7:59 AM next day)');
console.log('');
console.log('📊 Database Query (UTC):');
console.log('   Start: October 10, 2025 at 12:00:00 PM UTC');
console.log('   End:   October 17, 2025 at 11:59:59.999 AM UTC');
console.log('');
console.log(
  "⚠️  Note: The calculation is 'today - 6 days' because today counts as day 1"
);
