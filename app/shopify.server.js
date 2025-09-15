// // import "@shopify/shopify-app-remix/adapters/node";
// // import {
// //   ApiVersion,
// //   AppDistribution,
// //   shopifyApp,
// // } from "@shopify/shopify-app-remix/server";
// // import { DeliveryMethod, Session } from "@shopify/shopify-api";
// // import pool from "./db.server.js";

// // // ✅ MySQL Session Storage
// // class MySQLSessionStorage {
// //   async storeSession(session) {
// //     const sessionData = JSON.stringify(session);

// //     await pool.query(
// //       `INSERT INTO stores (id, shop, access_token, sessionData, updated_at)
// //        VALUES (?, ?, ?, ?, NOW())
// //        ON DUPLICATE KEY UPDATE
// //          access_token = VALUES(access_token),
// //          sessionData = VALUES(sessionData),
// //          updated_at = NOW()`,
// //       [session.id, session.shop, session.accessToken, sessionData],
// //     );

// //     return true;
// //   }

// //   async loadSession(id) {
// //     const [rows] = await pool.query(
// //       `SELECT sessionData FROM stores WHERE id = ?`,
// //       [id],
// //     );
// //     if (rows.length === 0) return undefined;

// //     const rawData = JSON.parse(rows[0].sessionData);
// //     const session = new Session(rawData.id);
// //     Object.assign(session, rawData);

// //     return session;
// //   }

// //   // async deleteSession(id) {
// //   //   await pool.query(`DELETE FROM stores WHERE id = ?`, [id]);
// //   //   return true;
// //   // }

// //   // async deleteSessions(ids) {
// //   //   if (!ids || ids.length === 0) return true;
// //   //   await pool.query(`DELETE FROM stores WHERE id IN (?)`, [ids]);
// //   //   return true;
// //   // }
// // }

// // // ✅ Shopify config
// // const shopify = shopifyApp({
// //   apiKey: process.env.SHOPIFY_API_KEY,
// //   apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
// //   apiVersion: ApiVersion.January25,
// //   scopes: process.env.SHOPIFY_SCOPES?.split(","),
// //   appUrl: process.env.SHOPIFY_APP_URL || "",
// //   authPathPrefix: "/auth",
// //   sessionStorage: new MySQLSessionStorage(),
// //   distribution: AppDistribution.AppStore,
// //   future: {
// //     unstable_newEmbeddedAuthStrategy: true,
// //     removeRest: false, // 👈 allow REST API
// //   },
// //   // hooks: {
// //   //   afterAuth: async ({ session }) => {
// //   //     await shopify.registerWebhooks({ session });
// //   //   },
// //   // },
// //   hooks: {
// //     afterAuth: async ({ session }) => {
// //       console.log("✅ Auth complete for shop:", session.shop);

// //       // Save shop details in your DB (extra metadata if you want)
// //       await pool.query(
// //         `INSERT INTO stores (id, shop, access_token, sessionData, updated_at)
// //        VALUES (?, ?, ?, ?, NOW())
// //        ON DUPLICATE KEY UPDATE
// //          access_token = VALUES(access_token),
// //          sessionData = VALUES(sessionData),
// //          updated_at = NOW()`,
// //         [
// //           session.id,
// //           session.shop,
// //           session.accessToken,
// //           JSON.stringify(session),
// //         ],
// //       );

// //       // Register webhooks
// //       await shopify.registerWebhooks({ session });
// //       console.log("📦 Webhooks registered for", session.shop);
// //     },
// //   },

// //   webhooks: {
// //     ORDERS_CREATE: {
// //       deliveryMethod: DeliveryMethod.Http,
// //       callbackUrl: "/webhooks/orders/create",
// //     },
// //     ORDERS_PAID: {
// //       deliveryMethod: DeliveryMethod.Http,
// //       callbackUrl: "/webhooks/orders/paid",
// //     },
// //     ORDERS_FULFILLED: {
// //       deliveryMethod: DeliveryMethod.Http,
// //       callbackUrl: "/webhooks/orders/fulfilled",
// //     },
// //     ORDERS_UPDATED: {
// //       deliveryMethod: DeliveryMethod.Http,
// //       callbackUrl: "/webhooks/orders/update",
// //     },
// //     ORDERS_CANCELLED: {
// //       deliveryMethod: DeliveryMethod.Http,
// //       callbackUrl: "/webhooks/orders/cancelled",
// //     },
// //     APP_UNINSTALLED: {
// //       deliveryMethod: DeliveryMethod.Http,
// //       callbackUrl: "/webhooks/app/uninstall",
// //     },
// //     CUSTOMERS_CREATE: {
// //       deliveryMethod: DeliveryMethod.Http,
// //       callbackUrl: "/webhooks/customers/create",
// //     },
// //     CHECKOUTS_CREATE: {
// //       deliveryMethod: DeliveryMethod.Http,
// //       callbackUrl: "/webhooks/checkout",
// //     },
// //     CHECKOUTS_UPDATE: {
// //       deliveryMethod: DeliveryMethod.Http,
// //       callbackUrl: "/webhooks/checkout",
// //     },
// //     ORDERS_FULFILLMENT_UPDATE: {
// //       deliveryMethod: DeliveryMethod.Http,
// //       callbackUrl: "/webhooks/orders/delivery-status",
// //     },
// //   },
// // });

