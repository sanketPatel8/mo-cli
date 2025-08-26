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

import sessionStoragePkg from "@shopify/shopify-app-session-storage";

import pool from "./db.server.js";

const { CustomSessionStorage } = sessionStoragePkg;

// --- Shopify config with MySQL session storage ---

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,

  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",

  apiVersion: ApiVersion.January25,

  scopes: process.env.SHOPIFY_SCOPES?.split(","),

  appUrl: process.env.SHOPIFY_APP_URL || "",

  authPathPrefix: "/auth",

  distribution: AppDistribution.AppStore,

  future: {
    unstable_newEmbeddedAuthStrategy: true,

    removeRest: true,
  },

  // ✅ MySQL custom session storage

  sessionStorage: new CustomSessionStorage(
    // load

    async (id) => {
      const [rows] = await pool.query(
        `SELECT sessionData FROM sessions WHERE id = ?`,

        [id],
      );

      if (rows.length === 0) return undefined;

      console.log("👉 Loaded session:", id);

      return JSON.parse(rows[0].sessionData);
    },

    // store

    async (session) => {
      const sessionData = JSON.stringify(session);

      await pool.query(
        `INSERT INTO sessions (id, shop, accessToken, sessionData)

          VALUES (?, ?, ?, ?)

          ON DUPLICATE KEY UPDATE shop=VALUES(shop), accessToken=VALUES(accessToken), sessionData=VALUES(sessionData), updatedAt=NOW()`,

        [session.id, session.shop, session.accessToken, sessionData],
      );

      console.log("✅ Stored session for shop:", session.shop);

      return true;
    },

    // delete

    async (id) => {
      await pool.query(`DELETE FROM sessions WHERE id = ?`, [id]);

      console.log("🗑️ Deleted session:", id);

      return true;
    },
  ),
});

export default shopify;

export const apiVersion = ApiVersion.January25;

export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;

export const authenticate = shopify.authenticate;

export const unauthenticated = shopify.unauthenticated;

export const login = shopify.login;

export const registerWebhooks = shopify.registerWebhooks;

export const sessionStorage = shopify.sessionStorage;
