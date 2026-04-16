'use client';

import { SyntheticEvent } from 'react';
import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/shared/ui/dialog';
import { useCallback, useRef, useState } from 'react';
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  convertToPixelCrop,
  makeAspectCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { CropIcon, CheckIcon, Cross2Icon } from '@radix-ui/react-icons';

type CircleCropModalProps = {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropped: (dataUrl: string) => void;
  size?: number;
};

/**
 * Utility to center the aspect crop within the media dimensions
 */
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

/**
 * CircleCropModal Component
 * 
 * A premium image cropping modal that forces a circular aspect ratio.
 * Used for profile pictures and other circular avatars.
 */
export default function CircleCropModal({
  open,
  onClose,
  imageSrc,
  onCropped,
}: CircleCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const aspect = 1; // Strictly 1:1 for perfect circles

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight, width, height } = e.currentTarget;
    const initialCropPercent = centerAspectCrop(naturalWidth, naturalHeight, aspect);
    setCrop(initialCropPercent);
    setCompletedCrop(convertToPixelCrop(initialCropPercent, width, height));
  };

  /**
   * Generates the final circular cropped image as a data URL
   */
  const getCroppedImg = useCallback(
    (image: HTMLImageElement, crop: PixelCrop): Promise<{ url: string }> => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('No 2d context');

      // Calculate scales between natural and rendered size
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Extract the square section from the image
      canvas.width = crop.width;
      canvas.height = crop.height;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
      );

      // Create the circular mask
      const circleCanvas = document.createElement('canvas');
      const circleCtx = circleCanvas.getContext('2d');
      if (!circleCtx) throw new Error('No circle context');

      const outputSize = crop.width;
      circleCanvas.width = outputSize;
      circleCanvas.height = outputSize;

      circleCtx.beginPath();
      circleCtx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, 2 * Math.PI);
      circleCtx.clip();
      circleCtx.drawImage(canvas, 0, 0);

      const dataUrl = circleCanvas.toDataURL('image/png', 1.0);
      return Promise.resolve({ url: dataUrl });
    },
    []
  );

  const handleApply = async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const { url } = await getCroppedImg(imgRef.current, completedCrop);
      onCropped(url);
      onClose();
    } catch (e) {
      console.error('[CircleCrop] Failed to apply crop:', e);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="z-[100001] max-w-[500px] overflow-hidden rounded-2xl border-none p-0 shadow-2xl"
        backdropClassName="z-[100000]"
        isMobileFullScreen={false}
      >
        {/* Header Section */}
        <div className="bg-white px-6 py-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <CropIcon className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">Crop Photo</DialogTitle>
                <DialogDescription className="text-sm font-medium text-gray-500">
                  Adjust the square to frame your face perfectly
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Cropping Area - Dark Backdrop for Focus */}
        <div className="relative flex min-h-[400px] items-center justify-center bg-gray-950 p-6">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={c => setCompletedCrop(c)}
            aspect={aspect}
            circularCrop
            className="shadow-2xl ring-1 ring-white/10"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop target"
              onLoad={handleImageLoad}
              className="max-h-[50vh] w-auto max-w-full rounded-sm"
              style={{ display: 'block' }}
            />
          </ReactCrop>

          {/* Guidelines Overlay (Subtle) */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
            <div className="h-[90%] w-[90%] rounded-full border border-dashed border-white/20" />
          </div>
        </div>

        {/* Action Footer */}
        <div className="bg-gray-50/50 px-6 py-4 backdrop-blur-sm">
          <div className="flex w-full items-center justify-between gap-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="group border-gray-200 bg-white px-6 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <Cross2Icon className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
              Cancel
            </Button>
            
            <Button
              onClick={handleApply}
              disabled={!completedCrop}
              className="bg-green-600 px-8 text-white hover:bg-green-700 shadow-lg shadow-green-900/10 active:scale-[0.98] transition-all"
            >
              <CheckIcon className="mr-2 h-5 w-5" />
              Save Picture
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
