import { json } from "@remix-run/node";
import shopify, { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  console.log("👀 Customers loader called");

  // Step 1: Authenticate
  const authResult = await authenticate.admin(request);
  console.log("✅ Auth result:", authResult);

  if (authResult instanceof Response) {
    console.log("🔁 Redirecting to login...");
    return authResult; // redirect to auth if not logged in
  }

  // Step 2: Extract session
  const { session } = authResult;
  console.log("🛠 Session loaded:", {
    id: session.id,
    shop: session.shop,
    accessToken: session.accessToken ? "✔️ present" : "❌ missing",
  });

  try {
    // Step 3: Create REST client
    const client = new shopify.api.clients.Rest({ session });
    console.log("📡 REST client created");

    // Step 4: Fetch customers
    const response = await client.get({ path: "customers" });
    console.log("📥 Customers fetched:", response.body.customers?.length || 0);

    // Step 5: Return data
    return json({ customers: response.body.customers });
  } catch (error) {
    console.error("❌ Error fetching customers:", error);
    throw error;
  }
};
