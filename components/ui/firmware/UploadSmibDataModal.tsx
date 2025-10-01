import React, { useState, useRef } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UploadIcon } from "@radix-ui/react-icons"; // Using UploadIcon for the button
import type { UploadSmibDataModalProps } from "@/lib/types/components";
import { useUserStore } from "@/lib/store/userStore";

const UploadSmibDataModal: React.FC<UploadSmibDataModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
}) => {
  const { user } = useUserStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comments, setComments] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to get proper user display name for activity logging
  const getUserDisplayName = () => {
    if (!user) return "Unknown User";

    // Check if user has profile with firstName and lastName
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }

    // If only firstName exists, use it
    if (user.profile?.firstName && !user.profile?.lastName) {
      return user.profile.firstName;
    }

    // If only lastName exists, use it
    if (!user.profile?.firstName && user.profile?.lastName) {
      return user.profile.lastName;
    }

    // If neither firstName nor lastName exist, use username
    if (user.username && user.username.trim() !== "") {
      return user.username;
    }

    // If username doesn't exist or is blank, use email
    if (user.emailAddress && user.emailAddress.trim() !== "") {
      return user.emailAddress;
    }

    // Fallback
    return "Unknown User";
  };

  // Activity logging is now handled via API calls
  const logActivity = async (
    action: string,
    resource: string,
    resourceId: string,
    resourceName: string,
    details: string,
    previousData?: Record<string, unknown> | null,
    newData?: Record<string, unknown> | null
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
          username: getUserDisplayName(),
          userRole: "user",
          previousData: previousData || null,
          newData: newData || null,
          changes: [], // Will be calculated by the API
        }),
      });

      if (!response.ok) {
        console.error("Failed to log activity:", response.statusText);
      }
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("comments", comments);

      const response = await axios.post(
        "/api/firmware/upload-smib-data",
        formData
      );

      // Log the SMIB data upload activity
      await logActivity(
        "create",
        "firmware",
        response.data?.id || "unknown",
        `SMIB Data Upload: ${selectedFile.name}`,
        `Uploaded SMIB data file: ${selectedFile.name} (${(
          selectedFile.size / 1024
        ).toFixed(2)} KB)`,
        null, // No previous data for creation
        response.data // New data
      );

      // Refresh the parent page data after successful upload
      if (onRefresh) {
        onRefresh();
      }

      // Close modal and clear form on success
      onClose();
      setSelectedFile(null);
      setComments("");

      // Optional: Show success message
      if (typeof window !== "undefined") {
        alert("SMIB data uploaded successfully!");
      }
    } catch (error) {
      console.error("Upload error:", error);
      // Optional: Show error message
      if (typeof window !== "undefined") {
        alert("Upload failed. Please try again.");
      }
    }
  };

  const clearForm = () => {
    setSelectedFile(null);
    setComments("");
  };

  const handleModalClose = () => {
    clearForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-white">
        <DialogHeader className="p-6 border-b border-gray-200">
          <DialogTitle className="text-2xl font-bold text-gray-800">
            Upload CSV with SMIBs data
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 flex flex-col gap-6">
          <div>
            <Button
              variant="outline"
              onClick={handleChooseFileClick}
              className="w-full justify-start text-left border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-buttonActive focus:border-buttonActive"
            >
              <UploadIcon className="mr-2 h-5 w-5 text-gray-600" />
              {selectedFile ? selectedFile.name : "Choose File..."}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".csv"
            />
            {selectedFile && (
              <p className="text-xs text-gray-500 mt-1">
                Type: {selectedFile.type}, Size:{" "}
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="techCommentsUpload"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Technician Comments
            </label>
            <Textarea
              id="techCommentsUpload"
              placeholder="Add any comments related to this upload..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="min-h-[100px] border-gray-300 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive"
            />
          </div>
        </div>

        <DialogFooter className="p-6 border-t border-gray-200">
          <DialogClose asChild>
            <Button
              variant="outline"
              onClick={handleModalClose}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile}
            className="bg-button hover:bg-button/90 text-white"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadSmibDataModal;
