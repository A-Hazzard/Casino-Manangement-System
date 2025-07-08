"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Database, Server } from "lucide-react";
import { gsap } from "gsap";
import { LocationCardData } from "@/lib/types/location";
import { formatCurrency } from "@/lib/utils/number";

export default function LocationCard({
  location,
  onLocationClick,
  onEdit,
}: {
  location: LocationCardData["location"];
  onLocationClick: LocationCardData["onLocationClick"];
  onEdit: LocationCardData["onEdit"];
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [location]);

  const handleCardClick = () => {
    onLocationClick(location.location);
  };

  return (
    <div
      ref={cardRef}
      className="bg-container shadow-sm rounded-lg p-4 w-full mx-auto relative cursor-pointer hover:shadow-md transition-shadow border border-border"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest(".action-buttons")) {
          handleCardClick();
        }
      }}
    >
      {typeof location.onlineMachines === "number" && (
        <span
          className={`absolute top-3 right-3 w-3 h-3 rounded-full border-2 border-white z-10 ${
            location.onlineMachines > 0
                ? "bg-green-500 animate-pulse-slow"
                : "bg-red-500"
            }`}
          title={location.onlineMachines > 0 ? "Online" : "Offline"}
        />
      )}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-semibold">{location.locationName}</h3>
        <div className="flex gap-2 action-buttons">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(location);
            }}
            className="text-button"
          >
            <Image
              src="/editIcon.svg"
              width={16}
              height={16}
              alt="Edit"
              className="w-4 h-4"
            />
          </button>
        </div>
      </div>

      <div className="flex flex-col space-y-2 text-sm mb-2">
        <div className="flex justify-between">
          <span className="font-medium">Money In</span>
          <span className="text-foreground font-semibold">
            {formatCurrency(location.moneyIn ?? 0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Money Out</span>
          <span className="text-foreground font-semibold">
            {formatCurrency(location.moneyOut ?? 0)}
          </span>
        </div>
      </div>

      <div className="flex justify-between mt-1 mb-3">
        <span className="font-medium">Gross</span>
        <span
          className={`font-semibold ${
            (location.gross ?? 0) < 0 ? "text-destructive" : "text-button"
          }`}
        >
          {formatCurrency(location.gross ?? 0)}
        </span>
      </div>

      <div className="flex gap-2 justify-between mt-2 action-buttons">
        <Button
          className="bg-blueHighlight text-primary-foreground flex items-center space-x-1 rounded-md px-2 py-1 h-auto text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <Database className="w-3 h-3 mr-1" />
          {location.totalMachines} MACHINES
        </Button>
        <Button
          className="bg-button text-primary-foreground flex items-center space-x-1 rounded-md px-2 py-1 h-auto text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <Server className="w-3 h-3 mr-1" />
          {location.onlineMachines} ONLINE
        </Button>
      </div>
    </div>
  );
}
