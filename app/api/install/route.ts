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
      { name: 'Trinidad & Tobago', _id: '699ef6e695fc27943db16c14' },
      { name: 'Guyana', _id: '175d649e49f7a95dc32e72fc' },
      { name: 'Barbados', _id: '699ef6e695fc27943db16c18' },
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

    // Countries seeded, proceeding to licensees...

    // ============================================================================
    // STEP 5: Seed Licensees
    // ============================================================================
    const currentDateTime = new Date();
    const licenseesData = [
      {
        _id: "9a5db2cb29ffd2d962fd1d91",
        name: "TTG",
        country: "699ef6e695fc27943db16c14",
        startDate: new Date("2026-02-25T19:19:34.435Z"),
        expiryDate: new Date("2027-02-25T19:19:34.435Z"),
        isPaid: true,
        licenseKey: "LIC-MM2F4UKI-1NW5E1",
        status: "active",
        deletedAt: null,
        createdAt: currentDateTime,
        updatedAt: null,
      },
      {
        _id: "732b094083226f216b3fc11a",
        name: "Barbados",
        country: "699ef6e695fc27943db16c18",
        startDate: new Date("2026-02-25T19:19:35.029Z"),
        expiryDate: new Date("2027-02-25T19:19:35.029Z"),
        isPaid: true,
        licenseKey: "LIC-MM2F4V11-6Y189A",
        status: "active",
        deletedAt: null,
        createdAt: currentDateTime,
        updatedAt: null,
      },
      {
        _id: "c03b094083226f216b3fc39c",
        name: "Cabana",
        country: "175d649e49f7a95dc32e72fc",
        startDate: new Date("2025-06-01T14:31:00.000Z"),
        expiryDate: new Date("2025-07-01T03:18:00.000Z"),
        isPaid: true,
        description: "Licence to operate in Guyana",
        licenseKey: "LIC-CABANA-AUTO-GEN", // Added to satisfy required field
        geoCoords: {
          zoomRatio: 9,
          latitude: 5.570307,
          longitude: -59.026519
        },
        prevExpiryDate: new Date("2025-06-30T04:00:00.000Z"),
        deletedAt: null,
        createdAt: currentDateTime,
        updatedAt: null,
      },
    ];

    const seededLicenseeIds = [];
    for (const lic of licenseesData) {
      let licenseeDoc = await Licensee.findOne({ 
        $or: [
          { _id: lic._id },
          { name: lic.name }
        ]
      });

      if (!licenseeDoc) {
        // Special case for Cabana: Generate licenseKey if not provided in user JSON
        if (lic.name === 'Cabana' && lic.licenseKey === 'LIC-CABANA-AUTO-GEN') {
          lic.licenseKey = await generateUniqueLicenseKey();
        }

        licenseeDoc = await Licensee.create(lic);
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
          gender: "Other",
          phoneNumber: "18681234566",
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
