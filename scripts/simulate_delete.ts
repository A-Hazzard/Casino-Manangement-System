import mongoose from 'mongoose';
import { CollectionReport } from '../app/api/lib/models/collectionReport';
import { Collections } from '../app/api/lib/models/collections';
import { Machine } from '../app/api/lib/models/machines';
import {
  removeCollectionHistoryFromMachines,
  revertMachineCollectionMeters,
  deleteManualMetersPerCollection
} from '../app/api/lib/helpers/collectionReport/operations';

const MONGODB_URI = 'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-aaron?authSource=admin';

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const reportId = 'f917e134-6bf5-4173-9544-fa7ba0186719';

    console.log('1. Finding existing report...');
    let existingReport = await CollectionReport.findOne({
      locationReportId: reportId,
    }).lean();
    if (!existingReport && /^[0-9a-fA-F]{24}$/.test(reportId)) {
      existingReport = await CollectionReport.findOne({ _id: reportId }).lean();
    }
    console.log('Found report:', !!existingReport);
    if (!existingReport) return;

    const resolvedReportId = existingReport.locationReportId || reportId;

    console.log('2. Finding associated collections...');
    const associatedCollections = await Collections.find({
      locationReportId: resolvedReportId,
    }).lean();
    console.log(`Found ${associatedCollections.length} collections`);

    console.log('3. Removing collection history from machines...');
    const historyResult = await removeCollectionHistoryFromMachines(resolvedReportId);
    console.log('History removal result:', historyResult);

    console.log('4. Reverting machine collection meters...');
    const revertResult = await revertMachineCollectionMeters(associatedCollections);
    console.log('Revert result:', revertResult);

    console.log('5. Deleting manual meters...');
    const deleteMetersResult = await deleteManualMetersPerCollection(resolvedReportId, false);
    console.log('Delete manual meters result:', deleteMetersResult);

  } catch (error) {
    console.error('SIMULATION ERROR:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
