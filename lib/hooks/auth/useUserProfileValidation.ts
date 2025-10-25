import { useState, useEffect } from 'react';
import { useUserStore } from '@/lib/store/userStore';

export function useUserProfileValidation() {
  const user = useUserStore(state => state.user);
  const [needsProfileValidation, setNeedsProfileValidation] = useState(false);

  useEffect(() => {
    if (!user) {
      setNeedsProfileValidation(false);
      return;
    }

    // Check if username contains @ or .com (email-like)
    const hasEmailLikeUsername =
      user.username?.includes('@') || user.username?.includes('.com');

    // Check if profile is incomplete
    const hasIncompleteProfile =
      !user.profile?.firstName || !user.profile?.lastName;

    // Show validation modal if either condition is true
    setNeedsProfileValidation(hasEmailLikeUsername || hasIncompleteProfile);
  }, [user]);

  return needsProfileValidation;
}
