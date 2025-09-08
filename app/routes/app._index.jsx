// import { useEffect, useState } from "react";
// import { Page, Card, BlockStack, Text, Button } from "@shopify/polaris";
// import { useLoaderData } from "@remix-run/react";
// import { json } from "@remix-run/node";

// import { authenticate } from "../shopify.server";

// export const loader = async ({ request }) => {
//   await authenticate.admin(request);
//   return json({
//     SHOPIFY_NEXT_URI: process.env.SHOPIFY_NEXT_URI, // pass env to client
//   });
// };

// export default function Index() {
//   const { SHOPIFY_NEXT_URI } = useLoaderData(); // ✅ get env from loader
//   const [shop, setShop] = useState(null);

//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     setShop(params.get("shop"));
//   }, []);

//   return (
//     <Page>
//       <Card background="translucent" style={{ boxShadow: "none" }}>
//         <BlockStack
//           gap="500"
//           align="center"
//           marginBlockStart="200"
//           marginBlockEnd="200"
//         >
//           <Text as="h1" variant="headingXl" alignment="center">
//             Welcome to My Operator
//           </Text>
//           <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
//             Click below to open your Operator dashboard in a new tab.
//           </Text>

//           {shop && (
//             <Button
//               primary
//               size="large"
//               url={`${SHOPIFY_NEXT_URI}?shop=${shop}`} // ✅ safe to use
//               target="_blank"
//             >
//               Open My App
//             </Button>
//           )}
//         </BlockStack>
//       </Card>
//     </Page>
//   );
// }

import { useEffect, useState } from "react";
import { Page, Card, BlockStack, Text, Button } from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({
    SHOPIFY_NEXT_URI: process.env.SHOPIFY_NEXT_URI,
    SHOPIFY_STAGE_URI: process.env.SHOPIFY_STAGE_URI,
  });
};

export default function Index() {
  const { SHOPIFY_NEXT_URI, SHOPIFY_STAGE_URI } = useLoaderData();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShop(params.get("shop"));
  }, []);

  const handleOpenApp = async () => {
    if (!shop) return;

    setLoading(true);
    try {
      const res = await fetch("/api/get-company-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop }),
      });
      const data = await res.json();

      if (data.exists) {
        if (data.company_id) {
          window.open(`${SHOPIFY_STAGE_URI}/ecomm-plus`, "_blank");
        } else {
          window.open(`${SHOPIFY_NEXT_URI}?shop=${shop}`, "_blank");
        }
      } else {
        alert("Shop not found in database.");
      }
    } catch (err) {
      console.error(err);
      alert("Error checking shop.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <Card background="translucent" style={{ boxShadow: "none" }}>
        <BlockStack
          gap="500"
          align="center"
          marginBlockStart="200"
          marginBlockEnd="200"
        >
          <Text as="h1" variant="headingXl" alignment="center">
            Welcome to My Operator
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
            Click below to open your Operator dashboard in a new tab.
          </Text>

          {shop && (
            <Button
              primary
              size="large"
              loading={loading}
              onClick={handleOpenApp} // ✅ custom click handler
            >
              Open My App
            </Button>
          )}
        </BlockStack>
      </Card>
    </Page>
  );
}
