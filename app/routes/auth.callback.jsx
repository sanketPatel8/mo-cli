import { authenticate } from "../shopify.server";

import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }) => {
  const { session, shop } = await authenticate.admin(request);

  // ✅ Log to Vercel logs

  console.log("✅ Store URL:", shop);

  console.log("✅ Access Token:", session.accessToken);

  // Pass to component (not required but useful for debug)

  return { shop, accessToken: session.accessToken };
};

export default function AuthCallback() {
  const { shop, accessToken } = useLoaderData();

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">App Installed 🎉</h1>
      <p>
        <strong>Shop:</strong> {shop}
      </p>
      <p>
        <strong>Access Token:</strong> {accessToken}
      </p>
      <p className="mt-4 text-gray-600">
        You can close this tab and return to Shopify.
      </p>
    </div>
  );
}
