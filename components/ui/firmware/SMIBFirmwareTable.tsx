"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { DownloadIcon } from "@radix-ui/react-icons";
import type { Firmware } from "@/lib/types/firmware";
import type { SMIBFirmwareTableProps } from "@/lib/types/components";

export default function SMIBFirmwareTable({
  firmwares,
  loading = false,
}: SMIBFirmwareTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const prevFirmwaresRef = useRef<Firmware[]>([]);

  // Animate table rows on data change
  useEffect(() => {
    if (
      firmwares.length > 0 &&
      JSON.stringify(firmwares) !== JSON.stringify(prevFirmwaresRef.current)
    ) {
      prevFirmwaresRef.current = [...firmwares];

      const rows = tableRef.current?.querySelectorAll("tbody tr");
      if (rows && rows.length > 0) {
        gsap.fromTo(
          rows,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.05,
            duration: 0.4,
            ease: "power2.out",
          }
        );
      }
    }
  }, [firmwares]);

  const handleDownload = async (
    firmwareId: string,
    product: string,
    version: string
  ) => {
    try {
      const response = await fetch(`/api/firmwares/${firmwareId}/download`);
      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${product}_${version}.bin`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Error downloading firmware:", error);
      }
      alert("Failed to download firmware file");
    }
  };

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="table-fixed w-full border-collapse text-center">
          <thead className="bg-button text-white">
            <tr>
              <th className="p-3 border border-border border-t-0 text-sm">
                PRODUCT
              </th>
              <th className="p-3 border border-border border-t-0 text-sm">
                VERSION
              </th>
              <th className="p-3 border border-border border-t-0 text-sm">
                DATE ADDED
              </th>
              <th className="p-3 border border-border border-t-0 text-sm">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(3)].map((_, i) => (
              <tr key={i}>
                <td className="p-3 bg-container border border-border">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="p-3 bg-container border border-border">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="p-3 bg-container border border-border">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="p-3 bg-container border border-border">
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (firmwares.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md">
        <div className="text-gray-500 text-lg mb-2">No Firmware Available</div>
        <div className="text-gray-400 text-sm text-center">
          Upload your first firmware version to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        ref={tableRef}
        className="table-fixed w-full border-collapse text-center"
      >
        <thead className="bg-button text-white">
          <tr>
            <th className="p-3 border border-border border-t-0 text-sm">
              PRODUCT
            </th>
            <th className="p-3 border border-border border-t-0 text-sm">
              VERSION
            </th>
            <th className="p-3 border border-border border-t-0 text-sm">
              DATE ADDED
            </th>
            <th className="p-3 border border-border border-t-0 text-sm">
              ACTIONS
            </th>
          </tr>
        </thead>
        <tbody>
          {firmwares.map((firmware) => (
            <tr key={firmware._id} className="hover:bg-grayHighlight/10">
              <td className="p-3 bg-container border border-border text-sm text-left hover:bg-grayHighlight/20">
                <div className="font-medium text-button">
                  {firmware.product}
                </div>
                {firmware.versionDetails && (
                  <div className="text-xs text-grayHighlight mt-1">
                    {firmware.versionDetails}
                  </div>
                )}
              </td>
              <td className="p-3 bg-container border border-border text-sm hover:bg-grayHighlight/20">
                <span className="font-semibold text-buttonActive">
                  {firmware.version}
                </span>
              </td>
              <td className="p-3 bg-container border border-border text-sm hover:bg-grayHighlight/20">
                {formatDistanceToNow(new Date(firmware.createdAt), {
                  addSuffix: true,
                })}
              </td>
              <td className="p-3 bg-container border border-border text-sm hover:bg-grayHighlight/20">
                <Button
                  onClick={() =>
                    handleDownload(
                      firmware._id,
                      firmware.product,
                      firmware.version
                    )
                  }
                  className="bg-button hover:bg-button/90 text-white px-3 py-1 rounded-md text-xs flex items-center gap-1"
                >
                  <DownloadIcon className="w-3 h-3" />
                  Download
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
