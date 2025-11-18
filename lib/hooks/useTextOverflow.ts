import { useEffect, useState, type RefObject } from 'react';

/**
 * Hook to detect if text overflows its container
 * @param value - The text value to check
 * @param containerRef - Ref to the container element
 * @returns boolean indicating if text is overflowing
 */
export function useTextOverflow(
  value: string,
  containerRef: RefObject<HTMLElement | null>
): boolean {
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !value) {
      setIsOverflowing(false);
      return;
    }

    const element = containerRef.current;
    
    // Use requestAnimationFrame to ensure DOM has updated
    const checkOverflow = () => {
      // Check if scrollWidth is greater than clientWidth (horizontal overflow)
      // or scrollHeight is greater than clientHeight (vertical overflow)
      const hasOverflow = 
        element.scrollWidth > element.clientWidth ||
        element.scrollHeight > element.clientHeight;
      
      setIsOverflowing(hasOverflow);
    };

    // Initial check
    checkOverflow();

    // Use ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [value, containerRef]);

  return isOverflowing;
}




