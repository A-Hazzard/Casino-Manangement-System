"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function SettingsModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Settings"
          className="group mb-4 mx-auto p-2 rounded hover:bg-buttonActive"
        >
          <Settings className="w-6 h-6 text-grayHighlight group-hover:text-container" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Settings</DialogTitle>
          <DialogDescription>Update your preferences.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-grayHighlight">Custom settings can be configured here.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
