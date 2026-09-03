"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { primaryNavigation } from "@/config/site";

export function SiteNav() {
  const pathname = usePathname() || "/";

  return (
    <nav aria-label="Primary">
      <ul className="site-nav-list">
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
