import { hydrateRoot } from "react-dom/client";
import { RemixBrowser } from "@remix-run/react";

// 🚫 No <StrictMode> here
hydrateRoot(document, <RemixBrowser />);
