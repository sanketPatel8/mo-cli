import { redirect } from "@remix-run/node";
export async function loader() {
  return redirect("https://shopify.myoperator.com/?from=test", { status: 302 });
}
