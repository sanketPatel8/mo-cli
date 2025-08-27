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

// export const loader = async ({ request }) => {
//   const authResult = await authenticate.admin(request);

//   if (authResult instanceof Response) return authResult;

//   const { session } = authResult;

//   const client = new shopify.api.clients.Rest({ session });

//   const response = await client.get({ path: "customers" });

//   console.log("Fetched customers:", response.body.customers);

//   return json({ customers: response.body.customers });
// };

// export default function CustomersPage() {
//   const { customers } = useLoaderData();

//   return (
//     <div>
//       <h1>Customer List</h1>
//       <ul>
//         {customers.map((c) => (
//           <li key={c.id}>
//             {c.first_name} {c.last_name}
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

export const loader = async ({ request }) => {
  const authResult = await authenticate.admin(request);

  if (authResult instanceof Response) {
    console.log("🔁 Redirecting to /auth/login");

    return authResult;
  }

  const { session } = authResult;

  console.log("✅ Loaded session:", session.scope);

  const client = new shopify.api.clients.Rest({ session });

  const response = await client.get({ path: "customers" });

  console.log("🎯 Customers:", response.body.customers);

  return json({ customers: response.body.customers });
};
