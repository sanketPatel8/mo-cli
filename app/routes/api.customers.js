import express from "express";
import mysql from "mysql2/promise";

const router = express.Router();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

router.get("/customers", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM stores ORDER BY updatedAt DESC LIMIT 1",
    );
    if (rows.length === 0) {
      return res
        .status(401)
        .json({ error: "No session found, please login first" });
    }

    const { shop, accessToken } = rows[0];

    // Call Shopify REST API
    const response = await fetch(
      `https://${shop}/admin/api/${process.env.SHOPIFY_API_VERSION}/customers.json`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    res.json(data.customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
