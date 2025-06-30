import Image from "next/image";
import Link from "next/link";
import { ExitIcon } from "@radix-ui/react-icons";
import { BarChart3 } from "lucide-react";
import { logoutUser } from "@/lib/helpers/auth";
import SettingsModal from "./SettingsModal";

// Pre-import all images to enable preloading
import dashboardButton from "@/public/dashboardButton.svg";
import dashboardButtonNoBg from "@/public/dashboardButtonNoBg.svg";
import locationButton from "@/public/locationButton.svg";
import locationButtonNoBg from "@/public/locationButtonNoBg.svg";
import cabinetsButton from "@/public/cabinetsButton.svg";
import cabinetsButtonNoBg from "@/public/cabinetsButtonNoBg.svg";
import collectionsButton from "@/public/collectionsButton.svg";
import collectionsButtonNoBg from "@/public/collectionsButtonNoBg.svg";
import adminButton from "@/public/adminButton.svg";
import adminButtonNoBg from "@/public/adminButtonNoBg.svg";

export default function Sidebar({ pathname }: { pathname: string }) {
  // Check if the current path is related to dashboard
  const isDashboardPath = pathname === "/";
  // Check if the current path is related to locations
  const isLocationPath =
    pathname === "/locations" || pathname.startsWith("/locations/");
  // Check if the current path is related to cabinets
  const isCabinetPath =
    pathname === "/cabinets" || pathname.startsWith("/cabinets/");
  // Check if the current path is related to collections
  const isCollectionsPath =
    pathname === "/collection-report" ||
    pathname.startsWith("/collection-report/");
  // Check if the current path is related to administration
  const isAdminPath =
    pathname === "/administration" || pathname.startsWith("/administration/");
  // Check if the current path is related to reports
  const isReportsPath =
    pathname === "/reports" || pathname.startsWith("/reports/");

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full bg-container shadow-md shadow-purple-500 z-50 flex-col items-end pt-6 pb-6 pl-4">
      {/* Dashboard button */}
      <div className={isDashboardPath ? "" : "mb-6"}>
        <Link href="/">
          <Image
            src={isDashboardPath ? dashboardButton : dashboardButtonNoBg}
            width={50}
            height={50}
            className={`w-[7rem] cursor-pointer ${
              !isDashboardPath ? "-ml-2" : ""
            }`}
            alt="Dashboard Button"
            priority
          />
        </Link>
      </div>
      {/* Location button */}
      <div className={`${isLocationPath ? "-mt-6" : ""}`}>
        <Link href="/locations">
          <Image
            src={isLocationPath ? locationButton : locationButtonNoBg}
            width={50}
            height={50}
            className={`w-[7rem] cursor-pointer ${
              !isLocationPath ? "w-[7.5rem] -ml-2" : ""
            }`}
            alt="Location Button"
            priority
          />
        </Link>
      </div>
      {/* Cabinets button */}
      <div className={`${isLocationPath ? "-mt-6" : ""}`}>
        <Link href="/cabinets">
          <Image
            src={isCabinetPath ? cabinetsButton : cabinetsButtonNoBg}
            width={50}
            height={50}
            className={`cursor-pointer ${
              !isCabinetPath ? "w-[7.5rem] -ml-2" : "w-[7rem]"
            }`}
            alt="Cabinets Button"
            priority
          />
        </Link>
      </div>
      {/* Collections button */}
      <div
        className={`${isCollectionsPath ? "-mt-8" : "mb-6"} ${
          isAdminPath ? "mb-0" : ""
        }`}
      >
        <Link href="/collection-report">
          <Image
            src={isCollectionsPath ? collectionsButton : collectionsButtonNoBg}
            width={50}
            height={50}
            className={`w-[7rem] ${
              !isCollectionsPath ? "-ml-2" : ""
            } cursor-pointer`}
            alt="Collections Button"
            priority
          />
        </Link>
      </div>
      {/* Administration button */}
      <div className={`${isAdminPath ? "-mt-4" : ""}`}>
        <Link href="/administration">
          <Image
            src={isAdminPath ? adminButton : adminButtonNoBg}
            width={50}
            height={50}
            className={`w-[7rem] cursor-pointer ${
              !isAdminPath ? "w-[6rem] -ml-6" : ""
            }`}
            alt="Administration Button"
            priority
          />
        </Link>
      </div>
      {/* Reports button */}
      <div className={`${isReportsPath ? "-mt-4" : ""}`}>
        <Link href="/reports">
          <div
            className={`
            w-[7rem] cursor-pointer flex items-center justify-center px-3 py-3 rounded-lg transition-colors font-medium text-sm
            ${
              isReportsPath
                ? "bg-buttonActive text-white shadow-md"
                : "text-grayHighlight hover:bg-gray-100 hover:text-gray-900"
            }
            ${!isReportsPath ? "w-[6rem] -ml-6" : ""}
          `}
          >
            <BarChart3 className="h-5 w-5 mr-2" />
            Reports
          </div>
        </Link>
      </div>
      {/* Settings and Logout container */}
      <div className="mt-auto mb-4 mx-auto flex flex-col gap-2">
        <SettingsModal />
        <button
          onClick={logoutUser}
          className="group p-2 rounded hover:bg-buttonActive"
          aria-label="Logout"
          type="button"
        >
          <ExitIcon className="w-6 h-6 text-grayHighlight group-hover:text-container" />
        </button>
      </div>
    </aside>
  );
}
