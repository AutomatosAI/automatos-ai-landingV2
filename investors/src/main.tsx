import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import { APP_BASENAME, ROUTER_FUTURE } from "./lib/paths";
import "./styles/tokens.css";
import "./styles/index.css";
import { applyMood } from "./theme/apply-mood";

// Before the first render, so the page paints in the visitor's mood.
applyMood();

const container = document.getElementById("root");
if (!container) throw new Error("index.html has no #root element");

createRoot(container).render(
  <StrictMode>
    <BrowserRouter basename={APP_BASENAME} future={ROUTER_FUTURE}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
