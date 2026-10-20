import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { App } from "src/renderer/app/App";
import { store } from "src/renderer/app/providers/store";
import { DesktopNotificationsPage } from "src/renderer/pages/desktop-notifications";
import "../../styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Не найден корневой элемент React");

const isNotifications = new URLSearchParams(window.location.search).get("view") === "notifications";
if (isNotifications) document.body.classList.add("desktop-notifications-body");

createRoot(root).render(
  isNotifications ? <DesktopNotificationsPage /> : (
    <Provider store={store}>
      <App />
    </Provider>
  ),
);
