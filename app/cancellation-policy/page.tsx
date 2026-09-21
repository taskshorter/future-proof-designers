import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description: `Cancellation policy for custom website and software projects provided by ${siteConfig.legalName}.`,
};

export default function CancellationPolicyPage() {
  return (
    <div className="page-stack">
      <h1>Cancellation Policy</h1>
      <p>
        This policy applies to projects provided by {siteConfig.legalName}{" "}
        under the {siteConfig.name} brand.
      </p>

      <section className="prose-section" aria-labelledby="requesting-heading">
        <h2 id="requesting-heading">Requesting cancellation</h2>
        <p>
          You may ask to cancel future work on a project. To do so, contact{" "}
          {siteConfig.legalName} using the options on the{" "}
          <Link href="/contact">Contact</Link> page or through your project in
          the customer portal.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="effect-heading">
        <h2 id="effect-heading">What cancellation does and does not do</h2>
        <p>
          Cancelling future work does not automatically erase charges or
          obligations for work that has already been completed or committed
          under the terms that apply to your project. The exact consequences of
          cancelling depend on those project and commercial terms and on the
          stage the project has reached.
        </p>
        <p>
          This page does not set a cancellation window or cancellation fees.
          Any such terms are those stated in the proposal or other terms
          agreed for your project.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="law-heading">
        <h2 id="law-heading">Your legal rights</h2>
        <p>
          Rights that you have under applicable law are not affected by this
          policy.
        </p>
      </section>

      <p className="muted">
        See also the <Link href="/refund-policy">Refund &amp; Dispute Policy</Link> and{" "}
        <Link href="/terms">Terms</Link>.
      </p>
    </div>
  );
}
