import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { Session } from "@shopify/shopify-api";
import pool from "./db.server.js";

// ✅ MySQL Session Storage
class MySQLSessionStorage {
  async storeSession(session) {
    const sessionData = JSON.stringify(session);

    await pool.query(
      `INSERT INTO sessions (id, shop, accessToken, sessionData, updatedAt)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         accessToken = VALUES(accessToken),
         sessionData = VALUES(sessionData),
         updatedAt = NOW()`,
      [session.id, session.shop, session.accessToken, sessionData],
    );

    return true;
  }

  async loadSession(id) {
    const [rows] = await pool.query(
      `SELECT sessionData FROM sessions WHERE id = ?`,
      [id],
    );
    if (rows.length === 0) return undefined;

    const rawData = JSON.parse(rows[0].sessionData);
    const session = new Session(rawData.id);
    Object.assign(session, rawData);

    return session;
  }

  async deleteSession(id) {
    await pool.query(`DELETE FROM sessions WHERE id = ?`, [id]);
    return true;
  }

  async deleteSessions(ids) {
    if (!ids || ids.length === 0) return true;
    await pool.query(`DELETE FROM sessions WHERE id IN (?)`, [ids]);
    return true;
  }
}

// ✅ Shopify config
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
    removeRest: false, // 👈 allow REST API
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
export const webhookHandler = async (request) => {
  return await shopify.webhooks.process(request);
};
