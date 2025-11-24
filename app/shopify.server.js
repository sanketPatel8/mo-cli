// app/shopify.server.js
import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { DeliveryMethod, Session } from "@shopify/shopify-api";
import pool, { closePool } from "./db.server.js";
import { redirect } from "@remix-run/node";

// simple logger
function logError(ctx, err) {
  console.error(`❌ [${ctx}]`, {
    message: err?.message,
    stack: err?.stack,
    name: err?.name,
  });
}

// ---- MySQL session storage (stores RAW JSON once; parses once) ----
class MySQLSessionStorage {
  // 🟢 Store a single session
  async storeSession(session) {
    try {
      const jsonData = session.toObject();

      const payload = JSON.stringify(jsonData);

      const cleaned = payload.replace(/\\/g, "");

      console.log(session, "session data on");
      console.log(cleaned, "cleaned session data on storesession function");
      console.log(jsonData, "json data on session store");
      console.log(payload, "payload in session data");

      await pool.query(
        `INSERT INTO stores (shop, session_id, access_token, sessionData, updated_at)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           access_token = VALUES(access_token),
           sessionData = VALUES(sessionData),
           updated_at = NOW()`,
        [session.shop, session.id, session.accessToken, payload],
      );

      return true;
    } catch (e) {
      logError("Store Session", e);
      throw e;
    } finally {
      // ✅ Always close the pool after processing
      // await closePool();
    }
  }

