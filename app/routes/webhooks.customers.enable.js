import { handleWebhook } from "../utils/webhookHandler";

export async function action({ request }) {
  return handleWebhook(request, "customers/enable", "customers-enable");
}
