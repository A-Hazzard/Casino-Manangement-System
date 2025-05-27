import Image from "next/image";
import Link from "next/link";
import { ExitIcon } from "@radix-ui/react-icons";
import { logoutUser } from "@/lib/helpers/auth";

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

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full bg-container shadow-md shadow-purple-500 z-50 flex-col items-end pt-6 pb-6 pl-4">
      {/* Dashboard button */}
      <div className={isDashboardPath ? "" : "mb-6"}>
        <Link href="/">
          <Image
            src={
              isDashboardPath
                ? "/dashboardButton.svg"
                : "/dashboardButtonNoBg.svg"
            }
            width={50}
            height={50}
            className="w-[7rem] cursor-pointer"
            alt="Dashboard Button"
          />
        </Link>
      </div>
      {/* Location button */}
      <div className={`${isLocationPath ? "-mt-6" : ""}`}>
        <Link href="/locations">
          <Image
            src={
              isLocationPath ? "/locationButton.svg" : "/locationButtonNoBg.svg"
            }
            width={50}
            height={50}
            className={`w-[7rem] cursor-pointer ${
              !isLocationPath ? "w-[7.5rem] -ml-2" : ""
            }`}
            alt="Location Button"
          />
        </Link>
      </div>
      {/* Cabinets button */}
      <div className={`${isLocationPath ? "-mt-6" : ""}`}>
        <Link href="/cabinets">
          <Image
            src={
              isCabinetPath ? "/cabinetsButton.svg" : "/cabinetsButtonNoBg.svg"
            }
            width={50}
            height={50}
            className={`cursor-pointer ${
              !isCabinetPath ? "w-[7.5rem] -ml-2" : "w-[7rem]"
            }`}
            alt="Cabinets Button"
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
            src={
              isCollectionsPath
                ? "/collectionsButton.svg"
                : "/collectionsButtonNoBg.svg"
            }
            width={50}
            height={50}
            className={`w-[7rem] ${
              !isCollectionsPath ? "-ml-2" : ""
            } cursor-pointer`}
            alt="Collections Button"
          />
        </Link>
      </div>
      {/* Administration button */}
      <div className={`${isAdminPath ? "-mt-4" : ""}`}>
        <Link href="/administration">
          <Image
            src={isAdminPath ? "/adminButton.svg" : "/adminButtonNoBg.svg"}
            width={50}
            height={50}
            className={`w-[7rem] cursor-pointer ${
              !isAdminPath ? "w-[5.8rem] -ml-6" : ""
            }`}
            alt="Administration Button"
          />
        </Link>
      </div>
      {/* Logout button (client-side) */}
      <button
        onClick={logoutUser}
        className="group mt-auto mb-4 mx-auto p-2 rounded hover:bg-buttonActive"
        aria-label="Logout"
        type="button"
      >
        <ExitIcon className="w-6 h-6 text-grayHighlight group-hover:text-container" />
      </button>
    </aside>
  );
}
