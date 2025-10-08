// import shopify, { authenticate } from "../shopify.server";

// import { useLoaderData } from "@remix-run/react";
// import { getCustomerDetails } from "../utils/shopify-admin";

// export const loader = async ({ request }) => {
//   const { session, shop } = await authenticate.admin(request);

//   console.log("✅ Store URL:", shop);

//   console.log("✅ Access Token:", session.accessToken);

//   // ✅ Register webhook

//   try {
//     await shopify.webhooks.register({
//       path: "/webhooks/shopify",

//       topic: "CUSTOMERS_CREATE",

//       webhookHandler: async (topic, shop, body) => {
//         const payload = JSON.parse(body);

//         const customerId = payload.id;

//         console.log(`📦 Webhook received from ${shop}`);

//         console.log(`👤 New customer ID: ${customerId}`);

//         // ✅ Load session for the shop so we can call Admin API

//         const session = await shopify.sessionStorage.loadSession(shop, false);

//         if (session) {
//           const customer = await getCustomerDetails(session, customerId);

//           console.log("🎯 Fetched customer:", customer);
//         } else {
//           console.error("❌ No session found for shop:", shop);
//         }
//       },
//     });
//   } catch (err) {
//     console.error("❌ Webhook registration error:", err);
//   }

//   return { shop, accessToken: session.accessToken };
// };

// export default function AuthCallback() {
//   const { shop, accessToken } = useLoaderData();

//   return (
//     <div className="p-6">
//       <h1 className="text-xl font-bold">App Installed 🎉</h1>
//       <p>
//         <strong>Shop:</strong> {shop}
//       </p>
//       <p>
//         <strong>Access Token:</strong> {accessToken}
//       </p>
//       <p className="mt-4 text-gray-600">
//         You can close this tab and return to Shopify.
//       </p>
//     </div>
//   );
// }

// // // app/routes/auth.callback.js
// // import { redirect } from "@remix-run/node";
// // import shopify, { authenticate } from "../shopify.server";

// // const logError = (context, error) => {
// //   console.error(`❌ [${context}]`, error);
// // };

// // const ALLOWED_TOPICS = [
// //   "CUSTOMERS_CREATE",
// //   "CUSTOMERS_UPDATE",
// //   "ORDERS_CREATE",
// //   "ORDERS_PAID",
// //   "ORDERS_FULFILLED",
// // ];

// // export const loader = async ({ request }) => {
// //   try {
// //     console.log("🔑 Starting Shopify OAuth callback...");

// //     // Step 1: Authenticate with Shopify
// //     const authResponse = await authenticate.admin(request);

// //     // If Shopify returns a Response (usually a redirect), return it directly.
// //     if (authResponse instanceof Response) {
// //       console.log(
// //         "⚙️ Shopify returned redirect Response:",
// //         authResponse.status
// //       );
// //       return authResponse;
// //     }

// //     // Otherwise, proceed — means authentication is complete
// //     const { session, shop } = authResponse;
// //     console.log("✅ Auth complete for shop:", shop);
// //     console.log("🔑 Access Token:", session.accessToken);

// //     // Step 2: Register Webhooks
// //     for (const topic of ALLOWED_TOPICS) {
// //       try {
// //         await shopify.webhooks.register({
// //           path: "/webhooks/shopify",
// //           topic,
// //           webhookHandler: async (topic, shopName, body) => {
// //             try {
// //               const payload = JSON.parse(body);
// //               console.log(
// //                 `📬 Webhook received: ${topic} for ${shopName}`,
// //                 payload
// //               );
// //             } catch (handlerError) {
// //               logError("Webhook Handler", handlerError);
// //             }
// //           },
// //         });
// //         console.log(`📦 Webhook registered for topic: ${topic}`);
// //       } catch (webhookError) {
// //         logError(`Webhook Registration (${topic})`, webhookError);
// //       }
// //     }

// //     // Step 3: Redirect to Next.js admin dashboard
// //     const baseUri = process.env.SHOPIFY_NEXT_URI?.replace(/\/+$/, "");
// //     const url = new URL(baseUri);
// //     url.searchParams.set("shop", shop);
// //     console.log("➡️ Redirecting to frontend:", url.toString());

// //     return redirect(url.toString());
// //   } catch (authError) {
// //     logError("Shopify OAuth Callback", authError);
// //     return redirect("/auth/error");
// //   }
// // };

// // export default function AuthCallback() {
// //   return (
// //     <div className="p-6">
// //       <h1 className="text-xl font-bold">Redirecting...</h1>
// //       <p>
// //         Please return to your Shopify admin if not redirected automatically.
// //       </p>
// //     </div>
// //   );
// // }

// // import shopify, { authenticate } from "../shopify.server";

// // import { useLoaderData } from "@remix-run/react";
// // import { getCustomerDetails } from "../utils/shopify-admin";

// // export const loader = async ({ request }) => {
// //   const { session, shop } = await authenticate.admin(request);

// //   console.log("✅ Store URL:", shop);

// //   console.log("✅ Access Token:", session.accessToken);

// //   // ✅ Register webhook

// //   try {
// //     await shopify.webhooks.register({
// //       path: "/webhooks/shopify",

// //       topic: "CUSTOMERS_CREATE",

// //       webhookHandler: async (topic, shop, body) => {
// //         const payload = JSON.parse(body);

// //         const customerId = payload.id;

// //         console.log(`📦 Webhook received from ${shop}`);

