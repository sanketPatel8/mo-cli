// app/routes/customers.jsx

import { json } from "@remix-run/node";

import { useLoaderData } from "@remix-run/react";

import shopify, { authenticate } from "../shopify.server"; // adjust path

// export const loader = async ({ request }) => {
//   try {
//     const session = await authenticate.admin(request);

//     if (!session) {
//       throw new Error(
//         "No Shopify session found — maybe not embedded or session expired?",
//       );
//     }

//     const client = new shopify.api.clients.Rest({ session });

//     const response = await client.get({ path: "customers" });

//     if (!response?.body?.customers) {
//       throw new Error("Shopify response missing customers field");
//     }

//     return json({ customers: response.body.customers });
//   } catch (error) {
//     console.error("Error loading customers:", {
//       message: error?.message,

//       stack: error?.stack,
//     });

//     throw new Response(`Loader error: ${error.message}`, { status: 500 });
//   }
// };

export const loader = async ({ request }) => {
  try {
    const session = await authenticate.admin(request);

    const client = new shopify.api.clients.Rest({ session });

    const response = await client.get({ path: "customers" });

    return json({ customers: response.body.customers });
  } catch (error) {
    console.error("Raw error loading customers:", error);

    // Try to extract a message if possible

    let message = "Unknown error";

    if (typeof error === "string") {
      message = error;
    } else if (error instanceof Error) {
      message = error.message;
    } else if (error && typeof error === "object" && "message" in error) {
      message = error.message;
    }

    throw new Response(`Loader error: ${message}`, { status: 500 });
  }
};

export default function CustomersPage() {
  const { customers } = useLoaderData();

  return (
    <div>
      <h1>Customer List</h1>
      <ul>
        {customers.map((c) => (
          <li key={c.id}>
            {c.first_name} {c.last_name}
          </li>
        ))}
      </ul>
    </div>
  );
}
