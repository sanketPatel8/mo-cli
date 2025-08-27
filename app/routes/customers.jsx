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

async function ensureAuth(request) {
  // Some versions of the adapter return a Response, others throw it.
  try {
    const authResult = await authenticate.admin(request);
    if (authResult instanceof Response) {
      console.log("🔁 authenticate.admin returned a Response -> redirect");
      return authResult; // return the redirect Response
    }
    return authResult; // session object
  } catch (err) {
    // If the library throws a Response (redirect), return it so Remix will redirect.
    if (err instanceof Response) {
      console.log("🔁 authenticate.admin threw a Response -> redirect");
      return err;
    }
    // any other error -> rethrow
    throw err;
  }
}

export const loader = async ({ request }) => {
  console.log("👀 Customers loader called");
  const authResult = await ensureAuth(request);
  if (authResult instanceof Response) {
    // either returned or thrown => redirect to login flow
    console.log(
      "➡️ Redirecting (loader) to:",
      authResult.headers?.get?.("location"),
    );
    return authResult;
  }

  // we have a valid session
  const { session } = authResult;
  console.log("✅ Session loaded for shop:", session.shop);

  const client = new shopify.api.clients.Rest({ session });
  const response = await client.get({
    path: "customers",
    query: { limit: 20 },
  });

  const customers = response?.body?.customers || [];
  console.log(`🎯 Retrieved ${customers.length} customers`);
  return json({ customers });
};

export const action = async ({ request }) => {
  console.log("📝 Customers action called");
  const authResult = await ensureAuth(request);
  if (authResult instanceof Response) {
    console.log(
      "➡️ Redirecting (action) to:",
      authResult.headers?.get?.("location"),
    );
    return authResult;
  }

  const { session } = authResult;
  const form = await request.formData();
  const first_name = form.get("first_name");
  const last_name = form.get("last_name");
  const email = form.get("email");

  if (!first_name || !email) {
    return json(
      { error: "first_name and email are required" },
      { status: 422 },
    );
  }

  try {
    const client = new shopify.api.clients.Rest({ session });
    const response = await client.post({
      path: "customers",
      data: { customer: { first_name, last_name, email } },
      type: "application/json",
    });

    console.log("✅ Customer created:", response.body.customer?.id);
    // After creating, redirect back to the GET route so loader refreshes list
    return redirect("/customers");
  } catch (err) {
    console.error("❌ create customer error:", err);
    return json({ error: err.message || String(err) }, { status: 500 });
  }
};

export default function CustomersPage() {
  const { customers } = useLoaderData();
  const actionData = useActionData();

  return (
    <div style={{ padding: 24 }}>
      <h1>Shopify Customers</h1>

      <section style={{ marginBottom: 20 }}>
        <h2>Create new customer</h2>
        <Form method="post">
          <div>
            <label>
              First name: <input name="first_name" />
            </label>
          </div>
          <div>
            <label>
              Last name: <input name="last_name" />
            </label>
          </div>
          <div>
            <label>
              Email: <input name="email" type="email" />
            </label>
          </div>
          <button type="submit" style={{ marginTop: 8 }}>
            Create customer
          </button>
        </Form>
        {actionData?.error && (
          <p style={{ color: "red" }}>{actionData.error}</p>
        )}
      </section>

      <section>
        <h2>Customer list ({customers?.length || 0})</h2>
        {customers?.length === 0 ? (
          <p>No customers</p>
        ) : (
          <ul>
            {customers.map((c) => (
              <li key={c.id}>
                {c.first_name} {c.last_name} {c.email && `(${c.email})`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
