import { escapeHtml } from "../utils/escapeHtml.js";
import { formatWhen } from "../utils/formatWhen.js";

export function AssistantSummary({ summary, isLoading = false }) {
  const name = escapeHtml(summary?.assistant_name || "Inbox Assistant");
  const when = summary?.generated_at ? escapeHtml(formatWhen(summary.generated_at)) : "—";
  const lines = Array.isArray(summary?.briefing) ? summary.briefing : [];

  const body = isLoading
    ? `<div class="assistant-loading">Updating summary…</div>`
    : lines.map((t) => `<p class="assistant-line">${escapeHtml(t)}</p>`).join("");

  return `
    <section class="assistant-summary" aria-label="Inbox Assistant Summary">
      <div class="assistant-head">
        <div>
          <div class="assistant-title">${name}</div>
          <div class="assistant-meta">Generated: ${when}</div>
        </div>

        <button class="assistant-listen icon-btn" id="listenSummaryBtn" type="button" title="Listen (stub)">
          <span class="assistant-listen-icon">🔊</span>
        </button>
      </div>

      <div class="assistant-body">
        ${body || `<div class="assistant-empty">No summary available.</div>`}
      </div>
    </section>
  `;
}