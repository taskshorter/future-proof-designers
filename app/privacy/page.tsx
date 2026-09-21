import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${siteConfig.legalName} handles personal information on the ${siteConfig.name} website.`,
};

export default function PrivacyPage() {
  return (
    <div className="page-stack">
      <h1>Privacy Policy</h1>
      <p>
        This policy explains the categories of information handled when you use
        the {siteConfig.name} website and services operated by{" "}
        {siteConfig.legalName}.
      </p>

      <section className="prose-section" aria-labelledby="collect-heading">
        <h2 id="collect-heading">Information we handle</h2>
        <ul>
          <li>
            <strong>Account information.</strong> Details you provide to create
            and use an account, such as your email address.
          </li>
          <li>
            <strong>Project and business information.</strong> Answers,
            business details, files and other content you submit while
            describing and managing your website project.
          </li>
          <li>
            <strong>Authentication and security information.</strong> Sign-in
            and session data used to keep your account secure and to confirm
            that you are the person accessing your projects.
          </li>
          <li>
            <strong>Workflow information.</strong> Information needed to
            operate your project workflow, such as project status, website
            plans, proposals and payment status.
          </li>
        </ul>
        <p>
          Before you sign in, answers you enter into the project start form may
          be kept in your own browser&rsquo;s local storage so you can return to
          them.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="use-heading">
        <h2 id="use-heading">How we use it</h2>
        <p>
          We use this information to provide the website and services you
          request, to operate and secure accounts, to prepare and deliver your
          project, and to handle billing and support questions.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="payments-heading">
        <h2 id="payments-heading">Payments</h2>
        <p>
          Where a payment is required, you are sent to a third-party payment
          processor&rsquo;s hosted checkout page to pay. Payment card details
          are entered on that page and are not entered on this website.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="sharing-heading">
        <h2 id="sharing-heading">Selling and sharing</h2>
        <p>
          {siteConfig.legalName} does not sell personal information. We use
          service providers, such as those that host this website, provide
          authentication and process payments, only as needed to operate the
          website and services.
        </p>
      </section>

      <section className="prose-section" aria-labelledby="rights-heading">
        <h2 id="rights-heading">Your choices</h2>
        <p>
          You may contact {siteConfig.legalName} about your personal
          information using the options on the{" "}
          <Link href="/contact">Contact</Link> page. Any rights you have under
          applicable law are not limited by this policy.
        </p>
      </section>
    </div>
  );
}
