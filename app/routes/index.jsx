import { Link } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export default function Index() {
  return (
    <div>
      <h1>Welcome to your Shopify Remix App</h1>
      <Link to="/customers">View Customers</Link>
    </div>
  );
}
