// import { json } from "@remix-run/node";
// import { useLoaderData } from "@remix-run/react";
// import shopify, { authenticate } from "../shopify.server";

// export const loader = async ({ request }) => {
//   console.log("👀 Customers loader called");

//   try {
//     const authResult = await authenticate.admin(request);

//     if (authResult instanceof Response) {
//       console.log("🔁 Redirect triggered by Shopify auth");
//       return authResult; // ✅ stop here
//     }

//     // if we're here, we KNOW session exists
//     const { session } = authResult;
//     console.log("✅ Session loaded for shop:", session.shop);

//     const client = new shopify.api.clients.Rest({ session });
//     const response = await client.get({ path: "customers" });

//     console.log(
//       `🎯 Retrieved ${response.body.customers?.length || 0} customers`,
//     );

//     return json({ customers: response.body.customers || [] });
//   } catch (error) {
//     console.error("❌ Error in customers loader:", error);
//     throw error;
//   }
// };

// export default function CustomersPage() {
//   const { customers } = useLoaderData();

//   return (
//     <div>
//       <h1>Shopify Customers</h1>
//       {customers.length === 0 ? (
//         <p>No customers found.</p>
//       ) : (
//         <ul>
//           {customers.map((c) => (
//             <li key={c.id}>
//               {c.first_name} {c.last_name} {c.email && `(${c.email})`}
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }

// app/routes/customers.jsx
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useActionData } from "@remix-run/react";
import shopify, { authenticate } from "../shopify.server";

// Helper: normalize authenticate to always return { session }
async function ensureAuth(request) {
  try {
    const authResult = await authenticate.admin(request);

    if (authResult instanceof Response) {
      console.log(
        "🔁 Redirecting (ensureAuth):",
        authResult.headers?.get?.("location"),
      );
      return authResult;
    }

    return authResult;
  } catch (err) {
    if (err instanceof Response) {
      console.log(
        "🔁 Thrown redirect (ensureAuth):",
        err.headers?.get?.("location"),
      );
      return err;
    }
    console.error("❌ Auth error:", err);
    throw err;
  }
}

/**
 * Loader: fetch customers list
 */
export const loader = async ({ request }) => {
  console.log("👀 Customers loader called");
  const authResult = await ensureAuth(request);

  if (authResult instanceof Response) return authResult; // redirect if no session

  const { session } = authResult;
  console.log("✅ Session loaded for shop:", session.shop);

  try {
    const client = new shopify.api.clients.Rest({ session });
    const response = await client.get({
      path: "customers",
      query: { limit: 20, order: "created_at desc" },
    });

    const customers = response?.body?.customers || [];
    console.log(`🎯 Retrieved ${customers.length} customers`);

    return json({ customers });
  } catch (err) {
    console.error("❌ Error fetching customers:", err);
    return json(
      { customers: [], error: "Failed to fetch customers" },
      { status: 500 },
    );
  }
};

/**
 * Action: create a new customer
 */
export const action = async ({ request }) => {
  console.log("📝 Customers action called");
  const authResult = await ensureAuth(request);

  if (authResult instanceof Response) return authResult;

  const { session } = authResult;
  const form = await request.formData();

  const first_name = form.get("first_name")?.trim();
  const last_name = form.get("last_name")?.trim();
  const email = form.get("email")?.trim();

  if (!first_name || !email) {
    return json(
      { error: "⚠️ First name and email are required" },
      { status: 422 },
    );
  }

  try {
    const client = new shopify.api.clients.Rest({ session });
    const response = await client.post({
      path: "customers",
      data: {
        customer: {
          first_name,
          last_name,
          email,
        },
      },
      type: "application/json",
    });

    const newCustomer = response?.body?.customer;
    console.log("✅ Customer created:", newCustomer?.id);

    return redirect("/customers");
  } catch (err) {
    console.error("❌ Error creating customer:", err);
    return json(
      { error: err.message || "Failed to create customer" },
      { status: 500 },
    );
  }
};

/**
 * UI Component
 */
export default function CustomersPage() {
  const { customers, error } = useLoaderData();
  const actionData = useActionData();

  return (
    <div style={{ padding: 24 }}>
      <h1>👥 Shopify Customers</h1>

      {/* Customer creation form */}
      <section style={{ marginBottom: 20 }}>
        <h2>Create new customer</h2>
        <Form method="post">
          <div>
            <label>
              First name: <input name="first_name" required />
            </label>
          </div>
          <div>
            <label>
              Last name: <input name="last_name" />
            </label>
          </div>
          <div>
            <label>
              Email: <input name="email" type="email" required />
            </label>
          </div>
          <button type="submit" style={{ marginTop: 8 }}>
            ➕ Create customer
          </button>
        </Form>

        {actionData?.error && (
          <p style={{ color: "red" }}>{actionData.error}</p>
        )}
      </section>

      {/* Customer list */}
      <section>
        <h2>Customer list ({customers?.length || 0})</h2>
        {error && <p style={{ color: "red" }}>⚠️ {error}</p>}
        {!customers || customers.length === 0 ? (
          <p>No customers found</p>
        ) : (
          <ul>
            {customers.map((c) => (
              <li key={c.id}>
                <strong>
                  {c.first_name} {c.last_name}
                </strong>{" "}
                {c.email && `(${c.email})`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
