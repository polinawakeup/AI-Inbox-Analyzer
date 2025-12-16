import {
  loadDashboardModel,
  computeCountsFromBlocks,
  sumCounts,
  getSortedBlocks,
  findItem,
  getLatestReceivedAt,
  isNewEmail,
  loadTriageState,
  saveTriageState,
  cleanupExpiredSnoozes,
  applyTriageToBlocks,
  snoozePresetToUntil,
  removeFromTriage,
  loadAssistantSummary,
  loadAssistantPersona,
} from "../lib/data.js";

import { qs, on } from "../lib/dom.js";
import { KPIBar } from "./KPIBar.js";
import { Panel } from "./Panel.js";
import { EmailCard } from "./EmailCard.js";
import { Modal } from "./Modal.js";
import { TriageStrip } from "./TriageStrip.js";
import { AssistantSummary } from "./AssistantSummary.js";
import { formatWhen } from "../utils/formatWhen.js";

const DATA_URL = "./data/dashboard_view_model_v1.json";
const SUMMARY_URL = "./data/assistant_summary_v1.json";
const PERSONA_URL = "./data/assistant_persona_v1.json";

function panelMeta(category) {
  switch (category) {
    case "urgent_attention":
      return { title: "Urgent attention", subtitle: "Time-sensitive items with real downside", accentClass: "accent-urgent" };
    case "action_required":
      return { title: "Action required", subtitle: "Replies, decisions, follow-ups", accentClass: "accent-action" };
    case "documents_to_review":
      return { title: "Documents to review", subtitle: "Files to read, sign, or process", accentClass: "accent-docs" };
    case "informational":
      return { title: "Informational", subtitle: "No action needed; keep for awareness", accentClass: "accent-info" };
    default:
      return { title: category, subtitle: "", accentClass: "" };
  }
}

function triagePanelMeta(kind) {
  switch (kind) {
    case "snoozed":
      return { title: "Snoozed", subtitle: "Temporarily hidden until later", accentClass: "accent-info" };
    case "ignored":
      return { title: "Ignored", subtitle: "Hidden from main inbox", accentClass: "accent-info" };
    case "done":
      return { title: "Done", subtitle: "Marked as completed", accentClass: "accent-info" };
    default:
      return { title: kind, subtitle: "", accentClass: "" };
  }
}

