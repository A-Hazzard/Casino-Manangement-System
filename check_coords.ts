import mongoose from 'mongoose';
import { GamingLocations } from './app/api/lib/models/gaminglocations';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/evolution-one-cms');
  const locs = await GamingLocations.find({}).lean();
  for (const loc of locs) {
    console.log('---', loc.name);
    console.log('googleMapsLink:', loc.googleMapsLink);
    console.log('googleMapsIframe:', loc.googleMapsIframe);
    console.log('coords:', loc.geoCoords);
  }
  process.exit(0);
}

check().catch(console.error);
