import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import { X, Trash2, Edit3, Save, XCircle } from "lucide-react";
import type { User, ResourcePermissions } from "@/lib/types/administration";
import type { LocationSelectItem } from "@/lib/types/location";
import { fetchAllGamingLocations } from "@/lib/helpers/locations";
import { fetchCountries } from "@/lib/helpers/countries";
import type { Country } from "@/lib/helpers/countries";
import gsap from "gsap";
import defaultAvatar from "@/public/defaultAvatar.svg";
import cameraIcon from "@/public/cameraIcon.svg";
import CircleCropModal from "@/components/ui/image/CircleCropModal";
import { toast } from "sonner";
import {
  detectChanges,
  filterMeaningfulChanges,
  getChangesSummary,
} from "@/lib/utils/changeDetection";
import {
  validatePasswordStrength,
  getPasswordStrengthLabel,
} from "@/lib/utils/validation";

const ROLE_OPTIONS = [
  { label: "Evolution Admin", value: "evolution admin" },
  { label: "Administrator", value: "admin" },
  { label: "Manager", value: "manager" },
  { label: "Location Admin", value: "location admin" },
  { label: "Technician", value: "technician" },
  { label: "Collector", value: "collector" },
  { label: "Collector Meters", value: "collector meters" },
];

export type UserModalProps = {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (
    user: Partial<User> & {
      password?: string;
      resourcePermissions: ResourcePermissions;
    }
  ) => void;
};

