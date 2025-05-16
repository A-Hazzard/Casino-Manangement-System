"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Database, Server } from "lucide-react";
import { useLocationActionsStore } from "@/lib/store/locationActionsStore";
import { Location } from "@/lib/types/location";
import { LocationCardProps } from "@/lib/types/cardProps";
import gsap from "gsap";
import { useRouter } from "next/navigation";

export default function LocationCard(props: LocationCardProps) {
  const { openEditModal } = useLocationActionsStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const prevPropsRef = useRef<LocationCardProps | null>(null);
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

  // Create a Location object with required fields
  const locationData: Partial<Location> = {
    _id: props._id,
    name: props.name,
    moneyIn: props.moneyIn,
    moneyOut: props.moneyOut,
    gross: props.gross,
    totalMachines: props.totalMachines,
    onlineMachines: props.onlineMachines,
    hasSmib: props.hasSmib,
  };

  const handleCardClick = () => {
    router.push(`/locations/${props._id}`);
  };

  return (
    <div
      ref={cardRef}
      className="bg-container shadow-sm rounded-lg p-4 w-full mx-auto relative cursor-pointer hover:shadow-md transition-shadow border border-border"
      onClick={(e) => {
        // Only handle the click if it's not on the action buttons
        if (!(e.target as HTMLElement).closest(".action-buttons")) {
          handleCardClick();
        }
      }}
    >
      {/* Title + Action Icons */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-semibold">{props.name}</h3>
        <div className="flex gap-2 action-buttons">
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click
              openEditModal(locationData);
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

      {/* Money In & Out */}
      <div className="flex flex-col space-y-2 text-sm mb-2">
        <div className="flex justify-between">
          <span className="font-medium">Money In</span>
          <span className="text-foreground font-semibold">
            ${(props.moneyIn || 0).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Money Out</span>
          <span className="text-foreground font-semibold">
            ${(props.moneyOut || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Gross */}
      <div className="flex justify-between mt-1 mb-3">
        <span className="font-medium">Gross</span>
        <span
          className={`font-semibold ${
            (props.gross || 0) < 0 ? "text-destructive" : "text-button"
          }`}
        >
          ${(props.gross || 0).toLocaleString()}
        </span>
      </div>

      {/* Machines & Online Buttons */}
      <div className="flex gap-2 justify-between mt-2 action-buttons">
        <Button
          className="bg-blueHighlight text-primary-foreground flex items-center space-x-1 rounded-md px-2 py-1 h-auto text-xs"
          onClick={(e) => e.stopPropagation()} // Prevent card click
        >
          <Database className="w-3 h-3 mr-1" />
          {props.totalMachines} MACHINES
        </Button>
        <Button
          className="bg-button text-primary-foreground flex items-center space-x-1 rounded-md px-2 py-1 h-auto text-xs"
          onClick={(e) => e.stopPropagation()} // Prevent card click
        >
          <Server className="w-3 h-3 mr-1" />
          {props.onlineMachines} ONLINE
        </Button>
      </div>
    </div>
  );
}
