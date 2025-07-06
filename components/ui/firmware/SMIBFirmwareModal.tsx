"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UploadIcon, CameraIcon } from "@radix-ui/react-icons";

export interface SMIBFirmwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

export default function SMIBFirmwareModal({
  isOpen,
  onClose,
  onUploadComplete,
}: SMIBFirmwareModalProps) {
  const [product, setProduct] = useState("");
  const [version, setVersion] = useState("");
  const [versionDetails, setVersionDetails] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith(".bin")) {
      setSelectedFile(file);
    } else {
      alert("Please select a .bin file");
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".bin")) {
      setSelectedFile(file);
    } else {
      alert("Please drop a .bin file");
    }
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!product || !version || !selectedFile) {
      alert("Please fill in all required fields and select a file");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("product", product);
      formData.append("version", version);
      formData.append("versionDetails", versionDetails);
      formData.append("file", selectedFile);

      const response = await fetch("/api/firmwares", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      // Success
      onUploadComplete();
      handleModalClose();
    } catch (error) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Error uploading firmware:", error);
      }
      alert(
        `Upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setUploading(false);
    }
  };

  const clearForm = () => {
    setProduct("");
    setVersion("");
    setVersionDetails("");
    setSelectedFile(null);
    setDragActive(false);
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
            Add New Firmware Version
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 flex flex-col gap-6">
          {/* Product Dropdown */}
          <div>
            <Label
              htmlFor="product"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Product *
            </Label>
            <select
              id="product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
              required
            >
              <option value="">Select Product</option>
              <option value="Cloudy">Cloudy</option>
              <option value="Sunny">Sunny</option>
              <option value="Storm">Storm</option>
            </select>
          </div>

          {/* Version Input */}
          <div>
            <Label
              htmlFor="version"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Version *
            </Label>
            <Input
              id="version"
              type="text"
              placeholder="e.g., 1.0.4.1"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="border-gray-300 focus:ring-buttonActive focus:border-buttonActive"
              required
            />
          </div>

          {/* Version Details */}
          <div>
            <Label
              htmlFor="versionDetails"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Version Details
            </Label>
            <Textarea
              id="versionDetails"
              placeholder="Add any details about this version..."
              value={versionDetails}
              onChange={(e) => setVersionDetails(e.target.value)}
              className="min-h-[80px] border-gray-300 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive"
            />
          </div>

          {/* File Upload Area */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              Firmware File (.bin) *
            </Label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? "border-buttonActive bg-buttonActive/5"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".bin"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-button rounded-full flex items-center justify-center">
                    <UploadIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-sm font-medium text-gray-700">
                    {selectedFile.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="mt-2"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <CameraIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="text-sm text-gray-600">
                    <button
                      type="button"
                      onClick={handleChooseFileClick}
                      className="text-buttonActive hover:text-buttonActive/80 font-medium"
                    >
                      Click to upload
                    </button>{" "}
                    or drag and drop
                  </div>
                  <div className="text-xs text-gray-500">
                    Only .bin files are supported
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t border-gray-200">
          <DialogClose asChild>
            <Button
              variant="outline"
              onClick={handleModalClose}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
              disabled={uploading}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleUpload}
            disabled={!product || !version || !selectedFile || uploading}
            className="bg-button hover:bg-button/90 text-white"
          >
            {uploading ? "Uploading..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
