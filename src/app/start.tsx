import type { Root } from "react-dom/client";
import { Provider } from "react-redux";
import { App } from "./App";
import { store } from "./providers/store";
import { initializeApp } from "./bootstrap";

export async function startApp(reactRoot: Root): Promise<void> {
  try {
    const dispose = await initializeApp();
    window.addEventListener("pagehide", dispose, { once: true });
    reactRoot.render(<Provider store={store}><App /></Provider>);
  } catch (error) {
    reactRoot.render(<main className="mx-auto max-w-xl p-8 text-zinc-100" role="alert">
      <h1 className="mb-4 text-xl font-bold">Не удалось открыть приложение</h1>
      <p>{error instanceof Error ? error.message : String(error)}</p>
      <button className="mt-4 underline" onClick={() => location.reload()}>Повторить</button>
    </main>);
  }
}
