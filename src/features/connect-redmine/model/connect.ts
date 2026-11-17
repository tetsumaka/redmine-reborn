import { saveAppSettings, validateSettings } from "src/entities/app-data";
import { rememberCurrentUser, verifyRedmineConnection } from "src/entities/redmine";
import type { AppSettings } from "src/entities/settings";

export async function connectRedmine(draft: AppSettings) {
  const settings = {
    ...draft,
    redmineUrl: draft.redmineUrl.trim().replace(/\/+$/, ""),
    apiKey: draft.apiKey.trim(),
  };
  validateSettings(settings);
  const { user, activities, customFields } = await verifyRedmineConnection(settings);
  // No settings or identity writes until all responses have been validated.
  await rememberCurrentUser(settings, user);
  return saveAppSettings({
    redmineUrl: settings.redmineUrl,
    apiKey: settings.apiKey,
    customFields,
    activities,
  });
}
