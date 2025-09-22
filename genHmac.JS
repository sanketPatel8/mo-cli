import crypto from "node:crypto";

const secret = "your_shopify_webhook_secret";

// EXACT string from your curl -d argument
const payload =
  '{"id":1234567890,"email":"customer@example.com","total_price":"99.99","line_items":[{"id":111,"title":"Test Product","quantity":1,"price":"99.99"}]}';

const hmac = crypto
  .createHmac("sha256", secret)
  .update(payload, "utf8")
  .digest("base64");

console.log(hmac);


