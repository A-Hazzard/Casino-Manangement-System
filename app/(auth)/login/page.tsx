/**
 * Login Page
 *
 * User authentication page with login form and profile validation.
 */

'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import LoginForm from '@/components/auth/LoginForm';
import LiquidGradient from '@/components/ui/LiquidGradient';
import PasswordUpdateModal from '@/components/ui/PasswordUpdateModal';
import ProfileValidationModal from '@/components/ui/ProfileValidationModal';
import { LoginPageSkeleton } from '@/components/ui/skeletons/LoginSkeletons';

// Hooks
import { useLoginPageData } from '@/lib/hooks/auth/useLoginPageData';

// Assets
import EOSLogo from '/public/EOS_Logo.png';
import SlotMachineImage from '/public/slotMachine.png';

/**
 * Login Page Content Component
 */
function LoginPageContent() {
  const hook = useLoginPageData();

  const {
    identifier, password, showPassword, rememberMe, errors, message, messageType,
    loading, redirecting, authLoading, showPasswordUpdateModal, showProfileValidationModal,
    invalidProfileFields, profileValidationReasons, currentUserData, profileUpdating,
    setIdentifier, setPassword, setShowPassword, setRememberMe, handleLogin,
    setShowPasswordUpdateModal, setShowProfileValidationModal,
    handlePasswordUpdate, handleProfileUpdate
  } = hook;

  // Show loading skeleton while checking authentication status
  if (authLoading) return <LoginPageSkeleton />;

  return (
    <>
      <LiquidGradient />
      <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex flex-col md:flex-row">
            <div className="w-full p-12 md:w-1/2">
              <div className="mx-auto w-full max-w-sm">
                <div className="text-center">
                  <Image src={EOSLogo} alt="Logo" width={150} height={75} className="mb-6 inline-block" priority />
                </div>
                <LoginForm
                  identifier={identifier} setIdentifier={setIdentifier}
                  password={password} setPassword={setPassword}
                  showPassword={showPassword} setShowPassword={setShowPassword}
                  rememberMe={rememberMe} setRememberMe={setRememberMe}
                  errors={errors} message={message} messageType={messageType}
                  loading={loading} redirecting={redirecting} handleLogin={handleLogin}
                />
              </div>
            </div>
            <div className="relative min-h-[250px] w-full md:min-h-0 md:w-1/2">
              <Image src={SlotMachineImage} alt="Casino" fill priority className="object-cover" />
              <div className="absolute bottom-10 left-10 pr-4">
                <h2 className="text-2xl font-bold text-white">Casino Management System</h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PasswordUpdateModal
        open={showPasswordUpdateModal}
        onClose={() => setShowPasswordUpdateModal(false)}
        onUpdate={handlePasswordUpdate}
        loading={loading}
      />

      <ProfileValidationModal
        open={showProfileValidationModal}
        onClose={() => setShowProfileValidationModal(false)}
        onUpdate={handleProfileUpdate}
        loading={profileUpdating}
        invalidFields={invalidProfileFields}
        currentData={currentUserData}
        reasons={profileValidationReasons}
        enforceUpdate
      />
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginPageContent />
    </Suspense>
  );
}
