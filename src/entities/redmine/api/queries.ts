import { loadAppData } from "src/entities/app-data/@x/redmine";
import type { AppData } from "src/entities/app-data/@x/redmine";
import * as redmine from "./client";

async function withSettings<T>(operation: (settings: redmine.RedmineSettings, data: AppData) => Promise<T>): Promise<T> {
  const data = await loadAppData();
  return operation(await redmine.resolveRedmineSettings(data.settings), data);
}

export const getIssue = (id: string) => withSettings((settings) => redmine.loadIssue(id, settings));
export const getCurrentUser = async () => redmine.loadNotificationUser((await loadAppData()).settings);
export const getCustomFilterIssues = (id: string, offset: number, limit: number) => withSettings((settings, data) => {
  const filter = data.customFilters.find((item) => item.id === id);
  if (!filter) throw new Error("Фильтр не найден");
  return redmine.loadCustomFilterIssues(filter, settings, offset, limit);
});
export const getProjects = () => withSettings(redmine.loadProjects);
export const getProjectCategories = (id: number) => withSettings((settings) => redmine.loadProjectCategories(id, settings));
export const getProjectVersions = (id: number) => withSettings((settings) => redmine.loadProjectVersions(id, settings));
export const getIssuePriorities = () => withSettings(redmine.loadIssuePriorities);
export const getIssueStatuses = () => withSettings(redmine.loadIssueStatuses);
