// app/routes/customers.$customerId.jsx

import { json, useLoaderData } from "@remix-run/react";

import { getCustomerDetails } from "../utils/shopify-admin";

import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }) => {
  const session = await authenticate.admin(request);

  const customer = await getCustomerDetails(session, params.customerId);

  return json({ customer });
};

export default function CustomerPage() {
  const { customer } = useLoaderData();

  return (
    <div>
      <h1>Customer Details</h1>
      <p>
        <strong>ID:</strong> {customer.id}
      </p>
      <p>
        <strong>Name:</strong> {customer.first_name} {customer.last_name}
      </p>
      <p>
        <strong>Email:</strong> {customer.email || "Not provided"}
      </p>
      <p>
        <strong>Phone:</strong> {customer.phone || "Not provided"}
      </p>
      <p>
        <strong>Orders Count:</strong> {customer.orders_count}
      </p>
    </div>
  );
}
