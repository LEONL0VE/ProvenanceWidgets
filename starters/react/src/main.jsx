import "primereact/resources/themes/lara-light-cyan/theme.css";
import "./styles.css";

import { createRoot } from "react-dom/client";
import { ProvenanceProvider } from "provenance-widgets";

import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <ProvenanceProvider>
    <App />
  </ProvenanceProvider>,
);
