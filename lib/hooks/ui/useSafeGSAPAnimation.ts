import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';

/**
 * Custom hook for safe GSAP animations that handles React 19 lifecycle properly
 * Prevents "target not found" errors and ensures animations run at the right time
 */
export function useSafeGSAPAnimation() {
  const animationRefs = useRef<Map<string, gsap.core.Tween>>(new Map());

  /**
   * Safely animate elements with comprehensive error handling
   */
  const safeAnimate = useCallback(
    (
      selector: string | Element | Element[],
      animationProps: gsap.TweenVars,
      options: {
        ref?: React.RefObject<HTMLElement | null>;
        delay?: number;
        onComplete?: () => void;
        onError?: (error: Error) => void;
      } = {}
    ) => {
      const { ref, delay = 0, onComplete, onError } = options;

      const executeAnimation = () => {
        try {
          let targets: Element[] = [];

          // Handle different selector types
          if (typeof selector === 'string') {
            if (ref?.current) {
              targets = Array.from(ref.current.querySelectorAll(selector));
            } else {
              targets = Array.from(document.querySelectorAll(selector));
            }
          } else if (Array.isArray(selector)) {
            targets = selector.filter(
              el => el && el instanceof Element && el.isConnected
            );
          } else if (selector instanceof Element && selector.isConnected) {
            targets = [selector];
          }

          // Filter out invalid elements
          const validTargets = targets.filter(
            target =>
              target &&
              target instanceof Element &&
              target.isConnected &&
              (target as HTMLElement).offsetParent !== null // Ensure element is visible
          );

          if (validTargets.length === 0) {
            console.warn(
              `useSafeGSAPAnimation: No valid targets found for selector: ${selector}`
            );
            return;
          }

          // Kill any existing animations on these elements
          gsap.killTweensOf(validTargets);

          // Create animation with error handling
          const tween = gsap.to(validTargets, {
            ...animationProps,
            onComplete: () => {
              onComplete?.();
              // Clean up animation reference
              animationRefs.current.delete(selector.toString());
            },
            onError: (error: Error) => {
              console.error('GSAP Animation Error:', error);
              onError?.(error);
            },
          });

          // Store animation reference for cleanup
          animationRefs.current.set(selector.toString(), tween);
        } catch (error) {
          console.error('useSafeGSAPAnimation: Animation setup failed:', error);
          onError?.(error as Error);
        }
      };

      if (delay > 0) {
        setTimeout(executeAnimation, delay);
      } else {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(executeAnimation);
      }
    },
    []
  );

  /**
   * Safely animate cards with stagger effect
   */
  const animateCards = useCallback(
    (
      cardsRef: React.RefObject<HTMLDivElement | null>,
      options: {
        stagger?: number;
        duration?: number;
        ease?: string;
      } = {}
    ) => {
      const {
        stagger = 0.05,
        duration = 0.3,
        ease = 'back.out(1.5)',
      } = options;

      safeAnimate(
        '.card-item',
        {
          opacity: 1,
          scale: 1,
          y: 0,
          visibility: 'visible',
          duration,
          stagger,
          ease,
          from: {
            opacity: 0,
            scale: 0.95,
            y: 15,
            visibility: 'hidden',
          },
        },
        {
          ref: cardsRef,
          delay: 50, // Small delay to ensure cards are rendered
          onComplete: () => {
            // Clean up visibility styles
            if (cardsRef.current) {
              const cards = cardsRef.current.querySelectorAll('.card-item');
              cards.forEach(card => {
                if (card instanceof HTMLElement) {
                  card.style.visibility = '';
                }
              });
            }
          },
        }
      );
    },
    [safeAnimate]
  );

  /**
   * Safely animate table rows
   */
  const animateTableRows = useCallback(
    (
      tableRef: React.RefObject<HTMLDivElement | null>,
      options: {
        stagger?: number;
        duration?: number;
        ease?: string;
      } = {}
    ) => {
      const { stagger = 0.05, duration = 0.4, ease = 'power2.out' } = options;

      safeAnimate(
        'tbody tr',
        {
          opacity: 1,
          y: 0,
          duration,
          stagger,
          ease,
          from: {
            opacity: 0,
            y: 15,
          },
        },
        {
          ref: tableRef,
          delay: 0,
        }
      );
    },
    [safeAnimate]
  );

  /**
   * Cleanup function to kill all animations
   */
  const cleanup = useCallback(() => {
    animationRefs.current.forEach(tween => {
      tween.kill();
    });
    animationRefs.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    safeAnimate,
    animateCards,
    animateTableRows,
    cleanup,
  };
}
