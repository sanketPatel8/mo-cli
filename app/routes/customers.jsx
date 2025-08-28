// import { json } from "@remix-run/node";
// import { useLoaderData } from "@remix-run/react";
// import mysql from "mysql2/promise";

// const pool = mysql.createPool({
//   host: process.env.MYSQL_HOST,
//   user: process.env.MYSQL_USER,
//   password: process.env.MYSQL_PASSWORD, // your db password
//   database: process.env.MYSQL_DATABASE, // your db name
// });

// export async function loader() {
//   console.log("🔔 customers.loader — start");

//   try {
//     // 1) Query sessions table
//     console.log("1) Querying sessions table (most recent session)...");
//     const [rows] = await pool.query(
//       "SELECT * FROM sessions ORDER BY updatedAt DESC LIMIT 1",
//     );
//     console.log(`2) Sessions rows found: ${rows.length}`);

//     // 2) If no session, return early
//     if (rows.length === 0) {
//       console.log("3) No session found -> returning empty customers list");
//       return json({ customers: [] });
//     }

//     // 3) Use session row
//     const { shop, accessToken } = rows[0];
//     const accessTokenMasked = accessToken
//       ? `${accessToken.slice(0, 6)}...${accessToken.slice(-6)}`
//       : "none";

//     console.log("4) Using session -> shop:", shop);
//     console.log(
//       "   accessToken present:",
//       !!accessToken,
//       "masked:",
//       accessTokenMasked,
//     );

//     // 4) Build request URL & headers
//     const url = `https://${shop}/admin/api/2025-07/customers.json?limit=20`;
//     console.log("5) Calling Shopify REST endpoint:", url);

//     // 5) Fetch from Shopify
//     const response = await fetch(url, {
//       method: "GET",
//       headers: {
//         "X-Shopify-Access-Token": accessToken,
//         "Content-Type": "application/json",
//       },
//     });

//     console.log(
//       "6) Shopify response status:",
//       response.status,
//       response.statusText,
//       response,
//     );

//     // 6) Read & parse response body safely
//     const text = await response.text();
//     let data;
//     try {
//       data = text ? JSON.parse(text) : {};
//     } catch (parseErr) {
//       console.error("❌ Failed to parse Shopify response JSON:", parseErr);
//       console.log("▶️ Raw response body:", text);
//       throw parseErr;
//     }

//     const customers = data.customers || [];
//     console.log(`7) Parsed customers count: ${customers.length}`);

//     try {
//       const nextApiUrl = `${process.env.SHOPIFY_NEXT_URI}/api/receive-customers`;

//       const sendResponse = await fetch(nextApiUrl, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ customers }),
//       });

//       const sendResult = await sendResponse.json();
//       console.log("📤 Sent customers to Next.js API:", sendResult);
//     } catch (sendErr) {
//       console.error("❌ Failed to send customers to Next.js API:", sendErr);
//     }

//     // 7) Log first few customer summaries (avoid giant dumps)
//     if (customers.length > 0) {
//       console.log("8) Sample customers (first 5):");
//       customers.slice(0, 5).forEach((c, i) => {
//         console.log(
//           `   ${i + 1}) id=${c.id} name=${c.first_name || ""} ${c.last_name || ""} email=${
//             c.email || "N/A"
//           }`,
//         );
//       });
//     }

//     console.log("🔔 customers.loader — end (success)");
//     return json({ customers });
//   } catch (err) {
//     console.error("❌ customers.loader — error:", err);
//     return json({ customers: [], error: String(err) }, { status: 500 });
//   }
// }

// export default function CustomersPage() {
//   const { customers } = useLoaderData();

//   console.log(customers, "customers");

//   return (
//     <div>
//       <h1>Customers</h1>
//       <ul>
//         {customers?.map((c) => (
//           <li key={c.id}>
//             {c.first_name} {c.last_name} ({c.email})
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

export async function loader() {
  console.log("🔔 customers.loader — start");

  try {
    // 1) Get latest Shopify session from MySQL
    const [rows] = await pool.query(
      "SELECT * FROM sessions ORDER BY updatedAt DESC LIMIT 1",
    );

    if (rows.length === 0) {
      console.log("❌ No session found, returning empty");
      return json({ customers: [] });
    }

    const { shop, accessToken } = rows[0];

    // 2) Fetch customers from Shopify
    const url = `https://${shop}/admin/api/2025-07/customers.json?limit=20`;
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Shopify API error: ${response.status} ${response.statusText}`,
      );
    }

    const { customers = [] } = await response.json();
    console.log(`✅ Shopify returned ${customers.length} customers`);

    // 3) Forward customers to Next.js API
    try {
      const nextApiUrl = `${process.env.SHOPIFY_NEXT_URI}/api/receive-customers`;
      const sendResponse = await fetch(nextApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customers }),
      });

      console.log(
        "📤 Sent customers to Next.js API, status:",
        sendResponse.status,
      );
    } catch (err) {
      console.error("❌ Failed to forward to Next.js:", err);
    }

    // 4) Return to Remix UI (optional)
    return json({ customers });
  } catch (err) {
    console.error("❌ customers.loader error:", err);
    return json({ customers: [], error: String(err) }, { status: 500 });
  }
}

export default function CustomersPage() {
  const { customers } = useLoaderData();

  return (
    <div>
      <h1>Customers (from Shopify → sent to Next.js)</h1>
      <ul>
        {customers.map((c) => (
          <li key={c.id}>
            {c.first_name} {c.last_name} ({c.email})
          </li>
        ))}
      </ul>
    </div>
  );
}
