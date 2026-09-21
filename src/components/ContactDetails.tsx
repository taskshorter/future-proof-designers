import type { PublicContactDetails } from "@/config/site";

/**
 * Renders only the public contact channels that have actually been
 * configured. Renders nothing when none are set.
 */
export function ContactDetails({ contact }: { contact: PublicContactDetails }) {
  const { supportEmail, phone, mailingAddress } = contact;

  if (!supportEmail && !phone && !mailingAddress) {
    return null;
  }

  return (
    <dl className="review-list contact-details">
      {supportEmail ? (
        <div>
          <dt>Customer support email</dt>
          <dd>
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </dd>
        </div>
      ) : null}
      {phone ? (
        <div>
          <dt>Phone</dt>
          <dd>
            <a href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</a>
          </dd>
        </div>
      ) : null}
      {mailingAddress ? (
        <div>
          <dt>Mailing address</dt>
          <dd className="preserve-lines">{mailingAddress}</dd>
        </div>
      ) : null}
    </dl>
  );
}
