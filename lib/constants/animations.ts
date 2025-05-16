/**
 * Common animation variants used throughout the application
 */

/**
 * Page-level animation variants for route/page transitions.
 * Used in layout and page components to animate page entry/exit.
 */
export const pageVariants = {
  initial: { opacity: 0 },
  enter: {
    opacity: 1,
    transition: {
      duration: 0.5,
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3 },
  },
};

/**
 * Animation variants for individual items within a page or list.
 * Used to animate list/grid items as they appear/disappear.
 */
export const itemVariants = {
  initial: { opacity: 0, y: 20 },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 12,
      stiffness: 200,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: 0.2 },
  },
};

/**
 * Animation variants for scaling UI elements on hover/tap.
 * Used for interactive UI elements (e.g., buttons, cards).
 */
export const hoverScaleVariants = {
  hover: {
    scale: 1.03,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10,
    },
  },
  tap: {
    scale: 0.97,
  },
};

/**
 * Animation variant for loading spinners.
 * Used in loading indicators throughout the app.
 */
export const spinnerVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};
