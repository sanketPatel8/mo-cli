export async function getCustomerDetails(session, customerId) {
  const res = await fetch(
    `https://${session.shop}/admin/api/2025-07/customers/${customerId}.json`,
    {
      method: "GET",

      headers: {
        "X-Shopify-Access-Token": session.accessToken,

        "Content-Type": "application/json",
      },
    },
  );

  const data = await res.json();

  console.log(data, "customer data");

  return data.customer;
}

export async function getOrderDetails(session, orderId) {
  const res = await fetch(
    `https://${session.shop}/admin/api/2023-04/orders/${orderId}.json`,
    {
      method: "GET",

      headers: {
        "X-Shopify-Access-Token": session.accessToken,

        "Content-Type": "application/json",
      },
    },
  );

  const data = await res.json();

  return data.order;
}