export default function UserModal({
  open,
  onClose,
  user,
  onSave,
}: UserModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal state
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  // Form state for profile details
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    otherName: "",
    gender: "",
    street: "",
    town: "",
    region: "",
    country: "",
    postalCode: "",
    dateOfBirth: "",
    idType: "",
    idNumber: "",
    notes: "",
    profilePicture: "",
  });

  // Form state for roles and permissions
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "Very Weak",
    feedback: [] as string[],
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    },
  });
  const [roles, setRoles] = useState<string[]>([]);
  const [locations, setLocations] = useState<LocationSelectItem[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [allLocationsSelected, setAllLocationsSelected] = useState(false);

  // Countries state
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setIsLoading(false);
      setFormData({
        firstName: user.profile?.firstName || "",
        lastName: user.profile?.lastName || "",
        middleName: user.profile?.middleName || "",
        otherName: user.profile?.otherName || "",
        gender: user.profile?.gender || "",
        street: user.profile?.address?.street || "",
        town: user.profile?.address?.town || "",
        region: user.profile?.address?.region || "",
        country: user.profile?.address?.country || "",
        postalCode: user.profile?.address?.postalCode || "",
        dateOfBirth: user.profile?.identification?.dateOfBirth || "",
        idType: user.profile?.identification?.idType || "",
        idNumber: user.profile?.identification?.idNumber || "",
        notes: user.profile?.identification?.notes || "",
        profilePicture: user.profilePicture || "",
      });
      setRoles(user.roles || []);
      setSelectedLocationIds(
        user.resourcePermissions?.["gaming-locations"]?.resources || []
      );
    } else if (open) {
      setIsLoading(true);
    }
  }, [user, open]);

  // Load locations
  useEffect(() => {
    fetchAllGamingLocations().then((locs) => {
      const formattedLocs = locs.map((loc) => {
        let _id = "";
        if ("id" in loc && typeof loc.id === "string") _id = loc.id;
        else if ("_id" in loc && typeof loc._id === "string") _id = loc._id;
        return { _id, name: loc.name };
      });
      setLocations(formattedLocs);

      // Check if all locations are selected
      const userLocationIds =
        user?.resourcePermissions?.["gaming-locations"]?.resources || [];
      if (userLocationIds.length > 0 && formattedLocs.length > 0) {
        setAllLocationsSelected(
          userLocationIds.length === formattedLocs.length
        );
      }
    });
  }, [user]);

  // Load countries
  useEffect(() => {
    const loadCountries = async () => {
      setCountriesLoading(true);
      try {
        const countriesData = await fetchCountries();

        // Remove duplicates based on country name using Map for better performance
        const uniqueCountriesMap = new Map();
        countriesData.forEach((country) => {
          if (!uniqueCountriesMap.has(country.name)) {
            uniqueCountriesMap.set(country.name, country);
          }
        });
        const uniqueCountries = Array.from(uniqueCountriesMap.values());

        setCountries(uniqueCountries as unknown as Country[]);
      } catch (error) {
        console.error("Failed to fetch countries:", error);
        toast.error("Failed to load countries");
      } finally {
        setCountriesLoading(false);
      }
    };

    if (open) {
      loadCountries();
    }
  }, [open]);

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

  // Reset edit mode when modal closes
  useEffect(() => {
    if (!open) {
      setIsEditMode(false);
      setPassword("");
      setConfirmPassword("");
      setPasswordStrength({
        score: 0,
        label: "Very Weak",
        feedback: [],
        requirements: {
          length: false,
          uppercase: false,
          lowercase: false,
          number: false,
          special: false,
        },
      });
    }
  }, [open]);

  // Update password strength when password changes
  useEffect(() => {
    if (password) {
      const validation = validatePasswordStrength(password);
      setPasswordStrength({
        score: validation.score,
        label: getPasswordStrengthLabel(validation.score),
        feedback: validation.feedback,
        requirements: validation.requirements,
      });
    } else {
      setPasswordStrength({
        score: 0,
        label: "Very Weak",
        feedback: [],
        requirements: {
          length: false,
          uppercase: false,
          lowercase: false,
          number: false,
          special: false,
        },
      });
    }
  }, [password]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setRawImageSrc(e.target?.result as string);
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePicture = () => {
    setFormData((prev) => ({ ...prev, profilePicture: "" }));
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setFormData((prev) => ({ ...prev, profilePicture: croppedImageUrl }));
    setIsCropOpen(false);
    setRawImageSrc(null);
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    setRoles((prev) =>
      checked ? [...prev, role] : prev.filter((r) => r !== role)
    );
  };

  const handleLocationSelect = (id: string) => {
    if (!selectedLocationIds.includes(id)) {
      const newSelectedIds = [...selectedLocationIds, id];
      setSelectedLocationIds(newSelectedIds);

      // Check if all locations are now selected
      if (newSelectedIds.length === locations.length) {
        setAllLocationsSelected(true);
      }
    }
  };

  const handleLocationRemove = (id: string) => {
    const newSelectedIds = selectedLocationIds.filter((locId) => locId !== id);
    setSelectedLocationIds(newSelectedIds);
    setAllLocationsSelected(false);
  };

  const handleAllLocationsChange = (checked: boolean) => {
    setAllLocationsSelected(checked);
    if (checked) {
      setSelectedLocationIds(locations.map((loc) => loc._id));
    } else {
      setSelectedLocationIds([]);
    }
  };

  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const handleSave = () => {
    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Validate that we have a user to update
    if (!user) {
      toast.error("No user selected for update");
      return;
    }

    // Structure the data properly to match the User type
    const updatedUser = {
      ...user,
      profile: {
        ...user?.profile,
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        otherName: formData.otherName,
        gender: formData.gender,
        address: {
          ...user?.profile?.address,
          street: formData.street,
          town: formData.town,
          region: formData.region,
          country: formData.country,
          postalCode: formData.postalCode,
        },
        identification: {
          ...user?.profile?.identification,
          dateOfBirth: formData.dateOfBirth,
          idType: formData.idType,
          idNumber: formData.idNumber,
          notes: formData.notes,
        },
      },
      profilePicture: formData.profilePicture || null,
      roles,
      password: password || undefined,
      resourcePermissions: {
        ...(user?.resourcePermissions || {}),
        "gaming-locations": {
          entity: "gaming-locations" as const,
          resources: selectedLocationIds,
        },
      },
    };

    // Validate that the form data has been properly structured
    if (!updatedUser.profile) {
      toast.error("Failed to structure user data properly");
      return;
    }

    // Validate required fields
    if (!formData.firstName || formData.firstName.trim() === "") {
      toast.error("First name is required");
      return;
    }

    // Validate email if it exists in the user object
    if (user.email && !/\S+@\S+\.\S+/.test(user.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Validate password if provided
    if (password) {
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        toast.error(
          `Password requirements not met: ${passwordValidation.feedback.join(
            ", "
          )}`
        );
        return;
      }
    }

    // Detect actual changes between old and new user data
    const changes = detectChanges(user, updatedUser);
    const meaningfulChanges = filterMeaningfulChanges(changes);

    // Only proceed if there are actual changes
    if (meaningfulChanges.length === 0) {
      toast.info("No changes detected");
      return;
    }

    // Log the changes for debugging
    if (process.env.NODE_ENV === "development") {
      console.warn("Detected changes:", meaningfulChanges);
      console.warn("Changes summary:", getChangesSummary(meaningfulChanges));
    }

    onSave(updatedUser);

    setIsEditMode(false);
    setPassword("");
    setConfirmPassword("");
  };

  const handleCancelEdit = () => {
    // Reset form data to original user data
    if (user) {
      setFormData({
        firstName: user.profile?.firstName || "",
        lastName: user.profile?.lastName || "",
        middleName: user.profile?.middleName || "",
        otherName: user.profile?.otherName || "",
        gender: user.profile?.gender || "",
        street: user.profile?.address?.street || "",
        town: user.profile?.address?.town || "",
        region: user.profile?.address?.region || "",
        country: user.profile?.address?.country || "",
        postalCode: user.profile?.address?.postalCode || "",
        dateOfBirth: user.profile?.identification?.dateOfBirth || "",
        idType: user.profile?.identification?.idType || "",
        idNumber: user.profile?.identification?.idNumber || "",
        notes: user.profile?.identification?.notes || "",
        profilePicture: user.profilePicture || "",
      });
      setRoles(user.roles || []);
      setSelectedLocationIds(
        user.resourcePermissions?.["gaming-locations"]?.resources || []
      );
    }
    setIsEditMode(false);
    setPassword("");
    setConfirmPassword("");
  };

  if (!open || !user) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
        <div
          ref={backdropRef}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <div
          ref={modalRef}
          className="relative w-full h-full lg:max-w-4xl lg:max-h-[95vh] lg:rounded-2xl bg-white flex flex-col overflow-y-auto animate-in p-4 lg:p-10 border border-border"
          style={{ opacity: 1 }}
        >
          {/* Header with close button and edit toggle */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditMode ? "Edit User Details" : "User Details"}
            </h2>
            <div className="flex items-center gap-2">
              {!isEditMode && (
                <Button
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </Button>
              )}
              <button
                className="bg-white rounded-full p-2 shadow hover:bg-gray-100"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </div>

          <div className="w-full flex flex-col gap-8">
            {/* Top section: Profile pic + username/email (left), user info fields (right) */}
            <div className="w-full flex flex-col lg:flex-row lg:gap-12 items-start lg:items-center">
              {/* Left: Profile pic, username, and email */}
              <div className="w-full lg:w-1/3 flex flex-col items-center lg:items-start justify-center">
                <div className="relative mb-4 flex justify-center">
                  <Image
                    src={
                      formData.profilePicture ||
                      user.profilePicture ||
                      defaultAvatar
                    }
                    alt="Avatar"
                    width={160}
                    height={160}
                    className="rounded-full bg-gray-200 border-4 border-container"
                  />
                  {isEditMode && (
                    <>
                      <button
                        type="button"
                        className="absolute bottom-4 right-4 rounded-full border-2 border-border shadow flex items-center justify-center bg-transparent hover:bg-gray-100 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Image
                          src={cameraIcon}
                          alt="Edit Avatar"
                          width={32}
                          height={32}
                          className="m-0 p-0"
                        />
                      </button>
                      {(formData.profilePicture || user.profilePicture) && (
                        <button
                          type="button"
                          className="absolute top-2 right-2 rounded-full bg-red-500 text-white p-1 hover:bg-red-600 transition-colors"
                          onClick={handleRemoveProfilePicture}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="w-full flex flex-col items-center lg:items-start space-y-4">
                  <div className="w-full">
                    <label className="block text-sm font-semibold mb-1 text-gray-900">
                      Username:
                    </label>
                    {isLoading ? (
                      <Skeleton className="h-12 w-full" />
                    ) : (
                      <div className="w-full text-gray-700 text-center lg:text-left">
                        {user?.username || "Not specified"}
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <label className="block text-sm font-semibold mb-1 text-gray-900">
                      Email Address:
                    </label>
                    {isLoading ? (
                      <Skeleton className="h-12 w-full" />
                    ) : (
                      <div className="w-full text-gray-700 text-center lg:text-left">
                        {user?.email || "Not specified"}
                      </div>
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Right: User info fields */}
              <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 lg:mt-0">
                {isLoading ? (
                  <>
                    {Array.from({ length: 12 }).map((_, index) => (
                      <div key={index}>
                        <Skeleton className="h-4 w-20 mb-1" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-gray-900">
                        First Name:
                      </label>
                      {isEditMode ? (
                        <input
                          className="w-full rounded-md p-3 bg-white border border-border"
                          value={formData.firstName}
                          onChange={(e) =>
                            handleInputChange("firstName", e.target.value)
                          }
                          placeholder="Enter First Name"
                          required
                        />
                      ) : (
                        <div className="w-full text-gray-700">
                          {formData.firstName || "Not specified"}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-gray-900">
                        Last Name:
                      </label>
                      {isEditMode ? (
                        <input
                          className="w-full rounded-md p-3 bg-white border border-border"
                          value={formData.lastName}
                          onChange={(e) =>
                            handleInputChange("lastName", e.target.value)
                          }
                          placeholder="Enter Last Name"
                          required
                        />
                      ) : (
                        <div className="w-full text-gray-700">
                          {formData.lastName || "Not specified"}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-gray-900">
                        Middle Name:
                      </label>
                      {isEditMode ? (
                        <input
                          className="w-full rounded-md p-3 bg-white border border-border"
                          value={formData.middleName}
                          onChange={(e) =>
                            handleInputChange("middleName", e.target.value)
                          }
                          placeholder="Enter Middle Name"
                        />
                      ) : (
                        <div className="w-full text-gray-700">
                          {formData.middleName || "Not specified"}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-gray-900">
                        Other Name:
                      </label>
                      {isEditMode ? (
                        <input
                          className="w-full rounded-md p-3 bg-white border border-border"
                          value={formData.otherName}
                          onChange={(e) =>
                            handleInputChange("otherName", e.target.value)
                          }
                          placeholder="Enter Other Name"
                        />
                      ) : (
                        <div className="w-full text-gray-700">
                          {formData.otherName || "Not specified"}
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold mb-1 text-gray-900">
                        Gender:
                      </label>
                      {isEditMode ? (
                        <select
                          className="w-full rounded-md p-3 bg-white border border-border"
                          value={formData.gender}
                          onChange={(e) =>
                            handleInputChange("gender", e.target.value)
                          }
                          required
                        >
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      ) : (
                        <div className="w-full text-gray-700">
                          {formData.gender
                            ? formData.gender.charAt(0).toUpperCase() +
                              formData.gender.slice(1)
                            : "Not specified"}
                        </div>
                      )}
                    </div>
                  </>
                )}
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
                  {isEditMode ? (
                    <input
                      className="w-full rounded-md p-3 bg-white border border-border"
                      value={formData.street}
                      onChange={(e) =>
                        handleInputChange("street", e.target.value)
                      }
                      placeholder="Enter Street"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.street || "Not specified"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    Town:
                  </label>
                  {isEditMode ? (
                    <input
                      className="w-full rounded-md p-3 bg-white border border-border"
                      value={formData.town}
                      onChange={(e) =>
                        handleInputChange("town", e.target.value)
                      }
                      placeholder="Enter Town"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.town || "Not specified"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    Region:
                  </label>
                  {isEditMode ? (
                    <input
                      className="w-full rounded-md p-3 bg-white border border-border"
                      value={formData.region}
                      onChange={(e) =>
                        handleInputChange("region", e.target.value)
                      }
                      placeholder="Enter Region"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.region || "Not specified"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    Country:
                  </label>
                  {isEditMode ? (
                    <select
                      className="w-full rounded-md p-3 bg-white border border-border"
                      value={formData.country}
                      onChange={(e) =>
                        handleInputChange("country", e.target.value)
                      }
                    >
                      <option value="">Select Country</option>
                      {countriesLoading ? (
                        <option value="" disabled>
                          Loading countries...
                        </option>
                      ) : (
                        countries.map((country) => (
                          <option key={country._id} value={country._id}>
                            {country.name}
                          </option>
                        ))
                      )}
                    </select>
                  ) : (
                    <div className="w-full text-gray-700">
                      {countries.find((c) => c._id === formData.country)
                        ?.name ||
                        formData.country ||
                        "Not specified"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    Postal Code:
                  </label>
                  {isEditMode ? (
                    <input
                      className="w-full rounded-md p-3 bg-white border border-border"
                      value={formData.postalCode}
                      onChange={(e) =>
                        handleInputChange("postalCode", e.target.value)
                      }
                      placeholder="Enter Postal Code"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.postalCode || "Not specified"}
                    </div>
                  )}
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
                  {isEditMode ? (
                    <input
                      className="w-full rounded-md p-3 bg-white border border-border"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        handleInputChange("dateOfBirth", e.target.value)
                      }
                      placeholder="YYYY-MM-DD"
                      type="date"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.dateOfBirth || "Not specified"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    ID Type:
                  </label>
                  {isEditMode ? (
                    <input
                      className="w-full rounded-md p-3 bg-white border border-border"
                      value={formData.idType}
                      onChange={(e) =>
                        handleInputChange("idType", e.target.value)
                      }
                      placeholder="Enter ID Type"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.idType || "Not specified"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    ID Number:
                  </label>
                  {isEditMode ? (
                    <input
                      className="w-full rounded-md p-3 bg-white border border-border"
                      value={formData.idNumber}
                      onChange={(e) =>
                        handleInputChange("idNumber", e.target.value)
                      }
                      placeholder="Enter ID Number"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.idNumber || "Not specified"}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1 text-gray-900">
                    Notes:
                  </label>
                  {isEditMode ? (
                    <textarea
                      className="w-full rounded-md p-3 min-h-[56px] bg-white border border-border"
                      value={formData.notes}
                      onChange={(e) =>
                        handleInputChange("notes", e.target.value)
                      }
                      placeholder="Enter Notes"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.notes || "No notes"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Roles & Permissions Section */}
            {
              <>
                <hr className="my-6 border-gray-400 w-full" />
                <div className="w-full flex flex-col items-center">
                  <h3 className="text-2xl font-bold text-center mb-4 text-gray-900">
                    Roles & Permissions
                  </h3>
                  <div className="w-full max-w-3xl space-y-6">
                    {/* Password Section - Only show in edit mode */}
                    {isEditMode && (
                      <div className="space-y-4">
                        <div>
                          <label className="text-base font-medium">
                            Password
                          </label>
                          <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Leave blank to keep current password"
                            className="rounded-md mt-1"
                          />
                          {password && (
                            <div className="mt-2 space-y-2">
                              {/* Password Strength Indicator */}
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  Strength:
                                </span>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((level) => (
                                    <div
                                      key={level}
                                      className={`h-2 w-8 rounded ${
                                        level <= passwordStrength.score
                                          ? passwordStrength.score <= 2
                                            ? "bg-red-500"
                                            : passwordStrength.score === 3
                                            ? "bg-yellow-500"
                                            : "bg-green-500"
                                          : "bg-gray-200"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span
                                  className={`text-sm font-medium ${
                                    passwordStrength.score <= 2
                                      ? "text-red-600"
                                      : passwordStrength.score === 3
                                      ? "text-yellow-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {passwordStrength.label}
                                </span>
                              </div>

                              {/* Password Requirements */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                                <div
                                  className={`flex items-center gap-2 ${
                                    passwordStrength.requirements.length
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  <span>
                                    {passwordStrength.requirements.length
                                      ? "✓"
                                      : "✗"}
                                  </span>
                                  <span>At least 8 characters</span>
                                </div>
                                <div
                                  className={`flex items-center gap-2 ${
                                    passwordStrength.requirements.uppercase
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  <span>
                                    {passwordStrength.requirements.uppercase
                                      ? "✓"
                                      : "✗"}
                                  </span>
                                  <span>Uppercase letter</span>
                                </div>
                                <div
                                  className={`flex items-center gap-2 ${
                                    passwordStrength.requirements.lowercase
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  <span>
                                    {passwordStrength.requirements.lowercase
                                      ? "✓"
                                      : "✗"}
                                  </span>
                                  <span>Lowercase letter</span>
                                </div>
                                <div
                                  className={`flex items-center gap-2 ${
                                    passwordStrength.requirements.number
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  <span>
                                    {passwordStrength.requirements.number
                                      ? "✓"
                                      : "✗"}
                                  </span>
                                  <span>Number</span>
                                </div>
                                <div
                                  className={`flex items-center gap-2 ${
                                    passwordStrength.requirements.special
                                      ? "text-green-600"
                                      : "text-orange-600"
                                  }`}
                                >
                                  <span>
                                    {passwordStrength.requirements.special
                                      ? "✓"
                                      : "!"}
                                  </span>
                                  <span>Special character</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-base font-medium">
                            Confirm Password
                          </label>
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className={`rounded-md mt-1 ${
                              confirmPassword &&
                              password &&
                              password !== confirmPassword
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : confirmPassword &&
                                  password &&
                                  password === confirmPassword
                                ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                                : ""
                            }`}
                          />
                          {confirmPassword &&
                            password &&
                            password !== confirmPassword && (
                              <p className="text-red-600 text-sm mt-1">
                                Passwords do not match
                              </p>
                            )}
                          {confirmPassword &&
                            password &&
                            password === confirmPassword && (
                              <p className="text-green-600 text-sm mt-1">
                                Passwords match
                              </p>
                            )}
                        </div>
                      </div>
                    )}

                    {/* Roles Section */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 text-center mb-4">
                        Roles
                      </h4>
                      {isEditMode ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 justify-items-center">
                          {ROLE_OPTIONS.map((role) => (
                            <label
                              key={role.value}
                              className="flex items-center gap-2 cursor-pointer text-gray-900 text-base font-medium"
                            >
                              <Checkbox
                                id={role.value}
                                checked={roles.includes(role.value)}
                                onCheckedChange={(checked) =>
                                  handleRoleChange(role.value, checked === true)
                                }
                                className="border-2 border-gray-400 text-blue-600 focus:ring-blue-600"
                              />
                              {role.label}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-gray-700">
                            {roles && roles.length > 0
                              ? roles
                                  .map(
                                    (role) =>
                                      ROLE_OPTIONS.find((r) => r.value === role)
                                        ?.label
                                  )
                                  .join(", ")
                              : "No roles assigned"}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Locations Section */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 text-center mb-4">
                        Allowed Locations
                      </h4>

                      {isEditMode ? (
                        <>
                          {/* All Locations Checkbox */}
                          <div className="mb-3">
                            <label className="flex items-center gap-2 cursor-pointer text-gray-900 text-base font-medium">
                              <Checkbox
                                checked={allLocationsSelected}
                                onCheckedChange={(checked) =>
                                  handleAllLocationsChange(checked === true)
                                }
                                className="border-2 border-gray-400 text-blue-600 focus:ring-blue-600"
                              />
                              All Locations
                            </label>
                          </div>

                          <div className="relative mb-2">
                            <Input
                              value={locationSearch}
                              onChange={(e) => {
                                setLocationSearch(e.target.value);
                                setLocationDropdownOpen(true);
                              }}
                              onFocus={() => setLocationDropdownOpen(true)}
                              onBlur={() =>
                                setTimeout(
                                  () => setLocationDropdownOpen(false),
                                  150
                                )
                              }
                              placeholder={
                                allLocationsSelected
                                  ? "All locations are selected"
                                  : "Select Location.."
                              }
                              className="w-full rounded-md pr-10"
                              autoComplete="off"
                              disabled={allLocationsSelected}
                            />
                            {/* Dropdown of filtered locations, or all if no search */}
                            {!allLocationsSelected &&
                              locationDropdownOpen &&
                              (filteredLocations.length > 0 ||
                                locationSearch === "") && (
                                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                                  {(locationSearch
                                    ? filteredLocations
                                    : locations
                                  ).map((loc) => (
                                    <button
                                      key={loc._id}
                                      type="button"
                                      className="w-full text-left px-4 py-2 hover:bg-blue-100 text-gray-900"
                                      onClick={() => {
                                        handleLocationSelect(loc._id);
                                        setLocationSearch("");
                                        setLocationDropdownOpen(false);
                                      }}
                                    >
                                      {loc.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {allLocationsSelected ? (
                              <span className="bg-green-500 text-white rounded-full px-4 py-2 flex items-center text-sm font-medium">
                                All Locations Selected ({locations.length}{" "}
                                locations)
                                <button
                                  className="ml-2 text-white hover:text-gray-200 flex items-center justify-center"
                                  onClick={() =>
                                    handleAllLocationsChange(false)
                                  }
                                  type="button"
                                  title="Remove all locations"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </span>
                            ) : (
                              selectedLocationIds.map((id) => {
                                const loc = locations.find((l) => l._id === id);
                                return loc ? (
                                  <span
                                    key={id}
                                    className="bg-blue-400 text-white rounded-full px-3 py-1 flex items-center text-sm"
                                  >
                                    {loc.name}
                                    <button
                                      className="ml-2 text-white hover:text-gray-200 flex items-center justify-center"
                                      onClick={() => handleLocationRemove(id)}
                                      type="button"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </span>
                                ) : null;
                              })
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-center">
                          <div className="text-gray-700">
                            {allLocationsSelected
                              ? `All Locations (${locations.length} locations)`
                              : selectedLocationIds.length > 0
                              ? selectedLocationIds
                                  .map(
                                    (id) =>
                                      locations.find((l) => l._id === id)?.name
                                  )
                                  .filter(Boolean)
                                  .join(", ")
                              : "No locations assigned"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            }
          </div>

          {/* Action buttons */}
          <div className="flex justify-center lg:justify-end mt-8 gap-4">
            {isEditMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2 px-8 py-3 rounded-md text-lg font-semibold"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-button text-white px-8 py-3 rounded-md text-lg font-semibold hover:bg-buttonActive"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="px-8 py-3 rounded-md text-lg font-semibold"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Picture Cropping Modal */}
      {isCropOpen && rawImageSrc && (
        <CircleCropModal
          open={isCropOpen}
          onClose={() => {
            setIsCropOpen(false);
            setRawImageSrc(null);
          }}
          imageSrc={rawImageSrc}
          onCropped={handleCropComplete}
        />
      )}
    </>
  );
}
