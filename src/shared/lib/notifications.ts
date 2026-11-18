import { desktopApi, desktopValue, type NotificationMessage } from "src/shared/api/desktop";
export async function showNotification(message: NotificationMessage): Promise<void> {
  desktopValue(await desktopApi().notify(message));
}

export async function testNotification(): Promise<void> {
  await showNotification({
    title: "Пользователь Redmine обновил задачу #99999",
    body: "Тестовое название задачи",
    comment: "Тестовый комментарий",
    issueId: 99999,
    tag: `test:${crypto.randomUUID()}`,
  });
}
