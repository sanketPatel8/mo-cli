import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import shopify, { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  console.log("👀 Customers loader called");

  try {
    const authResult = await authenticate.admin(request);

    if (authResult instanceof Response) {
      console.log("🔁 Redirect triggered by Shopify auth");
      return authResult; // ✅ stop here
    }

    // if we're here, we KNOW session exists
    const { session } = authResult;
    console.log("✅ Session loaded for shop:", session.shop);

    const client = new shopify.api.clients.Rest({ session });
    const response = await client.get({ path: "customers" });

    console.log(
      `🎯 Retrieved ${response.body.customers?.length || 0} customers`,
    );

    return json({ customers: response.body.customers || [] });
  } catch (error) {
    console.error("❌ Error in customers loader:", error);
    throw error;
  }
};

export default function CustomersPage() {
  const { customers } = useLoaderData();

  return (
    <div>
      <h1>Shopify Customers</h1>
      {customers.length === 0 ? (
        <p>No customers found.</p>
      ) : (
        <ul>
          {customers.map((c) => (
            <li key={c.id}>
              {c.first_name} {c.last_name} {c.email && `(${c.email})`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
