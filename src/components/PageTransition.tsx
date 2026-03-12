"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition = ({ children }: PageTransitionProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  const previousPathname = useRef<string>("");

  useEffect(() => {
    // Check if this is a route change or initial load
    const isRouteChange =
      previousPathname.current !== "" && previousPathname.current !== pathname;

    if (isRouteChange) {
      // Route change - reset animation
      setIsVisible(false);
    }

    // Update the previous pathname
    previousPathname.current = pathname;

    // Trigger enter animation after a short delay
    const timer = setTimeout(
      () => {
        setIsVisible(true);
      },
      isRouteChange ? 100 : 50
    ); // Slightly longer delay for route changes

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      className={`page-transition-container ${isVisible ? "page-enter" : ""}`}
    >
      {children}
    </div>
  );
};
