import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Chip from "@/components/ui/common/Chip";
import { motion, AnimatePresence } from "framer-motion";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import Image from "next/image";

const MOCK_SMIBS = [
  { id: "a1", label: "afscdw67ge" },
  { id: "b2", label: "Dev Lab" },
  { id: "c3", label: "Dev Lab 2" },
  { id: "d4", label: "Test Lab" },
];

const MOCK_LOCATIONS = [
  { id: "loc1", name: "All Locations" },
  { id: "loc2", name: "Dev Lab" },
  { id: "loc3", name: "Test Lab" },
  { id: "loc4", name: "Dev Lab 2" },
];

export default function SMIBManagement() {
  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(
    MOCK_LOCATIONS[0].id
  );
  const [selectedSMIBs, setSelectedSMIBs] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [customSMIB, setCustomSMIB] = useState("");
  const [applyAll, setApplyAll] = useState(false);

  const shiftCards = selectedSMIBs.length >= 3;

  const handleSelectSMIB = (
    smib: { id: string; label: string } | undefined
  ) => {
    if (smib && !selectedSMIBs.find((s) => s.id === smib.id)) {
      setSelectedSMIBs([...selectedSMIBs, smib]);
    }
  };
  const handleRemoveSMIB = (id: string) => {
    setSelectedSMIBs(selectedSMIBs.filter((s) => s.id !== id));
  };
  const handleAddCustomSMIB = () => {
    if (
      customSMIB.trim() &&
      !selectedSMIBs.find((s) => s.label === customSMIB)
    ) {
      setSelectedSMIBs([
        ...selectedSMIBs,
        { id: customSMIB, label: customSMIB },
      ]);
      setCustomSMIB("");
    }
  };

  const currentSelectedLocationName =
    MOCK_LOCATIONS.find((l) => l.id === selectedLocation)?.name ||
    "Selected Location";

  return (
    <div className="w-full max-w-full min-h-[80vh] flex flex-col gap-6 text-gray-700">
      {/* Top Purple Bar */}
      <div className="bg-buttonActive p-4 rounded-lg flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative w-full lg:w-2/3">
          <Input
            placeholder="Search machines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 bg-white border-none rounded-md h-11 px-4 text-gray-700 placeholder-gray-400"
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="w-full lg:w-1/3 h-11 rounded-md border-none px-3 bg-white text-gray-700"
        >
          {MOCK_LOCATIONS.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Buttons and SMIB Selection Row */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between w-full">
        {/* Button Group */}
        <div className="flex gap-2 flex-wrap justify-center lg:justify-start w-full lg:w-auto">
          <Button
            variant="outline"
            className="bg-white border-button text-button hover:bg-button/10"
          >
            SEARCH SMIB
          </Button>
          <Button
            variant="outline"
            className="bg-white border-button text-button hover:bg-button/10"
          >
            ADD SMIB
          </Button>
          <Button
            variant="outline"
            className="bg-white border-button text-button hover:bg-button/10"
          >
            REMOVE SMIB
          </Button>
        </div>
        {/* Location Display */}
        <div className="text-center lg:text-right">
          <p className="text-sm text-gray-600">Current Location:</p>
          <p className="font-semibold text-gray-800">
            {currentSelectedLocationName}
          </p>
        </div>
      </div>

      {/* Apply All Checkbox - Centered */}
      <div className="flex items-center justify-center gap-2 my-2 w-full">
        <Checkbox
          checked={applyAll}
          onCheckedChange={(v) => setApplyAll(!!v)}
          id="applyAllSmibs"
          className="border-gray-400 data-[state=checked]:bg-buttonActive data-[state=checked]:border-buttonActive focus:ring-buttonActive"
        />
        <label htmlFor="applyAllSmibs" className="text-sm text-gray-600">
          Apply to all SMIBs at this location ({currentSelectedLocationName})
        </label>
      </div>

      {/* Selected SMIBs */}
      <div className="flex flex-wrap gap-2 min-h-[40px] items-center bg-gray-100 p-3 rounded-lg">
        {selectedSMIBs.length === 0 ? (
          <span className="text-gray-500">
            No SMIBs selected. Add SMIBs using the controls above.
          </span>
        ) : (
          selectedSMIBs.map((smib) => (
            <Chip
              key={smib.id}
              label={smib.label}
              onRemove={() => handleRemoveSMIB(smib.id)}
              className="bg-buttonActive text-white"
            />
          ))
        )}
      </div>

      {/* Cards Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Left column: Network/WIFI, Coms, Fingerprint/Probes */}
        <div className="flex flex-col gap-6">
          {/* Network/WIFI Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-700">
                Network / WIFI
              </h3>
              <Image
                src="/editIcon.svg"
                alt="Edit"
                width={20}
                height={20}
                className="w-5 h-5 cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <label className="text-sm text-gray-600">Name</label>
              <Input
                placeholder="Enter network name"
                className="sm:col-start-2 placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive"
              />
              <label className="text-sm text-gray-600">Password</label>
              <Input
                placeholder="Enter password"
                type="password"
                className="sm:col-start-2 placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive"
              />
              <label className="text-sm text-gray-600">Channel</label>
              <Input
                placeholder="Enter channel"
                className="sm:col-start-2 placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive"
              />
            </div>
            <Button className="mt-4 bg-button hover:bg-button/90 text-white w-full sm:w-auto">
              UPDATE
            </Button>
          </div>
          {/* Coms Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-700">Coms</h3>
              <Image
                src="/editIcon.svg"
                alt="Edit"
                width={20}
                height={20}
                className="w-5 h-5 cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <label className="text-sm text-gray-600">Mode</label>
              <Input
                placeholder="Enter mode"
                className="sm:col-start-2 placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive"
              />
              <label className="text-sm text-gray-600">Address</label>
              <Input
                placeholder="Enter address"
                className="sm:col-start-2 placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive"
              />
              <label className="text-sm text-gray-600">Rate</label>
              <Input
                placeholder="Enter rate"
                className="sm:col-start-2 placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive"
              />
              <label className="text-sm text-gray-600">RTE</label>
              <Input
                placeholder="Enter RTE"
                className="sm:col-start-2 placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive"
              />
              <label className="text-sm text-gray-600">GPC</label>
              <Input
                placeholder="Enter GPC"
                className="sm:col-start-2 placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive"
              />
            </div>
            <Button className="mt-4 bg-button hover:bg-button/90 text-white w-full sm:w-auto">
              UPDATE
            </Button>
          </div>
          {/* Fingerprint/Probes Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-bold text-lg mb-4 text-gray-700">
              Fingerprint
            </h3>
            <div className="text-gray-500 text-sm">Probes:</div>
          </div>
          {/* Animate MQTT cards below Coms if shiftCards is true */}
          <AnimatePresence>
            {shiftCards && (
              <motion.div
                key="mqtt-cards-shifted"
                initial={{ opacity: 0, y: 20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: 20, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="flex flex-col gap-6"
              >
                <MQTTCards />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column: MQTT cards (if not shifted) */}
        <div className={`flex-col gap-6 ${shiftCards ? "hidden" : "flex"}`}>
          <MQTTCards />
        </div>
      </div>
    </div>
  );
}

function MQTTCards() {
  return (
    <>
      {/* MQTT Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-bold text-lg mb-4 text-gray-700">MQTT</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div>
            <span className="font-semibold text-gray-600">Connection</span>
            <div className="text-xs text-gray-500 mt-1">
              Host:
              <br />
              Port:
              <br />
              Use TLS: No
              <br />
              Idle Timeout: 30 seconds
            </div>
          </div>
          <div>
            <span className="font-semibold text-gray-600">Authentication</span>
            <div className="text-xs text-gray-500 mt-1">
              Username:
              <br />
              Password:
            </div>
          </div>
          <div className="sm:col-span-2">
            <span className="font-semibold text-gray-600">Topics</span>
            <div className="text-xs text-gray-500 mt-1">
              Server: syskey/server
              <br />
              Configuration: smib/config
              <br />
              SMIB: smib/selvy/cb6d4d5343fc
            </div>
          </div>
        </div>
      </div>
      {/* MQTT Topics Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-bold text-lg mb-4 text-gray-700">MQTT Topics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <label className="text-sm text-gray-600">Mqtt Pub Topic</label>
          <Input
            placeholder="Enter Mqtt Pub Topic"
            className="sm:col-start-2 placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive"
          />
          <label className="text-sm text-gray-600">Mqtt Config Topic</label>
          <Input
            placeholder="Enter Mqtt Config Topic"
            className="sm:col-start-2 placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive"
          />
          <label className="text-sm text-gray-600">Mqtt URL</label>
          <Input
            placeholder="Enter Mqtt URL"
            className="sm:col-start-2 placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive"
          />
        </div>
        <Button className="mt-4 bg-button hover:bg-button/90 text-white w-full sm:w-auto">
          UPDATE
        </Button>
      </div>
    </>
  );
}
