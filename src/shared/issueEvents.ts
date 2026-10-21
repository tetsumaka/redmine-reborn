export function issueEventUrl(redmineUrl: string, issueId: number, journalId: number): string {
  const url = new URL(`issues/${issueId}`, `${redmineUrl.replace(/\/+$/, "")}/`);
  url.hash = `change-${journalId}`;
  return url.toString();
}
