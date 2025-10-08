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

// import { redirect } from "@remix-run/node";

// export async function loader({ request }) {
//   console.log("URL:", request.url);
//   console.log("XFP:", request.headers.get("x-forwarded-proto"));
//   console.log("XFH:", request.headers.get("x-forwarded-host"));
//   const { default: shopify } = await import("../../shopify.server.js"); // server-only import
//   let url = new URL(request.url);

//   // Force HTTPS
//   // if (url.protocol !== "https:") {
//   //   url = new URL(`https://${url.host}${url.pathname}${url.search}`);
//   // }
//   const shop = String(url.searchParams.get("shop") || "")
//     .toLowerCase()
//     .trim();
//   const host = url.searchParams.get("host") || "";

//   console.log("[/] hit _index/route", { url: url.toString(), shop, host });

//   if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
//     return new Response("Missing or invalid ?shop=", { status: 400 });
//   }

//   try {
//     // If NOT installed, this throws a 302 Response to Shopify authorize → return it AS-IS
//     await shopify.authenticate.admin(request);

//     // Installed → now go to Next.js UI
//     console.log("[/] installed -> redirecting to Next", { shop });
//     return redirect(
//       `https://shopify.myoperator.com/?shop=${encodeURIComponent(
//         shop
//       )}&host=${encodeURIComponent(host)}`,
//       { status: 302 }
//     );
//   } catch (respOrErr) {
//     if (respOrErr instanceof Response) {
//       console.log("[/] NOT installed -> returning OAuth 302 to authorize");
//       return respOrErr; // begins OAuth
//     }
//     console.error("[/] error", respOrErr);
//     throw respOrErr;
//   }
// }

// import { redirect } from "@remix-run/node";

// export async function loader({ request }) {
//   console.log("🚀 Loader started");

//   // Dynamically import server-only Shopify code
//   const { authenticate } = await import("~/shopify.server.js");
//   console.log("📦 Shopify server code imported");

//   let shop = null;
//   let host = null;
//   const url = new URL(request.url);
//   shop = (url.searchParams.get("shop") || "").toLowerCase().trim();
//   host = url.searchParams.get("host") || "";

//   if (shop != null && host != null) {
//     const redirectUrl = `https://shopify.myoperator.com/?shop=${encodeURIComponent(
//       shop,
//     )}&host=${encodeURIComponent(host)}`;
//     console.log("➡️ Redirecting to embedded app:", redirectUrl);

//     return redirect(redirectUrl, { status: 302 });
//   }

//   console.log("🔍 Parsed URL params:", { shop, host });

//   // Validate shop parameter
//   if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
//     console.warn("⚠️ Invalid or missing shop parameter");
//     return new Response("Missing or invalid ?shop=", { status: 400 });
//   }

//   try {
//     console.log("🔑 Authenticating store...");
//     console.log("⚠️ authenticate object:", authenticate);
//     // installed store → returns session
//     const { session } = await authenticate.admin(request);

//     console.log("✅ Store installed", { shop: session.shop, id: session.id });

//     const redirectUrl = `https://shopify.myoperator.com/?shop=${encodeURIComponent(
//       session.shop,
//     )}&host=${encodeURIComponent(host)}`;
//     console.log("➡️ Redirecting to embedded app:", redirectUrl);

//     return redirect(redirectUrl, { status: 302 });
//   } catch (error) {
//     // Shopify OAuth needed → thrown Response
//     if (error instanceof Response) {
//       console.warn("🔁 Shopify OAuth required, returning OAuth Response");
//       return error; // Shopify authorize URL પર redirect
//     }

//     // Unexpected errors
//     console.error("❌ Unexpected auth error", error);
//     throw error;
//   }
// }

// export default function Index() {
//   console.log("🏠 Index component rendered");
//   return <div>Redirecting...</div>;
// }

// app/routes/_index.jsx
import { redirect } from "@remix-run/node";

export async function loader({ request }) {
  console.log("🚀 [_index] Loader triggered");

  const url = new URL(request.url);
  const shop = (url.searchParams.get("shop") || "").toLowerCase().trim();
  const host = url.searchParams.get("host") || "";

  console.log("🧩 Params:", { shop, host });

  // ✅ Validate `shop` param
  if (!shop || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
    console.error("❌ Invalid or missing ?shop param");
    return new Response("❌ Missing or invalid ?shop=", { status: 400 });
  }

  try {
    console.log("📦 Importing shopify.server.js...");
    const { authenticate } = await import("~/shopify.server.js");
    console.log("✅ Import success, calling authenticate.admin()...");

    // ✅ This automatically loads session via session_id in MySQL
    const { session } = await authenticate.admin(request);

    if (!session) {
      console.warn("⚠️ No session found or invalid session");
      return new Response("Unauthorized", { status: 401 });
    }

    console.log("✅ Session loaded:", {
      id: session.id,
      shop: session.shop,
      hasAccessToken: !!session.accessToken,
    });

    // ✅ Redirect to your non-embedded app domain
    const redirectUrl = `https://shopify.myoperator.com/?shop=${encodeURIComponent(
      shop,
    )}&host=${encodeURIComponent(host)}`;

    console.log("➡️ Redirecting to:", redirectUrl);
    return redirect(redirectUrl);
  } catch (error) {
    // ✅ Handle Remix/Shopify OAuth redirect flow properly
    if (error instanceof Response) {
      console.warn("🔁 Shopify OAuth redirect:", error.status);
      return error;
    }

    console.error("💥 Unexpected loader error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export default function Index() {
  return <div>🔄 Redirecting to your Shopify app...</div>;
}
