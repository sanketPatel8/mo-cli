import shopify, { authenticate } from "../shopify.server";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  const authResult = await authenticate.admin(request);

  if (authResult instanceof Response) return authResult;

  const { session } = authResult;

  console.log("🎉 Auth callback complete, scopes:", session.scope);

  return redirect("/"); // or wherever you want
};
