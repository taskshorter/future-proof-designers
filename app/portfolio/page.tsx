import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio",
};

export default function PortfolioPage() {
  return (
    <div className="page-stack">
      <h1>Portfolio</h1>
      <p className="muted">Selected work will be published here.</p>
    </div>
  );
}
