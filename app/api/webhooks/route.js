// // app/api/webhooks/route.js
// import { NextResponse } from "next/server";

// export async function POST(req) {
//   const body = await req.json();

//   console.log("📬 Compliance webhook received:", body);

//   const topic = req.headers.get("x-shopify-topic");

//   //   switch (topic) {
//   //     case "customers/data_request":
//   //       // Return customer data here (usually from your DB)
//   //       console.log("📄 Customer data request:", body);
//   //       break;

//   //     case "customers/redact":
//   //       // Delete customer data here
//   //       console.log("🗑️ Customer delete request:", body);
//   //       break;

//   //     case "shop/redact":
//   //       // Delete all shop data
//   //       console.log("🗑️ Shop delete request:", body);
//   //       break;

//   //     default:
//   //       console.log("⚠️ Unknown compliance topic:", topic);
//   //   }

//   return NextResponse.json({ success: true });
// }

import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req) {
  const body = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const generatedHash = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET || "")
    .update(body, "utf8")
    .digest("base64");

  if (generatedHash !== hmac)
    return new NextResponse("Unauthorized", { status: 401 });

  console.log("Webhook received:", body);
  return NextResponse.json({ success: true });
}
