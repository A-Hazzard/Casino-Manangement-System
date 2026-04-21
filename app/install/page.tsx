'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { RefreshCw, CheckCircle2, AlertCircle, Settings, ShieldCheck, Database, Globe } from 'lucide-react';
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
  const [status, setStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');
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
    return () => { cancelled = true; };
  }, [router]);

  // Show minimal loading state while checking initialization status
  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
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
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      setStatus('error');
      setMessage('A critical error occurred during installation.');
      setErrorDetails(err.response?.data?.error || err.message || 'Unknown error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-50" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-50" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Settings className="w-8 h-8 text-white animate-spin-slow" />
            </div>
            <div>
              <CardTitle className="text-3xl font-extrabold text-slate-800">System Setup</CardTitle>
              <CardDescription className="text-slate-500 mt-2 text-base">
                Welcome to Evolution One CMS. Prepare your environment for first-time use.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 py-6">
            <div className="bg-amber-50/80 border border-amber-200/50 rounded-xl p-4 text-sm text-amber-900 shadow-sm">
              <div className="flex items-center gap-2 font-bold mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span>Prerequisites Outline</span>
              </div>
              <p className="text-xs mb-3 text-amber-800/80">Ensure these variables are set in your <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-amber-900">.env</code> file before continuing:</p>
              
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800/60 tracking-wider block mb-0.5">Core & Security</span>
                  <p className="font-mono text-[11px] font-semibold text-amber-900/90 break-words">MONGODB_URI, JWT_SECRET, NEXTAUTH_SECRET, API_BASE_URL</p>
                  <p className="text-[11px] mt-1 text-amber-800/80">
                    <span className="font-mono font-semibold text-amber-900">DEFAULT_PASSWORD</span>: Sets the initial login password for the admin account.
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800/60 tracking-wider block mb-0.5">MQTT & Hardware</span>
                  <p className="font-mono text-[11px] font-semibold text-amber-900/90 break-words">MQTT_URI, MQTT_PUB_TOPIC, MQTT_SUB_TOPIC, MQTT_CFG_TOPIC</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800/60 tracking-wider block mb-0.5">External Services (Optional)</span>
                  <p className="font-mono text-[11px] font-medium text-amber-800/80 break-words">GMAIL_USER, GMAIL_APP_PASSWORD, INFOBIP_BASE_URL, INFOBIP_API_KEY, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100 transition-all hover:shadow-md">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Database className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Database Seeding</p>
                  <p className="text-xs text-slate-500">Initialize core collections and records</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100 transition-all hover:shadow-md">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Security Guard</p>
                  <p className="text-xs text-slate-500">Create default administrator account</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100 transition-all hover:shadow-md">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Global Data</p>
                  <p className="text-xs text-slate-500">Setup countries and regional parameters</p>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {status !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-4 rounded-xl flex items-start gap-3 ${
                    status === 'installing' ? 'bg-blue-50 text-blue-700' :
                    status === 'success' ? 'bg-emerald-50 text-emerald-700' :
                    'bg-rose-50 text-rose-700'
                  }`}
                >
                  {status === 'installing' ? <RefreshCw className="w-5 h-5 animate-spin shrink-0" /> :
                   status === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> :
                   <AlertCircle className="w-5 h-5 shrink-0" />}
                  
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-normal">{message}</p>
                    {errorDetails && (
                      <p className="text-xs mt-1 opacity-80 break-words font-mono bg-white/50 p-2 rounded">
                        {errorDetails}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pb-8 px-6">
            {status === 'idle' || status === 'error' ? (
              <Button 
                onClick={handleInstall}
                className="w-full py-6 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
              >
                {status === 'error' ? 'Retry Installation' : 'Begin System Installation'}
              </Button>
            ) : status === 'success' ? (
              <Button 
                onClick={() => router.push('/login')}
                className="w-full py-6 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]"
              >
                Go to Login
              </Button>
            ) : (
              <Button 
                disabled
                className="w-full py-6 text-lg font-bold bg-slate-200 text-slate-500 cursor-not-allowed"
              >
                Installing...
              </Button>
            )}
            
            <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest font-semibold mt-2">
              Evolution One Engineering • v5.0.1
            </p>
          </CardFooter>
        </Card>
      </motion.div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
