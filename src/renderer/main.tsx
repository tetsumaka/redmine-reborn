import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { App } from "src/renderer/app/App";
import { store } from "src/renderer/app/providers/store";
import "../../styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Не найден корневой элемент React");

createRoot(root).render(
  <Provider store={store}>
    <App />
  </Provider>,
);
