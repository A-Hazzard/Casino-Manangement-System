"use client";

import React, {useState} from "react";
import {useRouter} from "next/navigation";
import {motion} from "framer-motion";
import {loginUser, sendForgotPasswordEmail} from "@/lib/helpers/auth"; // Frontend helper functions
import {validateEmail, validatePassword} from "@/lib/utils/validation";

export default function LoginPage() {
    const [isForgot, setIsForgot] = useState(false);
    const [emailAddress, setEmailAddress] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<{ emailAddress?: string; password?: string }>({});
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setMessage("");

        let valid = true;
        if (!validateEmail(emailAddress)) {
            setErrors((prev) => ({...prev, emailAddress: "Invalid email address."}));
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
            const response = await loginUser({emailAddress, password});
            if (response.success) {
                router.push('/')
            } else {
                setMessage("Invalid Credentials.");
            }
        } catch (error) {
            setMessage("An unexpected error occurred.");
            console.error(`An unexpected error occurred ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setMessage("");

        if (!validateEmail(emailAddress)) {
            setErrors((prev) => ({...prev, emailAddress: "Invalid email address address."}));
            return;
        }

        setLoading(true);
        try {
            const response = await sendForgotPasswordEmail({emailAddress});
            if (response.success) {
                setMessage("Password reset instructions have been sent to your email.");
            } else {
                setMessage(response.message || "Request failed.");
            }
        } catch (error) {
            setMessage("An unexpected error occurred.");
            console.error(`An unexpected error occurred ${error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#F6B37F]/40 via-[#5A69E7]/40 to-[#96E3D4]/40">
            <motion.div
                initial={{opacity: 0, y: -20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.5}}
                className="bg-white/90 shadow-2xl rounded-lg p-8 w-full max-w-md"
            >
                <h2 className="text-3xl font-bold mb-6 text-center">
                    {isForgot ? "Forgot Password" : "Dynamic CMS Login"}
                </h2>
                {message && (
                    <div className="mb-4 text-center text-red-500">{message}</div>
                )}
                <form onSubmit={isForgot ? handleForgotPassword : handleLogin}>
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-gray-700">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            placeholder="you@example.com"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.emailAddress && (
                            <p className="text-red-500 text-sm mt-1">{errors.emailAddress}</p>
                        )}
                    </div>
                    {!isForgot && (
                        <div className="mb-4">
                            <label htmlFor="password" className="block text-gray-700">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {errors.password && (
                                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                            )}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-buttonActive text-white py-2 rounded hover:bg-button transition-colors"
                    >
                        {loading
                            ? "Please wait..."
                            : isForgot
                                ? "Reset Password"
                                : "Login"}
                    </button>
                </form>
                <div className="mt-4 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setIsForgot(!isForgot);
                            setMessage("");
                        }}
                        className="text-blue-500 hover:underline"
                    >
                        {isForgot ? "Back to Login" : "Forgot Password?"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
