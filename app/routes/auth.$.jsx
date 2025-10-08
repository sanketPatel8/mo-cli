export const loader = async ({ request }) => {
  const { authenticate } = await import("~/shopify.server.js");

  await authenticate.admin(request);

  return null;
};
