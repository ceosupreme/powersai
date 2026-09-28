import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");
if (root.childElementCount > 0) hydrateRoot(root, <App />);
else createRoot(root).render(<App />);
