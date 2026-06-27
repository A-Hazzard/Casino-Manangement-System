/**
 * useMobileEditUI Hook
 *
 * Handles UI state for the Mobile Edit Collection Modal:
 * - Panel visibility states (machine list, form, collected list)
 * - Navigation stack management
 * - Animation states
 * - Search terms
 * - Edit mode tracking
 *
 * @module lib/hooks/collectionReport/useMobileEditUI
 */

'use client';

// ============================================================================
// External Dependencies
// ============================================================================

import { useCallback, Dispatch, SetStateAction } from 'react';
import type { MobileModalState } from './types';
import type { CollectionReportMachineSummary } from '@/lib/types/api';

// ============================================================================
// Types
// ============================================================================

type UseMobileEditUIProps = {
  modalState: MobileModalState;
  setModalState: Dispatch<SetStateAction<MobileModalState>>;
  show: boolean;
};

// ============================================================================
// Main Hook
// ============================================================================

export function useMobileEditUI({
  setModalState,
  show,
}: UseMobileEditUIProps) {
  // ============================================================================
  // Panel Visibility & Navigation
  // ============================================================================
  const pushNavigation = useCallback((screen: string) => {
    setModalState((prev: MobileModalState) => ({
      ...prev,
      navigationStack: [...prev.navigationStack, screen],
    }));
  }, [setModalState]);

  const popNavigation = useCallback(() => {
    setModalState((prev: MobileModalState) => {
      const newStack = [...prev.navigationStack];
      newStack.pop();

      const topPanel = newStack.length > 0 ? newStack[newStack.length - 1] : null;

      return {
        ...prev,
        isMachineListVisible: topPanel === 'machine-list' || topPanel === null,
        isFormVisible: topPanel === 'form',
        isCollectedListVisible: topPanel === 'list',
        navigationStack: newStack,
      };
    });
  }, [setModalState]);

  const handleViewCollectedMachines = useCallback(() => {
    setModalState((prev: MobileModalState) => ({
      ...prev,
      isCollectedListVisible: true,
      isFormVisible: false,
      isMachineListVisible: false,
    }));
    pushNavigation('list');
  }, [pushNavigation, setModalState]);

  const transitions = {
    selectLocation: (locationId: string, locationName: string) => {
      setModalState((prev: MobileModalState) => ({
        ...prev,
        selectedLocation: locationId,
        selectedLocationName: locationName,
        searchTerm: '',
      }));
    },

    showMachineList: () => {
      setModalState((prev: MobileModalState) => ({
        ...prev,
        isMachineListVisible: true,
        isFormVisible: false,
        isCollectedListVisible: false,
      }));
    },

    hideMachineList: () => {
      setModalState((prev: MobileModalState) => ({
        ...prev,
        isMachineListVisible: false,
      }));
    },

    selectMachine: (machine: CollectionReportMachineSummary) => {
      if (!machine) return;
      setModalState((prev: MobileModalState) => ({
        ...prev,
        selectedMachine: String(machine._id),
        selectedMachineData: machine,
        isFormVisible: true,
        isMachineListVisible: false,
        formData: {
          ...prev.formData,
          metersIn: '',
          metersOut: '',
          ramClear: false,
          ramClearMetersIn: '',
          ramClearMetersOut: '',
          notes: '',
          showAdvancedSas: false,
          sasStartTime: null,
          sasEndTime: null,
          collectionTime: prev.formData.collectionTime || new Date(),
          prevIn: (() => {
            const sasDrop = machine.sasMeters?.drop ?? null;
            const collectionIn = machine.collectionMeters?.metersIn;
            return collectionIn !== null &&
              collectionIn !== undefined &&
              collectionIn > 0
              ? collectionIn.toString()
              : sasDrop !== null && sasDrop > 0
                ? sasDrop.toString()
                : '';
          })(),
          prevOut: (() => {
            const sasCancelled = machine.sasMeters?.totalCancelledCredits ?? null;
            const collectionOut = machine.collectionMeters?.metersOut;
            return collectionOut !== null &&
              collectionOut !== undefined &&
              collectionOut > 0
              ? collectionOut.toString()
              : sasCancelled !== null && sasCancelled > 0
                ? sasCancelled.toString()
                : '';
          })(),
        },
      }));
    },
  };

  // ============================================================================
  // Reset modal state when modal opens
  // ============================================================================
  const resetModalState = useCallback(() => {
    if (show) {
      setModalState((prev: MobileModalState) => ({
        ...prev,
        isMachineListVisible: false,
        isFormVisible: false,
        isCollectedListVisible: true,
        navigationStack: ['list'],
      }));
    }
  }, [show, setModalState]);

  return {
    pushNavigation,
    popNavigation,
    handleViewCollectedMachines,
    transitions,
    resetModalState,
  };
}