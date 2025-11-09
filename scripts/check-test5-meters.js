require('dotenv').config();
const mongoose = require('mongoose');

async function checkMeters() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const Meters = mongoose.model('Meters', new mongoose.Schema({}, { strict: false }), 'meters');
  
  const machineId = '68f7ce36f5ea2df7999881aa';
  
  console.log('\n=== TEST5 METERS ===\n');
  
  // Get all meters for TEST5
  const allMeters = await Meters.find({ machine: machineId })
    .sort({ readAt: -1 })
    .limit(10)
    .lean();
  
  console.log(`Total meters for TEST5: ${allMeters.length}`);
  
  if (allMeters.length > 0) {
    console.log('\nRecent meter readings:');
    allMeters.forEach((meter, i) => {
      console.log(`\n${i + 1}. Meter ID: ${meter._id}`);
      console.log(`   Read At: ${new Date(meter.readAt).toISOString()}`);
      console.log(`   Drop (Money In): ${meter.movement?.drop || 0}`);
      console.log(`   Total Cancelled Credits (Money Out): ${meter.movement?.totalCancelledCredits || 0}`);
      console.log(`   Jackpot: ${meter.movement?.jackpot || 0}`);
    });
    
    // Calculate total for ALL TIME
    const totalDrop = allMeters.reduce((sum, m) => sum + (m.movement?.drop || 0), 0);
    console.log(`\n📊 Total drop (ALL TIME): ${totalDrop}`);
    
    // Calculate for TODAY (gaming day - 8 AM to 8 AM)
    // Trinidad is UTC-4, so Trinidad 8 AM = 12:00 PM UTC
    const now = new Date();
    const todayTrinidad = new Date(now);
    todayTrinidad.setUTCHours(12, 0, 0, 0); // Today at 8 AM Trinidad = 12 PM UTC
    
    if (todayTrinidad > now) {
      // If we haven't reached 8 AM Trinidad today yet, go back 24 hours
      todayTrinidad.setDate(todayTrinidad.getDate() - 1);
    }
    
    const tomorrowTrinidad = new Date(todayTrinidad);
    tomorrowTrinidad.setDate(tomorrowTrinidad.getDate() + 1);
    
    console.log(`\n📅 Gaming Day Range (8 AM offset):`);
    console.log(`   Start: ${todayTrinidad.toISOString()} (Trinidad 8 AM)`);
    console.log(`   End: ${tomorrowTrinidad.toISOString()} (Next day Trinidad 8 AM)`);
    
    const todayMeters = allMeters.filter(m => {
      const readAt = new Date(m.readAt);
      return readAt >= todayTrinidad && readAt <= tomorrowTrinidad;
    });
    
    const todayDrop = todayMeters.reduce((sum, m) => sum + (m.movement?.drop || 0), 0);
    console.log(`\n📊 Meters in today's gaming day: ${todayMeters.length}`);
    console.log(`📊 Total drop (TODAY gaming day): ${todayDrop}`);
  }
  
  await mongoose.disconnect();
}

checkMeters().catch(console.error);

