import { escapeHtml } from "../utils/escapeHtml.js";
import { formatWhen } from "../utils/formatWhen.js";

export function AssistantSummary({ summary, isLoading = false }) {
  const name = escapeHtml(summary?.assistant_name || "Inbox Assistant");
  const when = summary?.generated_at ? escapeHtml(formatWhen(summary.generated_at)) : "—";

  const lines = Array.isArray(summary?.briefing) ? summary.briefing : [];
  const mentions = Array.isArray(summary?.mentions) ? summary.mentions : [];

  // Build safe mention replacements on already-escaped text.
  // We replace occurrences of escaped phrases with a small inline button.
  const normalizedMentions = mentions
    .filter((m) => m && typeof m.phrase === "string" && typeof m.email_id === "string" && m.phrase.trim())
    .map((m) => ({
      phraseRaw: m.phrase,
      phraseEsc: escapeHtml(m.phrase),
      emailId: escapeHtml(m.email_id),
    }))
    // Replace longer phrases first to reduce partial/overlap issues.
    .sort((a, b) => b.phraseEsc.length - a.phraseEsc.length);

  function renderLineWithMentions(text) {
    let out = escapeHtml(text ?? "");

    for (const m of normalizedMentions) {
      if (!m.phraseEsc) continue;
      // Split/join avoids regex escaping pitfalls.
      const parts = out.split(m.phraseEsc);
      if (parts.length === 1) continue;

      const btn = `<button type="button" class="assistant-mention" data-mention-email-id="${m.emailId}" title="Open related email">${m.phraseEsc}</button>`;
      out = parts.join(btn);
    }

    return `<p class="assistant-line">${out}</p>`;
  }

  const body = isLoading
    ? `<div class="assistant-loading">Updating summary…</div>`
    : lines.map(renderLineWithMentions).join("");

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