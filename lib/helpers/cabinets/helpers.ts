/**
 * Cabinets Helper Functions
 *
 * Barrel file re-exporting all cabinet-related helper functions.
 *
 * Features:
 * - Cabinet list fetching (fetchCabinets, fetchCabinetById, fetchCabinetsForLocation, fetchCabinetLocations)
 * - Cabinet CRUD operations (createCabinet, updateCabinet, restoreCabinet, permanentlyDeleteCabinet)
 * - Cabinet financial totals (fetchCabinetTotals)
 * - Collection history operations (updateMachineCollectionHistory)
 */

export { fetchCabinets, fetchCabinetById, fetchCabinetsForLocation, fetchCabinetLocations } from './cabinetList';
export { createCabinet, updateCabinet, restoreCabinet, permanentlyDeleteCabinet } from './cabinetCrud';
export { fetchCabinetTotals } from './cabinetTotals';
export { updateMachineCollectionHistory } from './cabinetHistory';
