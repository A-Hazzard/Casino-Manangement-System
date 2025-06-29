import { Button, type ButtonProps } from "@/components/ui/button";
import { RefreshCw, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import type { SyncButtonProps as BaseSyncButtonProps } from "@/lib/types/components";

type SyncButtonProps = ButtonProps & BaseSyncButtonProps;

export const SyncButton: React.FC<SyncButtonProps> = ({
  onClick,
  isSyncing = false,
  className = "",
  label = "Sync Meters",
  iconOnly = false,
  variant = "sync",
  ...props
}) => {
  const Icon = variant === "sync" ? RotateCcw : RefreshCw;

  return (
    <Button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 bg-buttonActive text-white hover:bg-buttonActive/90 transition-colors",
        className
      )}
      disabled={isSyncing}
      aria-label={label}
      {...props}
    >
      <Icon
        className={cn("w-4 h-4", isSyncing ? "animate-spin" : "")}
        aria-hidden="true"
      />
      <span className={iconOnly ? "hidden" : "hidden lg:inline"}>{label}</span>
    </Button>
  );
};

// Keep the old RefreshButton for backward compatibility
export const RefreshButton: React.FC<SyncButtonProps> = (props) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant, ...otherProps } = props;
  return (
    <SyncButton
      {...otherProps}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      variant={"refresh" as any}
      label={props.label || "Refresh"}
    />
  );
};

export default SyncButton;
