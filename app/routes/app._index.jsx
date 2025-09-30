import { useEffect, useState } from "react";
import {
  Page,
  Card,
  Grid,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Icon,
  Badge,
  Box,
} from "@shopify/polaris";
import { CheckCircleIcon } from "@shopify/polaris-icons"; // ✅ Updated icon import
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";

import { authenticate } from "../shopify.server";
import styles from "./_index/styles.module.css";

export const loader = async ({ request }) => {
  try {
    await authenticate.admin(request);

    const SHOPIFY_NEXT_URI = process.env.SHOPIFY_NEXT_URI || "";
    const SHOPIFY_STAGE_URI = process.env.SHOPIFY_STAGE_URI || "";

    return json({ SHOPIFY_NEXT_URI, SHOPIFY_STAGE_URI });
  } catch (err) {
    console.error("Loader error:", err);
    throw new Response("Authentication failed", { status: 401 });
  }
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
      <Grid className={styles.Itemscenter}>
        {/* Left Column - Text */}
        <Grid.Cell columnSpan={{ xs: 12, sm: 6 }}>
          <BlockStack gap="400">
            {/* Title with highlight */}
            <Text variant="headingXl" as="h1">
              MyOperator <Badge tone="highlight">WhatsApp Automation</Badge>
            </Text>

            {/* Subtitle */}
            <Text>
              MyOperator WhatsApp Automation is a Shopify plugin that automates
              your WhatsApp messages to engage customers. Use ready-to-go
              templates to send timely updates, abandoned cart reminders, and
              more, all with a no-code setup. With automated event-based message
              triggers, you recover lost sales, reduce risks, and keep customers
              informed.
            </Text>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              {[
                "Recover carts with 3 reminders + purchase check",
                "Send order updates: placed, shipped, refunds",
                "Confirm/cancel COD & convert to prepaid",
                "Welcome new customers instantly",
              ].map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px", // spacing between icon and text
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Icon
                      source={CheckCircleIcon}
                      tone="success"
                      className={styles.polarisIcon}
                    />
                    <span>{item}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Button */}
            {shop && (
              <Button
                secondary
                size="large"
                loading={loading}
                onClick={handleOpenApp}
              >
                Open My App
              </Button>
            )}
          </BlockStack>
        </Grid.Cell>

        {/* Right Column - Image */}
        <Grid.Cell columnSpan={{ xs: 12, sm: 6 }}>
          <img
            src="/home.png"
            alt="Operator Dashboard"
            style={{
              width: "100%",
              height: "auto",
              borderRadius: "8px",
            }}
          />
        </Grid.Cell>
      </Grid>
    </Page>
  );
}
