"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loginUser, sendForgotPasswordEmail } from "@/lib/helpers/auth";
import { validateEmail, validatePassword } from "@/lib/utils/validation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Loading login...</p>
      </div>
    );
  }
  return <LoginForm />;
}

function LoginForm() {
  const [isForgot, setIsForgot] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    emailAddress?: string;
    password?: string;
  }>({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success" | "">("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage("");
    setMessageType("");
    let valid = true;
    if (!validateEmail(emailAddress)) {
      setErrors((prev) => ({
        ...prev,
        emailAddress: "Invalid email address.",
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
      const response = await loginUser({ emailAddress, password });
      if (response.success) {
        setMessageType("success");
        setMessage("Login successful. Redirecting...");
        router.push("/");
      } else {
        setMessageType("error");
        setMessage(response.message || "Invalid Credentials.");
      }
    } catch (error) {
      setMessageType("error");
      setMessage("An unexpected error occurred.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage("");
    setMessageType("");
    if (!validateEmail(emailAddress)) {
      setErrors((prev) => ({
        ...prev,
        emailAddress: "Invalid email address.",
      }));
      return;
    }
    setLoading(true);
    try {
      const response = await sendForgotPasswordEmail({ emailAddress });
      if (response.success) {
        setMessageType("success");
        setMessage("Password reset instructions have been sent to your email.");
      } else {
        setMessageType("error");
        setMessage(response.message || "Request failed.");
      }
    } catch (error) {
      setMessageType("error");
      setMessage("An unexpected error occurred.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-2xl border border-gray-200">
        <CardHeader className="flex flex-col items-center gap-2 pb-2">
          <Image
            src="/Evolution_one_Solutions_logo.png"
            alt="Evolution One Solutions Logo"
            width={120}
            height={60}
            className="mb-2"
            priority
          />
          <CardTitle className="text-center text-2xl font-bold text-buttonActive">
            {isForgot ? "Forgot Password" : "Casino Management Login"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {message && (
            <div
              className={`mb-4 text-center text-sm font-medium ${
                messageType === "error"
                  ? "text-destructive"
                  : "text-greenHighlight"
              }`}
              role="alert"
              aria-live="polite"
            >
              {message}
            </div>
          )}
          <form
            onSubmit={isForgot ? handleForgotPassword : handleLogin}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="email" className="text-grayHighlight">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                disabled={loading}
                aria-invalid={!!errors.emailAddress}
                aria-describedby={
                  errors.emailAddress ? "email-error" : undefined
                }
                className="mt-1"
              />
              {errors.emailAddress && (
                <p className="text-destructive text-xs mt-1" id="email-error">
                  {errors.emailAddress}
                </p>
              )}
            </div>
            {!isForgot && (
              <div>
                <Label htmlFor="password" className="text-grayHighlight">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  className="mt-1"
                />
                {errors.password && (
                  <p
                    className="text-destructive text-xs mt-1"
                    id="password-error"
                  >
                    {errors.password}
                  </p>
                )}
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-buttonActive text-white hover:bg-button transition-colors mt-2"
              aria-busy={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  {isForgot ? "Sending..." : "Logging in..."}
                </span>
              ) : isForgot ? (
                "Reset Password"
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 items-center">
          <Button
            type="button"
            variant="link"
            className="text-blueHighlight text-sm p-0 h-auto"
            onClick={() => {
              setIsForgot(!isForgot);
              setMessage("");
              setMessageType("");
              setErrors({});
              setPassword("");
            }}
            tabIndex={0}
          >
            {isForgot ? "Back to Login" : "Forgot Password?"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
