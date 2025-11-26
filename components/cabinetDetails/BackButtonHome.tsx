/**
 * Back Button Home Component
 * Navigation button to go back to home/dashboard page.
 *
 * Features:
 * - Back navigation to home
 * - Router integration
 * - Simple button UI
 *
 * @returns Button component for navigating to home
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { useRouter } from 'next/navigation';

const BackButtonHome: React.FC = () => {
  // ============================================================================
  // Hooks
  // ============================================================================
  const router = useRouter();

  // ============================================================================
  // Render - Back Button
  // ============================================================================
  const buttonContent = (
    <Button
      variant="outline"
      className="bg-button text-white hover:bg-buttonActive"
      onClick={() => router.push('/')}
    >
      <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Home
    </Button>
  );

  return <div className="mb-2 mt-4">{buttonContent}</div>;
};

export default BackButtonHome;
