"use client";

import Image from "next/image";
import { ExitIcon } from "@radix-ui/react-icons";
import { logoutUser } from "@/lib/helpers/auth";
import { usePathname, useRouter } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

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

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 h-full bg-container shadow-md shadow-purple-500
                 z-50 flex-col items-end pt-6 pb-6 pl-4"
    >
      {/* Dashboard button */}
      <div className="mb-6">
        <Image
          src={
            pathname === "/"
              ? "/dashboardButton.svg"
              : "/dashboardButtonNoBg.svg"
          }
          width={50}
          height={50}
          className="w-[7rem] cursor-pointer"
          alt="Dashboard Button"
          onClick={() => router.push("/")}
        />
      </div>

      {/* Location button */}
      <div className="mb-6">
        <Image
          src={
            isLocationPath ? "/locationButton.svg" : "/locationButtonNoBg.svg"
          }
          width={50}
          height={50}
          className="w-[7rem] cursor-pointer"
          alt="Location Button"
          onClick={() => router.push("/locations")}
        />
      </div>

      {/* Cabinets button */}
      <div className="mb-6">
        <Image
          src={
            isCabinetPath ? "/cabinetsButton.svg" : "/cabinetsButtonNoBg.svg"
          }
          width={50}
          height={50}
          className="w-[7rem] cursor-pointer"
          alt="Cabinets Button"
          onClick={() => router.push("/cabinets")}
        />
      </div>

      {/* Collections button */}
      <div className="mb-6">
        <Image
          src={
            isCollectionsPath
              ? "/collectionsButton.svg"
              : "/collectionsButtonNoBg.svg"
          }
          width={50}
          height={50}
          className="w-[7rem] cursor-pointer"
          alt="Collections Button"
          onClick={() => router.push("/collection-report")}
        />
      </div>

      {/* Logout button */}
      <button
        onClick={logoutUser}
        className="group mt-auto mb-4 mx-auto p-2 rounded hover:bg-buttonActive"
        aria-label="Logout"
      >
        <ExitIcon className="w-6 h-6 text-grayHighlight group-hover:text-container" />
      </button>
    </aside>
  );
}
