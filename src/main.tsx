import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { App } from "src/app/App";
import { store } from "src/app/providers/store";
import { initializeApp } from "src/app/bootstrap";
import "../styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Не найден корневой элемент React");

const reactRoot = createRoot(root);
void initializeApp().then((dispose) => {
  // Release the writer lock on navigation; a restored bfcache page starts a new session.
  window.addEventListener("pagehide", dispose, { once: true });
  window.addEventListener("pageshow", (event) => { if (event.persisted) location.reload(); });
  reactRoot.render(<Provider store={store}><App /></Provider>);
}).catch((error: unknown) => {
  reactRoot.render(<main className="mx-auto max-w-xl p-8 text-zinc-100" role="alert">
    <h1 className="mb-4 text-xl font-bold">Не удалось открыть приложение</h1>
    <p>{error instanceof Error ? error.message : String(error)}</p>
    <button className="mt-4 underline" onClick={() => location.reload()}>Повторить</button>
  </main>);
});
