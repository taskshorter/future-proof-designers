import type { CommercialOfferStatus, QuoteLine } from "@/lib/factory/contract";

export function commercialOfferStatusHeading(
  status: CommercialOfferStatus,
): string {
  switch (status) {
    case "DECLINED":
      return "Proposal not moving forward";
    case "DEPOSIT_READY":
      return "Your project is approved and ready to start";
    case "NEED_MORE_INFORMATION":
      return "We need a little more information";
    case "NEEDS_CONSULTATION":
      return "A consultation is needed";
    case "AWAITING_CUSTOMER_REAPPROVAL":
      return "This proposal was updated";
    case "OWNER_APPROVED":
      return "Your proposal has been approved";
    case "AWAITING_OWNER":
      return "Your proposal is being reviewed";
    default:
      return "Proposal & Pricing";
  }
}

export function quoteLineAmountSuffix(line: QuoteLine): string {
  if (line.kind === "RECURRING" && line.interval === "MONTH") {
    return " / month";
  }
  return "";
}

export const DECLINE_NEUTRAL_MESSAGE =
  "This proposal is not moving forward at this time. If you have questions, contact Future Proof.";

export const DEPOSIT_READY_PAYMENT_NOTE =
  "Your deposit amount is shown below. Payment will be handled in the next step once that capability is available.";
