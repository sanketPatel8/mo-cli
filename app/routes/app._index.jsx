import { useEffect, useState } from "react";
import { Page, Card, BlockStack, Text, Button } from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({
    SHOPIFY_NEXT_URI: process.env.SHOPIFY_NEXT_URI, // pass env to client
  });
};

export default function Index() {
  const { SHOPIFY_NEXT_URI } = useLoaderData(); // ✅ get env from loader
  const [shop, setShop] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShop(params.get("shop"));
  }, []);

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
              url={`${SHOPIFY_NEXT_URI}?shop=${shop}`} // ✅ safe to use
              target="_blank"
            >
              Open My App
            </Button>
          )}
        </BlockStack>
      </Card>
    </Page>
  );
}
