'use client';

import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import { Label } from '@/components/shared/ui/label';
import { UploadIcon, CameraIcon } from '@radix-ui/react-icons';
import type { SMIBFirmwareModalProps } from '@/lib/types/components';

export default function SMIBFirmwareModal({
  isOpen,
  onClose,
  onUploadComplete,
}: SMIBFirmwareModalProps) {
  const [product, setProduct] = useState('');
  const [version, setVersion] = useState('');
  const [versionDetails, setVersionDetails] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.bin')) {
      setSelectedFile(file);
    } else {
      alert('Please select a .bin file');
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.bin')) {
      setSelectedFile(file);
    } else {
      alert('Please drop a .bin file');
    }
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!product || !version || !selectedFile) {
      alert('Please fill in all required fields and select a file');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('product', product);
      formData.append('version', version);
      formData.append('versionDetails', versionDetails);
      formData.append('file', selectedFile);

      await axios.post('/api/firmwares', formData);

      // Success
      onUploadComplete?.();
      handleModalClose();
    } catch (error) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error uploading firmware:', error);
      }
      alert(
        `Upload failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setUploading(false);
    }
  };

  const clearForm = () => {
    setProduct('');
    setVersion('');
    setVersionDetails('');
    setSelectedFile(null);
    setDragActive(false);
  };

  const handleModalClose = () => {
    clearForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-lg overflow-hidden bg-white p-0">
        <DialogHeader className="border-b border-gray-200 p-6">
          <DialogTitle className="text-2xl font-bold text-gray-800">
            Add New Firmware Version
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 p-6">
          {/* Product Dropdown */}
          <div>
            <Label
              htmlFor="product"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Product *
            </Label>
            <select
              id="product"
              value={product}
              onChange={e => setProduct(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
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
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Version *
            </Label>
            <Input
              id="version"
              type="text"
              placeholder="e.g., 1.0.4.1"
              value={version}
              onChange={e => setVersion(e.target.value)}
              className="border-gray-300 focus:border-buttonActive focus:ring-buttonActive"
              required
            />
          </div>

          {/* Version Details */}
          <div>
            <Label
              htmlFor="versionDetails"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Version Details
            </Label>
            <Textarea
              id="versionDetails"
              placeholder="Add any details about this version..."
              value={versionDetails}
              onChange={e => setVersionDetails(e.target.value)}
              className="min-h-[80px] border-gray-300 placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
            />
          </div>

          {/* File Upload Area */}
          <div>
            <Label className="mb-1 block text-sm font-medium text-gray-700">
              Firmware File (.bin) *
            </Label>
            <div
              className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                dragActive
                  ? 'border-buttonActive bg-buttonActive/5'
                  : 'border-gray-300 hover:border-gray-400'
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-button">
                    <UploadIcon className="h-6 w-6 text-white" />
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <CameraIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="text-sm text-gray-600">
                    <button
                      type="button"
                      onClick={handleChooseFileClick}
                      className="font-medium text-buttonActive hover:text-buttonActive/80"
                    >
                      Click to upload
                    </button>{' '}
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

        <DialogFooter className="border-t border-gray-200 p-6">
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
            className="bg-button text-white hover:bg-button/90"
          >
            {uploading ? 'Uploading...' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