// // export default shopify;
// // export const apiVersion = ApiVersion.January25;
// // export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
// // export const authenticate = shopify.authenticate;
// // export const unauthenticated = shopify.unauthenticated;
// // export const login = shopify.login;
// // export const registerWebhooks = shopify.registerWebhooks;
// // export const sessionStorage = shopify.sessionStorage;
// // export const webhookHandler = async (request) => {
// //   return await shopify.webhooks.process(request);
// // };

// import "@shopify/shopify-app-remix/adapters/node";
// import {
//   ApiVersion,
//   AppDistribution,
//   shopifyApp,
// } from "@shopify/shopify-app-remix/server";
// import { DeliveryMethod, Session } from "@shopify/shopify-api";
// import pool from "./db.server.js";

// // ✅ MySQL Session Storage with better error handling
// class MySQLSessionStorage {
//   async storeSession(session) {
//     try {
//       const sessionData = JSON.stringify(session);

//       await pool.query(
//         `INSERT INTO stores (id, shop, access_token, sessionData, updated_at)
//          VALUES (?, ?, ?, ?, NOW())
//          ON DUPLICATE KEY UPDATE
//            access_token = VALUES(access_token),
//            sessionData = VALUES(sessionData),
//            updated_at = NOW()`,
//         [session.id, session.shop, session.accessToken, sessionData],
//       );

//       return true;
//     } catch (error) {
//       console.error("Error storing session:", error);
//       throw error;
//     }
//   }

//   async loadSession(id) {
//     try {
//       const [rows] = await pool.query(
//         `SELECT sessionData FROM stores WHERE id = ?`,
//         [id],
//       );

//       if (rows.length === 0) return undefined;

//       const rawData = JSON.parse(rows[0].sessionData);
//       const session = new Session(rawData.id);
//       Object.assign(session, rawData);

//       return session;
//     } catch (error) {
//       console.error("Error loading session:", error);
//       return undefined; // Return undefined instead of throwing to allow auth flow to continue
//     }
//   }

//   async findSessionsByShop(shop) {
//     try {
//       const [rows] = await pool.query(
//         `SELECT sessionData FROM stores WHERE shop = ?`,
//         [shop],
//       );

//       return rows.map((row) => {
//         const rawData = JSON.parse(row.sessionData);
//         const session = new Session(rawData.id);
//         Object.assign(session, rawData);
//         return session;
//       });
//     } catch (error) {
//       console.error("Error finding sessions by shop:", error);
//       return [];
//     }
//   }
// }

// // ✅ Shopify config with better error handling
// const shopify = shopifyApp({
//   apiKey: process.env.SHOPIFY_API_KEY,
//   apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
//   apiVersion: ApiVersion.January25,
//   scopes: process.env.SHOPIFY_SCOPES?.split(","),
//   appUrl: process.env.SHOPIFY_APP_URL || "",
//   authPathPrefix: "/auth",
//   sessionStorage: new MySQLSessionStorage(),
//   distribution: AppDistribution.AppStore,
//   future: {
//     unstable_newEmbeddedAuthStrategy: true,
//     removeRest: false, // 👈 allow REST API
//   },
//   hooks: {
//     afterAuth: async ({ session }) => {
//       try {
//         console.log("✅ Auth complete for shop:", session.shop);

//         // Save shop details in your DB (extra metadata if you want)
//         await pool.query(
//           `INSERT INTO stores (id, shop, access_token, sessionData, updated_at)
//          VALUES (?, ?, ?, ?, NOW())
//          ON DUPLICATE KEY UPDATE
//            access_token = VALUES(access_token),
//            sessionData = VALUES(sessionData),
//            updated_at = NOW()`,
//           [
//             session.id,
//             session.shop,
//             session.accessToken,
//             JSON.stringify(session),
//           ],
//         );

