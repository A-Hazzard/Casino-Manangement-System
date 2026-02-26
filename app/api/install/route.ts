/**
 * First-Time Setup API Route
 *
 * Seeds the database with an initial admin user.
 * Prevents re-initialization if an admin already exists.
 *
 * Flow:
 * 1. Connect to database
 * 2. Check if admin user already exists (by username OR email)
 * 3. Hash the default password
 * 4. Create the admin user
 * 5. Return 201 Created
 *
 * @module app/api/install/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { Countries } from '@/app/api/lib/models/countries';
import { Licensee } from '@/app/api/lib/models/licensee';
import UserModel from '@/app/api/lib/models/user';
import { generateUniqueLicenseKey } from '@/app/api/lib/utils/licenseKey';
import { hashPassword } from '@/app/api/lib/utils/validation';
import { generateMongoId } from '@/lib/utils/id';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Check if system is already initialized
    // ============================================================================
    const [existingUser, existingCountryCount, existingLicenseeCount] = await Promise.all([
      UserModel.findOne({
        $or: [{ username: 'admin' }, { emailAddress: 'admin@gmail.com' }],
      }).lean(),
      Countries.countDocuments({
        name: { $in: ['Trinidad & Tobago', 'Guyana', 'Barbados', 'St. Lucia'] },
      }),
      Licensee.countDocuments({
        name: { $in: ['TTG', 'Cabana', 'Barbados'] },
      }),
    ]);

    // Only block installation if ALL prerequisite data exists
    if (existingUser && existingCountryCount >= 4 && existingLicenseeCount >= 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'System is already initialized. Initial data already exists.',
        },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 3: Hash the default password
    // ============================================================================
    const defaultPassword = process.env.DEFAULT_PASSWORD;
    if (!defaultPassword) throw new Error('DEFAULT_PASSWORD environment variable is not set');
    const hashedPassword = await hashPassword(defaultPassword);

    // ============================================================================
    // STEP 4: Seed Countries
    // ============================================================================
    const countriesData = [
      { name: 'Trinidad & Tobago', _id: 'be622340d9d8384087937ff6' },
      { name: 'Guyana', _id: '175d649e49f7a95dc32e72fc' },
      { name: 'Barbados', _id: '4dc779ccc9a24014b78b3e54' },
      { name: 'St. Lucia' },
    ];

    const seededCountries = [];
    for (const country of countriesData) {
      let countryDoc = await Countries.findOne({ name: country.name });
      if (!countryDoc) {
        countryDoc = await Countries.create({
          _id: country._id || await generateMongoId(),
          name: country.name,
        });
      }
      seededCountries.push(countryDoc);
    }

    const ttCountry = seededCountries.find(c => c.name === 'Trinidad & Tobago');
    const guyanaCountry = seededCountries.find(c => c.name === 'Guyana');
    const barbadosCountry = seededCountries.find(c => c.name === 'Barbados');

    // ============================================================================
    // STEP 5: Seed Licensees
    // ============================================================================
    const licenseesData = [
      { 
        name: 'TTG', 
        country: ttCountry?._id 
      },
      { 
        name: 'Cabana', 
        country: guyanaCountry?._id 
      },
      { 
        name: 'Barbados', 
        country: barbadosCountry?._id 
      },
    ];

    const seededLicenseeIds = [];
    for (const lic of licenseesData) {
      let licenseeDoc = await Licensee.findOne({ name: lic.name });
      if (!licenseeDoc) {
        const licenseKey = await generateUniqueLicenseKey();
        const startDate = new Date();
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year by default

        const licId = await generateMongoId();
        licenseeDoc = await Licensee.create({
          _id: licId,
          name: lic.name,
          country: lic.country,
          startDate,
          expiryDate,
          licenseKey,
          status: 'active',
          isPaid: true,
        });
      }
      seededLicenseeIds.push(licenseeDoc._id);
    }

    // ============================================================================
    // STEP 6: Create the admin user
    // ============================================================================
    if (!existingUser) {
      await UserModel.create({
        _id: await generateMongoId(),
        username: 'admin',
        emailAddress: 'admin@gmail.com',
        password: hashedPassword,
        passwordUpdatedAt: new Date(),
        roles: ['developer', 'admin'],
        isEnabled: true,
        profile: {
          firstName: 'Evolution',
          lastName: 'Admin',
        },
        assignedLocations: [], // Empty initially
        assignedLicensees: seededLicenseeIds,
        tempPassword: null,
        tempPasswordChanged: true,
        sessionVersion: 1,
        loginCount: 0,
        lastLoginAt: null,
        profilePicture: null,
        deletedAt: null,
      });
    }

    // ============================================================================
    // STEP 7: Return success
    // ============================================================================
    return NextResponse.json(
      {
        success: true,
        message: 'System initialized successfully. Admin user, countries, and licensees created.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('[Install API] Error:', errorMessage);

    return NextResponse.json(
      { success: false, error: 'Failed to initialize the system.' },
      { status: 500 }
    );
  }
}
