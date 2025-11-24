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
    // 1️⃣ Import your Shopify server file
    const { authenticate } = await import("~/shopify.server.js");

    // 2️⃣ Complete OAuth and get session
    const result = await authenticate.admin(request);

    if (!result) {
      console.error("❌ authenticate.admin returned null or undefined");
      throw new Response("Shopify authentication failed", { status: 401 });
    }

    const { session, shop } = result;

    if (!session || !shop) {
      console.error("❌ Session or shop missing", result);
      throw new Response("Shopify authentication failed", { status: 401 });
    }

    // 3️⃣ Read host query param from Shopify callback
    const url = new URL(request.url);
    const host = url.searchParams.get("host") || "";

    console.log("✅ Shopify store installed:", shop);

    // 4️⃣ Redirect to your Next.js app dashboard
    return redirect(
      `${process.env.SHOPIFY_NEXT_URI}/?shop=${encodeURIComponent(
        shop,
      )}&host=${encodeURIComponent(host)}`,
      { status: 302 },
    );
  } catch (error) {
    console.error("💥 /auth/callback loader error:", error);

    // Optional: redirect to error page instead of showing HTTP 500
    return redirect("/error?msg=Shopify+OAuth+failed");
  }
};

export default function AuthCallback() {
  return <div>🔄 Completing Shopify installation, please wait...</div>;
}
