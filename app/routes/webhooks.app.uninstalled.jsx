import db from "../db.server";

export const action = async ({ request }) => {
  const { authenticate } = await import("~/shopify.server.js");

  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
