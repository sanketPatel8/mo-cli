// import { redirect } from "@remix-run/node";

// export const loader = async ({ request }) => {
//   const { authenticate } = await import("~/shopify.server.js");
//   const { session, shop } = await authenticate.admin(request);

//   if (!session || !shop) {
//     throw new Response("Shopify authentication failed", { status: 401 });
//   }

//   const url = new URL(request.url);
//   const host = url.searchParams.get("host");

//   console.log("✅ Store installed:", shop);

//   return redirect(
//     `${process.env.SHOPIFY_NEXT_URI}/?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host || "")}`,
//     { status: 302 },
//   );
// };

import { redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  try {
    const { authenticate } = await import("~/shopify.server.js");

    // Make sure authenticate.admin returns object
    const result = await authenticate.admin(request);

    if (!result) {
      console.error("❌ authenticate.admin returned undefined/null");
      throw new Response("Shopify authentication failed", { status: 401 });
    }

    const { session, shop } = result;

    if (!session || !shop) {
      console.error("❌ session or shop missing", result);
      throw new Response("Shopify authentication failed", { status: 401 });
    }

    const url = new URL(request.url);
    const host = url.searchParams.get("host");

    console.log("✅ Store installed:", shop);

    return redirect(
      `${process.env.SHOPIFY_NEXT_URI}/?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host || "")}`,
      { status: 302 },
    );
  } catch (error) {
    console.error("💥 /auth/callback loader error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
