// Animation utilities for mobile collection modal
import React from "react";

export const slideUpVariants = {
  hidden: {
    y: "100%",
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200,
      duration: 0.3,
    },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200,
      duration: 0.25,
    },
  },
};

export const slideDownVariants = {
  hidden: {
    y: "-100%",
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200,
      duration: 0.3,
    },
  },
  exit: {
    y: "-100%",
    opacity: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200,
      duration: 0.25,
    },
  },
};

export const slideLeftVariants = {
  hidden: {
    x: "100%",
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200,
      duration: 0.3,
    },
  },
  exit: {
    x: "-100%",
    opacity: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200,
      duration: 0.25,
    },
  },
};

export const slideRightVariants = {
  hidden: {
    x: "-100%",
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200,
      duration: 0.3,
    },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200,
      duration: 0.25,
    },
  },
};

export const fadeInOutVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
    },
  },
};

export const scaleInOutVariants = {
  hidden: {
    scale: 0.95,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 300,
      duration: 0.2,
    },
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: {
      duration: 0.15,
    },
  },
};

// Stagger animation for lists
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  hidden: {
    y: 20,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 300,
    },
  },
};

// Custom CSS classes for animations (fallback for when Framer Motion is not available)
export const animationClasses = {
  slideUpEnter: "animate-slide-up-enter",
  slideUpExit: "animate-slide-up-exit",
  slideDownEnter: "animate-slide-down-enter",
  slideDownExit: "animate-slide-down-exit",
  slideLeftEnter: "animate-slide-left-enter",
  slideLeftExit: "animate-slide-left-exit",
  slideRightEnter: "animate-slide-right-enter",
  slideRightExit: "animate-slide-right-exit",
  fadeIn: "animate-fade-in",
  fadeOut: "animate-fade-out",
  scaleIn: "animate-scale-in",
  scaleOut: "animate-scale-out",
};

// Animation presets for common use cases
export const animationPresets = {
  // List panel slide up from bottom
  listPanel: slideUpVariants,

  // Form slide in from right
  formSlide: slideLeftVariants,

  // Back navigation slide in from left
  backNavigation: slideRightVariants,

  // Modal backdrop fade
  backdrop: fadeInOutVariants,

  // Button press feedback
  buttonPress: scaleInOutVariants,

  // Card hover effect
  cardHover: {
    scale: 1.02,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 300,
    },
  },

  // Loading spinner
  spinner: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

// Utility function to get animation class based on state
export const getAnimationClass = (
  isVisible: boolean,
  animationType: keyof typeof animationClasses
): string => {
  const baseClass = animationClasses[animationType];
  return isVisible ? baseClass : "";
};

// Hook for managing animation states
export const useAnimationState = (initialState: boolean = false) => {
  const [isVisible, setIsVisible] = React.useState(initialState);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const show = React.useCallback(() => {
    setIsVisible(true);
    setIsAnimating(true);
  }, []);

  const hide = React.useCallback(() => {
    setIsAnimating(false);
    // Delay hiding to allow exit animation
    setTimeout(() => setIsVisible(false), 250);
  }, []);

  const toggle = React.useCallback(() => {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  }, [isVisible, show, hide]);

  return {
    isVisible,
    isAnimating,
    show,
    hide,
    toggle,
  };
};

// React is already imported at the top
