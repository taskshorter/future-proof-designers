import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="page-stack">
      <h1>About</h1>
      <p>
        FPDesigner builds custom websites for businesses through a clear,
        guided process.
      </p>
    </div>
  );
}
