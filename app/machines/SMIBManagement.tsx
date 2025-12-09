import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/ui/custom-select';
import { Checkbox } from '@/components/ui/checkbox';
import Chip from '@/components/ui/common/Chip';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import Image from 'next/image';

// Import SVG icons for pre-rendering
import editIcon from '@/public/editIcon.svg';

const MOCK_SMIBS = [
  { id: 'a1', label: 'afscdw67ge' },
  { id: 'b2', label: 'Dev Lab' },
  { id: 'c3', label: 'Dev Lab 2' },
  { id: 'd4', label: 'Test Lab' },
];

const MOCK_LOCATIONS = [
  { id: 'loc1', name: 'All Locations' },
  { id: 'loc2', name: 'Dev Lab' },
  { id: 'loc3', name: 'Test Lab' },
  { id: 'loc4', name: 'Dev Lab 2' },
];

export default function SMIBManagement() {
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(
    MOCK_LOCATIONS[0].id
  );
  const [selectedSMIBs, setSelectedSMIBs] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [customSMIB, setCustomSMIB] = useState('');
  const [applyAll, setApplyAll] = useState(false);

  const shiftCards = selectedSMIBs.length >= 3;

  const handleSelectSMIB = (
    smib: { id: string; label: string } | undefined
  ) => {
    if (smib && !selectedSMIBs.find(s => s.id === smib.id)) {
      setSelectedSMIBs([...selectedSMIBs, smib]);
    }
  };
  const handleRemoveSMIB = (id: string) => {
    setSelectedSMIBs(selectedSMIBs.filter(s => s.id !== id));
  };
  const handleAddCustomSMIB = () => {
    if (customSMIB.trim() && !selectedSMIBs.find(s => s.label === customSMIB)) {
      setSelectedSMIBs([
        ...selectedSMIBs,
        { id: customSMIB, label: customSMIB },
      ]);
      setCustomSMIB('');
    }
  };

  const currentSelectedLocationName =
    MOCK_LOCATIONS.find(l => l.id === selectedLocation)?.name ||
    'Selected Location';

  return (
    <div className="flex min-h-[80vh] w-full max-w-full flex-col gap-6 text-gray-700">
      {/* Top Purple Bar */}
      <div className="flex flex-col items-center gap-4 rounded-lg bg-buttonActive p-4 lg:flex-row">
        <div className="relative w-full lg:w-2/3">
          <Input
            placeholder="Search machines..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-11 w-full rounded-md border-none bg-white px-4 pr-10 text-gray-700 placeholder-gray-400"
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        </div>
        <CustomSelect
          value={selectedLocation}
          onValueChange={setSelectedLocation}
          options={MOCK_LOCATIONS.map(loc => ({
            value: loc.id,
            label: loc.name,
          }))}
          placeholder="Select Location"
          className="w-full lg:w-1/3"
          triggerClassName="h-11 rounded-md border-none px-3 bg-white text-gray-700"
          emptyMessage="No locations found"
        />
      </div>

      {/* Buttons and SMIB Selection Row */}
      <div className="flex w-full flex-col items-center justify-between gap-4 lg:flex-row">
        {/* Button Group */}
        <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
          <Button
            variant="outline"
            className="border-button bg-white text-button hover:bg-button/10"
          >
            SEARCH SMIB
          </Button>
          <Button
            variant="outline"
            className="border-button bg-white text-button hover:bg-button/10"
          >
            STOP SEARCH
          </Button>
          <Button
            variant="outline"
            className="border-button bg-white text-button hover:bg-button/10"
          >
            GET SMIB CONFIG
          </Button>
        </div>
        {/* SMIB Selection Group */}
        <div className="flex w-full flex-col items-center gap-2 sm:flex-row lg:w-auto">
          <select
            className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-700 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:w-auto"
            onChange={e => {
              const smib = MOCK_SMIBS.find(s => s.id === e.target.value);
              if (smib) handleSelectSMIB(smib);
            }}
            value=""
          >
            <option value="" disabled>
              Select SMIB
            </option>
            {MOCK_SMIBS.map(smib => (
              <option key={smib.id} value={smib.id}>
                {smib.label}
              </option>
            ))}
          </select>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Input
              placeholder="Custom SMIB"
              value={customSMIB}
              onChange={e => setCustomSMIB(e.target.value)}
              className="h-11 w-full border-gray-300 bg-white text-gray-700 placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:w-32"
            />
            <Button
              onClick={handleAddCustomSMIB}
              variant="outline"
              className="h-11 border-button bg-white text-button hover:bg-button/10"
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Apply All Checkbox - Centered */}
      <div className="my-2 flex w-full items-center justify-center gap-2">
        <Checkbox
          checked={applyAll}
          onCheckedChange={v => setApplyAll(!!v)}
          id="applyAllSmibs"
          className="border-gray-400 focus:ring-buttonActive data-[state=checked]:border-buttonActive data-[state=checked]:bg-buttonActive"
        />
        <label htmlFor="applyAllSmibs" className="text-sm text-gray-600">
          Apply to all SMIBs at this location ({currentSelectedLocationName})
        </label>
      </div>

      {/* Selected SMIBs */}
      <div className="flex min-h-[40px] flex-wrap items-center gap-2 rounded-lg bg-gray-100 p-3">
        {selectedSMIBs.length === 0 ? (
          <span className="text-gray-500">
            No SMIBs selected. Add SMIBs using the controls above.
          </span>
        ) : (
          selectedSMIBs.map(smib => (
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
      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column: Network/WIFI, Coms, Fingerprint/Probes */}
        <div className="flex flex-col gap-6">
          {/* Network/WIFI Card */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-700">
                Network / WIFI
              </h3>
              <Image
                src={editIcon}
                alt="Edit"
                width={20}
                height={20}
                className="h-5 w-5 cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <label className="text-sm text-gray-600">Name</label>
              <Input
                placeholder="Enter network name"
                className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
              />
              <label className="text-sm text-gray-600">Password</label>
              <Input
                placeholder="Enter password"
                type="password"
                className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
              />
              <label className="text-sm text-gray-600">Channel</label>
              <Input
                placeholder="Enter channel"
                className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
              />
            </div>
            <Button className="mt-4 w-full bg-button text-white hover:bg-button/90 sm:w-auto">
              UPDATE
            </Button>
          </div>
          {/* Coms Card */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-700">Coms</h3>
              <Image
                src={editIcon}
                alt="Edit"
                width={20}
                height={20}
                className="h-5 w-5 cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <label className="text-sm text-gray-600">Mode</label>
              <Input
                placeholder="Enter mode"
                className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
              />
              <label className="text-sm text-gray-600">Address</label>
              <Input
                placeholder="Enter address"
                className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
              />
              <label className="text-sm text-gray-600">Rate</label>
              <Input
                placeholder="Enter rate"
                className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
              />
              <label className="text-sm text-gray-600">RTE</label>
              <Input
                placeholder="Enter RTE"
                className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
              />
              <label className="text-sm text-gray-600">GPC</label>
              <Input
                placeholder="Enter GPC"
                className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
              />
            </div>
            <Button className="mt-4 w-full bg-button text-white hover:bg-button/90 sm:w-auto">
              UPDATE
            </Button>
          </div>
          {/* Fingerprint/Probes Card */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-bold text-gray-700">
              Fingerprint
            </h3>
            <div className="text-sm text-gray-500">Probes:</div>
          </div>
          {/* Animate MQTT cards below Coms if shiftCards is true */}
          <AnimatePresence>
            {shiftCards && (
              <motion.div
                key="mqtt-cards-shifted"
                initial={{ opacity: 0, y: 20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 20, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="flex flex-col gap-6"
              >
                <MQTTCards />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column: MQTT cards (if not shifted) */}
        <div className={`flex-col gap-6 ${shiftCards ? 'hidden' : 'flex'}`}>
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
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h3 className="mb-4 text-lg font-bold text-gray-700">MQTT</h3>
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
          <div>
            <span className="font-semibold text-gray-600">Connection</span>
            <div className="mt-1 text-xs text-gray-500">
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
            <div className="mt-1 text-xs text-gray-500">
              Username:
              <br />
              Password:
            </div>
          </div>
          <div className="sm:col-span-2">
            <span className="font-semibold text-gray-600">Topics</span>
            <div className="mt-1 text-xs text-gray-500">
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
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h3 className="mb-4 text-lg font-bold text-gray-700">MQTT Topics</h3>
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
          <label className="text-sm text-gray-600">Mqtt Pub Topic</label>
          <Input
            placeholder="Enter Mqtt Pub Topic"
            className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
          />
          <label className="text-sm text-gray-600">Mqtt Config Topic</label>
          <Input
            placeholder="Enter Mqtt Config Topic"
            className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
          />
          <label className="text-sm text-gray-600">Mqtt URL</label>
          <Input
            placeholder="Enter Mqtt URL"
            className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
          />
        </div>
        <Button className="mt-4 w-full bg-button text-white hover:bg-button/90 sm:w-auto">
          UPDATE
        </Button>
      </div>
    </>
  );
}
