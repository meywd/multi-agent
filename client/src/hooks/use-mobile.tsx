import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Function to check if the window width is less than 768px (typical tablet/mobile breakpoint)
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on initial render
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  return isMobile;
}