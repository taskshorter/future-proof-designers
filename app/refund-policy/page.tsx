import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Refund & Dispute Policy",
  description: `Refund and billing dispute policy for custom website and software work provided by ${siteConfig.legalName}.`,
};

export default function RefundPolicyPage() {
  return (
    <div className="page-stack with-kicker">
      <h1>Refund &amp; Dispute Policy</h1>
      <p>
        This policy applies to services provided by {siteConfig.legalName}{" "}
        under the {siteConfig.name} brand.
      </p>

      <section className="prose-section" aria-labelledby="custom-work-heading">
        <h2 id="custom-work-heading">Custom work</h2>
        <p>
          Our services are custom development work. Each project is scoped and
          performed specifically for the customer, so it is not a
          ready-made product that can simply be returned.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="eligibility-heading">
        <h2 id="eligibility-heading">Refund eligibility</h2>
        <p>
          Whether a payment, including a project deposit, is refundable depends
          on the commercial terms that apply to your project and on the work
          that has already been performed or committed. A universal or
          unconditional refund right is not offered by this page.
        </p>
        <p>
          Specific refund rules beyond those described here are not published
          on this website. Where your project&rsquo;s proposal or other agreed
          terms address refunds, those terms apply to your project.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="concerns-heading">
        <h2 id="concerns-heading">Billing or service concerns</h2>
        <p>
          If you have a concern about a charge or about the service you
          received, please contact {siteConfig.legalName} promptly using the
          options on the <Link href="/contact">Contact</Link> page or through
          your project in the customer portal, so that it can be reviewed.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="disputes-heading">
        <h2 id="disputes-heading">Billing disputes</h2>
        <p>
          If you believe a charge is incorrect, you can contact{" "}
          {siteConfig.legalName} using the options on the{" "}
          <Link href="/contact">Contact</Link> page. We will review billing
          concerns against the applicable project and payment records.
        </p>
        <p>
          Nothing in this policy limits any rights available to you through
          your payment method provider or under applicable law, and it does not
          require you to contact us before exercising those rights.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="law-heading">
        <h2 id="law-heading">Your legal rights</h2>
        <p>
          Nothing on this page overrides any rights you have under applicable
          law.
        </p>
      </section>

      <p className="muted">
        See also the{" "}
        <Link href="/cancellation-policy">Cancellation Policy</Link> and{" "}
        <Link href="/terms">Terms</Link>.
      </p>
    </div>
  );
}
