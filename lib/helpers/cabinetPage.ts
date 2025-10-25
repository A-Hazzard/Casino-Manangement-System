import type { GamingMachine as Cabinet } from '@/shared/types/entities';
type CabinetSortOption =
  | 'assetNumber'
  | 'locationName'
  | 'moneyIn'
  | 'moneyOut'
  | 'jackpot'
  | 'gross'
  | 'cancelledCredits'
  | 'game'
  | 'smbId'
  | 'serialNumber'
  | 'lastOnline';
type CabinetProps = Partial<Cabinet> & {
  _id: string;
  onEdit: () => void;
  onDelete: () => void;
};
import { fetchCabinetLocations, fetchCabinets } from '@/lib/helpers/cabinets';
import { TimePeriod } from '@/shared/types/common';

/**
 * Loads cabinet locations data
 */
export const loadCabinetLocations = async (
  selectedLicencee: string | undefined,
  setLocations: (locations: { _id: string; name: string }[]) => void
) => {
  try {
    const locationsData = await fetchCabinetLocations(selectedLicencee);
    if (Array.isArray(locationsData)) {
      setLocations(locationsData);
    } else {
      console.error('Locations data is not an array:', locationsData);
      setLocations([]);
    }
  } catch (err) {
    console.error('Failed to fetch locations:', err);
    setLocations([]);
  }
};

/**
 * Filters cabinets based on search term and selected location
 */
export const filterCabinets = (
  cabinets: Cabinet[],
  searchTerm: string,
  selectedLocation: string
) => {
  let filtered = [...cabinets];

  if (selectedLocation !== 'all') {
    filtered = filtered.filter(cab => cab.locationId === selectedLocation);
  }

  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter(
      cab =>
        cab.assetNumber?.toLowerCase().includes(searchLower) ||
        cab.smbId?.toLowerCase().includes(searchLower) ||
        cab.locationName?.toLowerCase().includes(searchLower) ||
        cab.serialNumber?.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
};

/**
 * Loads cabinets data
 */
export const loadCabinetsData = async (
  selectedLicencee: string | undefined,
  activeMetricsFilter: TimePeriod,
  setAllCabinets: (cabinets: Cabinet[]) => void,
  setFilteredCabinets: (cabinets: Cabinet[]) => void,
  searchTerm: string,
  selectedLocation: string
) => {
  const cabinetsData = await fetchCabinets(
    selectedLicencee,
    activeMetricsFilter
  );

  if (!Array.isArray(cabinetsData)) {
    console.error('Cabinets data is not an array:', cabinetsData);
    setAllCabinets([]);
    setFilteredCabinets([]);
    return [];
  }

  setAllCabinets(cabinetsData);
  const filtered = filterCabinets(cabinetsData, searchTerm, selectedLocation);
  setFilteredCabinets(filtered);
  return cabinetsData;
};

/**
 * Sorts cabinets based on sort option and order
 */
export const sortCabinets = (
  cabinets: Cabinet[],
  sortOption: CabinetSortOption,
  sortOrder: 'asc' | 'desc'
) => {
  return [...cabinets].sort((a, b) => {
    const order = sortOrder === 'desc' ? -1 : 1;
    const aValue = a[sortOption] || 0;
    const bValue = b[sortOption] || 0;
    return (aValue > bValue ? 1 : -1) * order;
  });
};

/**
 * Converts Cabinet to CabinetProps for component compatibility
 */
export const mapToCabinetProps = (
  cabinet: Cabinet,
  onEdit: (cabinet: Cabinet) => void,
  onDelete: (cabinet: Cabinet) => void
): CabinetProps => {
  return {
    _id: cabinet._id,
    locationId: cabinet.locationId || '',
    locationName: cabinet.locationName || '',
    assetNumber: cabinet.assetNumber || '',
    smbId: cabinet.smbId || cabinet.smibBoard || cabinet.relayId || '',
    moneyIn: cabinet.moneyIn || cabinet.sasMeters?.drop || 0,
    moneyOut: cabinet.moneyOut || cabinet.sasMeters?.totalCancelledCredits || 0,
    gross:
      cabinet.gross ||
      (cabinet.moneyIn || cabinet.sasMeters?.drop || 0) -
        (cabinet.moneyOut || cabinet.sasMeters?.totalCancelledCredits || 0),
    jackpot: cabinet.jackpot || cabinet.sasMeters?.jackpot || 0,
    lastOnline: cabinet.lastOnline
      ? cabinet.lastOnline.toString()
      : cabinet.lastActivity
        ? cabinet.lastActivity.toString()
        : '',
    installedGame: cabinet.installedGame || cabinet.game || '',
    accountingDenomination:
      cabinet.accountingDenomination ||
      cabinet.gameConfig?.accountingDenomination?.toString() ||
      '',
    collectionMultiplier: cabinet.collectionMultiplier || '',
    status: cabinet.status || cabinet.assetStatus || '',
    gameType: cabinet.gameType,
    isCronosMachine: cabinet.isCronosMachine,
    cabinetType: cabinet.cabinetType,
    onEdit: () => onEdit(cabinet),
    onDelete: () => onDelete(cabinet),
  };
};

/**
 * Handles pagination calculations
 */
export const getPaginationData = (
  filteredCabinets: Cabinet[],
  currentPage: number,
  itemsPerPage = 10
) => {
  const paginatedCabinets = filteredCabinets.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  const totalPages = Math.ceil(filteredCabinets.length / itemsPerPage);

  return { paginatedCabinets, totalPages };
};

/**
 * Creates sort options configuration
 */
export const getSortOptions = () => [
  { label: 'Money In', value: 'moneyIn' as CabinetSortOption },
  { label: 'Gross', value: 'gross' as CabinetSortOption },
  { label: 'Asset #', value: 'assetNumber' as CabinetSortOption },
  { label: 'Game', value: 'game' as CabinetSortOption },
  { label: 'Last Online', value: 'lastOnline' as CabinetSortOption },
];

/**
 * Handles location change filtering
 */
export const handleLocationChange = (
  locationId: string,
  allCabinets: Cabinet[],
  searchTerm: string,
  setSelectedLocation: (location: string) => void,
  setFilteredCabinets: (cabinets: Cabinet[]) => void
) => {
  setSelectedLocation(locationId);
  const filtered = filterCabinets(allCabinets, searchTerm, locationId);
  setFilteredCabinets(filtered);
};
