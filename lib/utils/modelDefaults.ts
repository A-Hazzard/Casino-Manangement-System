/**
 * Utility functions to provide default values for model fields
 * Ensures all required fields are present with appropriate default values
 */

import type { MachineDocument } from "@/shared/types";
import type { CollectionDocument } from "@/lib/types/collections";

/**
 * Provides default values for Machine model fields
 */
export function getMachineDefaults(
  partialData: Partial<MachineDocument>
): Partial<MachineDocument> {
  return {
    // Basic fields
    billValidator: {
      balance: 0,
      notes: [],
      ...(partialData.billValidator || {}),
    },
    config: {
      enableRte: false,
      lockMachine: false,
      lockBvOnLogOut: false,
      ...(partialData.config || {}),
    },
    playableBalance: 0,
    custom: { name: "" },
    balances: { cashable: 0 },
    curProcess: { name: "", next: "" },
    tasks: {
      pendingHandpay: {
        name: "",
        steps: [],
        currentStepIndex: 0,
        retryAttempts: 0,
      },
      ...(partialData.tasks || {}),
    },
    origSerialNumber: "",
    machineId: "",
    relayId: "",
    gamingLocation: "",
    game: "",
    lastActivity: new Date(),
    sasMeters: {
      drop: 0,
      totalCancelledCredits: 0,
      gamesPlayed: 0,
      moneyOut: 0,
      slotDoorOpened: 0,
      powerReset: 0,
      totalHandPaidCancelledCredits: 0,
      coinIn: 0,
      coinOut: 0,
      totalWonCredits: 0,
      jackpot: 0,
      currentCredits: 0,
      gamesWon: 0,
      ...(partialData.sasMeters || {}),
    },
    operationsWhileIdle: { extendedMeters: new Date() },
    gameConfig: {
      accountingDenomination: 0,
      theoreticalRtp: 0,
      maxBet: "",
      payTableId: "",
      ...(partialData.gameConfig || {}),
    },
    collectionMeters: { metersIn: 0, metersOut: 0 },
    collectionTime: new Date(),
    previousCollectionTime: new Date(),
    collectionMetersHistory: [],
    assetStatus: "",
    cabinetType: "",
    gamingBoard: "",
    manuf: "",
    smibBoard: "",
    smibVersion: { firmware: "", version: "" },
    smibConfig: {
      mqtt: {
        mqttSecure: 0,
        mqttQOS: 0,
        mqttURI: "",
        mqttSubTopic: "",
        mqttPubTopic: "",
        mqttCfgTopic: "",
        mqttIdleTimeS: 0,
      },
      net: {
        netMode: 0,
        netStaSSID: "",
        netStaPwd: "",
        netStaChan: 0,
      },
      coms: {
        comsAddr: 0,
        comsMode: 0,
        comsRateMs: 0,
        comsRTE: 0,
        comsGPC: 0,
      },
      ...(partialData.smibConfig || {}),
    },
    billMeters: {
      dollar1: 0,
      dollar2: 0,
      dollar5: 0,
      dollar10: 0,
      dollar20: 0,
      dollar50: 0,
      dollar100: 0,
      dollar500: 0,
      dollar1000: 0,
      dollar2000: 0,
      dollar5000: 0,
      dollarTotal: 0,
      dollarTotalUnknown: 0,
      ...(partialData.billMeters || {}),
    },
    orig: {
      meters: {
        coinIn: "",
        coinOut: "",
        drop: "",
        jackpot: "",
        gamesPlayed: "",
        moneyOut: "",
        slotDoorOpened: "",
        powerReset: "",
      },
      deletedAt: 0,
      ...(partialData.orig || {}),
    },
    manufacturer: "",
    serialNumber: "",
    gameNumber: "",
    protocols: [],
    numberOfEnabledGames: 0,
    enabledGameNumbers: [],
    noOfGames: 0,
    viewingAccountDenomination: [],
    isSunBoxDevice: false,
    sessionHistory: [],
    currentSession: "",
    viewingAccountDenominationHistory: [],
    selectedDenomination: { drop: 0, totalCancelledCredits: 0 },
    isSasMachine: false,
    lastBillMeterAt: new Date(),
    lastSasMeterAt: new Date(),
    machineType: "",
    machineStatus: "",
    lastMaintenanceDate: new Date(),
    nextMaintenanceDate: new Date(),
    maintenanceHistory: [],
    ...partialData,
  };
}

/**
 * Provides default values for Collection model fields
 */
export function getCollectionDefaults(
  partialData: Partial<CollectionDocument>
): Partial<CollectionDocument> {
  return {
    machineId: "",
    machineName: "",
    location: "",
    locationReportId: "",
    collector: "",
    isCompleted: false,
    metersIn: 0,
    metersOut: 0,
    prevIn: 0,
    prevOut: 0,
    softMetersIn: 0,
    softMetersOut: 0,
    notes: "",
    timestamp: new Date(),
    sasMeters: {
      machine: "",
      drop: 0,
      totalCancelledCredits: 0,
      gross: 0,
      gamesPlayed: 0,
      jackpot: 0,
      sasStartTime: "",
      sasEndTime: "",
    },
    movement: {
      metersIn: 0,
      metersOut: 0,
      gross: 0,
    },
    machineCustomName: "",
    ramClear: false,
    serialNumber: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0,
    ...partialData,
  };
}

/**
 * Generic function to apply defaults to any model data
 */
export function applyModelDefaults<T>(
  partialData: Partial<T>,
  getDefaultsFn: (data: Partial<T>) => Partial<T>
): T {
  const defaults = getDefaultsFn(partialData);
  return { ...defaults, ...partialData } as T;
}
