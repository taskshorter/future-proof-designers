"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { primaryNavigation } from "@/config/site";

export function SiteNav() {
  const pathname = usePathname() || "/";
  const toggleRef = useRef<HTMLButtonElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [previousPathname, setPreviousPathname] = useState(pathname);

  // Guarded state adjustment during render (not an Effect): the setter
  // belongs to this component, the update is guarded by comparing the
  // current pathname against the previously seen one, and that guard is
  // updated in the same branch — so a real navigation closes the menu
  // exactly once and this can't loop. This covers every route change,
  // including ones that don't go through one of this component's own
  // Links (e.g. browser back/forward), so no stale "opened on this route"
  // state can survive a navigation and reopen the menu later.
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setIsOpen(false);
  }

  function closeMenu() {
    setIsOpen(false);
  }

  // Subscribe to Escape while the mobile drawer is open, so it can be
  // dismissed without a pointer, and return focus to the toggle that opened
  // it.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
        toggleRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <nav aria-label="Primary">
      <button
        ref={toggleRef}
        type="button"
        className="nav-toggle"
        aria-expanded={isOpen}
        aria-controls="primary-nav-list"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? "Close" : "Menu"}
        <span className="visually-hidden"> primary navigation</span>
      </button>
      <ul
        id="primary-nav-list"
        className={isOpen ? "site-nav-list is-open" : "site-nav-list"}
      >
        {primaryNavigation.map((item) => {
          const isCurrent =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
