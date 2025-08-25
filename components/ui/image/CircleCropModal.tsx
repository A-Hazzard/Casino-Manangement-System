"use client";

import React, { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

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
        unit: "%",
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
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (aspect) {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, aspect));
      }
    },
    []
  );

  const aspect = 1; // Square aspect ratio for circular crop

  const getCroppedImg = useCallback(
    (
      image: HTMLImageElement,
      crop: PixelCrop
    ): Promise<{ url: string }> => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("No 2d context");
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = crop.width;
      canvas.height = crop.height;

      ctx.imageSmoothingQuality = "high";

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

      // Create circular mask
      const circleCanvas = document.createElement("canvas");
      const circleCtx = circleCanvas.getContext("2d");
      if (!circleCtx) {
        throw new Error("No 2d context for circle");
      }

      circleCanvas.width = crop.width;
      circleCanvas.height = crop.height;

      // Create circular clipping path
      circleCtx.beginPath();
      circleCtx.arc(
        crop.width / 2,
        crop.height / 2,
        crop.width / 2,
        0,
        2 * Math.PI
      );
      circleCtx.closePath();
      circleCtx.clip();

      // Draw the cropped image into the circular mask
      circleCtx.drawImage(canvas, 0, 0);

      // Return a persistent Data URL so it can be stored in DB and rendered later
      const dataUrl = circleCanvas.toDataURL("image/png", 1);
      return Promise.resolve({ url: dataUrl });
    },
    []
  );

  const handleApply = async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const { url } = await getCroppedImg(
        imgRef.current,
        completedCrop
      );
      onCropped(url);
      onClose();
    } catch (e) {
      console.error("Error cropping image:", e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* Elevated overlay above any underlying modal */}
      {open && typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[180] bg-black/70" />, document.body
        )}
      <DialogContent className="max-w-4xl w-full z-[200]">
        <DialogHeader>
          <DialogTitle>Crop Profile Picture</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <div className="flex justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              circularCrop
              className="max-h-96"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                alt="Crop me"
                src={imageSrc}
                style={{
                  transform: `scale(${scale}) rotate(${rotate}deg)`,
                  maxHeight: "400px",
                  maxWidth: "100%",
                }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                Zoom:
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-32"
                />
                <span className="text-xs text-gray-500">
                  {Math.round(scale * 100)}%
                </span>
              </label>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                Rotate:
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={rotate}
                  onChange={(e) => setRotate(Number(e.target.value))}
                  className="w-32"
                />
                <span className="text-xs text-gray-500">{rotate}°</span>
              </label>
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
            className="bg-button hover:bg-button/90 text-white"
          >
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