  // 🟢 Load a session by session_id (Shopify compatible)
  async loadSession(id) {
    try {
      console.log("✅ Load loadSession function for load data :", id);
      const [rows] = await pool.query(
        `SELECT sessionData FROM stores WHERE session_id=?`,
        [id],
      );
      if (!rows.length) return undefined;
      let sessionObj;
      const rawData = rows[0].sessionData;

      const cleanData = rawData.replace(/\\"/g, '"');

      console.log("✅ Fatched Row Data in stores table :", rows[0].sessionData);
      console.log("✅ Fatched cleanData in rawData :", cleanData);

      sessionObj = JSON.parse(cleanData);

      console.log("⚠️ sessionObj in stors table", sessionObj);
      const session = new Session({
        id: sessionObj.id,
        shop: sessionObj.shop,
        state: sessionObj.state,
        isOnline: sessionObj.isOnline,
        scope: sessionObj.scope,
        accessToken: sessionObj.accessToken,
        expires: sessionObj.expires ? new Date(sessionObj.expires) : undefined,
      });

      return session;
    } catch (e) {
      logError("Load Session", e);
      return undefined;
    } finally {
      // ✅ Always close the pool after processing
      // await closePool();
    }
  }

  // 🟢 Find sessions by shop
  async findSessionsByShop(shop) {
    try {
      const [rows] = await pool.query(
        `SELECT sessionData FROM stores WHERE shop=?`,
        [shop],
      );
      return rows.map((r) =>
        Session.fromPropertyArray(Object.entries(JSON.parse(r.sessionData))),
      );
    } catch (e) {
      logError("Find Sessions by Shop", e);
      return [];
    } finally {
      // ✅ Always close the pool after processing
      // await closePool();
    }
  }

  // 🟢 Delete session by session_id
  async deleteSession(id) {
    try {
      const [res] = await pool.query(`DELETE FROM stores WHERE session_id=?`, [
        id,
      ]);
      return res.affectedRows > 0;
    } catch (e) {
      logError("Delete Session", e);
      return false;
    } finally {
      // ✅ Always close the pool after processing
      // await closePool();
    }
  }

  // 🟢 Bulk store
  async storeSessions(sessions) {
    if (!sessions?.length) return true;
    try {
      const vals = sessions.map((s) => [
        s.shop,
        s.id,
        s.accessToken,
        JSON.stringify(s),
      ]);
      await pool.query(
        `REPLACE INTO stores (shop, session_id, access_token, sessionData, updated_at)
         VALUES ?`,
        [vals],
      );
      return true;
    } catch (e) {
      logError("Store Sessions (bulk)", e);
      return false;
    } finally {
      // ✅ Always close the pool after processing
      // await closePool();
    }
  }

  // 🟢 Bulk delete
  async deleteSessions(ids) {
    if (!ids?.length) return true;
    try {
      const [res] = await pool.query(
        `DELETE FROM stores WHERE session_id IN (${ids.map(() => "?").join(",")})`,
        ids,
      );
      return res.affectedRows > 0;
    } catch (e) {
      logError("Delete Sessions (bulk)", e);
      return false;
    } finally {
      // ✅ Always close the pool after processing
      // await closePool();
    }
  }
}

// ---- Shopify app config ----
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: (process.env.SHOPIFY_SCOPES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  appUrl: process.env.SHOPIFY_APP_URL, // no trailing slash
  authPathPrefix: "/auth",
  auth: { path: "/auth", callbackPath: "/auth/callback" },

  isEmbeddedApp: false,
  distribution: AppDistribution.Standalone,
  future: { unstable_newEmbeddedAuthStrategy: true, removeRest: false },

  sessionStorage: new MySQLSessionStorage(),

  hooks: {
    // Keep side-effects here if you like, but DO NOT redirect from here.
    afterAuth: async ({ session }) => {
      try {
        await shopify.sessionStorage.storeSession(session);
        await shopify.registerWebhooks({ session });

        console.log("➡️ now redireact on post-auth route");

        return redirect(
          `/post-auth?shop=${session.shop}&host=${Buffer.from(session.shop).toString("base64")}`,
        );
      } catch (e) {
        logError("Register Webhooks", e);
        throw e;
      }
    },
  },

  // webhooks: {
  //   ORDERS_CREATE: {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/webhooks/orders/create",
  //   },
  //   ORDERS_PAID: {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/webhooks/orders/paid",
  //   },
  //   ORDERS_FULFILLED: {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/webhooks/orders/fulfilled",
  //   },
  //   ORDERS_UPDATED: {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/webhooks/orders/update",
  //   },
  //   ORDERS_CANCELLED: {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/webhooks/orders/cancelled",
  //   },
  //   APP_UNINSTALLED: {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/webhooks/app/uninstall",
  //   },
  //   CUSTOMERS_CREATE: {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/webhooks/customers/create",
  //   },
  //   CUSTOMERS_UPDATE: {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/webhooks/customers/update",
  //   },
  //   CUSTOMERS_ENABLE: {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/webhooks/customers/enable",
  //   },
  //   CUSTOMERS_DISABLE: {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/webhooks/customers/disable",
  //   },
  //   CHECKOUTS_CREATE: {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/webhooks/checkout",
  //   },
  //   CHECKOUTS_UPDATE: {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/webhooks/checkout",
  //   },
  //   CUSTOMERS_DATA_REQUEST: {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/webhooks/customers_data_request",
  //   },
  //   CUSTOMERS_REDACT: {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/webhooks/customers_redact",
  //   },
  //   SHOP_REDACT: {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/webhooks/shop_redact",
  //   },
  // },

  webhooks: {
    // ✅ Keep only APP_UNINSTALLED - it's always allowed
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/uninstall",
    },

    // ✅ Keep mandatory GDPR webhooks - these are required
    CUSTOMERS_DATA_REQUEST: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/customers_data_request",
    },
    CUSTOMERS_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/customers_redact",
    },
    SHOP_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/shop_redact",
    },

    // ❌ REMOVE ALL PROTECTED CUSTOMER DATA WEBHOOKS
    // These require Shopify approval for protected customer data access
    // Uncomment them only after getting approval from Shopify

    /*
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
    CUSTOMERS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/customers/create",
    },
    CUSTOMERS_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/customers/update",
    },
    CUSTOMERS_ENABLE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/customers/enable",
    },
    CUSTOMERS_DISABLE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/customers/disable",
    },
    CHECKOUTS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/checkout",
    },
    CHECKOUTS_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/checkout",
    },
    */
  },
});

export default shopify;
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
