import { connectDB, disconnectDB } from '@/app/api/lib/middleware/db';
import { Countries } from '@/app/api/lib/models/countries';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import UserModel from '@/app/api/lib/models/user';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import fs from 'fs/promises';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import path from 'path';

// --- Configuration ---
// ALWAYS export from the production source
const SOURCE_URI = 'mongodb://sunny1:87ydaiuhdsia2e@147.182.210.65:32017/sas-prod?authSource=admin';
const EXPORT_DIR = path.join(process.cwd(), 'migration_exports');
const TIMEZONE_OFFSET = -4;

// --- Migration Types ---
type MigrationPeriod = 'Today' | 'Yesterday';

type LeanLicencee = {
    _id: string;
    name: string;
};

type LeanLocation = {
    _id: string;
    gameDayOffset?: number;
    licencee?: string;
    rel?: {
        licencee?: string;
    };
};

type LeanMachine = {
    _id: string;
    gamingLocation?: string;
};

export async function POST(request: Request) {
    const logs: string[] = [];
    const log = (msg: string) => {
        const timestamped = `[${new Date().toISOString()}] ${msg}`;
        console.log(timestamped);
        logs.push(timestamped);
    };

    // Backup current URI to restore later if needed
    const originalUri = process.env.MONGODB_URI || '';

    try {
        // STEP 0: Clean up any existing connection to avoid Mongoose conflict
        log('🧹 Cleaning up existing connections...');
        await disconnectDB();
        await mongoose.disconnect();

        // STEP 1: Connect to Source
        log(`🔗 Connecting to source: ${SOURCE_URI}`);
        process.env.MONGODB_URI = SOURCE_URI;
        await connectDB();
        log('✅ Connected to source database.');

        // STEP 2: Prep Export
        const body: {
            licenceeName?: string;
            migrateMeters?: boolean;
            daysToMigrate?: MigrationPeriod[];
        } = await request.json().catch(() => ({}));

        const { 
            licenceeName = 'Cabana',
            migrateMeters = true
        } = body;

        // Force strictly Today and Yesterday for export as per requested constraints
        const daysToMigrate: MigrationPeriod[] = ['Today', 'Yesterday'];

        await fs.mkdir(EXPORT_DIR, { recursive: true });
        log(`📁 Exporting JSON files to: ${EXPORT_DIR}`);

        // 1. Export Licencees
        log('🏢 Fetching licencees...');
        const licencees = (await Licencee.find({}).lean()) as unknown as LeanLicencee[];
        if (licencees.length > 0) {
            await fs.writeFile(path.join(EXPORT_DIR, 'licencees.json'), JSON.stringify(licencees, null, 2));
            log(`   ✅ ${licencees.length} Licencees exported.`);
        }

        const targetLicencee = licencees.find((l) => l.name === licenceeName);
        const targetLicenceeId = targetLicencee?._id?.toString();

        if (!targetLicenceeId) {
            throw new Error(`Licencee '${licenceeName}' not found in source database.`);
        }
        log(`📍 Targeting licencee: ${licenceeName} (${targetLicenceeId})`);

        // 2. Export Countries
        log('🌍 Fetching countries...');
        const countries = await Countries.find({}).lean();
        if (countries.length > 0) {
            await fs.writeFile(path.join(EXPORT_DIR, 'countries.json'), JSON.stringify(countries, null, 2));
            log(`   ✅ ${countries.length} Countries exported.`);
        }

        // 3. Export Locations
        log('📍 Fetching locations...');
        const locations = (await GamingLocations.find({}).lean()) as unknown as LeanLocation[];
        const locationOffsets = new Map<string, number>();
        const targetLocationIds: string[] = [];
        
        if (locations.length > 0) {
            locations.forEach((loc) => {
                const offset = loc.gameDayOffset ?? 8;
                locationOffsets.set(loc._id.toString(), offset);
                
                if (loc.licencee?.toString() === targetLicenceeId || loc.rel?.licencee?.toString() === targetLicenceeId) {
                    targetLocationIds.push(loc._id.toString());
                }
            });
            await fs.writeFile(path.join(EXPORT_DIR, 'gaminglocations.json'), JSON.stringify(locations, null, 2));
            log(`   ✅ ${locations.length} Locations exported. (${targetLocationIds.length} for ${licenceeName})`);
        }

        // 4. Export Machines
        log(`🎰 Fetching machines for ${licenceeName}...`);
        const machines = await Machine.find({
            gamingLocation: { $in: targetLocationIds }
        }).lean();

        if (machines.length > 0) {
            await fs.writeFile(path.join(EXPORT_DIR, 'machines.json'), JSON.stringify(machines, null, 2));
            log(`   ✅ ${machines.length} Machines exported.`);
        }

        // 5. Export Meters
        let totalMetersExported = 0;
        const allMeters: unknown[] = [];
        
        if (migrateMeters && machines.length > 0) {
            log('📊 Fetching meters...');
            const machineIds = (machines as unknown as LeanMachine[]).map((m) => m._id.toString());
            
            for (const machineId of machineIds) {
                const machineObj = (machines as unknown as LeanMachine[]).find((m) => m._id.toString() === machineId);
                if (!machineObj) continue;

                const locId = machineObj.gamingLocation?.toString();
                const offset = locationOffsets.get(locId ?? '') ?? 8;

                const ranges = daysToMigrate.map(period => getGamingDayRangeForPeriod(period, offset, undefined, undefined, TIMEZONE_OFFSET));
                
                for (const range of ranges) {
                    const meters = await Meters.find({
                        machine: machineId,
                        readAt: { $gte: range.rangeStart, $lte: range.rangeEnd }
                    }).lean();

                    if (meters.length > 0) {
                        allMeters.push(...meters);
                        totalMetersExported += meters.length;
                    }
                }
            }
            
            if (allMeters.length > 0) {
                await fs.writeFile(path.join(EXPORT_DIR, 'meters.json'), JSON.stringify(allMeters, null, 2));
                log(`   ✅ Total meters exported: ${totalMetersExported}`);
            }
        }

        // 6. Export Users
        log('👥 Fetching users...');
        const users = await UserModel.find({}).lean();
        if (users.length > 0) {
            await fs.writeFile(path.join(EXPORT_DIR, 'users.json'), JSON.stringify(users, null, 2));
            log(`   ✅ ${users.length} Users exported.`);
        }

        // 7. Export Vault Data
        log('🔐 Fetching vault data...');
        const vaultShifts = await VaultShiftModel.find({ locationId: { $in: targetLocationIds } }).lean();
        const vaultTransactions = await VaultTransactionModel.find({ locationId: { $in: targetLocationIds } }).lean();
        
        if (vaultShifts.length > 0) {
            await fs.writeFile(path.join(EXPORT_DIR, 'vault_shifts.json'), JSON.stringify(vaultShifts, null, 2));
            log(`   ✅ ${vaultShifts.length} Vault shifts exported.`);
        }
        if (vaultTransactions.length > 0) {
            await fs.writeFile(path.join(EXPORT_DIR, 'vault_transactions.json'), JSON.stringify(vaultTransactions, null, 2));
            log(`   ✅ ${vaultTransactions.length} Vault transactions exported.`);
        }

        log('🏁 Data export completed successfully.');
        
        return NextResponse.json({
            success: true,
            licencee: licenceeName,
            exportPath: EXPORT_DIR,
            counts: {
                licencees: licencees.length,
                locations: locations.length,
                targetLocations: targetLocationIds.length,
                machines: machines.length,
                meters: totalMetersExported,
                users: users.length,
                vaultShifts: vaultShifts.length,
                vaultTransactions: vaultTransactions.length
            },
            logs
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`❌ Export failed: ${errorMessage}`);
        return NextResponse.json({ success: false, error: errorMessage, logs }, { status: 500 });
    } finally {
        // Restore original URI and close production connection
        log('🧹 Disconnecting from source...');
        await disconnectDB();
        await mongoose.disconnect();
        process.env.MONGODB_URI = originalUri;
    }
}
