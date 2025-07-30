"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { NewMovementModalProps } from "@/lib/types/components";
import type { MachineMovementRecord } from "@/lib/types/reports";

// Sample data
const sampleMachines = [
  {
    id: "MAC001",
    name: "Lucky Stars Deluxe",
    currentLocation: "Main Casino Floor",
    currentLocationId: "LOC001",
  },
  {
    id: "MAC002",
    name: "Diamond Rush Pro",
    currentLocation: "VIP Gaming Area",
    currentLocationId: "LOC002",
  },
  {
    id: "MAC003",
    name: "Golden Jackpot",
    currentLocation: "Sports Bar Gaming",
    currentLocationId: "LOC003",
  },
  {
    id: "MAC004",
    name: "Mega Fortune",
    currentLocation: "Main Casino Floor",
    currentLocationId: "LOC001",
  },
  {
    id: "MAC005",
    name: "Royal Flush",
    currentLocation: "Hotel Gaming Lounge",
    currentLocationId: "LOC004",
  },
];

const sampleLocations = [
  { id: "LOC001", name: "Main Casino Floor" },
  { id: "LOC002", name: "VIP Gaming Area" },
  { id: "LOC003", name: "Sports Bar Gaming" },
  { id: "LOC004", name: "Hotel Gaming Lounge" },
  { id: "LOC005", name: "Outdoor Terrace" },
];

const movementReasons = [
  "Performance optimization",
  "Maintenance relocation",
  "Customer demand",
  "Space reconfiguration",
  "New installation",
  "Equipment upgrade",
  "Seasonal adjustment",
  "Other",
];

export default function NewMovementModal({
  isOpen,
  onClose,
  onSubmit,
}: NewMovementModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    machineId: "",
    toLocationId: "",
    moveDate: undefined as Date | undefined,
    reason: "",
    notes: "",
    estimatedCost: "",
    priority: "medium",
  });

  const selectedMachine = sampleMachines.find(
    (m) => m.id === formData.machineId
  );
  const selectedToLocation = sampleLocations.find(
    (l) => l.id === formData.toLocationId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.machineId ||
      !formData.toLocationId ||
      !formData.moveDate ||
      !formData.reason
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (selectedMachine?.currentLocation === selectedToLocation?.name) {
      toast.error("Machine is already at the selected location");
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const newMovement: MachineMovementRecord = {
        id: `MOV${Date.now()}`,
        machineId: formData.machineId,
        machineName: selectedMachine?.name || "",
        fromLocationId: selectedMachine?.currentLocationId || null,
        fromLocationName: selectedMachine?.currentLocation || null,
        toLocationId: formData.toLocationId,
        toLocationName: selectedToLocation?.name || "",
        moveDate: format(formData.moveDate, "yyyy-MM-dd"),
        reason: formData.reason,
        status: "pending",
        notes: formData.notes,
        movedBy: "current-user", // This should come from auth context
        cost: formData.estimatedCost
          ? parseFloat(formData.estimatedCost)
          : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Call the callback to update parent component
      if (onSubmit) {
        onSubmit(newMovement);
      }

      toast.success("Movement request created successfully!");
      onClose();

      // Reset form
      setFormData({
        machineId: "",
        toLocationId: "",
        moveDate: undefined,
        reason: "",
        notes: "",
        estimatedCost: "",
        priority: "medium",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Failed to create movement request:", errorMessage);
      toast.error("Failed to create movement request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Movement Request</DialogTitle>
          <DialogDescription>
            Schedule a machine movement or relocation. All fields marked with *
            are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Machine Selection */}
            <div className="space-y-2">
              <Label htmlFor="machine">Machine *</Label>
              <Select
                value={formData.machineId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, machineId: value }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select machine to move" />
                </SelectTrigger>
                <SelectContent>
                  {sampleMachines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      <div>
                        <div className="font-medium">{machine.name}</div>
                        <div className="text-sm text-gray-500">
                          Current: {machine.currentLocation}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destination Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Destination Location *</Label>
              <Select
                value={formData.toLocationId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, toLocationId: value }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {sampleLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Current vs Destination Display */}
          {selectedMachine && selectedToLocation && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-blue-50 rounded-lg border border-blue-200"
            >
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-blue-900">From:</span>
                  <span className="ml-2 text-blue-700">
                    {selectedMachine.currentLocation}
                  </span>
                </div>
                <div className="text-blue-500">→</div>
                <div>
                  <span className="font-medium text-blue-900">To:</span>
                  <span className="ml-2 text-blue-700">
                    {selectedToLocation.name}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Move Date */}
            <div className="space-y-2">
              <Label>Scheduled Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.moveDate && "text-muted-foreground"
                    )}
                    disabled={isSubmitting}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.moveDate
                      ? format(formData.moveDate, "PPP")
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.moveDate}
                    onSelect={(date) =>
                      setFormData((prev) => ({ ...prev, moveDate: date }))
                    }
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, priority: value }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Movement *</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, reason: value }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {movementReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estimated Cost */}
            <div className="space-y-2">
              <Label htmlFor="cost">Estimated Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.estimatedCost}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    estimatedCost: e.target.value,
                  }))
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information about this movement..."
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Movement Request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
