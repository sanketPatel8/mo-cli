import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  // Handles /auth/login, /auth/exit-iframe, etc.

  return authenticate.admin(request);
};

export default function AuthCatchAll() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Authenticating...</h1>
      <p>Please wait while we complete authentication with Shopify.</p>
    </div>
  );
}
