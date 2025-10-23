import { Button, type ButtonProps } from "@/components/ui/button";
import { RefreshCw, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import type { SyncButtonProps as BaseSyncButtonProps } from "@/lib/types/components";

type Props = Omit<ButtonProps, keyof BaseSyncButtonProps> & BaseSyncButtonProps;

export const SyncButton = ({
  onClick,
  isSyncing = false,
  className = "",
  label = "Sync Meters",
  iconOnly = false,
  variant = "sync",
  ...props
}: Props) => {
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
      <span className={iconOnly ? "hidden" : ""}>{label}</span>
    </Button>
  );
};

export const RefreshButton = (props: Omit<Props, "variant">) => {
  return <SyncButton {...props} variant="refresh" />;
};

export default SyncButton;
