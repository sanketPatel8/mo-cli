import { handleWebhook } from "../utils/webhookHandler";

export async function action({ request }) {
  return handleWebhook(
    request,
    "customer_payment_methods/create",
    "customer-payment-methods-create",
  );
}
