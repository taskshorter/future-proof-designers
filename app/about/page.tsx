import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="page-stack">
      <h1>About</h1>
      <p>
        FPDesigner builds custom websites for businesses. Detailed company
        narrative and brand presentation will be added in a later design pass.
      </p>
    </div>
  );
}
