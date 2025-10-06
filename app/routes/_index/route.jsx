// import { redirect } from "@remix-run/node";
// import { Form, useLoaderData } from "@remix-run/react";
// import { login } from "../../shopify.server";
// import styles from "./styles.module.css";

// export const loader = async ({ request }) => {
//   const url = new URL(request.url);

//   if (url.searchParams.get("shop")) {
//     throw redirect(`/app?${url.searchParams.toString()}`);
//   }

//   return { showForm: Boolean(login) };
// };

// export default function App() {
//   const { showForm } = useLoaderData();

//   return (
//     <div className={styles.index}>
//       <div className={styles.content}>
//         <h1 className={styles.heading}>A short heading about [your app]</h1>
//         <p className={styles.text}>
//           A tagline about [your app] that describes your value proposition.
//         </p>
//         {showForm && (
//           <Form className={styles.form} method="post" action="/auth/login">
//             <label className={styles.label}>
//               <span>Shop domain</span>
//               <input className={styles.input} type="text" name="shop" />
//               <span>e.g: my-shop-domain.myshopify.com</span>
//             </label>
//             <button className={styles.button} type="submit">
//               Log in
//             </button>
//           </Form>
//         )}
//         <ul className={styles.list}>
//           <li>
//             <strong>Product feature</strong>. Some detail about your feature and
//             its benefit to your customer.
//           </li>
//           <li>
//             <strong>Product feature</strong>. Some detail about your feature and
//             its benefit to your customer.
//           </li>
//           <li>
//             <strong>Product feature</strong>. Some detail about your feature and
//             its benefit to your customer.
//           </li>
//         </ul>
//       </div>
//     </div>
//   );
// }

import { redirect } from "@remix-run/node";

export async function loader({ request }) {
  console.log("URL:", request.url);
  console.log("XFP:", request.headers.get("x-forwarded-proto"));
  console.log("XFH:", request.headers.get("x-forwarded-host"));
  const { default: shopify } = await import("../../shopify.server.js"); // server-only import
  const url = new URL(request.url);
  const shop = String(url.searchParams.get("shop") || "")
    .toLowerCase()
    .trim();
  const host = url.searchParams.get("host") || "";

  console.log("[/] hit", { url: url.toString(), shop, host });

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
    return new Response("Missing or invalid ?shop=", { status: 400 });
  }

  try {
    // If NOT installed, this throws a 302 Response to Shopify authorize → return it AS-IS
    await shopify.authenticate.admin(request);

    // Installed → now go to Next.js UI
    console.log("[/] installed -> redirecting to Next", { shop });
    return redirect(
      `https://shopify.myoperator.com/?shop=${encodeURIComponent(
        shop,
      )}&host=${encodeURIComponent(host)}`,
      { status: 302 },
    );
  } catch (respOrErr) {
    if (respOrErr instanceof Response) {
      console.log("[/] NOT installed -> returning OAuth 302 to authorize");
      return respOrErr; // begins OAuth
    }
    console.error("[/] error", respOrErr);
    throw respOrErr;
  }
}
