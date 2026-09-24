import Link from "next/link";

import { siteConfig } from "@/config/site";

const services = [
  {
    title: "Custom business websites",
    body: "Purpose-built websites that present your business clearly, support the actions your customers need to take, and give you a durable online presence.",
  },
  {
    title: "Web applications and custom software",
    body: "Custom browser-based software, for internal teams or for customers, when a business needs more than a standard informational website.",
  },
  {
    title: "Integrations and automation",
    body: "Software integrations and workflow automation where they help a website or application work with the tools a business already uses.",
  },
] as const;

const steps = [
  {
    title: "Start",
    body: "Answer three short guided discovery questions about your business.",
  },
  {
    title: "Review your plan",
    body: "Your answers inform a website plan for your project, which you review.",
  },
  {
    title: "Approve your proposal",
    body: "Scope, cost and any deposit are presented to you in a proposal before work is billed.",
  },
  {
    title: "We build it",
    body: "Your custom website or application is built for your business under the terms you agreed to.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="page-wide">
      <section className="hero" aria-labelledby="hero-heading">
        <p className="eyebrow">{siteConfig.legalName}</p>
        <h1 id="hero-heading">
          {siteConfig.name}: custom websites and software for businesses
        </h1>
        <p className="lead">
          {siteConfig.operatorStatement} We build custom business websites,
          web applications and software products, and we scope every project
          around what your business actually needs.
        </p>
        <div className="panel hero-panel">
          <p className="muted">
            Start a website project with three short discovery questions. Sign in to
            save your work and return to it later.
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
      </section>

      <section className="content-section" aria-labelledby="services-heading">
        <h2 id="services-heading">What we build</h2>
        <div className="card-grid">
          {services.map((service) => (
            <article key={service.title} className="card">
              <h3>{service.title}</h3>
              <p className="muted">{service.body}</p>
            </article>
          ))}
        </div>
        <p>
          <Link href="/services">See all services</Link>
        </p>
      </section>

      <section className="content-section" aria-labelledby="process-heading">
        <h2 id="process-heading">What working with us looks like</h2>
        <div className="step-grid">
          {steps.map((step, index) => (
            <div key={step.title} className="step-card">
              <span className="step-number" aria-hidden="true">
                {index + 1}
              </span>
              <h3>{step.title}</h3>
              <p className="muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section" aria-labelledby="products-heading">
        <h2 id="products-heading">Our software products</h2>
        <h3>BookLocal</h3>
        <p className="muted">{siteConfig.bookLocalStatement}</p>
        <p>
          <Link href="/products">About BookLocal</Link>
        </p>
      </section>

      <section className="content-section" aria-labelledby="company-heading">
        <h2 id="company-heading">Who operates FPDesigner</h2>
        <p>
          {siteConfig.name} is the public website and custom-software brand of{" "}
          <strong>{siteConfig.legalName}</strong>, which provides the services
          described on this website.
        </p>
        <p>
          <Link href="/about">About the company</Link>
        </p>
      </section>
    </div>
  );
}
