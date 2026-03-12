"use client";

import Link, { LinkProps } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { startTransition } from "react";

interface TransitionLinkProps extends LinkProps {
  children: React.ReactNode;
  href: string;
  className?: string;
  style?: React.CSSProperties;
  onMouseEnter?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
}

export const TransitionLink = ({
  children,
  href,
  className = "",
  onMouseEnter,
  onMouseLeave,
  ...props
}: TransitionLinkProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleTransition = async (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    e.preventDefault();

    const container = document.querySelector(
      ".page-transition-container"
    ) as HTMLElement;
    const targetPath = href.split("?")[0].split("#")[0];
    const isSameRoute = targetPath === pathname;

    if (container) {
      container.classList.remove("page-enter");
      container.classList.add("page-exit");
    }

    if (isSameRoute) {
      setTimeout(() => {
        if (!container) {
          return;
        }
        container.classList.remove("page-exit");
        // Force reflow to allow the enter animation to retrigger
        void container.offsetWidth;
        container.classList.add("page-enter");
      }, 160);
      return;
    }

    setTimeout(() => {
      startTransition(() => {
        router.push(href);
      });
    }, 150);
  };

  return (
    <Link
      onClick={handleTransition}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      href={href}
      className={`transition-all duration-200 hover:opacity-80 ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
};
