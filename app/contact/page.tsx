import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <div className="page-stack">
      <h1>Contact</h1>
      <p>
        Contact and booking flows are not part of B1-P0. This route is reserved
        for that work in a later release.
      </p>
    </div>
  );
}
