/**
 * Utility functions to provide default values for model fields
 * Ensures all required fields are present with appropriate default values
 */

import type { GamingMachine as MachineDocument } from "@/shared/types/entities";
import type { CollectionDocument } from "@/lib/types/collections";

/**
 * Provides default values for Machine model fields
 */
export function getMachineDefaults(
  partialData: Partial<MachineDocument>
): Partial<MachineDocument> {
  return {
    // Core identification fields
    _id: "",
    serialNumber: "",
    relayId: "",
    game: "",
    gameType: "",
    isCronosMachine: false,
    cabinetType: "",
    assetStatus: "",
    gamingLocation: "",
    accountingDenomination: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    
    // Optional fields with defaults
    assetNumber: "",
    machineId: "",
    smbId: "",
    smibBoard: "",
    installedGame: "",
    gameNumber: "",
    manufacturer: "",
    manuf: "",
    gamingBoard: "",
    collectionMultiplier: "",
    lastActivity: new Date(),
    lastOnline: new Date(),
    loggedIn: false,
    online: false,
    
    // Financial metrics
    moneyIn: 0,
    moneyOut: 0,
    jackpot: 0,
    cancelledCredits: 0,
    gross: 0,
    coinIn: 0,
    coinOut: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    handle: 0,
    
    // SAS and meter data
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
    
    // Configuration objects
    gameConfig: {
      accountingDenomination: 0,
      theoreticalRtp: 0,
      maxBet: "",
      payTableId: "",
      ...(partialData.gameConfig || {}),
    },
    
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
    
    // Collection and bill validator data
    collectionMeters: { metersIn: 0, metersOut: 0 },
    collectionTime: new Date(),
    previousCollectionTime: new Date(),
    collectorDenomination: 0,
    collectionMetersHistory: [],
    
    billValidator: {
      balance: 0,
      notes: [],
      ...(partialData.billValidator || {}),
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
    
    // Machine settings and features
    machineMembershipSettings: {
      isPointsAllowed: false,
      isFreePlayAllowed: false,
      pointsAwardMethod: "",
      freePlayAmount: 0,
      freePlayCreditsTimeout: 0,
    },
    
    // Credits and balances
    nonRestricted: 0,
    restricted: 0,
    uaccount: 0,
    playableBalance: 0,
    
    // SAS protocol and protocols
    sasVersion: "",
    isSasMachine: false,
    protocols: [],
    
    // Game management
    numberOfEnabledGames: 0,
    enabledGameNumbers: [],
    noOfGames: 0,
    
    // Maintenance and history
    machineType: "",
    machineStatus: "",
    lastMaintenanceDate: new Date(),
    nextMaintenanceDate: new Date(),
    maintenanceHistory: [],
    
    sessionHistory: [],
    currentSession: "",
    
    // Viewing account denomination
    viewingAccountDenomination: [],
    viewingAccountDenominationHistory: [],
    selectedDenomination: { drop: 0, totalCancelledCredits: 0 },
    
    // Additional fields
    isSunBoxDevice: false,
    lastBillMeterAt: new Date(),
    lastSasMeterAt: new Date(),
    operationsWhileIdle: { extendedMeters: new Date() },
    
    // Frontend-specific fields
    locationId: "",
    locationName: "",
    
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
