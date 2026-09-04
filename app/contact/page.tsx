import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <div className="page-stack">
      <h1>Contact</h1>
      <p>
        Contact and booking options aren’t available yet. Please check back later.
      </p>
    </div>
  );
}
