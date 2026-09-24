import type { Metadata } from "next";
import Link from "next/link";

import { ContactDetails } from "@/components/ContactDetails";
import { publicContact, siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `How to reach ${siteConfig.legalName}, the company behind ${siteConfig.name}.`,
};

export default function ContactPage() {
  const hasPublicChannel = Boolean(
    publicContact.supportEmail ||
      publicContact.phone ||
      publicContact.mailingAddress,
  );

  return (
    <div className="page-stack with-kicker">
      <h1>Contact</h1>
      <p>
        {siteConfig.name} is operated by {siteConfig.legalName}.
      </p>

      {hasPublicChannel ? (
        <section className="prose-section" aria-labelledby="reach-us-heading">
          <h2 id="reach-us-heading">Contact {siteConfig.legalName}</h2>
          <ContactDetails contact={publicContact} />
        </section>
      ) : (
        <section className="prose-section" aria-labelledby="reach-us-heading">
          <h2 id="reach-us-heading">Public contact details</h2>
          <p>
            A public email address, telephone number and mailing address for{" "}
            {siteConfig.legalName} are not published on this website at this
            time.
          </p>
        </section>
      )}

      <section className="prose-section" aria-labelledby="project-heading">
        <h2 id="project-heading">Starting a website project</h2>
        <p>
          If you would like {siteConfig.legalName} to build a website for your
          business, begin with the guided{" "}
          <Link href="/start">project start</Link>. Your answers are saved to
          your {siteConfig.name} account, and your project&rsquo;s progress
          and next steps are shown in the <Link href="/portal">customer portal</Link>.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="billing-heading">
        <h2 id="billing-heading">Billing or service questions</h2>
        <p>
          Existing customers can review their project, proposal and payment
          status in the customer portal. Policies that apply to payments and
          changes are set out in the{" "}
          <Link href="/refund-policy">Refund &amp; Dispute Policy</Link>,{" "}
          <Link href="/cancellation-policy">Cancellation Policy</Link> and{" "}
          <Link href="/terms">Terms</Link>.
        </p>
      </section>
    </div>
  );
}