//         // Register webhooks with error handling
//         try {
//           await shopify.registerWebhooks({ session });
//           console.log("📦 Webhooks registered for", session.shop);
//         } catch (webhookError) {
//           console.error("Failed to register webhooks:", webhookError);
//           // Don't throw here - allow auth to continue even if webhooks fail
//         }
//       } catch (error) {
//         console.error("Error in afterAuth hook:", error);
//         // Don't throw here to prevent blocking the auth flow
//       }
//     },
//   },

//   webhooks: {
//     ORDERS_CREATE: {
//       deliveryMethod: DeliveryMethod.Http,
//       callbackUrl: "/webhooks/orders/create",
//     },
//     ORDERS_PAID: {
//       deliveryMethod: DeliveryMethod.Http,
//       callbackUrl: "/webhooks/orders/paid",
//     },
//     ORDERS_FULFILLED: {
//       deliveryMethod: DeliveryMethod.Http,
//       callbackUrl: "/webhooks/orders/fulfilled",
//     },
//     ORDERS_UPDATED: {
//       deliveryMethod: DeliveryMethod.Http,
//       callbackUrl: "/webhooks/orders/update",
//     },
//     ORDERS_CANCELLED: {
//       deliveryMethod: DeliveryMethod.Http,
//       callbackUrl: "/webhooks/orders/cancelled",
//     },
//     APP_UNINSTALLED: {
//       deliveryMethod: DeliveryMethod.Http,
//       callbackUrl: "/webhooks/app/uninstall",
//     },
//     CUSTOMERS_CREATE: {
//       deliveryMethod: DeliveryMethod.Http,
//       callbackUrl: "/webhooks/customers/create",
//     },
//     CHECKOUTS_CREATE: {
//       deliveryMethod: DeliveryMethod.Http,
//       callbackUrl: "/webhooks/checkout",
//     },
//     CHECKOUTS_UPDATE: {
//       deliveryMethod: DeliveryMethod.Http,
//       callbackUrl: "/webhooks/checkout",
//     },
//     ORDERS_FULFILLMENT_UPDATE: {
//       deliveryMethod: DeliveryMethod.Http,
//       callbackUrl: "/webhooks/orders/delivery-status",
//     },
//   },
// });

// export default shopify;
// export const apiVersion = ApiVersion.January25;
// export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
// export const authenticate = shopify.authenticate;
// export const unauthenticated = shopify.unauthenticated;
// export const login = shopify.login;
// export const registerWebhooks = shopify.registerWebhooks;
// export const sessionStorage = shopify.sessionStorage;

// const processedWebhooks = new Set();

// export const webhookHandler = async (request) => {
//   try {
//     console.log("📥 Webhook received");

//     const headers = Object.fromEntries(request.headers.entries());
//     const webhookId = headers["x-shopify-webhook-id"];

//     if (processedWebhooks.has(webhookId)) {
//       console.log("⚠️ Duplicate webhook ignored:", webhookId);
//       return { ok: true, duplicate: true };
//     }
//     processedWebhooks.add(webhookId);

//     // Get raw body for HMAC verification
//     let rawBody;
//     if (typeof Buffer !== "undefined") {
//       rawBody = Buffer.from(await request.text());
//     } else {
//       rawBody = await request.text();
//     }

//     const response = new Response();
//     const result = await shopify.webhooks.process({
//       rawBody,
//       rawRequest: request,
//       rawResponse: response,
//     });

//     console.log("✅ Webhook processed successfully:", result);
//     return result;
//   } catch (error) {
//     console.error("❌ Webhook processing error:", {
//       message: error.message,
//       stack: error.stack,
//       name: error.name,
//     });

//     try {
//       const clone = request.clone();
//       const rawDebug = await clone.text();
//       try {
//         console.log("Request JSON body (for debugging):", JSON.parse(rawDebug));
//       } catch {
//         console.log("Request body is not valid JSON, raw:", rawDebug);
//       }
//     } catch (err) {
//       console.log("Failed to read cloned request body:", err.message);
//     }

//     throw error;
//   }
// };

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
    logError("Webhook Processing", error);

    try {
      const clone = request.clone();
      const rawDebug = await clone.text();
      try {
        console.log("Request JSON body (debug):", JSON.parse(rawDebug));
      } catch {
        console.log("Request body is not valid JSON, raw:", rawDebug);
      }
    } catch (err) {
      console.log("Failed to read cloned request body:", err.message);
    }

    return new Response("Webhook error", { status: 500 });
  }
};
