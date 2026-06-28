import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { App } from "./App";
import { store } from "./store";
import "../../styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Не найден корневой элемент React");

createRoot(root).render(
  <Provider store={store}>
    <App />
  </Provider>,
);
