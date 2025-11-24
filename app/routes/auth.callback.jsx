import { redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  const { authenticate } = await import("~/shopify.server.js");
  const { session, shop } = await authenticate.admin(request);

  if (!session || !shop) {
    throw new Response("Shopify authentication failed", { status: 401 });
  }

  const url = new URL(request.url);
  const host = url.searchParams.get("host");

  console.log("✅ Store installed:", shop);

  return redirect(
    `${process.env.SHOPIFY_NEXT_URI}/?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host || "")}`,
    { status: 302 },
  );
};
