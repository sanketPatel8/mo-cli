import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { DeliveryMethod, Session } from "@shopify/shopify-api"; // ✅ removed Webhooks
import pool from "./db.server.js";

// 🛠 Helper for error logging
function logError(context, error) {
  console.error(`❌ [${context}]`, {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });
}

// ✅ MySQL Session Storage
class MySQLSessionStorage {
  async storeSession(session) {
    try {
      const sessionData = JSON.stringify(session);

      await pool.query(
        `INSERT INTO stores (id, shop, access_token, sessionData, updated_at)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           access_token = VALUES(access_token),
           sessionData = VALUES(sessionData),
           updated_at = NOW()`,
        [session.id, session.shop, session.accessToken, sessionData],
      );

      return true;
    } catch (error) {
      logError("Store Session", error);
      throw error;
    }
  }

  async loadSession(id) {
    try {
      const [rows] = await pool.query(
        `SELECT sessionData FROM stores WHERE id = ?`,
        [id],
      );

      if (rows.length === 0) return undefined;
      const rawData = JSON.parse(rows[0].sessionData);

      return Session.fromPropertyArray(Object.entries(rawData));
    } catch (error) {
      logError("Load Session", error);
      return undefined;
    }
  }

  async findSessionsByShop(shop) {
    try {
      const [rows] = await pool.query(
        `SELECT sessionData FROM stores WHERE shop = ?`,
        [shop],
      );

      return rows.map((row) =>
        Session.fromPropertyArray(Object.entries(JSON.parse(row.sessionData))),
      );
    } catch (error) {
      logError("Find Sessions by Shop", error);
      return [];
    }
  }
}

// ✅ Shopify app config
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SHOPIFY_SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new MySQLSessionStorage(),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: false,
  },
  hooks: {
    afterAuth: async ({ session }) => {
      try {
        console.log("✅ Auth complete for shop:", session.shop);

        try {
          await pool.query(
            `INSERT INTO stores (id, shop, access_token, sessionData, updated_at)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               access_token = VALUES(access_token),
               sessionData = VALUES(sessionData),
               updated_at = NOW()`,
            [
              session.id,
              session.shop,
              session.accessToken,
              JSON.stringify(session),
            ],
          );
        } catch (dbError) {
          logError("AfterAuth DB Insert", dbError);
        }

        try {
          await shopify.registerWebhooks({ session });
          console.log("📦 Webhooks registered for", session.shop);
        } catch (webhookError) {
          logError("Register Webhooks", webhookError);
        }
      } catch (error) {
        logError("AfterAuth Hook", error);
      }
    },
  },

  webhooks: {
    ORDERS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/create",
    },
    ORDERS_PAID: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/paid",
    },
    ORDERS_FULFILLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/fulfilled",
    },
    ORDERS_UPDATED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/update",
    },
    ORDERS_CANCELLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/cancelled",
    },
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/uninstall",
    },
    CUSTOMERS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/customers/create",
    },
    CHECKOUTS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/checkout",
    },
    CHECKOUTS_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/checkout",
    },
    ORDERS_FULFILLMENT_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/delivery-status",
    },
  },
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

const processedWebhooks = new Map();

function markWebhookProcessed(id) {
  processedWebhooks.set(id, Date.now());
  for (const [wid, ts] of processedWebhooks) {
    if (Date.now() - ts > 5 * 60 * 1000) {
      processedWebhooks.delete(wid);
    }
  }
}

export const webhookHandler = async (request) => {
  try {
    console.log("📥 Webhook received");

    if (!request.headers || typeof request.headers.entries !== "function") {
      console.log("⚠️ Invalid headers object", request.headers);
      return new Response("Invalid headers", { status: 400 });
    }

    const headers = Object.fromEntries(request.headers.entries());
    const webhookId = headers["x-shopify-webhook-id"];

    if (processedWebhooks.has(webhookId)) {
      console.log("⚠️ Duplicate webhook ignored:", webhookId);
      return new Response("Duplicate webhook", { status: 200 });
    }
    markWebhookProcessed(webhookId);

    const rawBody = await request.text();

    const response = new Response();
    const result = await shopify.webhooks.process({
      rawBody,
      rawRequest: request,
      rawResponse: response,
    });

    console.log("✅ Webhook processed successfully:", result);
    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    console.error("❌ [Webhook Processing]", error);
    return new Response("Webhook error", { status: 500 });
  }
};
