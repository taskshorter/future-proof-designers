"use client";

import { signOutAction } from "@/lib/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="text-button">
        Sign out
      </button>
    </form>
  );
}
