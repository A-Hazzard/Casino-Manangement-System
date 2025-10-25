import { Variants } from 'framer-motion';

/**
 * Animation variants for expanding/collapsing configuration content.
 * Used in settings/configuration panels for smooth open/close transitions.
 */
export const configContentVariants: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto' },
};

/**
 * Animation variants for container elements that animate their children.
 * Used to stagger child animations in lists or grouped UI sections.
 */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: 'beforeChildren',
      staggerChildren: 0.1,
    },
  },
};

/**
 * Animation variants for individual items within a container.
 * Used for animating list/grid items as they appear/disappear.
 */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};
