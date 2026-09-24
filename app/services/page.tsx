import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Services",
  description: `Custom business websites, web applications, custom software, and integrations and automation from ${siteConfig.legalName}.`,
};

export default function ServicesPage() {
  return (
    <div className="page-stack with-kicker">
      <h1>Services</h1>
      <p>
        {siteConfig.legalName} provides custom digital work for businesses
        under the {siteConfig.name} brand. Every project is scoped around the
        specific business it serves.
      </p>

      <section className="prose-section" aria-labelledby="websites-heading">
        <h2 id="websites-heading">Custom business websites</h2>
        <p>
          Purpose-built websites focused on presenting your company clearly,
          supporting the actions your customers need to take, and creating a
          durable online presence. A website project begins with guided
          discovery questions about your business and goals, which inform a
          website plan for your project.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="apps-heading">
        <h2 id="apps-heading">Web applications and custom software</h2>
        <p>
          Custom browser-based software, including internal tools and
          customer-facing applications, for businesses that need more than a
          standard informational website, built around how your business
          operates.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="integrations-heading">
        <h2 id="integrations-heading">Integrations and automation</h2>
        <p>
          Where appropriate, we connect a website or application to other
          software a business already uses, and automate repeated workflows.
          Availability of a specific integration depends on the tools involved
          and the scope of your project.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="scope-heading">
        <h2 id="scope-heading">Scope and pricing</h2>
        <p>
          Project scope and pricing depend on the requirements agreed for your
          project. We do not publish fixed prices on this website. Once you have
          described your project, its scope, pricing and any deposit are
          presented to you in a proposal for your review.
        </p>
        <p>
          For how payments, refunds and cancellations are handled, see the{" "}
          <Link href="/refund-policy">Refund &amp; Dispute Policy</Link> and{" "}
          <Link href="/cancellation-policy">Cancellation Policy</Link>.
        </p>
      </section>

      <div className="panel">
        <p className="muted">
          Ready to describe your project? Start with three short discovery
          questions.
        </p>
        <div className="button-row">
          <Link href="/start" className="button-link">
            Start website project
          </Link>
          <Link href="/contact" className="button-link secondary">
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
}
