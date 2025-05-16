import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, RefreshCcw, XIcon } from "lucide-react";
import type { Location, CabinetData } from "@/lib/types/collections";
import type { NewCollectionModalProps } from "@/lib/types/componentProps";
import type {
  CollectionReportLocationWithMachines,
  CollectionReportMachineSummary,
  CreateCollectionReportPayload,
} from "@/lib/types/api";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  getLocationsWithMachines,
  createCollectionReport,
} from "@/lib/helpers/collectionReport";

export default function NewCollectionModal({
  show,
  onClose,
  locations = [],
}: NewCollectionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const [selectedLocationId, setSelectedLocationId] = useState<
    string | undefined
  >(undefined);
  const [locationSearch, setLocationSearch] = useState("");
  const [cabinetsForLocation, setCabinetsForLocation] = useState<CabinetData[]>(
    []
  );
  const [selectedCabinetId, setSelectedCabinetId] = useState<
    string | undefined
  >(undefined);

  const [currentMachineIndex, setCurrentMachineIndex] = useState(0);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );

  const [metersIn, setMetersIn] = useState("");
  const [metersOut, setMetersOut] = useState("");
  const [notes, setNotes] = useState("");

  const [locationsWithMachines, setLocationsWithMachines] = useState<
    CollectionReportLocationWithMachines[]
  >([]);
  const [financials, setFinancials] = useState({
    taxes: "",
    advance: "",
    variance: "",
    varianceReason: "",
    amountToCollect: "",
    collectedAmount: "",
    balanceCorrection: "",
    balanceCorrectionReason: "",
    previousBalance: "",
    reasonForShortagePayment: "",
  });

  const selectedLocation = locations.find(
    (l: Location) => l._id === selectedLocationId
  );
  const selectedCabinet = cabinetsForLocation.find(
    (c) => c.id === selectedCabinetId
  );
  const currentMachines = selectedCabinet?.machines || [];
  const currentMachine = currentMachines[currentMachineIndex];
  const totalMachinesInCabinet = currentMachines.length;

  useEffect(() => {
    if (show && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" }
      );
    } else if (!show && modalRef.current) {
      gsap.to(modalRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
          setSelectedLocationId(undefined);
          setLocationSearch("");
          setCabinetsForLocation([]);
          setSelectedCabinetId(undefined);
          setCurrentMachineIndex(0);
          setSelectedDate(new Date());
          setMetersIn("");
          setMetersOut("");
          setNotes("");
        },
      });
    }
  }, [show]);

  useEffect(() => {
    if (selectedLocationId) {
      console.log(`Fetching cabinets for location: ${selectedLocationId}`);
      if (selectedLocationId === "loc1") {
        setCabinetsForLocation([
          {
            id: "cab1",
            name: "Cabinet 1",
            prevIn: 704220,
            prevOut: 466141,
            machines: [
              { id: "cab1-m1", name: "Alpha Keno" },
              { id: "cab1-m2", name: "Beta Slots" },
            ],
          },
          {
            id: "cab2",
            name: "Cabinet 2",
            prevIn: 12345,
            prevOut: 67890,
            machines: [{ id: "cab2-m1", name: "Gamma Poker" }],
          },
        ]);
      } else {
        setCabinetsForLocation([]);
      }
      setSelectedCabinetId(undefined);
      setCurrentMachineIndex(0);
      setMetersIn("");
      setMetersOut("");
      setNotes("");
    } else {
      setCabinetsForLocation([]);
      setSelectedCabinetId(undefined);
      setCurrentMachineIndex(0);
    }
  }, [selectedLocationId]);

  useEffect(() => {
    setCurrentMachineIndex(0);
    setMetersIn("");
    setMetersOut("");
    setNotes("");
  }, [selectedCabinetId]);

  useEffect(() => {
    if (show) {
      getLocationsWithMachines().then((locations) => {
        setLocationsWithMachines(locations);
      });
    }
  }, [show]);

  const handleSaveReport = async () => {
    const payload: CreateCollectionReportPayload = {
      variance: Number(financials.variance),
      previousBalance: Number(financials.previousBalance),
      currentBalance: 0,
      amountToCollect: Number(financials.amountToCollect),
      amountCollected: Number(financials.collectedAmount),
      amountUncollected: 0,
      partnerProfit: 0,
      taxes: Number(financials.taxes),
      advance: Number(financials.advance),
      collectorName: "",
      locationName: selectedLocation?.name || "",
      locationReportId: "",
      location: selectedLocationId || "",
      totalDrop: 0,
      totalCancelled: 0,
      totalGross: 0,
      totalSasGross: 0,
      timestamp: selectedDate
        ? selectedDate.toISOString()
        : new Date().toISOString(),
      varianceReason: financials.varianceReason,
      previousCollectionTime: undefined,
      locationProfitPerc: undefined,
      reasonShortagePayment: financials.reasonForShortagePayment,
      balanceCorrection: Number(financials.balanceCorrection),
      balanceCorrectionReas: financials.balanceCorrectionReason,
    };
    await createCollectionReport(payload);
    onClose();
  };

  // Helper to check if all required fields are filled
  const isSaveEnabled = Boolean(
    selectedLocationId &&
      selectedCabinetId &&
      selectedDate &&
      metersIn &&
      metersOut &&
      financials.taxes &&
      financials.advance &&
      financials.variance &&
      financials.varianceReason &&
      financials.amountToCollect &&
      financials.collectedAmount &&
      financials.balanceCorrection &&
      financials.balanceCorrectionReason &&
      financials.previousBalance &&
      financials.reasonForShortagePayment
  );

  if (!show) {
    return null;
  }

  return (
    <Dialog
      open={show}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        ref={modalRef}
        className="max-w-4xl h-[calc(100vh-4rem)] md:h-[85vh] p-0 flex flex-col bg-container"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 md:p-6 pb-0">
          <DialogTitle className="text-xl md:text-2xl font-bold">
            New Report,{" "}
            {currentMachine
              ? `${currentMachineIndex + 1} of ${totalMachinesInCabinet}`
              : `0 of 0`}{" "}
            Machines
          </DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 md:top-4 md:right-4"
              onClick={onClose}
            >
              <XIcon className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
          {/* Left Column */}
          <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border p-4 md:p-6 flex flex-col space-y-3 md:space-y-4 overflow-y-auto">
            <Select
              value={selectedLocationId}
              onValueChange={setSelectedLocationId}
            >
              <SelectTrigger className="w-full bg-buttonActive text-white focus:ring-primary">
                <SelectValue
                  className="text-white"
                  placeholder="Select Location"
                />
              </SelectTrigger>
              <SelectContent>
                {locationsWithMachines.length > 0 ? (
                  locationsWithMachines.map((loc) => (
                    <SelectItem key={String(loc._id)} value={String(loc._id)}>
                      {loc.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-grayHighlight">
                    No locations found.
                  </div>
                )}
              </SelectContent>
            </Select>

            <div className="relative">
              <Input
                placeholder="Search Locations..."
                className="pr-10"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-grayHighlight" />
            </div>

            <div className="flex-grow space-y-2 min-h-[100px]">
              {locationsWithMachines
                .find((l) => l._id === selectedLocationId)
                ?.machines.map((cabinet: CollectionReportMachineSummary) => (
                  <Button
                    key={String(cabinet._id)}
                    variant={
                      selectedCabinetId === String(cabinet._id)
                        ? "secondary"
                        : "outline"
                    }
                    className="w-full justify-start text-left h-auto py-2 px-3 whitespace-normal"
                    onClick={() => {
                      setSelectedCabinetId(String(cabinet._id));
                      setCurrentMachineIndex(0);
                    }}
                  >
                    {cabinet.name} ({cabinet.serialNumber})
                  </Button>
                ))}
              {!selectedLocationId && (
                <p className="text-xs md:text-sm text-grayHighlight pt-2">
                  Select a location to see cabinets.
                </p>
              )}
              {selectedLocationId &&
                locationsWithMachines.find((l) => l._id === selectedLocationId)
                  ?.machines.length === 0 && (
                  <p className="text-xs md:text-sm text-grayHighlight pt-2">
                    No cabinets for this location.
                  </p>
                )}
            </div>
          </div>

          {/* Right Column */}
          <div className="w-full md:w-2/3 p-4 md:p-6 flex flex-col space-y-3 md:space-y-4 overflow-y-auto">
            {selectedLocationId && selectedCabinetId ? (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-xs md:text-sm text-grayHighlight">
                    {selectedLocation?.name} (prev. collection time: N/A)
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-grayHighlight"
                    onClick={() => {
                      setSelectedDate(new Date());
                      setMetersIn("");
                      setMetersOut("");
                      setNotes("");
                      setFinancials({
                        taxes: "",
                        advance: "",
                        variance: "",
                        varianceReason: "",
                        amountToCollect: "",
                        collectedAmount: "",
                        balanceCorrection: "",
                        balanceCorrectionReason: "",
                        previousBalance: "",
                        reasonForShortagePayment: "",
                      });
                    }}
                  >
                    <RefreshCcw className="h-4 w-4 md:h-5" />
                  </Button>
                </div>

                <Button
                  variant="default"
                  className="w-full bg-lighterBlueHighlight text-primary-foreground text-sm md:text-base"
                >
                  {locationsWithMachines
                    .find((l) => l._id === selectedLocationId)
                    ?.machines.find((m) => String(m._id) === selectedCabinetId)
                    ?.serialNumber || "No Machine"}
                </Button>

                <div className="flex items-center gap-2 mt-4">
                  <DateTimePicker
                    date={selectedDate}
                    setDate={(date) => setSelectedDate(date)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-grayHighlight mb-1">
                      Meters In:
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={metersIn}
                      onChange={(e) => setMetersIn(e.target.value)}
                      className="text-xs md:text-sm"
                    />
                    <p className="text-xs text-grayHighlight mt-1">
                      Prev In: {selectedCabinet?.prevIn ?? "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-grayHighlight mb-1">
                      Meters Out:
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={metersOut}
                      onChange={(e) => setMetersOut(e.target.value)}
                      className="text-xs md:text-sm"
                    />
                    <p className="text-xs text-grayHighlight mt-1">
                      Prev Out: {selectedCabinet?.prevOut ?? "N/A"}
                    </p>
                  </div>
                </div>

                {/* Financial Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-grayHighlight mb-1">
                      Taxes:
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={financials.taxes}
                      onChange={(e) =>
                        setFinancials({ ...financials, taxes: e.target.value })
                      }
                      className="text-xs md:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-grayHighlight mb-1">
                      Advance:
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={financials.advance}
                      onChange={(e) =>
                        setFinancials({
                          ...financials,
                          advance: e.target.value,
                        })
                      }
                      className="text-xs md:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-grayHighlight mb-1">
                      Variance:
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={financials.variance}
                      onChange={(e) =>
                        setFinancials({
                          ...financials,
                          variance: e.target.value,
                        })
                      }
                      className="text-xs md:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-grayHighlight mb-1">
                      Variance Reason:
                    </label>
                    <Textarea
                      placeholder="Variance Reason"
                      value={financials.varianceReason}
                      onChange={(e) =>
                        setFinancials({
                          ...financials,
                          varianceReason: e.target.value,
                        })
                      }
                      className="text-xs md:text-sm min-h-[40px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-grayHighlight mb-1">
                      Amount To Collect:
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={financials.amountToCollect}
                      onChange={(e) =>
                        setFinancials({
                          ...financials,
                          amountToCollect: e.target.value,
                        })
                      }
                      className="text-xs md:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-grayHighlight mb-1">
                      Collected Amount:
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={financials.collectedAmount}
                      onChange={(e) =>
                        setFinancials({
                          ...financials,
                          collectedAmount: e.target.value,
                        })
                      }
                      className="text-xs md:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-grayHighlight mb-1">
                      Balance Correction:
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={financials.balanceCorrection}
                      onChange={(e) =>
                        setFinancials({
                          ...financials,
                          balanceCorrection: e.target.value,
                        })
                      }
                      className="text-xs md:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-grayHighlight mb-1">
                      Balance Correction Reason:
                    </label>
                    <Textarea
                      placeholder="Correction Reason"
                      value={financials.balanceCorrectionReason}
                      onChange={(e) =>
                        setFinancials({
                          ...financials,
                          balanceCorrectionReason: e.target.value,
                        })
                      }
                      className="text-xs md:text-sm min-h-[40px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-grayHighlight mb-1">
                      Previous Balance:
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={financials.previousBalance}
                      onChange={(e) =>
                        setFinancials({
                          ...financials,
                          previousBalance: e.target.value,
                        })
                      }
                      className="text-xs md:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-grayHighlight mb-1">
                      Reason For Shortage Payment:
                    </label>
                    <Textarea
                      placeholder="Shortage Reason"
                      value={financials.reasonForShortagePayment}
                      onChange={(e) =>
                        setFinancials({
                          ...financials,
                          reasonForShortagePayment: e.target.value,
                        })
                      }
                      className="text-xs md:text-sm min-h-[40px]"
                    />
                  </div>
                </div>

                {/* Notes at the end */}
                <div>
                  <label className="block text-xs md:text-sm font-medium text-grayHighlight mb-1">
                    Notes:
                  </label>
                  <Textarea
                    placeholder="Add notes here..."
                    value={notes || ""}
                    onChange={(e) => setNotes(e.target.value || "")}
                    className="text-xs md:text-sm min-h-[60px] md:min-h-[80px]"
                  />
                </div>

                <DialogFooter className="pt-2 md:pt-4 flex justify-center">
                  <Button
                    onClick={handleSaveReport}
                    className="w-auto bg-lighterBlueHighlight text-primary-foreground text-sm md:text-base px-6"
                    disabled={!isSaveEnabled}
                  >
                    SAVE REPORT
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <div className="flex-grow flex items-center justify-center h-full">
                <p className="text-grayHighlight text-sm md:text-base text-center">
                  Select a location and cabinet to begin.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
