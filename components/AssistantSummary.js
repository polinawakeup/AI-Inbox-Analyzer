import { escapeHtml } from "../utils/escapeHtml.js";
import { formatWhen } from "../utils/formatWhen.js";

export function AssistantSummary({
  summary,
  isLoading = false,
  persona = null,
  isPersonaLoading = false,
}) {
  const personaName = escapeHtml(persona?.display_name || summary?.assistant_name || "Inbox Assistant");
  const personaRole = escapeHtml(persona?.role || "Personal inbox assistant");
  const personaTagline = escapeHtml(persona?.tagline || "");
  const personaAvatarUrl = escapeHtml(persona?.avatar_url || "./assets/assistant_avatar.png");
  const listenLabel = escapeHtml(persona?.voice?.label || "Listen");

  const when = summary?.generated_at ? escapeHtml(formatWhen(summary.generated_at)) : "—";

  const lines = Array.isArray(summary?.briefing) ? summary.briefing : [];
  const mentions = Array.isArray(summary?.mentions) ? summary.mentions : [];

  // Mentions (phrase -> email_id)
  const normalizedMentions = mentions
    .filter((m) => m && typeof m.phrase === "string" && typeof m.email_id === "string" && m.phrase.trim())
    .map((m) => ({
      phraseRaw: m.phrase,
      phraseEsc: escapeHtml(m.phrase),
      emailId: escapeHtml(m.email_id),
    }))
    .sort((a, b) => b.phraseEsc.length - a.phraseEsc.length);

  function renderLineWithMentions(text) {
    let out = escapeHtml(text ?? "");

    for (const m of normalizedMentions) {
      if (!m.phraseEsc) continue;
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

  // Quick intents (stubs)
  const intents = [
    { id: "draft_replies", label: "Draft replies" },
    { id: "plan_day", label: "Plan my day" },
    { id: "deadlines", label: "Deadlines overview" },
    { id: "ask", label: "Ask assistant" },
  ];

  const intentsHtml = `
    <div class="assistant-intents" role="group" aria-label="Assistant quick intents">
      ${intents
        .map(
          (it) =>
            `<button type="button" class="assistant-intent" data-assistant-intent="${escapeHtml(it.id)}">${escapeHtml(it.label)}</button>`
        )
        .join("")}
    </div>
  `;

  return `
    <section class="assistant-summary" aria-label="Inbox Assistant Summary">
      <div class="assistant-head">
        <div class="assistant-left">
          <div class="assistant-avatar-wrap" aria-hidden="true">
            <img class="assistant-avatar" src="${personaAvatarUrl}" alt="" />
          </div>

          <div class="assistant-ident">
            <div class="assistant-title-row">
              <div class="assistant-title">${personaName}</div>
              ${isPersonaLoading ? `<span class="assistant-persona-loading">Loading persona…</span>` : ""}
            </div>

            ${personaTagline
              ? `<div class="assistant-tagline">${personaTagline}</div>`
              : `<div class="assistant-tagline">${personaRole}</div>`}

            <div class="assistant-meta">Generated: ${when}</div>
          </div>
        </div>

        <!-- IMPORTANT: no icon-btn class here -->
        <button class="assistant-listen" id="listenSummaryBtn" type="button" title="Listen (stub)">
          <span class="assistant-listen-icon">🔊</span>
          <span class="assistant-listen-label">${listenLabel}</span>
        </button>
      </div>

      <div class="assistant-body">
        ${body || `<div class="assistant-empty">No summary available.</div>`}
      </div>

      ${intentsHtml}
    </section>
  `;
}