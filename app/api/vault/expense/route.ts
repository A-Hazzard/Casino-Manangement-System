/**
 * Vault Expense API
 *
 * GET  /api/vault/expense - Fetch expense history
 * POST /api/vault/expense - Record a new expense
 *
 * Records a petty cash expense from the vault.
 * Creates a transaction and updates the vault balance.
 *
 * @module app/api/vault/expense/route */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { Db, GridFSBucket } from 'mongodb';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

/**
 * POST /api/vault/expense
 *
 * Handler flow:
 * 1. Performance tracking and authentication
 * 2. Parse and validate request body
 * 3. Licensee/location filtering via vault shift
 * 4. Database connection
 * 5. Get active vault shift
 * 6. Create transaction and update balance
 * 7. Save and return response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    // ============================================================================
    // STEP 1: Authentication & Authorization
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const vaultManagerId = userPayload._id as string;
    const username = userPayload.username as string;
    const userRoles = (userPayload?.roles as string[]) || [];
    const hasVMAccess = userRoles.some(role =>
      ['developer', 'admin', 'manager', 'vault-manager'].includes(
        role.toLowerCase()
      )
    );
    if (!hasVMAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse and validate request body (Multipart Form Data)
    // ============================================================================
    const formData = await request.formData();
    const category = formData.get('category') as string;
    const amountStr = formData.get('amount') as string;
    const description = formData.get('description') as string;
    const dateStr = formData.get('date') as string;
    const denominationsStr = formData.get('denominations') as string;
    const file = formData.get('file') as File | null;

    const amount = parseFloat(amountStr);
    let denominations: { denomination: number; quantity: number }[] = [];
    
    // Parse denominations if provided
    if (denominationsStr) {
      try {
        const parsed = JSON.parse(denominationsStr);
        // Filter out zero quantities and ensure positive numbers
        denominations = parsed
          .filter((d: any) => d.quantity > 0)
          .map((d: any) => ({
            denomination: Number(d.denomination),
            quantity: Math.max(0, Number(d.quantity)),
          }));
        
        // Validate total against amount (optional strict check, or just trust amount)
        // const denomTotal = denominations.reduce((sum, d) => sum + d.denomination * d.quantity, 0);
        // if (Math.abs(denomTotal - amount) > 0.01) {
        //   return NextResponse.json({ success: false, error: 'Amount mismatch with denominations' }, { status: 400 });
        // }
      } catch (e) {
        console.error('Error parsing denominations', e);
      }
    }

    if (!category || isNaN(amount) || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Database connection
    // ============================================================================
    const db = await connectDB();

    // ============================================================================
    // STEP 3.5: Handle File Upload (if present)
    // ============================================================================
    let attachmentId = undefined;
    let attachmentName = undefined;

    if (file && file.size > 0) {
      try {
        const bucket = new GridFSBucket(db as unknown as Db, {
          bucketName: 'vault_attachments',
        });

        // Convert File to stream
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const stream = Readable.from(buffer);

        // Upload file
        const uploadStream = bucket.openUploadStream(file.name, {
          metadata: {
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            uploadedAt: new Date(),
            uploadedBy: vaultManagerId,
            context: 'expense_receipt',
          },
        });

        attachmentId = uploadStream.id;
        attachmentName = file.name;

        await new Promise((resolve, reject) => {
          stream.pipe(uploadStream).on('error', reject).on('finish', resolve);
        });
      } catch (uploadError) {
        console.error('File upload failed:', uploadError);
        // We continue without attachment if upload fails, or fail the request?
        // Better to fail so user knows.
        return NextResponse.json(
          { success: false, error: 'Failed to upload attachment' },
          { status: 500 }
        );
      }
    }

    // ============================================================================
    // STEP 4: Get active vault shift and Update Inventory
    // ============================================================================
    const activeVaultShift = await VaultShiftModel.findOne({
      vaultManagerId,
      status: 'active',
    });

    if (!activeVaultShift) {
      return NextResponse.json(
        { success: false, error: 'No active vault shift found' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Licensee/location filtering
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      (userPayload?.assignedLicensees as string[]) || [],
      undefined,
      (userPayload?.assignedLocations as string[]) || [],
      (userPayload?.roles as string[]) || []
    );

    if (
      allowedLocationIds !== 'all' &&
      !allowedLocationIds.includes(activeVaultShift.locationId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied for this vault location' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 6: Balance Validation & Inventory Update
    // ============================================================================
    const currentBalance =
      activeVaultShift.closingBalance ?? activeVaultShift.openingBalance;

    if (currentBalance < amount) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient vault funds. Current Balance: $${currentBalance.toFixed(2)}, Expense: $${amount.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // Update Inventory (currentDenominations)
    if (denominations.length > 0) {
      const currentInventory =
        activeVaultShift.currentDenominations &&
        activeVaultShift.currentDenominations.length > 0
          ? activeVaultShift.currentDenominations
          : activeVaultShift.openingDenominations;

      const newInventoryMap = new Map<number, number>();
      
      // Initialize with current
      currentInventory.forEach((d: { denomination: number; quantity: number }) => {
        newInventoryMap.set(d.denomination, d.quantity);
      });

      // Deduct expense denominations
      let insufficientFunds = false;
      denominations.forEach((d) => {
        const currentQty = newInventoryMap.get(d.denomination) || 0;
        if (currentQty < d.quantity) {
          insufficientFunds = true;
        }
        newInventoryMap.set(d.denomination, Math.max(0, currentQty - d.quantity));
      });

      if (insufficientFunds) {
        // Option: Allow it (go negative? no, schema prevents) or Block it. 
        // We blocked based on total amount already. 
        // If specific bills are missing, we should probably warn or block.
        // For now, let's block strictly to maintain accurate inventory.
        return NextResponse.json(
          { success: false, error: 'Insufficient bill quantities for this expense.' },
          { status: 400 }
        );
      }

      // Convert back to array
      activeVaultShift.currentDenominations = Array.from(
        newInventoryMap.entries()
      ).map(([denomination, quantity]) => ({
        denomination,
        quantity,
      }));
    }

    // ============================================================================
    // STEP 7: Create transaction
    // ============================================================================
    const transactionId = nanoid();
    const expenseDate = dateStr ? new Date(dateStr) : new Date();

    const vaultTransaction = new VaultTransactionModel({
      _id: transactionId,
      locationId: activeVaultShift.locationId,
      timestamp: expenseDate,
      type: 'expense',
      from: { type: 'vault' },
      to: { type: 'external', id: category },
      amount,
      denominations: denominations, // Save actual denominations used
      vaultBalanceBefore:
        activeVaultShift.closingBalance || activeVaultShift.openingBalance,
      vaultBalanceAfter:
        (activeVaultShift.closingBalance || activeVaultShift.openingBalance) -
        amount,
      vaultShiftId: activeVaultShift._id,
      performedBy: vaultManagerId,
      notes: `Expense: ${category} - ${description}`,
      attachmentId,
      attachmentName,
    });

    // ============================================================================
    // STEP 8: Save and Update Balance
    // ============================================================================
    await vaultTransaction.save();

    activeVaultShift.closingBalance = vaultTransaction.vaultBalanceAfter;
    await activeVaultShift.save();

    // STEP 9: Audit Activity
    await logActivity({
      userId: vaultManagerId,
      username,
      action: 'create',
      details: `Recorded expense: ${category} - $${amount}`,
      metadata: {
        resource: 'vault',
        resourceId: activeVaultShift.locationId,
        resourceName: 'Vault',
        transactionId,
        description,
      },
    });

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`Expense API took ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      transaction: vaultTransaction,
    });
  } catch (error) {
    console.error('Error recording expense:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/vault/expense
 *
 * Fetch expense history with optional filters
 * Query params: locationId, startDate, endDate, category
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    // ============================================================================
    // STEP 1: Authentication & Authorization
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const userRoles = (userPayload?.roles as string[]) || [];
    const hasVMAccess = userRoles.some(role =>
      ['developer', 'admin', 'manager', 'vault-manager'].includes(
        role.toLowerCase()
      )
    );
    if (!hasVMAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');

    // ============================================================================
    // STEP 3: Database connection
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Location filtering
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      (userPayload?.assignedLicensees as string[]) || [],
      undefined,
      (userPayload?.assignedLocations as string[]) || [],
      (userPayload?.roles as string[]) || []
    );

    // ============================================================================
    // STEP 5: Build query
    // ============================================================================
    type ExpenseQuery = {
      type: string;
      locationId?: string | { $in: string[] };
      timestamp?: { $gte?: Date; $lte?: Date };
      'to.id'?: string;
    };

    const query: ExpenseQuery = { type: 'expense' };

    // Location filter
    if (locationId) {
      // Check if user has access to this specific location
      if (allowedLocationIds !== 'all' && !allowedLocationIds.includes(locationId)) {
        return NextResponse.json(
          { success: false, error: 'Access denied for this location' },
          { status: 403 }
        );
      }
      query.locationId = locationId;
    } else if (allowedLocationIds !== 'all') {
      // User can only see their allowed locations
      query.locationId = { $in: allowedLocationIds };
    }

    // Date filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    // Category filter
    if (category) {
      query['to.id'] = category;
    }

    // ============================================================================
    // STEP 6: Fetch expenses
    // ============================================================================
    const expenses = await VaultTransactionModel.find(query)
      .sort({ timestamp: -1 })
      .limit(500)
      .lean();

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`Expense GET API took ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      expenses,
      count: expenses.length,
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