export async function mountApp({ rootId }) {
  const root = document.getElementById(rootId);
  if (!root) throw new Error(`Root element #${rootId} not found`);

  const state = {
    isModalOpen: false,
    modalItem: null,
    modalCategory: null,

    viewedIds: new Set(),

    isRefreshing: false,
    lastUpdatedAtIso: null,

    toast: null, // { type: "success"|"error", message: string }

    triage: null,
    collapsed: { snoozed: true, ignored: true, done: true },

    snoozeMenu: null, // { emailId, category, left, top }

    summary: null,
    isSummaryLoading: false,
    persona: null,
    isPersonaLoading: false,
  };

  let sortedBlocks = [];
  let latestMs = 0;

  async function loadData() {
    const model = await loadDashboardModel(DATA_URL);
    sortedBlocks = getSortedBlocks(model.blocks || []);
    latestMs = getLatestReceivedAt(sortedBlocks);

    if (!state.lastUpdatedAtIso) state.lastUpdatedAtIso = new Date().toISOString();

    const now = new Date();
    const triage = cleanupExpiredSnoozes(loadTriageState(), now);
    state.triage = saveTriageState(triage);

    // Mode A: load summary from local JSON
    try {
      state.summary = await loadAssistantSummary(SUMMARY_URL);
    } catch (e) {
      // non-fatal: keep app working
      state.summary = {
        assistant_name: "Inbox Assistant",
        generated_at: new Date().toISOString(),
        briefing: ["Summary is unavailable (missing or unreadable assistant_summary_v1.json)."],
      };
    }

    // Mode A: load persona from local JSON
    try {
      state.persona = await loadAssistantPersona(PERSONA_URL);
    } catch (e) {
      // non-fatal: keep app working
      state.persona = {
        assistant_id: "inbox_assistant_v1",
        name: "Inbox Assistant",
        tagline: "Your calm, fast morning brief",
        avatar_url: "./assets/avatar.png",
        voice: { label: "Listen", status: "stub" },
      };
    }
  }

  function renderError(err) {
    root.innerHTML = `
      <div class="app">
        <div class="brand-title">AI Inbox Analyzer</div>
        <div class="brand-subtitle">Failed to load dashboard model.</div>
        <pre style="white-space:pre-wrap;border:1px solid rgba(255,59,48,.25);padding:12px;border-radius:16px;">\n${String(
          err?.message || err
        )}\n        </pre>
        <div class="brand-subtitle">
          Tip: open via a local server (e.g. <code>python -m http.server 8000</code>), not file://.
        </div>
      </div>
    `;
  }

  function showToast(type, message) {
    state.toast = { type, message };
    render();

    window.setTimeout(() => {
      if (state.toast && state.toast.type === type && state.toast.message === message) {
        state.toast = null;
        render();
      }
    }, 2800);
  }

  async function handleRefreshClick() {
    if (state.isRefreshing) return;

    state.isRefreshing = true;
    state.isSummaryLoading = true;
    state.isPersonaLoading = true;
    render();

    window.setTimeout(() => {
      const simulateError = false;

      if (simulateError) {
        state.isRefreshing = false;
        state.isSummaryLoading = false;
        state.isPersonaLoading = false;
        showToast("error", "Could not refresh. Please try again.");
        render();
        return;
      }

      state.lastUpdatedAtIso = new Date().toISOString();

      // Simulate summary regeneration (Mode A)
      if (state.summary && typeof state.summary === "object") {
        state.summary = { ...state.summary, generated_at: new Date().toISOString() };
      }

      state.isRefreshing = false;
      state.isSummaryLoading = false;
      state.isPersonaLoading = false;
      showToast("success", "Dashboard updated.");
      render();
    }, 2000);
  }

  function closeModal() {
    state.isModalOpen = false;
    state.modalItem = null;
    state.modalCategory = null;
    render();
  }

  function openSnoozeMenu(buttonEl, emailId, category) {
    const appEl = qs(".app", root);
    if (!appEl) return;

    const btnRect = buttonEl.getBoundingClientRect();
    const appRect = appEl.getBoundingClientRect();

    state.snoozeMenu = {
      emailId,
      category,
      left: Math.max(12, btnRect.left - appRect.left - 180),
      top: Math.max(12, btnRect.bottom - appRect.top + 8),
    };
    render();
  }

  function applyTriageAction(kind, emailId, category, buttonEl) {
    const now = new Date();
    const current = cleanupExpiredSnoozes(state.triage || loadTriageState(), now);

    if (kind === "restore") {
      const next = removeFromTriage(current, emailId);
      state.triage = saveTriageState(next);
      showToast("success", "Restored to inbox.");
      state.snoozeMenu = null;
      render();
      return;
    }

    if (kind === "done") {
      const next = { ...current, done: Array.from(new Set([...current.done, emailId])) };
      state.triage = saveTriageState(next);
      showToast("success", "Moved to Done.");
      state.snoozeMenu = null;
      render();
      return;
    }

    if (kind === "ignore") {
      const next = { ...current, ignored: Array.from(new Set([...current.ignored, emailId])) };
      state.triage = saveTriageState(next);
      showToast("success", "Moved to Ignored.");
      state.snoozeMenu = null;
      render();
      return;
    }

    if (kind === "snooze") {
      openSnoozeMenu(buttonEl, emailId, category);
    }
  }

  function setSnoozePreset(emailId, preset) {
    const now = new Date();
    const current = cleanupExpiredSnoozes(state.triage || loadTriageState(), now);
    const until = snoozePresetToUntil(preset, now);

    const next = {
      ...current,
      snoozed: {
        ...current.snoozed,
        [emailId]: { until, preset },
      },
    };

    state.triage = saveTriageState(next);
    state.snoozeMenu = null;
    showToast("success", "Moved to Snoozed.");
    render();
  }

  function findAny(blocks, emailId) {
    for (const b of blocks) {
      const it = (b.items || []).find((x) => x.email_id === emailId);
      if (it) return { item: it, category: b.category };
    }
    return null;
  }

  function renderSnoozeMenuHtml() {
    if (!state.snoozeMenu) return "";
    const { emailId, left, top } = state.snoozeMenu;

    return `
      <div class="snooze-menu" style="left:${left}px; top:${top}px;" role="menu" aria-label="Snooze options">
        <button type="button" data-snooze-preset="later_today" data-email-id="${emailId}">Later today (+3h)</button>
        <button type="button" data-snooze-preset="tomorrow_9" data-email-id="${emailId}">Tomorrow 09:00</button>
        <button type="button" data-snooze-preset="next_mon_9" data-email-id="${emailId}">Next week (Mon 09:00)</button>
      </div>
    `;
  }

  function render() {
    const now = new Date();
    const triageClean = cleanupExpiredSnoozes(state.triage || loadTriageState(), now);
    state.triage = saveTriageState(triageClean);

    const { mainBlocks, snoozedItems, ignoredItems, doneItems } = applyTriageToBlocks(sortedBlocks, state.triage, now);

    const counts = computeCountsFromBlocks(mainBlocks);
    const total = sumCounts(counts);

    const lastUpdatedLabel = state.lastUpdatedAtIso
      ? `Last updated: ${formatWhen(state.lastUpdatedAtIso)}`
      : "Last updated: —";

    const toastHtml = state.toast
      ? `<div class="toast toast--${state.toast.type}" role="status">${state.toast.message}</div>`
      : "";

    const headerHtml = `
      <header class="header">
        <div class="header-top">
          <div class="profile">
            <img class="avatar" src="./assets/avatar.png" alt="User avatar" />
            <div class="brand-container">
              <div class="brand-title">AI Inbox Analyzer</div>
              <div class="brand-subtitle">Polina • inbox dashboard</div>
            </div>
          </div>

          <div class="header-actions">
            <button class="icon-btn" id="refreshBtn" title="Refresh dashboard" ${state.isRefreshing ? "disabled" : ""}>
              <span class="refresh-icon ${state.isRefreshing ? "spin" : ""}">⟳</span>
            </button>
            <div class="last-updated">${lastUpdatedLabel}</div>
          </div>
        </div>

        <div class="header-kpis">
          ${KPIBar({ counts, total })}
        </div>
      </header>

      <div class="toast-host">${toastHtml}</div>
    `;

    const summaryHtml = AssistantSummary({ summary: state.summary, isLoading: state.isSummaryLoading, persona: state.persona, isPersonaLoading: state.isPersonaLoading });

    const order = ["urgent_attention", "action_required", "documents_to_review", "informational"];
    const panelsHtml = order
      .map((cat) => {
        const meta = panelMeta(cat);
        const block = mainBlocks.find((b) => b.category === cat);
        const baseItems = block?.items || [];

        const items = baseItems.map((it) => ({
          ...it,
          _show_new: Boolean(isNewEmail(it.received_at, latestMs, 6) && !state.viewedIds.has(it.email_id)),
        }));

        const itemsHtml = items.map((it) => EmailCard({ item: it, category: cat })).join("");

        return Panel({ title: meta.title, subtitle: meta.subtitle, accentClass: meta.accentClass, itemsHtml, count: items.length });
      })
      .join("");

    const snoozedMeta = triagePanelMeta("snoozed");
    const ignoredMeta = triagePanelMeta("ignored");
    const doneMeta = triagePanelMeta("done");

    const snoozedHtml = snoozedItems
      .map((it) =>
        EmailCard({
          item: { ...it, _show_new: false },
          category: it._source_category || "informational",
          extraMeta: it._snooze_until ? `Until ${formatWhen(it._snooze_until)}` : "",
          triageMode: true,
        })
      )
      .join("");

    const ignoredHtml = ignoredItems
      .map((it) =>
        EmailCard({
          item: { ...it, _show_new: false },
          category: it._source_category || "informational",
          triageMode: true,
        })
      )
      .join("");

    const doneHtml = doneItems
      .map((it) =>
        EmailCard({
          item: { ...it, _show_new: false },
          category: it._source_category || "informational",
          triageMode: true,
        })
      )
      .join("");

    const triageStripsHtml = `
      <div class="triage-strips">
        ${TriageStrip({ id: "snoozed", title: snoozedMeta.title, subtitle: snoozedMeta.subtitle, count: snoozedItems.length, collapsed: state.collapsed.snoozed, itemsHtml: snoozedHtml })}
        ${TriageStrip({ id: "ignored", title: ignoredMeta.title, subtitle: ignoredMeta.subtitle, count: ignoredItems.length, collapsed: state.collapsed.ignored, itemsHtml: ignoredHtml })}
        ${TriageStrip({ id: "done", title: doneMeta.title, subtitle: doneMeta.subtitle, count: doneItems.length, collapsed: state.collapsed.done, itemsHtml: doneHtml })}
      </div>
    `;

    root.innerHTML = `
      <div class="app">
        ${headerHtml}
        ${summaryHtml}
        <main class="board" id="board">
          ${panelsHtml}
          ${triageStripsHtml}
        </main>
        <div class="overlay-layer" id="overlayLayer">
          ${renderSnoozeMenuHtml()}
        </div>
        ${Modal({ isOpen: state.isModalOpen, item: state.modalItem, category: state.modalCategory })}
      </div>
    `;

    wireEvents();
  }

  function wireEvents() {
    const appEl = qs(".app", root);

    if (appEl) {
      on(appEl, "click", (e) => {
        // Summary listen stub
        const listenBtn = e.target.closest("#listenSummaryBtn");
        if (listenBtn) {
          e.preventDefault();
          e.stopPropagation();
          showToast("success", "Voice playback coming soon.");
          return;
        }

        // Assistant quick intents (stubs)
        const intentBtn = e.target.closest("[data-assistant-intent]");
        if (intentBtn) {
          e.preventDefault();
          e.stopPropagation();

          const id = intentBtn.getAttribute("data-assistant-intent") || "";
          const labelMap = {
            draft_replies: "Draft replies",
            plan_day: "Plan my day",
            deadlines: "Deadlines overview",
            ask: "Ask assistant",
          };

          const label = labelMap[id] || "Assistant action";
          showToast("success", `Stub: ${label}`);
          return;
        }

        // Summary mentions -> open the referenced email modal
        const mentionBtn = e.target.closest("[data-mention-email-id]");
        if (mentionBtn) {
          e.preventDefault();
          e.stopPropagation();

          const emailId = mentionBtn.getAttribute("data-mention-email-id");
          if (!emailId) return;

          // Prefer finding across all blocks (works even if the email is currently triaged)
          const any = findAny(sortedBlocks, emailId);
          if (!any) {
            showToast("error", "Email not found.");
            return;
          }

          state.viewedIds.add(emailId);
          state.isModalOpen = true;
          state.modalItem = any.item;
          state.modalCategory = any.category;
          render();
          return;
        }

        // Snooze menu selection
        const snoozePick = e.target.closest("[data-snooze-preset]");
        if (snoozePick) {
          e.preventDefault();
          e.stopPropagation();
          const preset = snoozePick.getAttribute("data-snooze-preset");
          const emailId = snoozePick.getAttribute("data-email-id");
          if (preset && emailId) setSnoozePreset(emailId, preset);
          return;
        }

        // Close snooze menu on outside click
        const inMenu = e.target.closest(".snooze-menu");
        const snoozeBtn = e.target.closest('[data-triage="snooze"]');
        if (state.snoozeMenu && !inMenu && !snoozeBtn) {
          state.snoozeMenu = null;
          render();
        }
      });
    }

    const board = qs("#board", root);
    if (board) {
      on(board, "click", (e) => {
        const triageToggle = e.target.closest(".triage-head[data-triage-toggle]");
        if (triageToggle) {
          const id = triageToggle.getAttribute("data-triage-toggle");
          if (id && Object.prototype.hasOwnProperty.call(state.collapsed, id)) {
            state.collapsed[id] = !state.collapsed[id];
            render();
          }
          return;
        }

        const toggle = e.target.closest("[data-toggle]");
        if (toggle) {
          const id = toggle.getAttribute("data-toggle");
          if (id && Object.prototype.hasOwnProperty.call(state.collapsed, id)) {
            state.collapsed[id] = !state.collapsed[id];
            render();
          }
          return;
        }

        const triageBtn = e.target.closest("[data-triage]");
        if (triageBtn) {
          e.preventDefault();
          e.stopPropagation();
          const kind = triageBtn.getAttribute("data-triage");
          const emailId = triageBtn.getAttribute("data-email-id");
          if (!kind || !emailId) return;

          const cardEl = triageBtn.closest(".email-card");
          const category = cardEl?.getAttribute("data-category") || "informational";

          applyTriageAction(kind, emailId, category, triageBtn);
          return;
        }

        const card = e.target.closest(".email-card");
        if (!card) return;

        const emailId = card.getAttribute("data-email-id");
        const category = card.getAttribute("data-category");
        if (!emailId || !category) return;

        let found = findItem(sortedBlocks, category, emailId);
        let foundCat = category;

        if (!found) {
          const any = findAny(sortedBlocks, emailId);
          if (!any) return;
          found = any.item;
          foundCat = any.category;
        }

        state.viewedIds.add(emailId);
        state.isModalOpen = true;
        state.modalItem = found;
        state.modalCategory = foundCat;
        render();
      });

      on(board, "keydown", (e) => {
        const el = e.target;
        if (!(el instanceof HTMLElement)) return;
        if (!el.matches(".triage-head[data-triage-toggle]")) return;
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();

        const id = el.getAttribute("data-triage-toggle");
        if (id && Object.prototype.hasOwnProperty.call(state.collapsed, id)) {
          state.collapsed[id] = !state.collapsed[id];
          render();
        }
      });
    }

    const refreshBtn = qs("#refreshBtn", root);
    if (refreshBtn) on(refreshBtn, "click", handleRefreshClick);

    const backdrop = qs("#modalBackdrop", root);
    const closeBtn = qs("#modalClose", root);

    if (closeBtn) on(closeBtn, "click", closeModal);

    if (backdrop) {
      on(backdrop, "click", (e) => {
        if (e.target !== backdrop) return;
        closeModal();
      });
    }

    on(window, "keydown", (e) => {
      if (e.key !== "Escape") return;
      if (state.snoozeMenu) {
        state.snoozeMenu = null;
        render();
        return;
      }
      if (!state.isModalOpen) return;
      closeModal();
    });
  }

  try {
    await loadData();
    render();
  } catch (err) {
    renderError(err);
  }
}