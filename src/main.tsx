import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Root element not found</div>';
} else {
  createRoot(rootElement).render(<App />);
}
