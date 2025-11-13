import { redirect } from "@remix-run/node";

export async function loader({ request }) {
  console.log("🚀 [_index] Loader triggered");

  const url = new URL(request.url);
  const shop = (url.searchParams.get("shop") || "").toLowerCase().trim();
  const host = url.searchParams.get("host") || "";

  console.log("🧩 Params:", { shop, host });

  if (!shop || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
    console.error("❌ Invalid or missing ?shop param");
    return new Response("❌ Missing or invalid ?shop=", { status: 400 });
  }

  try {
    console.log("📦 Importing shopify.server.js...");
    const { authenticate } = await import("~/shopify.server.js");
    console.log("✅ Import success, calling authenticate.admin()...");

    // ✅ This automatically loads session via session_id in MySQL
    const { session } = await authenticate.admin(request);

    if (!session) {
      console.warn("⚠️ No session found or invalid session");
      return new Response("Unauthorized", { status: 401 });
    }

    console.log("✅ Session loaded:", {
      id: session.id,
      shop: session.shop,
      hasAccessToken: !!session.accessToken,
    });

    const redirectUrl = `https://shopify.myoperator.com/?shop=${encodeURIComponent(
      shop,
    )}&host=${encodeURIComponent(host)}`;

    console.log("➡️ Redirecting to:", redirectUrl);
    return redirect(redirectUrl);
  } catch (error) {
    if (error instanceof Response) {
      console.warn("🔁 Shopify OAuth redirect:", error.status);
      return error;
    }

    console.error("💥 Unexpected loader error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export default function Index() {
  return <div>🔄 Redirecting to your Shopify app...</div>;
}
