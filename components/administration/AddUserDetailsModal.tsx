import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { X } from "lucide-react";
import type { User } from "@/lib/types/administration";
import gsap from "gsap";

type AddUserDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  onNext: () => void;
  formState: Partial<User> & {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    otherName?: string;
    gender?: string;
    street?: string;
    town?: string;
    region?: string;
    country?: string;
    postalCode?: string;
    dateOfBirth?: string;
    idType?: string;
    idNumber?: string;
    notes?: string;
  };
  setFormState: (data: Partial<AddUserDetailsModalProps["formState"]>) => void;
};

export default function AddUserDetailsModal({
  open,
  onClose,
  onNext,
  formState,
  setFormState,
}: AddUserDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && modalRef.current && backdropRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
      );
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="relative w-full h-full lg:max-w-4xl lg:max-h-[95vh] lg:rounded-2xl bg-background flex flex-col overflow-y-auto animate-in p-4 lg:p-10 border border-border"
        style={{ opacity: 1 }}
      >
        {/* Close button */}
        <button
          className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow hover:bg-gray-100"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Create New User Details
          </h2>
        </div>
        <form
          className="w-full flex flex-col gap-8"
          onSubmit={(e) => {
            e.preventDefault();
            onNext();
          }}
        >
          {/* Top section: Profile pic + username (left), user info fields (right) */}
          <div className="w-full flex flex-col lg:flex-row lg:gap-12 items-start lg:items-center">
            {/* Left: Profile pic and username */}
            <div className="w-full lg:w-1/3 flex flex-col items-center lg:items-start justify-center">
              <div className="relative mb-4 flex justify-center">
                <Image
                  src={formState.profilePicture || "/defaultAvatar.svg"}
                  alt="Avatar"
                  width={160}
                  height={160}
                  className="rounded-full bg-gray-200 border-4 border-container"
                />
                <span className="absolute bottom-4 right-4 rounded-full border-2 border-border shadow flex items-center justify-center bg-transparent">
                  <Image
                    src="/cameraIcon.svg"
                    alt="Edit Avatar"
                    width={32}
                    height={32}
                    className="m-0 p-0"
                  />
                </span>
              </div>
              <div className="w-full flex flex-col items-center lg:items-start">
                <label className="block text-sm font-semibold mb-1 text-gray-900">
                  Username:
                </label>
                <input
                  className="w-full rounded-md p-3 bg-white border border-border text-center lg:text-left"
                  value={formState.username || ""}
                  onChange={(e) => setFormState({ username: e.target.value })}
                  placeholder="Enter Username"
                  required
                />
              </div>
            </div>
            {/* Right: User info fields */}
            <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 lg:mt-0">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900">
                  First Name:
                </label>
                <input
                  className="w-full rounded-md p-3 bg-white border border-border"
                  value={formState.firstName || ""}
                  onChange={(e) => setFormState({ firstName: e.target.value })}
                  placeholder="Enter First Name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900">
                  Last Name:
                </label>
                <input
                  className="w-full rounded-md p-3 bg-white border border-border"
                  value={formState.lastName || ""}
                  onChange={(e) => setFormState({ lastName: e.target.value })}
                  placeholder="Enter Last Name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900">
                  Middle Name:
                </label>
                <input
                  className="w-full rounded-md p-3 bg-white border border-border"
                  value={formState.middleName || ""}
                  onChange={(e) => setFormState({ middleName: e.target.value })}
                  placeholder="Enter Middle Name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900">
                  Other Name:
                </label>
                <input
                  className="w-full rounded-md p-3 bg-white border border-border"
                  value={formState.otherName || ""}
                  onChange={(e) => setFormState({ otherName: e.target.value })}
                  placeholder="Enter Other Name"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1 text-gray-900">
                  Gender:
                </label>
                <select
                  className="w-full rounded-md p-3 bg-white border border-border"
                  value={formState.gender || ""}
                  onChange={(e) => setFormState({ gender: e.target.value })}
                  required
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <hr className="my-6 border-gray-400 w-full" />
          <div className="w-full flex flex-col items-center">
            <h3 className="text-2xl font-bold text-center mb-4 text-gray-900">
              Address
            </h3>
            <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900">
                  Street:
                </label>
                <input
                  className="w-full rounded-md p-3 bg-white border border-border"
                  value={formState.street || ""}
                  onChange={(e) => setFormState({ street: e.target.value })}
                  placeholder="Enter Street"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900">
                  Town:
                </label>
                <input
                  className="w-full rounded-md p-3 bg-white border border-border"
                  value={formState.town || ""}
                  onChange={(e) => setFormState({ town: e.target.value })}
                  placeholder="Enter Town"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900">
                  Region:
                </label>
                <input
                  className="w-full rounded-md p-3 bg-white border border-border"
                  value={formState.region || ""}
                  onChange={(e) => setFormState({ region: e.target.value })}
                  placeholder="Enter Region"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900">
                  Country:
                </label>
                <input
                  className="w-full rounded-md p-3 bg-white border border-border"
                  value={formState.country || ""}
                  onChange={(e) => setFormState({ country: e.target.value })}
                  placeholder="Enter Country"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900">
                  Postal Code:
                </label>
                <input
                  className="w-full rounded-md p-3 bg-white border border-border"
                  value={formState.postalCode || ""}
                  onChange={(e) => setFormState({ postalCode: e.target.value })}
                  placeholder="Enter Postal Code"
                />
              </div>
            </div>
          </div>

          {/* Identification Section */}
          <hr className="my-6 border-gray-400 w-full" />
          <div className="w-full flex flex-col items-center">
            <h3 className="text-2xl font-bold text-center mb-4 text-gray-900">
              Identification
            </h3>
            <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900">
                  D.O.B:
                </label>
                <input
                  className="w-full rounded-md p-3 bg-white border border-border"
                  value={formState.dateOfBirth || ""}
                  onChange={(e) =>
                    setFormState({ dateOfBirth: e.target.value })
                  }
                  placeholder="YYYY-MM-DD"
                  type="date"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900">
                  ID Type:
                </label>
                <input
                  className="w-full rounded-md p-3 bg-white border border-border"
                  value={formState.idType || ""}
                  onChange={(e) => setFormState({ idType: e.target.value })}
                  placeholder="Enter ID Type"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900">
                  ID Number:
                </label>
                <input
                  className="w-full rounded-md p-3 bg-white border border-border"
                  value={formState.idNumber || ""}
                  onChange={(e) => setFormState({ idNumber: e.target.value })}
                  placeholder="Enter ID Number"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1 text-gray-900">
                  Notes:
                </label>
                <textarea
                  className="w-full rounded-md p-3 min-h-[56px] bg-white border border-border"
                  value={formState.notes || ""}
                  onChange={(e) => setFormState({ notes: e.target.value })}
                  placeholder="Enter Notes"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end mt-8">
            <Button
              type="submit"
              className="bg-button text-white px-12 py-3 rounded-md text-lg font-semibold hover:bg-buttonActive"
            >
              Next
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
