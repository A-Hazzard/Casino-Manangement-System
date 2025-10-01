import { useState, useEffect } from "react";

/**
 * Custom React hook to determine if the component has mounted on the client.
 *
 * @returns Boolean indicating if the component has mounted.
 */
export function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}

export default useHasMounted;
