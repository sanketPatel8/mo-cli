import { json } from "@remix-run/node";
import pool from "../../db.server"; // your mysql connection

export const action = async ({ request }) => {
  const { shop } = await request.json();

  const [rows] = await pool.query(
    "SELECT company_id FROM stores WHERE shop = ? LIMIT 1",
    [shop],
  );

  if (rows.length > 0) {
    const { company_id } = rows[0];
    return json({
      exists: true,
      company_id,
    });
  }

  return json({ exists: false });
};