// //         console.log(`👤 New customer ID: ${customerId}`);

// //         // ✅ Load session for the shop so we can call Admin API

// //         const session = await shopify.sessionStorage.loadSession(shop, false);

// //         if (session) {
// //           const customer = await getCustomerDetails(session, customerId);

// //           console.log("🎯 Fetched customer:", customer);
// //         } else {
// //           console.error("❌ No session found for shop:", shop);
// //         }
// //       },
// //     });
// //   } catch (err) {
// //     console.error("❌ Webhook registration error:", err);
// //   }

// //   return { shop, accessToken: session.accessToken };
// // };

// // export default function AuthCallback() {
// //   const { shop, accessToken } = useLoaderData();

// //   return (
// //     <div className="p-6">
// //       <h1 className="text-xl font-bold">App Installed 🎉</h1>
// //       <p>
// //         <strong>Shop:</strong> {shop}
// //       </p>
// //       <p>
// //         <strong>Access Token:</strong> {accessToken}
// //       </p>
// //       <p className="mt-4 text-gray-600">
// //         You can close this tab and return to Shopify.
// //       </p>
// //     </div>
// //   );
// // }

// // import { redirect } from "@remix-run/node";
// // import shopify, { authenticate } from "../shopify.server.js";

// // // Utility for logging
// // const logError = (context, error) => {
// //   console.error(`❌ [${context}]`, error);
// // };

// // export const loader = async ({ request }) => {
// //   try {
// //     console.log("🔑 Starting Shopify OAuth callback...");

// //     // 1️⃣ Authenticate Shopify session
// //     const { session, shop } = await authenticate.admin(request);
// //     console.log("✅ Auth complete for shop:", shop);

// //     // 3️⃣ Redirect to frontend with JWT (safe)
// //     const baseUri = process.env.SHOPIFY_NEXT_URI.replace(/\/+$/, "");
// //     const redirectUrl = `${baseUri}/?shop=${shop}&token=${session.accessToken}`;

// //     console.log("➡️ Redirecting to frontend:", redirectUrl);
// //     return redirect(redirectUrl);
// //   } catch (authError) {
// //     logError("Shopify OAuth Callback", authError);
// //     return redirect("/auth/error");
// //   }
// // };

// import { redirect } from "@remix-run/node";

// export async function loader({ request }) {
//   const { default: shopify } = await import("../shopify.server.js");

//   // 1️⃣ Complete OAuth and save the session
//   const { session } = await shopify.authenticate.admin(request);

//   const url = new URL(request.url);
//   const shop = (url.searchParams.get("shop") || "").toLowerCase();
//   const host = url.searchParams.get("host") || "";

//   console.log("✅ Auth complete for shop:", shop);

//   console.log("🔑 Access Token:", session.accessToken);

//   // return redirect(
//   //   `https://shopify.myoperator.com/?shop=${encodeURIComponent(
//   //     shop
//   //   )}&host=${encodeURIComponent(host)}`,
//   //   { status: 302 }
//   // );
// }

// =========================================================new code below=========================================================

// app/routes/auth.callback.jsx
// import { redirect } from "@remix-run/node";

// export async function loader({ request }) {
//   const { default: shopify } = await import("../shopify.server.js");
//   const { default: pool } = await import("../db.server.js");

//   console.log("[callback] HIT", new URL(request.url).toString());

//   // 1) Finish OAuth (this also stores session via sessionStorage)
//   const { session } = await shopify.authenticate.admin(request);

//   // 2) Persist to your own table (for Next.js)
//   try {
//     await pool.query(
//       `INSERT INTO stores (id, shop, access_token, sessionData, updated_at)
//        VALUES (?, ?, ?, ?, NOW())
//        ON DUPLICATE KEY UPDATE
//          access_token = VALUES(access_token),
//          sessionData = VALUES(sessionData),
//          updated_at = NOW()`,
//       [session.id, session.shop, session.accessToken, JSON.stringify(session)],
//     );
//     console.log("[callback] DB saved", {
//       shop: session.shop,
//       id: session.id,
//       online: session.isOnline,
//     });
//   } catch (e) {
//     console.error("[callback] DB save failed", e);
//     // optionally: throw or continue
//   }

//   // 3) (Optional) register webhooks here too (defensive)
//   try {
//     await shopify.registerWebhooks({ session });
//   } catch (e) {
//     console.error("[callback] webhook reg failed", e);
//   }

//   // 4) redirect to Next.js UI
//   const u = new URL(request.url);
//   const shop = (u.searchParams.get("shop") || "").toLowerCase();
//   const host = u.searchParams.get("host") || "";
//   console.log("[callback] redirecting to Next", { shop, host });

//   return redirect(
//     `https://shopify.myoperator.com/?shop=${encodeURIComponent(
//       shop,
//     )}&host=${encodeURIComponent(host)}`,
//     { status: 302 },
//   );
// }

import { redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  const { authenticate } = await import("~/shopify.server.js");
  const { session, shop } = await authenticate.admin(request);

  if (!session || !shop) {
    throw new Response("Shopify authentication failed", { status: 401 });
  }

  // ✅ Ensure host param exists
  const url = new URL(request.url);
  const host = url.searchParams.get("host");

  console.log("✅ Store installed:", shop);

  // ✅ Proper redirect to your Next.js admin panel
  return redirect(
    `https://shopify.myoperator.com/?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host || "")}`,
    { status: 302 },
  );
};
