import { escapeHtml } from "../utils/escapeHtml.js";
import { formatWhen } from "../utils/formatWhen.js";
import { clampConfidence, confLabel } from "../utils/confidence.js";

export function EmailCard({ item, category }) {
  const subject = escapeHtml(item.subject || "(no subject)");
  const from = escapeHtml(item.from_name || item.from_email || "Unknown sender");
  const when = escapeHtml(formatWhen(item.received_at));
  const conf = clampConfidence(item.confidence);
  const pill = `${confLabel(conf)} • ${Math.round(conf * 100)}%`;
  const snippet = escapeHtml(item.snippet || "");
  const action = escapeHtml(item.suggested_action || "");
  const attCount = Number(item.attachments_count || 0);

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
        <div class="pill">${pill}</div>
      </div>

      <div class="email-meta">
        <span>${from}</span>
        <span>•</span>
        <span>${when}</span>
        <span>•</span>
        <span>${attCount > 0 ? `📎 ${attCount}` : "—"}</span>
      </div>

      <div class="email-snippet">${snippet}</div>
      <div class="email-foot">${action}</div>
    </article>
  `;
}