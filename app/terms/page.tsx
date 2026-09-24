import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms for using the ${siteConfig.name} website and services operated by ${siteConfig.legalName}.`,
};

export default function TermsPage() {
  return (
    <div className="page-stack with-kicker">
      <h1>Terms of Service</h1>
      <p>
        These terms describe the basis on which you may use the{" "}
        {siteConfig.name} website ({siteConfig.domain}) and related services.
      </p>

      <section className="prose-section" aria-labelledby="operator-heading">
        <h2 id="operator-heading">Who we are</h2>
        <p>
          This website and its services are operated by{" "}
          {siteConfig.legalName}. {siteConfig.name} is the brand under which{" "}
          {siteConfig.legalName} offers custom website and software services.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="use-heading">
        <h2 id="use-heading">Using the website</h2>
        <p>
          You may use this website to learn about our services, to start a
          website project and to manage your account and projects. You must
          not misuse the website or services, including by attempting to gain
          unauthorized access, interfering with their operation, submitting
          unlawful or harmful content, or using them to harm others.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="projects-heading">
        <h2 id="projects-heading">Project services</h2>
        <p>
          Custom website and software projects may be governed by separate
          commercial terms agreed for the project, such as a proposal or other
          project agreement. Where those terms address a subject, they apply
          to that project in addition to these terms. See also the{" "}
          <Link href="/refund-policy">Refund &amp; Dispute Policy</Link> and{" "}
          <Link href="/cancellation-policy">Cancellation Policy</Link>.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="ip-heading">
        <h2 id="ip-heading">Intellectual property</h2>
        <p>
          Ownership of and rights in work produced for a project depend on the
          terms agreed for that project. You retain ownership of content you
          submit, subject to any project-specific agreement and the permissions
          necessary for us to provide the services. You are responsible for
          having the right to provide that content.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="availability-heading">
        <h2 id="availability-heading">Availability</h2>
        <p>
          We do not guarantee that this website or its services will be
          available without interruption or free of errors.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="law-heading">
        <h2 id="law-heading">Your legal rights</h2>
        <p>
          Nothing in these terms limits any rights you have under applicable
          law.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">Privacy and contact</h2>
        <p>
          Our handling of personal information is described in the{" "}
          <Link href="/privacy">Privacy Policy</Link>. For contact options,
          see the <Link href="/contact">Contact</Link> page.
        </p>
      </section>
    </div>
  );
}
