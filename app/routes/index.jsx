// app/routes/_index.jsx
import { redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) {
    return redirect("/auth?shop=myshop.myshopify.com");
  }

  console.log("🏠 [Index] Loaded for shop:", shop);
  return null;
};

export default function Index() {
  return <div>✅ Shopify app installed successfully!</div>;
}
