
import { useEffect } from "react";
import { useSearchParams } from "@remix-run/react";

export default function PostAuth() {
  console.log("🛂 post-auth page rendered");
  const [params] = useSearchParams();
  const shop = params.get("shop");
  const host = params.get("host");
  console.log("📋 post-auth params:", { shop, host });

  useEffect(() => {
    console.log("Cookies in JS:", document.cookie);
    if (document.cookie.includes("shopify_app_session")) {
      const url = `/?shop=${shop}&host=${host}`;
      console.log("Redirecting from client to:", url);
      window.location.assign(url);
    } else {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [shop, host]);

  return (
    <div>
      <p>Finishing installation…</p>
    </div>
  );
}
