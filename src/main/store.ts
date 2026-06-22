import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { AppData, defaultSettings } from "./types";

const emptyData = (): AppData => ({ entries: [], settings: { ...defaultSettings } });

export class Store {
  private file = path.join(app.getPath("userData"), "data.json");

  async read(): Promise<AppData> {
    try {
      const parsed = JSON.parse(await fs.readFile(this.file, "utf8")) as Partial<AppData>;
      const settings = parsed.settings;
      return {
        entries: Array.isArray(parsed.entries) ? parsed.entries : [],
        settings: {
          redmineUrl: settings?.redmineUrl ?? defaultSettings.redmineUrl,
          apiKey: settings?.apiKey ?? defaultSettings.apiKey,
          userId: settings?.userId ?? defaultSettings.userId,
          certificatePath: settings?.certificatePath ?? defaultSettings.certificatePath,
          activityIds: settings?.activityIds ?? defaultSettings.activityIds
        }
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyData();
      throw error;
    }
  }

  async write(data: AppData): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const temporary = `${this.file}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(temporary, this.file);
  }
}
