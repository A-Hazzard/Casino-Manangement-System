"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { CabinetCardProps } from "@/lib/types/cardProps";
import { motion } from "framer-motion";
import editIcon from "@/public/editIcon.svg";
import deleteIcon from "@/public/deleteIcon.svg";

export default function CabinetCard(props: CabinetCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const prevPropsRef = useRef<CabinetCardProps | null>(null);
  const router = useRouter();

  // GSAP animation for card updates
  useEffect(() => {
    if (
      !prevPropsRef.current ||
      JSON.stringify(props) !== JSON.stringify(prevPropsRef.current)
    ) {
      // Store current props for future comparison
      prevPropsRef.current = { ...props };

      // Animate the card
      if (cardRef.current) {
        gsap.fromTo(
          cardRef.current,
          { opacity: 0, scale: 0.95, y: 15 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.4,
            ease: "back.out(1.5)",
          }
        );
      }
    }
  }, [props]);

  const handleCardClick = () => {
    const currentPath = window.location.pathname;

    // If we're already in a location-specific view, use that path structure
    if (currentPath.startsWith("/locations/")) {
      const locationId = props.locationId;
      router.push(`/locations/${locationId}/details/${props._id}`);
    } else {
      // Default to the cabinets/ route if we're not in a location view
      router.push(`/cabinets/${props._id}`);
    }
  };

  // Determine if cabinet is online (you may need to adjust this based on your data structure)
  const isOnline = props.status === "functional" || props.online === true;

  return (
    <div
      ref={cardRef}
      className="bg-white shadow-sm rounded-lg p-2 xs:p-2 sm:p-4 w-full mx-auto relative cursor-pointer hover:shadow-md transition-shadow border border-gray-100 mb-4 max-w-full"
      onClick={(e) => {
        // Only handle card click if not clicking action buttons
        if (!(e.target as HTMLElement).closest(".action-buttons")) {
          handleCardClick();
        }
      }}
    >
      {/* Header with Asset Number and Status Indicator */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm xs:text-xs sm:text-base font-semibold flex items-center gap-1 truncate flex-1 pr-2">
          {props.assetNumber || "(No Asset #)"}
          <motion.span
            className={`w-2 h-2 rounded-full ${
              isOnline ? "bg-green-500" : "bg-red-500"
            } ml-1 flex-shrink-0`}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          ></motion.span>
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            props.onEdit?.(props);
          }}
          className="text-green-500 flex-shrink-0"
        >
          <Image
            src={editIcon}
            alt="Edit"
            width={20}
            height={20}
            className="w-4 h-4 xs:w-4 xs:h-4 sm:w-5 sm:h-5"
          />
        </button>
      </div>

      {/* SMIB ID and Details */}
      <div className="mb-3">
        <p className="text-xs xs:text-xs sm:text-sm text-green-500 truncate">
          SMIB ID: {props.smbId || "N/A"}
        </p>
        <p className="text-xs xs:text-xs sm:text-sm text-gray-600 truncate">
          {props.locationName || "No Location"}
        </p>
        <p className="text-xs xs:text-xs sm:text-sm text-gray-600 truncate">
          {props.serialNumber || props.assetNumber || "No S/N"}
        </p>
      </div>

      {/* Financial Data - Simple List Layout */}
      <div className="text-xs xs:text-xs sm:text-sm">
        <div className="flex justify-between py-1">
          <span className="truncate flex-1 pr-2">Money In</span>
          <span className="text-right flex-shrink-0">
            {formatCurrency(props.moneyIn || 0)}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="truncate flex-1 pr-2">Money Out</span>
          <span className="text-right flex-shrink-0">
            {formatCurrency(props.cancelledCredits || 0)}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="truncate flex-1 pr-2">Jackpot</span>
          <span className="text-right flex-shrink-0">
            {formatCurrency(props.jackpot || 0)}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="truncate flex-1 pr-2">Gross</span>
          <span
            className={`text-right flex-shrink-0 ${
              (props.gross || 0) < 0 ? "text-red-500" : "text-green-500"
            }`}
          >
            {formatCurrency(props.gross || 0)}
          </span>
        </div>
      </div>

      {/* Hidden delete button - only shown in edit mode or on hover */}
      <div className="hidden absolute bottom-2 right-2 action-buttons">
        <button
          onClick={(e) => {
            e.stopPropagation();
            props.onDelete?.(props);
          }}
          className="text-red-500"
        >
          <Image
            src={deleteIcon}
            alt="Delete"
            width={20}
            height={20}
            className="w-4 h-4 xs:w-4 xs:h-4 sm:w-5 sm:h-5"
          />
        </button>
      </div>
    </div>
  );
}
