import { Button, type ButtonProps } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

type RefreshButtonProps = ButtonProps & {
  isRefreshing: boolean;
  onClick: () => void;
  label?: string;
};

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onClick,
  isRefreshing = false,
  className = "",
  label = "Refresh",
  ...props
}) => (
  <Button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 bg-buttonActive text-white hover:bg-buttonActive/90 transition-colors",
      className
    )}
    disabled={isRefreshing}
    aria-label={label}
    {...props}
  >
    <RefreshCw
      className={cn("w-4 h-4", isRefreshing ? "animate-spin" : "")}
      aria-hidden="true"
    />
    <span className="hidden lg:inline">{label}</span>
  </Button>
);

export default RefreshButton;
