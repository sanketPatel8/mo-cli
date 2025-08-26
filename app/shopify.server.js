// import "@shopify/shopify-app-remix/adapters/node";
// import {
//   ApiVersion,
//   AppDistribution,
//   shopifyApp,
// } from "@shopify/shopify-app-remix/server";
// import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
// import prisma from "./db.server";

// const shopify = shopifyApp({
//   apiKey: process.env.SHOPIFY_API_KEY,
//   apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
//   apiVersion: ApiVersion.January25,
//   scopes: process.env.SCOPES?.split(","),
//   appUrl: process.env.SHOPIFY_APP_URL || "",
//   authPathPrefix: "/auth",
//   sessionStorage: new PrismaSessionStorage(prisma),
//   distribution: AppDistribution.AppStore,
//   future: {
//     unstable_newEmbeddedAuthStrategy: true,
//     removeRest: true,
//   },
//   ...(process.env.SHOP_CUSTOM_DOMAIN
//     ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
//     : {}),
// });

// export default shopify;
// export const apiVersion = ApiVersion.January25;
// export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
// export const authenticate = shopify.authenticate;
// export const unauthenticated = shopify.unauthenticated;
// export const login = shopify.login;
// export const registerWebhooks = shopify.registerWebhooks;
// export const sessionStorage = shopify.sessionStorage;

import "@shopify/shopify-app-remix/adapters/node";

import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";

import pool from "./db.server.js"; // your MySQL connection pool

// --- Custom MySQL Session Storage ---

class MySQLSessionStorage {
  async storeSession(session) {
    const sessionData = JSON.stringify(session);

    await pool.query(
      `INSERT INTO sessions (id, shop, accessToken, sessionData, updatedAt)

        VALUES (?, ?, ?, ?, NOW())

        ON DUPLICATE KEY UPDATE 

          shop = VALUES(shop),

          accessToken = VALUES(accessToken),

          sessionData = VALUES(sessionData),

          updatedAt = NOW()`,

      [session.id, session.shop, session.accessToken, sessionData],
    );

    console.log("✅ Stored session for shop:", session.shop);

    return true;
  }

  async loadSession(id) {
    const [rows] = await pool.query(
      `SELECT sessionData FROM sessions WHERE id = ?`,

      [id],
    );

    if (rows.length === 0) return undefined;

    console.log("👉 Loaded session:", id);

    return JSON.parse(rows[0].sessionData);
  }

  async deleteSession(id) {
    await pool.query(`DELETE FROM sessions WHERE id = ?`, [id]);

    console.log("🗑️ Deleted session:", id);

    return true;
  }

  async deleteSessions(ids) {
    if (!ids || ids.length === 0) return true;

    await pool.query(`DELETE FROM sessions WHERE id IN (?)`, [ids]);

    console.log("🗑️ Deleted multiple sessions:", ids);

    return true;
  }
}

// --- Shopify config ---

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,

  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",

  apiVersion: ApiVersion.January25,

  scopes: process.env.SHOPIFY_SCOPES?.split(","),

  appUrl: process.env.SHOPIFY_APP_URL || "",

  authPathPrefix: "/auth",

  sessionStorage: new MySQLSessionStorage(), // 👈 use our custom class

  distribution: AppDistribution.AppStore,

  future: {
    unstable_newEmbeddedAuthStrategy: true,

    removeRest: true,
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
