"use client";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useState } from "react";
import {
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";

const mockUsers = [
  {
    name: "Sadmin",
    username: "admin",
    email: "example1@example.com",
    enabled: true,
    roles: ["admin"],
  },
  {
    name: "App Reviewer",
    username: "reviewer",
    email: "example2@example.com",
    enabled: false,
    roles: ["reviewer"],
  },
  {
    name: "Manager T",
    username: "manager",
    email: "example3@example.com",
    enabled: true,
    roles: ["manager"],
  },
  {
    name: "TTG Collector 1",
    username: "collector 1",
    email: "example4@example.com",
    enabled: false,
    roles: ["collector"],
  },
  {
    name: "TTG Collector 2",
    username: "collector 2",
    email: "example5@example.com",
    enabled: true,
    roles: ["collector", "collectormeters"],
  },
];

export default function AdministrationPage() {
  const pathname = usePathname();
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = 24; // Placeholder for total pages

  // For now, just use the mockUsers for the current page
  const paginatedUsers = mockUsers;

  return (
    <>
      <Sidebar pathname={pathname} />
      <div className="w-full md:pl-[8rem] min-h-screen bg-background flex overflow-hidden mt-8">
        <main className="flex flex-col flex-1 p-4 lg:p-6 w-full max-w-full overflow-x-hidden">
          <Header
            pageTitle="Administration"
            hideOptions={false}
            hideLicenceeFilter={false}
            disabled={false}
          />

          {/* Top navigation buttons */}
          <div className="flex gap-4 mt-6">
            <Button className="bg-buttonActive text-white flex-1">Users</Button>
            <Button className="bg-button text-white flex-1">Countries</Button>
            <Button className="bg-button text-white flex-1">
              SMIB Management
            </Button>
            <Button className="bg-button text-white flex-1">
              SMIB Firmware
            </Button>
          </div>

          {/* Search and filter bar */}
          <div className="bg-buttonActive rounded-t-lg p-4 mt-6 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 flex items-center relative">
              <Input
                type="text"
                placeholder="Search by...."
                className="w-full pr-10 bg-white border-none h-10 px-4 shadow-sm text-sm rounded-md lg:rounded-full"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                <Image
                  src="/searchIcon.svg"
                  alt="Search"
                  width={20}
                  height={20}
                />
              </button>
            </div>
            <Button className="bg-white text-buttonActive font-semibold px-6 py-2 rounded-full flex items-center gap-2">
              Username
              <Image
                src="/chevronDown.svg"
                alt="Dropdown"
                width={16}
                height={16}
              />
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-b-lg shadow-md">
              <thead>
                <tr className="bg-[#19C900] text-white">
                  <th className="py-3 px-4 text-left font-bold">NAME</th>
                  <th className="py-3 px-4 text-left font-bold">USERNAME</th>
                  <th className="py-3 px-4 text-left font-bold">
                    EMAIL ADDRESS
                  </th>
                  <th className="py-3 px-4 text-left font-bold">ENABLED</th>
                  <th className="py-3 px-4 text-left font-bold">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr
                    key={user.username}
                    className="border-b last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-bold">
                      {user.name}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className="bg-blue-200 text-blue-800 text-xs rounded px-2 py-0.5 mr-1"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold">
                      {user.username}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className="bg-blue-200 text-blue-800 text-xs rounded px-2 py-0.5 mr-1"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">{user.email}</td>
                    <td className="py-3 px-4">
                      {user.enabled ? "true" : "false"}
                    </td>
                    <td className="py-3 px-4 flex gap-3 items-center">
                      <Image
                        src="/details.svg"
                        alt="Details"
                        width={24}
                        height={24}
                        className="cursor-pointer"
                      />
                      <Image
                        src="/editIcon.svg"
                        alt="Edit"
                        width={24}
                        height={24}
                        className="cursor-pointer"
                      />
                      <Image
                        src="/deleteIcon.svg"
                        alt="Delete"
                        width={24}
                        height={24}
                        className="cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center space-x-2 mt-6">
            <Button
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0}
              className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
            >
              <DoubleArrowLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <span className="text-gray-700 text-sm">Page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage + 1}
              onChange={(e) => {
                let val = Number(e.target.value);
                if (isNaN(val)) val = 1;
                if (val < 1) val = 1;
                if (val > totalPages) val = totalPages;
                setCurrentPage(val - 1);
              }}
              className="w-16 px-2 py-1 border rounded text-center text-sm"
              aria-label="Page number"
            />
            <span className="text-gray-700 text-sm">of {totalPages}</span>
            <Button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
              }
              disabled={currentPage === totalPages - 1}
              className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setCurrentPage(totalPages - 1)}
              disabled={currentPage === totalPages - 1}
              className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
            >
              <DoubleArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
