import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Products",
  description: `${siteConfig.bookLocalStatement}`,
};

export default function ProductsPage() {
  return (
    <div className="page-stack with-kicker">
      <h1>Products</h1>
      <p>
        In addition to custom project work, {siteConfig.legalName} develops
        its own software products.
      </p>

      <section className="prose-section" aria-labelledby="booklocal-heading">
        <h2 id="booklocal-heading">BookLocal</h2>
        <p>
          <strong>{siteConfig.bookLocalStatement}</strong>
        </p>
        <p>
          This page identifies who owns the product. It does not describe
          product availability, pricing or features.
        </p>
      </section>

      <p>
        Questions about our products? See the{" "}
        <Link href="/contact">Contact</Link> page.
      </p>
    </div>
  );
}
