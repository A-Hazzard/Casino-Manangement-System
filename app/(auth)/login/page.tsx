"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loginUser } from "@/lib/helpers/clientAuth";
import { validatePassword } from "@/lib/utils/validation";
import { useUserStore } from "@/lib/store/userStore";
import LiquidGradient from "@/components/ui/LiquidGradient";
import LoginForm from "@/components/auth/LoginForm";
import { LoginPageSkeleton } from "@/components/ui/skeletons/LoginSkeletons";
import PasswordUpdateModal from "@/components/ui/PasswordUpdateModal";
import ProfileValidationModal from "@/components/ui/ProfileValidationModal";

// Import images as variables for better performance
import EOSLogo from "/public/EOS_Logo.png";
import SlotMachineImage from "/public/slotMachine.png";

export default function LoginPage() {
  const { user, setUser } = useUserStore();
  const [isMounted, setIsMounted] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    identifier?: string;
    password?: string;
  }>({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "error" | "success" | "info" | undefined
  >(undefined);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [showPasswordUpdateModal, setShowPasswordUpdateModal] = useState(false);
  const [showProfileValidationModal, setShowProfileValidationModal] =
    useState(false);
  const [invalidProfileFields, setInvalidProfileFields] = useState<{
    username?: boolean;
    firstName?: boolean;
    lastName?: boolean;
  }>({});
  const [currentUserData, setCurrentUserData] = useState<{
    username: string;
    firstName: string;
    lastName: string;
  }>({
    username: "",
    firstName: "",
    lastName: "",
  });
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);

    // Handle database mismatch error from URL
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");

    if (error === "database_mismatch") {
      setMessage(
        "Database environment has changed. Please login again to continue."
      );
      setMessageType("info");
    }
  }, []);

  // Redirect if user is already logged in
  // Remove duplicate redirect - handled in handleLogin
  // This was causing the redirecting state to stay stuck
  useEffect(() => {
    // Only redirect if user is already logged in when page loads
    if (user && !loading && !redirecting) {
      router.push("/");
    }
  }, [user, router, loading, redirecting]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent form submission and page refresh
    setErrors({});
    setMessage("");
    setMessageType(undefined);

    let valid = true;
    if (!identifier) {
      setErrors((prev) => ({
        ...prev,
        identifier: "Enter email or username.",
      }));
      valid = false;
    }
    if (!validatePassword(password)) {
      setErrors((prev) => ({
        ...prev,
        password: "Password must be at least 6 characters.",
      }));
      valid = false;
    }
    if (!valid) return;

    setLoading(true);
    try {
      const response = await loginUser({ identifier, password });
      if (response.success) {
        // Check if password update is required
        if (response.requiresPasswordUpdate) {
          setShowPasswordUpdateModal(true);
          setLoading(false);
          return;
        }

        // Check if profile update is required
        if (response.requiresProfileUpdate && response.invalidProfileFields) {
          setInvalidProfileFields(response.invalidProfileFields);
          setCurrentUserData({
            username: response.user?.username || "",
            firstName: response.user?.profile?.firstName || "",
            lastName: response.user?.profile?.lastName || "",
          });
          setShowProfileValidationModal(true);
          setLoading(false);
          return;
        }

        // Store user data in the Zustand store
        if (response.user) {
          setUser(response.user);
          setMessage("Login successful. Redirecting...");
          setMessageType("success");
          setRedirecting(true);

          // Add a small delay to ensure user store is updated before redirect
          setTimeout(() => {
            router.push("/");
          }, 100);
        } else {
          setMessage("Login failed - no user data received");
          setMessageType("error");
        }
      } else {
        const backendMsg =
          response.message || "Invalid email or password. Please try again.";
        setMessage(backendMsg);
        setMessageType("error");
      }
    } catch {
      const fallbackMsg = "An unexpected error occurred. Please try again.";
      setMessage(fallbackMsg);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (newPassword: string) => {
    // TODO: Implement password update API call
    if (process.env.NODE_ENV === "development") {
      console.warn("Password update requested:", newPassword);
    }
    setShowPasswordUpdateModal(false);
    setMessage("Password updated successfully. Redirecting...");
    setMessageType("success");
    setRedirecting(true);
    router.push("/");
  };

  const handleProfileUpdate = async (data: {
    username: string;
    firstName: string;
    lastName: string;
  }) => {
    // TODO: Implement profile update API call
    if (process.env.NODE_ENV === "development") {
      console.warn("Profile update requested:", data);
    }
    setShowProfileValidationModal(false);
    setMessage("Profile updated successfully. Redirecting...");
    setMessageType("success");
    setRedirecting(true);
    router.push("/");
  };

  if (!isMounted) {
    return <LoginPageSkeleton />;
  }

  return (
    <>
      <LiquidGradient />
      <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl bg-white">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/2 p-12">
              <div className="mx-auto w-full max-w-sm">
                <div className="text-center">
                  <Image
                    src={EOSLogo}
                    alt="Evolution One Solutions Logo"
                    width={150}
                    height={75}
                    className="mb-6 inline-block"
                    priority
                  />
                </div>
                <LoginForm
                  identifier={identifier}
                  setIdentifier={setIdentifier}
                  password={password}
                  setPassword={setPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  errors={errors}
                  message={message}
                  messageType={messageType}
                  loading={loading}
                  redirecting={redirecting}
                  handleLogin={handleLogin}
                />
              </div>
            </div>
            <div className="relative w-full md:w-1/2 min-h-[250px] md:min-h-0">
              <Image
                src={SlotMachineImage}
                alt="Casino Slot Machine"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{
                  objectFit: "cover",
                }}
              />
              <div className="absolute inset-0" />
              <div className="absolute bottom-10 left-10 pr-4">
                <h2 className="text-2xl font-bold text-white whitespace-nowrap">
                  Casino Management System
                </h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Update Modal */}
      <PasswordUpdateModal
        open={showPasswordUpdateModal}
        onClose={() => setShowPasswordUpdateModal(false)}
        onUpdate={handlePasswordUpdate}
        loading={loading}
      />

      {/* Profile Validation Modal */}
      <ProfileValidationModal
        open={showProfileValidationModal}
        onClose={() => setShowProfileValidationModal(false)}
        onUpdate={handleProfileUpdate}
        loading={loading}
        invalidFields={invalidProfileFields}
        currentData={currentUserData}
      />
    </>
  );
}
