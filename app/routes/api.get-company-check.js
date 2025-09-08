// import { json } from "@remix-run/node";
// import pool from "../../db.server"; // your mysql connection

// export const action = async ({ request }) => {
//   const { shop } = await request.json();

//   const [rows] = await pool.query(
//     "SELECT company_id FROM stores WHERE shop = ? LIMIT 1",
//     [shop],
//   );

//   if (rows.length > 0) {
//     const { company_id } = rows[0];
//     return json({
//       exists: true,
//       company_id,
//     });
//   }

//   return json({ exists: false });
// };

import { json } from "@remix-run/node";
import pool from "../../db.server"; // your mysql connection

export const action = async ({ request }) => {
  try {
    const { shop } = await request.json();

    const [rows] = await pool.query(
      "SELECT company_id FROM stores WHERE shop = ? LIMIT 1",
      [shop],
    );

    console.log(rows, "rows");

    if (rows.length > 0) {
      const { company_id } = rows[0];

      if (company_id) {
        return json({
          exists: true,
          company_id,
        });
      } else {
        return json({
          exists: false,
          message: "Company ID is null for this shop",
        });
      }
    }

    return json({ exists: false, message: "Shop not found" });
  } catch (error) {
    console.error("❌ Error in action:", error);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
};
