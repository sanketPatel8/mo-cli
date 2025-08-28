import { json } from "@remix-run/node";
import pool from "~/db.server";

export async function action({ request }) {
  const payload = await request.json();

  // Send payload directly to Next.js
  await fetch(`${process.env.SHOPIFY_NEXT_URI}/api/receive-customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customers: [payload] }),
  });

  return json({ status: "ok" });
}
