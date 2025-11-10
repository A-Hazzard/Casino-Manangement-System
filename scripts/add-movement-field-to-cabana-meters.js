require('dotenv').config();
const { MongoClient } = require('mongodb');

const CABANA_LOCATION_ID = '691142e37f88af78f4193b6d';

async function addMovementField() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== ADDING movement FIELD TO CABANA METERS ===\n');
    
    // Get all Cabana meters
    const meters = await db.collection('meters').find({
      location: CABANA_LOCATION_ID
    }).toArray();
    
    console.log(`Found ${meters.length} meters to update\n`);
    
    let updated = 0;
    for (const meter of meters) {
      // Create movement object from sasMeters
      const movement = {
        coinIn: meter.sasMeters.coinIn,
        coinOut: meter.sasMeters.coinOut,
        jackpot: meter.sasMeters.jackpot || 0,
        totalHandPaidCancelledCredits: meter.sasMeters.totalHandPaidCancelledCredits || 0,
        totalCancelledCredits: meter.sasMeters.totalCancelledCredits || 0,
        gamesPlayed: meter.sasMeters.gamesPlayed || 0,
        gamesWon: meter.sasMeters.gamesWon || 0,
        currentCredits: meter.sasMeters.currentCredits || 0,
        totalWonCredits: meter.sasMeters.totalWonCredits || 0,
        drop: meter.sasMeters.drop || 0
      };
      
      // Update meter to add movement field and top-level fields
      await db.collection('meters').updateOne(
        { _id: meter._id },
        {
          $set: {
            movement,
            coinIn: movement.coinIn,
            coinOut: movement.coinOut,
            jackpot: movement.jackpot,
            totalHandPaidCancelledCredits: movement.totalHandPaidCancelledCredits,
            totalCancelledCredits: movement.totalCancelledCredits,
            gamesPlayed: movement.gamesPlayed,
            gamesWon: movement.gamesWon,
            currentCredits: movement.currentCredits,
            totalWonCredits: movement.totalWonCredits,
            drop: movement.drop
          }
        }
      );
      
      updated++;
    }
    
    console.log(`✅ Updated ${updated} meters with movement field\n`);
    
    // Verify
    const sample = await db.collection('meters').findOne({
      location: CABANA_LOCATION_ID
    });
    
    console.log('Sample meter verification:');
    console.log('  Has movement?', sample.movement ? 'YES ✅' : 'NO ❌');
    console.log('  movement.drop:', sample.movement?.drop);
    console.log('  movement.coinIn:', sample.movement?.coinIn);
    console.log('  movement.totalCancelledCredits:', sample.movement?.totalCancelledCredits);
    
    console.log('\n✅ Done! Refresh the browser - data should now appear!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

addMovementField().catch(console.error);

