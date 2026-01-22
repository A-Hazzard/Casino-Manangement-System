'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

type CircleCropModalProps = {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropped: (dataUrl: string) => void;
  size?: number;
};

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

export default function CircleCropModal({
  open,
  onClose,
  imageSrc,
  onCropped,
}: CircleCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const aspect = 1; // Square aspect ratio for circular crop

  // Extract underlying img element from Next.js Image for react-image-crop
  useEffect(() => {
    if (imageWrapperRef.current && open) {
      // Next.js Image renders an img element inside a span/div wrapper
      const nextImageElement = imageWrapperRef.current.querySelector('img');
      if (nextImageElement instanceof HTMLImageElement) {
        // Sync our ref to point to Next.js Image's underlying img element
        if (imgRef.current !== nextImageElement) {
          // Store reference to the actual img element from Next.js Image
          Object.defineProperty(imgRef, 'current', {
            value: nextImageElement,
            writable: true,
            configurable: true,
          });
        }
        const handleLoad = () => {
          if (nextImageElement && aspect) {
            setCrop(
              centerAspectCrop(
                nextImageElement.naturalWidth,
                nextImageElement.naturalHeight,
                aspect
              )
            );
          }
        };
        if (nextImageElement.complete) {
          handleLoad();
          return undefined;
        } else {
          nextImageElement.addEventListener('load', handleLoad);
          return () => {
            nextImageElement.removeEventListener('load', handleLoad);
          };
        }
      }
    }
    return undefined;
  }, [imageSrc, open, aspect]);

  const getCroppedImg = useCallback(
    (image: HTMLImageElement, crop: PixelCrop): Promise<{ url: string }> => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No 2d context');
      }

      // Calculate the actual crop coordinates
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

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

      // Create circular mask - ensure perfect circle
      const circleCanvas = document.createElement('canvas');
      const circleCtx = circleCanvas.getContext('2d');
      if (!circleCtx) {
        throw new Error('No 2d context for circle');
      }

      // Use the crop size as the output size (should be square due to aspect ratio)
      const outputSize = crop.width; // Should equal crop.height since aspect is 1
      circleCanvas.width = outputSize;
      circleCanvas.height = outputSize;

      // Clear the canvas
      circleCtx.clearRect(0, 0, outputSize, outputSize);

      // Create circular clipping path
      circleCtx.beginPath();
      circleCtx.arc(
        outputSize / 2,
        outputSize / 2,
        outputSize / 2,
        0,
        2 * Math.PI
      );
      circleCtx.closePath();
      circleCtx.clip();

      // Draw the cropped image into the circular mask
      circleCtx.drawImage(canvas, 0, 0);

      // Return a persistent Data URL so it can be stored in DB and rendered later
      const dataUrl = circleCanvas.toDataURL('image/png', 1);
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
      console.error('Error cropping image:', e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* Elevated overlay above any underlying modal */}
      {open &&
        typeof window !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100001] bg-black/70" />,
          document.body
        )}
      <DialogContent className="z-[100002] w-full max-w-4xl">
        <DialogHeader>
          <DialogTitle>Crop Profile Picture</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <div className="flex justify-center">
            <div ref={imageWrapperRef} className="relative">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={c => setCompletedCrop(c)}
              aspect={aspect}
              circularCrop
              className="max-h-96"
            >
                {/* 
                  Next.js Image component - react-image-crop accesses the underlying img element
                  via the ref sync in useEffect. The library will work with the img element
                  that Next.js Image renders internally.
                */}
                <Image
                src={imageSrc}
                  alt="Image to crop"
                  width={800}
                  height={800}
                  unoptimized
                style={{
                  maxHeight: '400px',
                  maxWidth: '100%',
                }}
              />
            </ReactCrop>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!completedCrop}
            className="bg-button text-white hover:bg-button/90"
          >
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

