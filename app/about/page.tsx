import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${siteConfig.legalName}, the company behind the ${siteConfig.name} custom website and software brand and the BookLocal software product.`,
};

export default function AboutPage() {
  return (
    <div className="page-stack">
      <h1>About</h1>
      <p>
        FPDesigner builds custom websites for businesses through a clear,
        guided process.
      </p>

      <section className="prose-section" aria-labelledby="company-heading">
        <h2 id="company-heading">The company</h2>
        <p>
          {siteConfig.legalName} is a company that builds custom software and
          digital products for businesses. {siteConfig.name} is its public
          website and custom-software brand, and the name you see across this
          website. {siteConfig.operatorStatement}
        </p>
      </section>

      <section className="prose-section" aria-labelledby="what-we-do-heading">
        <h2 id="what-we-do-heading">What we do</h2>
        <p>
          We design and build custom business websites, web applications and
          other custom digital solutions, including integrations and workflow
          automation where a project calls for them. Each engagement is scoped
          around the business it is built for. See{" "}
          <Link href="/services">Services</Link> for details.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="products-heading">
        <h2 id="products-heading">Software products</h2>
        <p>
          {siteConfig.bookLocalStatement} Read more on the{" "}
          <Link href="/products">Products</Link> page.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="work-with-us-heading">
        <h2 id="work-with-us-heading">Working with us</h2>
        <p>
          To begin a website project, use the guided{" "}
          <Link href="/start">project start</Link>. For other questions, see
          the <Link href="/contact">Contact</Link> page.
        </p>
      </section>
    </div>
  );
}
