import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Small delay to ensure route change is complete
    const timer = setTimeout(() => {
      // Scroll to absolute top - try multiple methods for better browser compatibility
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth"
      });
      
      // Also scroll document elements for better compatibility
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
};

export default ScrollToTop;

