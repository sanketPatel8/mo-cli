// app/routes/customers.jsx

import { json } from "@remix-run/node";

import { useLoaderData, Link } from "@remix-run/react";

import shopify from "../shopify.server"; // or wherever it's defined

export const loader = async ({ request }) => {
  const session = await shopify.auth.authenticate.admin(request); // same as your `authenticate.admin()`

  const client = new shopify.api.clients.Rest({ session });

  const response = await client.get({ path: "customers" });

  return json({ customers: response.body.customers });
};

export default function CustomersPage() {
  const { customers } = useLoaderData();

  return (
    <div>
      <h1>Customer List</h1>
      <ul>
        {customers.map((customer) => (
          <li key={customer.id}>
            <Link to={`/customers/${customer.id}`}>
              {customer.first_name} {customer.last_name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
