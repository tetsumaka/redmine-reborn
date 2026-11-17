import type { AppSettings, IssueCustomField } from "../model/types";

export function normalizeCustomFields(value: unknown): IssueCustomField[] {
  if (!Array.isArray(value)) throw new Error("Redmine не вернул список пользовательских полей");
  const ids = new Set<number>();
  return value.map((field): IssueCustomField => {
    if (!field || !Number.isSafeInteger(field.id) || field.id <= 0 || typeof field.name !== "string" || !field.name.trim() || ids.has(field.id)) {
      throw new Error("Некорректный список пользовательских полей");
    }
    ids.add(field.id);
    return { id: field.id, name: field.name.trim() };
  });
}

export type IssueRole = "qa" | "codeReviewer";
const aliases: Record<IssueRole, readonly string[]> = {
  qa: ["qa", "qualityassurance"],
  codeReviewer: ["codereviewer", "кодревьювер"],
};

export function roleCustomField(settings: AppSettings, role: IssueRole): IssueCustomField | undefined {
  const matches = settings.customFields.filter(({ name }) => aliases[role].includes(name.toLowerCase().replace(/[\s_-]+/g, "")));
  return matches.length === 1 ? matches[0] : undefined;
}
