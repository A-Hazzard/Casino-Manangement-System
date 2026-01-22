/**
 * Application Selection Component
 *
 * Displays role/application selection screen for high-level users (Developer, Admin, Manager, Location Admin).
 * Allows users to choose between CMS and VAULT applications.
 *
 * Features:
 * - Two large selection cards: "Casino Management System" and "Vault Management"
 * - Role-based display (only shown to authorized roles)
 * - Redirects to selected application
 * - Bypasses selection if APPLICATION env var is set
 *
 * @module components/shared/auth/ApplicationSelection
 */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUserStore } from '@/lib/store/userStore';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import { CreditCard, MonitorSpeaker } from 'lucide-react';
import Image from 'next/image';

/**
 * Check if user has high-level role that requires application selection
 */
function hasHighLevelRole(userRoles: string[] | undefined): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  const highLevelRoles = ['developer', 'admin', 'manager', 'location admin'];
  return userRoles.some(role => highLevelRoles.includes(role));
}

type ApplicationSelectionProps = {
  onSelect: (application: 'CMS' | 'VAULT') => void;
};

export default function ApplicationSelection({
  onSelect,
}: ApplicationSelectionProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const router = useRouter();
  const { user } = useUserStore();
  const [isSelecting, setIsSelecting] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================
  // Check if user should see this screen
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // If APPLICATION env var is set, bypass selection
    // Note: This is a server-side env var, so we check it on mount
    // In production, this would be set at build/deploy time
    // For development, you can set it in .env.local
    const appEnv = process.env.NEXT_PUBLIC_APPLICATION || process.env.APPLICATION;
    if (appEnv) {
      const appMode = appEnv as 'CMS' | 'VAULT';
      onSelect(appMode);
      return;
    }

    // Only show selection to high-level roles
    if (!hasHighLevelRole(user.roles)) {
      // Non-high-level users go directly to CMS
      onSelect('CMS');
    }
  }, [user, router, onSelect]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const handleSelect = (application: 'CMS' | 'VAULT') => {
    if (isSelecting) return;
    setIsSelecting(true);
    onSelect(application);
  };

  // ============================================================================
  // Render
  // ============================================================================
  // Don't render if user doesn't have high-level role or APPLICATION is set
  if (
    !user ||
    !hasHighLevelRole(user.roles) ||
    process.env.NEXT_PUBLIC_APPLICATION
  ) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Image
              src="/EOS_Logo.png"
              alt="Evolution One CMS Logo"
              width={64}
              height={64}
              className="h-16 w-16"
            />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Welcome back, {user.profile?.firstName || user.username || 'User'}
          </h1>
          <p className="text-gray-600">
            Please select your workspace:
          </p>
        </div>

        {/* Application Selection Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* CMS Card */}
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
            onClick={() => handleSelect('CMS')}
          >
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                <MonitorSpeaker className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Casino Management System
              </h2>
              <p className="mb-6 text-sm text-gray-600">
                Manage machines, locations, collections, and reports
              </p>
              <Button
                className="w-full"
                onClick={e => {
                  e.stopPropagation();
                  handleSelect('CMS');
                }}
                disabled={isSelecting}
              >
                Access Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* VAULT Card */}
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
            onClick={() => handleSelect('VAULT')}
          >
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
                <CreditCard className="h-10 w-10 text-orange-600" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Vault Management
              </h2>
              <p className="mb-6 text-sm text-gray-600">
                Manage vault balance, cash desks, floats, and expenses
              </p>
              <Button
                className="w-full bg-orange-600 hover:bg-orange-700"
                onClick={e => {
                  e.stopPropagation();
                  handleSelect('VAULT');
                }}
                disabled={isSelecting}
              >
                Access Vault
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
