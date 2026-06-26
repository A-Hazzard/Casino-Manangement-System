/**
 * Developer DB Explorer — Model Registry
 *
 * The allow-list of collections the developer DB explorer (cabinet "Developer
 * Options" tab) is permitted to read and mutate. Each entry maps a stable
 * kebab-case key to its Mongoose model plus the metadata the explorer needs to
 * query and sort it. Model export names vary across the codebase (named vs
 * default), so every import is centralised here.
 *
 * @module app/api/lib/helpers/dev/modelRegistry
 *
 * Features:
 * - Single source of truth for which collections are explorable (developer-only)
 * - Per-model label, group, default date field and default sort
 * - Lookup helper used by every dev-collections route
 */

import type { Model } from 'mongoose';

import { AcceptedBill } from '@/app/api/lib/models/acceptedBills';
import { ActivityLog } from '@/app/api/lib/models/activityLog';
import { CashDeskPayout } from '@/app/api/lib/models/cashDeskPayouts';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import { CollectionSessionV2 } from '@/app/api/lib/models/collectionSessionV2';
import { Denomination } from '@/app/api/lib/models/denominations';
import { FeedbackModel } from '@/app/api/lib/models/feedback';
import { FloatRequest } from '@/app/api/lib/models/floatRequests';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { InterLocationTransferModel } from '@/app/api/lib/models/interLocationTransfer';
import { Licencee } from '@/app/api/lib/models/licencee';
import { MachineEvent } from '@/app/api/lib/models/machineEvents';
import { Machine } from '@/app/api/lib/models/machines';
import { MachineSession } from '@/app/api/lib/models/machineSessions';
import { Member } from '@/app/api/lib/models/members';
import { Meters } from '@/app/api/lib/models/meters';
import { MovementRequest } from '@/app/api/lib/models/movementrequests';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import { Shift } from '@/app/api/lib/models/shifts';
import { SoftCountModel } from '@/app/api/lib/models/softCount';
import { VaultCollectionSession } from '@/app/api/lib/models/vault-collection-session';
import PayoutModel from '@/app/api/lib/models/payout';
import UserModel from '@/app/api/lib/models/user';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';

// ============================================================================
// Types
// ============================================================================

export type DevModelEntry = {
  key: string;
  label: string;
  group: string;
  model: Model<unknown>;
  defaultDateField: string;
  defaultSort: Record<string, 1 | -1>;
};

// ============================================================================
// Registry
// ============================================================================

function entry(
  key: string,
  label: string,
  group: string,
  model: unknown,
  defaultDateField: string,
  sortField?: string
): DevModelEntry {
  return {
    key,
    label,
    group,
    model: model as Model<unknown>,
    defaultDateField,
    defaultSort: sortField
      ? { [sortField]: -1, _id: -1 }
      : { _id: -1 },
  };
}

const GAMING = 'Gaming & Financial';
const COLLECTIONS = 'Collections & Reporting';
const VAULT = 'Vault / Cash Desk';
const PLATFORM = 'Platform / System';

const ENTRIES: DevModelEntry[] = [
  // Gaming & Financial
  entry('meters', 'Meters', GAMING, Meters, 'readAt', 'readAt'),
  entry('machines', 'Machines', GAMING, Machine, 'createdAt', 'createdAt'),
  entry('machine-sessions', 'Machine Sessions', GAMING, MachineSession, 'createdAt', 'createdAt'),
  entry('machine-events', 'Machine Events', GAMING, MachineEvent, 'createdAt', 'createdAt'),
  entry('gaming-locations', 'Gaming Locations', GAMING, GamingLocations, 'createdAt', 'createdAt'),
  entry('licencees', 'Licencees', GAMING, Licencee, 'createdAt', 'createdAt'),
  entry('members', 'Members', GAMING, Member, 'createdAt', 'createdAt'),

  // Collections & Reporting
  entry('collections', 'Collections', COLLECTIONS, Collections, 'createdAt', 'createdAt'),
  entry('collection-reports', 'Collection Reports', COLLECTIONS, CollectionReport, 'createdAt', 'createdAt'),
  entry('collection-sessions-v2', 'Collection Sessions (V2)', COLLECTIONS, CollectionSessionV2, 'createdAt', 'createdAt'),
  entry('reported-machines', 'Reported Machines', COLLECTIONS, ReportedMachine, 'createdAt', 'createdAt'),
  entry('movement-requests', 'Movement Requests', COLLECTIONS, MovementRequest, 'createdAt', 'createdAt'),

  // Vault / Cash Desk
  entry('vault-shifts', 'Vault Shifts', VAULT, VaultShiftModel, 'createdAt', 'createdAt'),
  entry('vault-transactions', 'Vault Transactions', VAULT, VaultTransactionModel, 'createdAt', 'createdAt'),
  entry('vault-collection-sessions', 'Vault Collection Sessions', VAULT, VaultCollectionSession, 'createdAt', 'createdAt'),
  entry('shifts', 'Shifts', VAULT, Shift, 'createdAt', 'createdAt'),
  entry('float-requests', 'Float Requests', VAULT, FloatRequest, 'createdAt', 'createdAt'),
  entry('payouts', 'Payouts', VAULT, PayoutModel, 'createdAt', 'createdAt'),
  entry('cash-desk-payouts', 'Cash Desk Payouts', VAULT, CashDeskPayout, 'createdAt', 'createdAt'),
  entry('denominations', 'Denominations', VAULT, Denomination, 'createdAt', 'createdAt'),
  entry('soft-counts', 'Soft Counts', VAULT, SoftCountModel, 'createdAt', 'createdAt'),
  entry('inter-location-transfers', 'Inter-Location Transfers', VAULT, InterLocationTransferModel, 'createdAt', 'createdAt'),
  entry('accepted-bills', 'Accepted Bills', VAULT, AcceptedBill, 'createdAt', 'createdAt'),

  // Platform / System
  entry('users', 'Users', PLATFORM, UserModel, 'createdAt', 'createdAt'),
  entry('activity-logs', 'Activity Logs', PLATFORM, ActivityLog, 'createdAt', 'createdAt'),
  entry('feedback', 'Feedback', PLATFORM, FeedbackModel, 'createdAt', 'createdAt'),
];

const REGISTRY: Map<string, DevModelEntry> = new Map(
  ENTRIES.map(item => [item.key, item])
);

// ============================================================================
// Lookups
// ============================================================================

/** Returns the registry entry for a key, or null if the model is not explorable. */
export function getDevModel(key: string): DevModelEntry | null {
  return REGISTRY.get(key) ?? null;
}

/** Returns the public model list (key/label/group) for the explorer picker. */
export function listDevModels(): { key: string; label: string; group: string }[] {
  return ENTRIES.map(({ key, label, group }) => ({ key, label, group }));
}
