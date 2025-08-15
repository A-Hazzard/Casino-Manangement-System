"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { useMemberActionsStore } from "@/lib/store/memberActionsStore";
import axios from "axios";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Member } from "@/lib/types/members";
import { createActivityLogger } from "@/lib/helpers/activityLogger";

type DeleteMemberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onDelete: () => void;
};

export default function DeleteMemberModal({
  isOpen,
  onClose,
  member,
  onDelete,
}: DeleteMemberModalProps) {
  const { isDeleteModalOpen, selectedMember, closeDeleteModal } =
    useMemberActionsStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const memberLogger = createActivityLogger("member");

  useEffect(() => {
    if (isDeleteModalOpen) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: -20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
          overwrite: true,
        }
      );

      gsap.to(backdropRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      });
    }
  }, [isDeleteModalOpen]);

  const handleClose = () => {
    gsap.to(modalRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        closeDeleteModal();
        onClose();
      },
    });

    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
    });
  };

  const handleDelete = async () => {
    if (!selectedMember?._id) {
      toast.error("No member selected");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.delete(`/api/members/${selectedMember._id}`);

      if (response.status === 200) {
        const memberData = { ...selectedMember };

        // Log the deletion activity
        await memberLogger.logDelete(
          selectedMember._id,
          `${selectedMember.profile?.firstName || "Unknown"} ${
            selectedMember.profile?.lastName || "Member"
          }`,
          memberData,
          `Deleted member: ${selectedMember.profile?.firstName || "Unknown"} ${
            selectedMember.profile?.lastName || "Member"
          }`
        );

        toast.success("Member deleted successfully");
        onDelete();
        handleClose();
      } else {
        toast.error("Failed to delete member");
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      toast.error("Failed to delete member");
    } finally {
      setLoading(false);
    }
  };

  if (!isDeleteModalOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto"
        >
          <Dialog open={isDeleteModalOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Member</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this member? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">
                    {selectedMember?.profile?.firstName}{" "}
                    {selectedMember?.profile?.lastName}
                  </h3>
                  <p className="text-red-600 text-sm">
                    Member ID: {selectedMember?._id}
                  </p>
                  <p className="text-red-600 text-sm">
                    Email: {selectedMember?.profile?.email}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Delete Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
