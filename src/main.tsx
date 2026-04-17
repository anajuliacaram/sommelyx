import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  console.error("[Sommelyx] Missing #root element in index.html");
} else {
  createRoot(root).render(<App />);
}
