import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

function getOrderStatus(order) {
  // Cancelled
  if (order.cancelled_at) return "Order Cancelled";

  // Refund
  if (order.financial_status === "refunded") return "Refund Created";

  // Payment
  if (order.financial_status === "paid") return "Payment Received";
  if (order.financial_status === "pending") return "Payment Pending";

  // Shipping
  if (order.fulfillment_status === "fulfilled") return "Order Delivered";
  if (order.fulfillment_status === "partial") return "Order Out for Delivery";
  if (order.fulfillment_status === "unfulfilled" && order.confirmed)
    return "Order Placed";

  return "Unknown";
}

export async function loader() {
  try {
    // 1) Get latest session
    const [rows] = await pool.query(
      "SELECT * FROM stores ORDER BY updatedAt DESC LIMIT 1",
    );

    if (rows.length === 0) {
      return json({ orders: [] });
    }

    const { shop, accessToken } = rows[0];

    // 2) Build Orders API URL
    const url = `https://${shop}/admin/api/2025-07/orders.json?limit=20&status=any`;

    // 3) Fetch orders
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    const orders = (data.orders || []).map((o) => ({
      id: o.id,
      name: o.name,
      email: o.email,
      total: o.total_price,
      financial_status: o.financial_status,
      fulfillment_status: o.fulfillment_status,
      cancelled_at: o.cancelled_at,
      confirmed: o.confirmed,
      status: getOrderStatus(o), // ✅ normalized status
    }));

    return json({ orders });
  } catch (err) {
    console.error("orders.loader — error:", err);
    return json({ orders: [], error: String(err) }, { status: 500 });
  }
}

export default function OrdersPage() {
  const { orders } = useLoaderData();

  return (
    <div>
      <h1>Orders with Status</h1>
      <ul>
        {orders?.map((o) => (
          <li key={o.id}>
            <strong>{o.name}</strong> - {o.total} ({o.email || "No email"})
            <br />
            <em>Status: {o.status}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}
