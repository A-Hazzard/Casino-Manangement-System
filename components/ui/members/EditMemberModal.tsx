"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemberActionsStore } from "@/lib/store/memberActionsStore";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { toast } from "sonner";
import { useUserStore } from "@/lib/store/userStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Member } from "@/lib/types/members";

type EditMemberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onMemberUpdated: () => void;
};

export default function EditMemberModal({
  onClose,
  onMemberUpdated,
}: EditMemberModalProps) {
  const { isEditModalOpen, selectedMember, closeEditModal } =
    useMemberActionsStore();
  const { user } = useUserStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  // Activity logging is now handled via API calls
  const logActivity = async (
    action: string,
    resource: string,
    resourceId: string,
    resourceName: string,
    details: string
  ) => {
    try {
      const response = await fetch("/api/activity-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          resource,
          resourceId,
          resourceName,
          details,
          userId: user?._id || "unknown",
          username: user?.emailAddress || "unknown",
          userRole: user?.roles?.[0] || "user",
        }),
      });

      if (!response.ok) {
        console.error("Failed to log activity:", response.statusText);
      }
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    occupation: "",
    address: "",
    points: 0,
    uaccount: 0,
  });

  // Initialize form data when a member is selected
  useEffect(() => {
    if (selectedMember && selectedMember.profile) {
      setFormData({
        firstName: selectedMember.profile.firstName || "",
        lastName: selectedMember.profile.lastName || "",
        email: selectedMember.profile.email || "",
        phoneNumber: selectedMember.phoneNumber || "",
        occupation: selectedMember.profile.occupation || "",
        address: selectedMember.profile.address || "",
        points: selectedMember.points || 0,
        uaccount: selectedMember.uaccount || 0,
      });
    }
  }, [selectedMember]);

  useEffect(() => {
    if (isEditModalOpen) {
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
  }, [isEditModalOpen]);

  const handleClose = () => {
    gsap.to(modalRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        closeEditModal();
        onClose();
      },
    });

    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedMember?._id) {
      toast.error("No member selected");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(`/api/members/${selectedMember._id}`, {
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          occupation: formData.occupation,
          address: formData.address,
        },
        phoneNumber: formData.phoneNumber,
        points: formData.points,
        uaccount: formData.uaccount,
      });

      if (response.status === 200) {
        // Log the update activity
        await logActivity(
          "update",
          "member",
          selectedMember._id,
          `${selectedMember.profile?.firstName || "Unknown"} ${
            selectedMember.profile?.lastName || "Member"
          }`,
          `Updated member: ${selectedMember.profile?.firstName || "Unknown"} ${
            selectedMember.profile?.lastName || "Member"
          }`
        );

        toast.success("Member updated successfully");
        onMemberUpdated();
        handleClose();
      } else {
        toast.error("Failed to update member");
      }
    } catch (error) {
      console.error("Error updating member:", error);
      toast.error("Failed to update member");
    } finally {
      setLoading(false);
    }
  };

  if (!isEditModalOpen) return null;

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
          <Dialog open={isEditModalOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Member</DialogTitle>
                <DialogDescription>
                  Update member information below.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="First Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Last Name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="Phone Number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleInputChange}
                    placeholder="Occupation"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="points">Points</Label>
                    <Input
                      id="points"
                      name="points"
                      type="number"
                      value={formData.points}
                      onChange={handleInputChange}
                      placeholder="Points"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uaccount">Account Balance</Label>
                    <Input
                      id="uaccount"
                      name="uaccount"
                      type="number"
                      value={formData.uaccount}
                      onChange={handleInputChange}
                      placeholder="Account Balance"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? "Updating..." : "Update Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
