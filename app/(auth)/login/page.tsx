"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loginUser } from "@/lib/helpers/auth";
import { validatePassword } from "@/lib/utils/validation";
import { toast } from "sonner";
import LiquidGradient from "@/components/ui/LiquidGradient";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>(
    {}
  );
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success" | "">("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    let valid = true;
    if (!identifier) {
      setErrors((prev) => ({ ...prev, identifier: "Enter email or username." }));
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
        toast.success("Login successful. Redirecting...");
        setRedirecting(true);
        router.push("/");
      } else {
        const backendMsg =
          response.message || "Invalid email or password. Please try again.";
        setMessage(backendMsg);
        setMessageType("error");
        toast.error(backendMsg);
      }
    } catch {
      const fallbackMsg = "An unexpected error occurred. Please try again.";
      setMessage(fallbackMsg);
      setMessageType("error");
      toast.error(fallbackMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Loading login...</p>
      </div>
    );
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
                    src="/EOS_Logo.png"
                    alt="Evolution One Solutions Logo"
                    width={150}
                    height={75}
                    className="mb-6 inline-block"
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
                  setErrors={setErrors}
                  setMessage={setMessage}
                  setMessageType={setMessageType}
                />
              </div>
            </div>
            <div className="relative w-full md:w-1/2 min-h-[250px] md:min-h-0">
              <Image
                src="/slotMachine.png"
                alt="Casino Slot Machine"
                layout="fill"
                objectFit="cover"
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
    </>
  );
}
