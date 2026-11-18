import { createRoot } from "react-dom/client";
import "../styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Не найден корневой элемент React");

const reactRoot = createRoot(root);
if (new URLSearchParams(location.search).get("view") === "notifications") {
  document.body.classList.add("desktop-notifications-body");
  void import("src/pages/desktop-notifications").then(({ DesktopNotificationsPage }) => reactRoot.render(<DesktopNotificationsPage />));
} else {
  void import("src/app/start").then(({ startApp }) => startApp(reactRoot));
}
