import { escapeHtml } from "../utils/escapeHtml.js";
import { formatWhen } from "../utils/formatWhen.js";

export function EmailCard({ item, category, extraMeta = "" }) {
  const subject = escapeHtml(item.subject || "(no subject)");
  const from = escapeHtml(item.from_name || item.from_email || "Unknown sender");
  const when = escapeHtml(formatWhen(item.received_at));
  const snippet = escapeHtml(item.snippet || "");
  const action = escapeHtml(item.suggested_action || "");
  const attCount = Number(item.attachments_count || 0);

  const showNew = Boolean(item._show_new);

  return `
    <article class="email-card"
      data-email-id="${escapeHtml(item.email_id)}"
      data-category="${escapeHtml(category)}"
      role="button"
      tabindex="0"
      aria-label="Open email ${escapeHtml(item.email_id)}"
    >
      <div class="email-top">
        <div class="email-subject">${subject}</div>
        <div class="email-tags">
          ${attCount > 0 ? `<span class="pill" title="${escapeHtml((item.attachment_filenames || []).join(", "))}">📎 ${attCount}</span>` : ""}

          <div class="card-actions" aria-label="Quick actions">
            <button class="card-action" type="button" data-triage="done" data-email-id="${escapeHtml(item.email_id)}" title="Mark as done" aria-label="Mark as done">✓</button>
            <button class="card-action" type="button" data-triage="snooze" data-email-id="${escapeHtml(item.email_id)}" title="Snooze" aria-label="Snooze">⏰</button>
            <button class="card-action" type="button" data-triage="ignore" data-email-id="${escapeHtml(item.email_id)}" title="Ignore" aria-label="Ignore">⦸</button>
          </div>

          ${showNew ? `<span class="badge-new">New</span>` : ""}
        </div>
      </div>

      <div class="email-meta">
        <span>${from}</span>
        <span>•</span>
        <span>${when}</span>
      </div>

      ${extraMeta ? `<div class="meta-line">${escapeHtml(extraMeta)}</div>` : ""}

      <div class="email-snippet">${snippet}</div>
      <div class="email-foot">${action}</div>
    </article>
  `;
}