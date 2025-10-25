/**
 * Quick Test: Last 30 Days Date Range
 * Today: October 16th, 2025
 * Gaming Day Offset: 8 (8:00 AM)
 */

function calculate30Days() {
  // Simulate October 16th, 2025
  const nowUtc = new Date('2025-10-16T15:00:00.000Z'); // 11 AM Trinidad
  const timezoneOffset = -4;
  const gameDayStartHour = 8;

  const nowLocal = new Date(nowUtc.getTime() + timezoneOffset * 60 * 60 * 1000);

  const today = new Date(
    Date.UTC(
      nowLocal.getUTCFullYear(),
      nowLocal.getUTCMonth(),
      nowLocal.getUTCDate()
    )
  );

  // Last 30 days: today - 29 (because today is day 1)
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  // Gaming day start
  const rangeStart = new Date(thirtyDaysAgo);
  rangeStart.setUTCHours(gameDayStartHour - timezoneOffset, 0, 0, 0);

  // Gaming day end
  const rangeEnd = new Date(today);
  rangeEnd.setDate(rangeEnd.getDate() + 1);
  rangeEnd.setUTCHours(gameDayStartHour - timezoneOffset, 0, 0, 0);
  rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1);

  // Convert to Trinidad time for display
  const startTrinidad = new Date(rangeStart.getTime() - 4 * 60 * 60 * 1000);
  const endTrinidad = new Date(rangeEnd.getTime() - 4 * 60 * 60 * 1000);

  console.log('📅 Last 30 Days (October 16th, 2025)');
  console.log('='.repeat(50));
  console.log('');
  console.log('Trinidad Time:');
  console.log(
    `  Start: ${startTrinidad.toISOString().split('T')[0]} at 8:00:00 AM`
  );
  console.log(
    `  End:   ${endTrinidad.toISOString().split('T')[0]} at 7:59:59.999 AM`
  );
  console.log('');
  console.log('Database Query (UTC):');
  console.log(`  Start: ${rangeStart.toISOString()}`);
  console.log(`  End:   ${rangeEnd.toISOString()}`);
}

calculate30Days();
