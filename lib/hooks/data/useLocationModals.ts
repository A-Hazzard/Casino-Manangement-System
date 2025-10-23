/**
 * Custom hook for managing location modal states and actions
 * Handles modal visibility, actions, and state management for locations page
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocationActionsStore } from "@/lib/store/locationActionsStore";
import { AggregatedLocation } from "@/shared/types/common";
import type { UseLocationModalsReturn } from "@/lib/types/locationModals";

export function useLocationModals(): UseLocationModalsReturn {
  const router = useRouter();
  const { openEditModal, openDeleteModal } = useLocationActionsStore();

  // Local modal state
  const [isNewLocationModalOpen, setIsNewLocationModalOpen] = useState(false);

  // Modal actions
  const openNewLocationModal = useCallback(() => {
    setIsNewLocationModalOpen(true);
  }, []);

  const closeNewLocationModal = useCallback(() => {
    setIsNewLocationModalOpen(false);
  }, []);

  const handleLocationClick = useCallback(
    (locationId: string) => {
      router.push(`/locations/${locationId}`);
    },
    [router]
  );

  const handleTableAction = useCallback(
    (action: "edit" | "delete", location: AggregatedLocation) => {
      if (action === "edit") {
        openEditModal(location);
      } else if (action === "delete") {
        openDeleteModal(location);
      }
    },
    [openEditModal, openDeleteModal]
  );

  return {
    isNewLocationModalOpen,
    openNewLocationModal,
    closeNewLocationModal,
    handleLocationClick,
    handleTableAction,
  };
}
