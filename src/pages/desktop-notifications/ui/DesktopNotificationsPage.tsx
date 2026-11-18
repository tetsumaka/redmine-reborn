import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { DesktopNotification, DesktopNotificationState } from "src/shared/api/desktop";
import { DESKTOP_NOTIFICATION_HEIGHT, DESKTOP_NOTIFICATION_GAP, DESKTOP_NOTIFICATION_MAX_VISIBLE } from "src/shared/config/notifications";
import { pushNotificationsApi as api } from "src/shared/api/desktop";
import "./notifications.css";

type Card = DesktopNotification & { leaving?: boolean; position: number };

export function DesktopNotificationsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [corner, setCorner] = useState<DesktopNotificationState["position"]>("bottom-right");

  useEffect(() => {
    let active = true;
    let receivedUpdate = false;
    const update = (state: DesktopNotificationState) => {
      if (!active) return;
      const items = state.notifications;
      setCorner(state.position);
      setCards((previous) => {
        const ids = new Set(items.map((item) => item.id));
        const leaving = previous.filter((card) => !ids.has(card.id)).map((card) => ({
          ...card,
          leaving: true,
          position: items.length >= DESKTOP_NOTIFICATION_MAX_VISIBLE ? DESKTOP_NOTIFICATION_MAX_VISIBLE : card.position,
        }));
        return [...leaving, ...items.map((item, index) => ({ ...item, position: items.length - 1 - index }))];
      });
    };
    const unsubscribe = api().onChanged((items) => {
      receivedUpdate = true;
      update(items);
    });
    void api().list().then((items) => {
      if (!receivedUpdate) update(items);
    }).catch(console.error);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!cards.some((card) => card.leaving)) return;
    const timer = setTimeout(() => setCards((previous) => previous.filter((card) => !card.leaving)), 320);
    return () => clearTimeout(timer);
  }, [cards]);

  useEffect(() => {
    let interactive: boolean | undefined;
    const onMove = (event: MouseEvent) => {
      const overCard = event.target instanceof Element && Boolean(event.target.closest(".desktop-notification:not(.is-leaving)"));
      if (interactive === overCard) return;
      interactive = overCard;
      void api().setInteractive(interactive).catch(console.error);
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      void api().setInteractive(false).catch(console.error);
    };
  }, [cards]);

  return (
    <div className="desktop-notifications" data-position={corner} aria-live="polite">
      {cards.map((card) => (
        <article
          key={card.id}
          className={`desktop-notification${card.leaving ? " is-leaving" : ""}`}
          style={{
            [corner.startsWith("top") ? "top" : "bottom"]: 8 + card.position * (DESKTOP_NOTIFICATION_HEIGHT + DESKTOP_NOTIFICATION_GAP),
            height: DESKTOP_NOTIFICATION_HEIGHT,
          }}
        >
          <div
            className="desktop-notification-content"
          >
            <div className="desktop-notification-heading">
              <img src="./redmine-reborn.svg" alt="" />
              <span className="desktop-notification-message">
                {card.message}
                {card.issueId && <> {card.issueUrl ? (
                  <a
                    href={card.issueUrl}
                    className="desktop-notification-link"
                    tabIndex={card.leaving ? -1 : 0}
                    aria-label={`Открыть изменение задачи #${card.issueId}`}
                    onClick={(event) => {
                      event.preventDefault();
                      if (!card.leaving) void api().open(card.id).catch(console.error);
                    }}
                  >#{card.issueId}</a>
                ) : <span>#{card.issueId}</span>}</>}
              </span>
            </div>
            <span className="desktop-notification-title">{card.title}</span>
            {card.comment && (
              <blockquote className="desktop-notification-comment">
                <span className="desktop-notification-comment-text">{card.comment}</span>
              </blockquote>
            )}
          </div>
          <button
            type="button"
            className="desktop-notification-close"
            aria-label="Закрыть уведомление"
            onClick={() => { void api().close(card.id).catch(console.error); }}
          ><X size={16} /></button>
        </article>
      ))}
    </div>
  );
}
