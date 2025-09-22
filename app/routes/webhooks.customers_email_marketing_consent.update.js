import { handleWebhook } from "../utils/webhookHandler";

export async function action({ request }) {
  return handleWebhook(
    request,
    "customers_email_marketing_consent/update",
    "customers-email-marketing-consent-update",
  );
}
