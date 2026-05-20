'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Settings,
  ShieldCheck,
  Database,
  Globe,
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

/**
 * Installation Page
 *
 * Provides a UI for the first-time system setup and database seeding.
 * Calls the /api/install endpoint to initialize mandatory data.
 *
 * On mount, checks if the system is already initialized via /api/install/status.
 * If it is, redirects to /login to prevent accidental re-initialization.
 */
export default function InstallPage() {
  const [status, setStatus] = useState<
    'idle' | 'installing' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // Check if system is already initialized — redirect to /login if so
  useEffect(() => {
    let cancelled = false;
    async function checkInitialization() {
      try {
        const res = await fetch('/api/install/status');
        const data = await res.json();
        if (!cancelled && data.initialized) {
          router.replace('/login');
          return;
        }
      } catch {
        // Silently fail — allow user to attempt installation
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    checkInitialization();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Show minimal loading state while checking initialization status
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const handleInstall = async () => {
    setStatus('installing');
    setMessage('Initializing system components...');
    setErrorDetails('');

    try {
      const response = await axios.get('/api/install');
      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message || 'System initialized successfully!');
      } else {
        setStatus('error');
        setMessage(response.data.error || 'Installation failed.');
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      setStatus('error');
      setMessage('A critical error occurred during installation.');
      setErrorDetails(
        err.response?.data?.error || err.message || 'Unknown error'
      );
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      {/* Background Decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-blue-100 opacity-50 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-indigo-100 opacity-50 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-none bg-white/80 shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
              <Settings className="animate-spin-slow h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-extrabold text-slate-800">
                System Setup
              </CardTitle>
              <CardDescription className="mt-2 text-base text-slate-500">
                Welcome to Evolution One CMS. Prepare your environment for
                first-time use.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 py-6">
            <div className="rounded-xl border border-amber-200/50 bg-amber-50/80 p-4 text-sm text-amber-900 shadow-sm">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span>Prerequisites Outline</span>
              </div>
              <p className="mb-3 text-xs text-amber-800/80">
                Ensure these variables are set in your{' '}
                <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-amber-900">
                  .env
                </code>{' '}
                file before continuing:
              </p>

              <div className="space-y-3">
                <div>
                  <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-amber-800/60">
                    Core & Security
                  </span>
                  <p className="break-words font-mono text-[11px] font-semibold text-amber-900/90">
                    MONGODB_URI, JWT_SECRET, NEXTAUTH_SECRET, API_BASE_URL
                  </p>
                  <p className="mt-1 text-[11px] text-amber-800/80">
                    <span className="font-mono font-semibold text-amber-900">
                      DEFAULT_PASSWORD
                    </span>
                    : Sets the initial login password for the admin account.
                  </p>
                </div>
                <div>
                  <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-amber-800/60">
                    MQTT & Hardware
                  </span>
                  <p className="break-words font-mono text-[11px] font-semibold text-amber-900/90">
                    MQTT_URI, MQTT_PUB_TOPIC, MQTT_SUB_TOPIC, MQTT_CFG_TOPIC
                  </p>
                </div>
                <div>
                  <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-amber-800/60">
                    External Services (Optional)
                  </span>
                  <p className="break-words font-mono text-[11px] font-medium text-amber-800/80">
                    GMAIL_USER, GMAIL_APP_PASSWORD, INFOBIP_BASE_URL,
                    INFOBIP_API_KEY, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all hover:shadow-md">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Database Seeding
                  </p>
                  <p className="text-xs text-slate-500">
                    Initialize core collections and records
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all hover:shadow-md">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Security Guard
                  </p>
                  <p className="text-xs text-slate-500">
                    Create default administrator account
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all hover:shadow-md">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                  <Globe className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Global Data
                  </p>
                  <p className="text-xs text-slate-500">
                    Setup countries and regional parameters
                  </p>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {status !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`flex items-start gap-3 rounded-xl p-4 ${
                    status === 'installing'
                      ? 'bg-blue-50 text-blue-700'
                      : status === 'success'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {status === 'installing' ? (
                    <RefreshCw className="h-5 w-5 shrink-0 animate-spin" />
                  ) : status === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 shrink-0" />
                  )}

                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-normal">
                      {message}
                    </p>
                    {errorDetails && (
                      <p className="mt-1 break-words rounded bg-white/50 p-2 font-mono text-xs opacity-80">
                        {errorDetails}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 px-6 pb-8">
            {status === 'idle' || status === 'error' ? (
              <Button
                onClick={handleInstall}
                className="w-full bg-blue-600 py-6 text-lg font-bold shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-[0.98]"
              >
                {status === 'error'
                  ? 'Retry Installation'
                  : 'Begin System Installation'}
              </Button>
            ) : status === 'success' ? (
              <Button
                onClick={() => router.push('/login')}
                className="w-full bg-emerald-600 py-6 text-lg font-bold shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-[0.98]"
              >
                Go to Login
              </Button>
            ) : (
              <Button
                disabled
                className="w-full cursor-not-allowed bg-slate-200 py-6 text-lg font-bold text-slate-500"
              >
                Installing...
              </Button>
            )}

            <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Evolution One CMS • v2.0.0
            </p>
          </CardFooter>
        </Card>
      </motion.div>

      <style jsx global>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
