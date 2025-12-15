import { escapeHtml } from "../utils/escapeHtml.js";
import { formatWhen } from "../utils/formatWhen.js";

// Iteration 4A — Triage UI polish
// - Keep Iteration 4 card content (subject/from/when/snippet/suggested_action)
// - Support triageMode (restore button)
// - Render quick actions as a separate block (not inside the badge row)
export function EmailCard({ item, category, triageMode = false, extraMeta = "" }) {
  const emailId = escapeHtml(item.email_id || "");
  const subject = escapeHtml(item.subject || "(no subject)");
  const from = escapeHtml(item.from_name || item.from_email || "Unknown sender");
  const when = escapeHtml(formatWhen(item.received_at));
  const snippet = escapeHtml(item.snippet || "");
  const action = escapeHtml(item.suggested_action || "");

  const attCount = Number(item.attachments_count || 0);
  const attNames = escapeHtml((item.attachment_filenames || []).join(", "));

  const showNew = Boolean(item._show_new);

  const quickActions = triageMode
    ? `
      <div class="card-actions" aria-label="Quick actions">
        <button class="card-action" type="button"
          data-triage="restore"
          data-email-id="${emailId}"
          title="Restore"
          aria-label="Restore">↩</button>
      </div>
    `
    : `
      <div class="card-actions" aria-label="Quick actions">
        <button class="card-action" type="button"
          data-triage="done"
          data-email-id="${emailId}"
          title="Mark as done"
          aria-label="Mark as done">✅</button>

        <button class="card-action" type="button"
          data-triage="snooze"
          data-email-id="${emailId}"
          title="Snooze"
          aria-label="Snooze">⏰</button>

        <button class="card-action" type="button"
          data-triage="ignore"
          data-email-id="${emailId}"
          title="Ignore"
          aria-label="Ignore">🚫</button>
      </div>
    `;

  return `
    <article class="email-card"
      data-email-id="${emailId}"
      data-category="${escapeHtml(category)}"
      role="button"
      tabindex="0"
      aria-label="Open email ${emailId}"
    >
      <div class="email-top">
        <div class="email-subject">${subject}</div>
        <div class="email-tags">
          ${attCount > 0 ? `<span class="pill" title="${attNames}">📎 ${attCount}</span>` : ""}
          ${showNew ? `<span class="badge-new">New</span>` : ""}
        </div>
      </div>

      <div class="email-meta">
        <span>${from}</span>
        <span class="dot-sep">•</span>
        <span>${when}</span>
      </div>

      ${extraMeta ? `<div class="meta-line">${escapeHtml(extraMeta)}</div>` : ""}

      <div class="email-snippet">${snippet}</div>
      <div class="email-foot">${action}</div>

      ${quickActions}
    </article>
  `;
}