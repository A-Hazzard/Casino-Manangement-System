"use client";

import React from "react";
import { useUserValidation } from "@/lib/hooks/useUserValidation";
import UserValidationModal from "@/components/ui/UserValidationModal";

export default function UserValidationWrapper() {
  const { needsValidation, validationType, currentUsername, isLoading } = useUserValidation();

  // Don't show modal while loading
  if (isLoading) {
    return null;
  }

  // Don't show modal if validation is not needed
  if (!needsValidation) {
    return null;
  }

  return (
    <UserValidationModal
      isOpen={needsValidation}
      onClose={() => {}} // Modal cannot be closed until validation is complete
      validationType={validationType || "username"}
      currentUsername={currentUsername}
    />
  );
}
