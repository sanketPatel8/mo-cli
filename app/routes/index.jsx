import { Link } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  return authenticate.admin(request); // ✅ okay here, since it's the handler
};

export default function Index() {
  return (
    <div>
      <h1>Welcome to your Shopify Remix App</h1>
      <Link to="/customers">View Customers</Link>
    </div>
  );
}
