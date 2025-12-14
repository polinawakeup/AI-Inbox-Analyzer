import {
  loadDashboardModel,
  computeCountsFromBlocks,
  sumCounts,
  getSortedBlocks,
  findItem,
  getLatestReceivedAt,
  isNewEmail,
} from "../lib/data.js";

import { qs, on } from "../lib/dom.js";
import { KPIBar } from "./KPIBar.js";
import { Panel } from "./Panel.js";
import { EmailCard } from "./EmailCard.js";
import { Modal } from "./Modal.js";
import { formatWhen } from "../utils/formatWhen.js";

const DATA_URL = "./data/dashboard_view_model_v1.json";

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
  };

  let sortedBlocks = [];
  let latestMs = 0;

  async function loadData() {
    const model = await loadDashboardModel(DATA_URL);
    sortedBlocks = getSortedBlocks(model.blocks || []);
    latestMs = getLatestReceivedAt(sortedBlocks);

    // initial last updated = "now" at first successful load
    if (!state.lastUpdatedAtIso) state.lastUpdatedAtIso = new Date().toISOString();
  }

  function renderError(err) {
    root.innerHTML = `
      <div class="app">
        <div class="brand-title">AI Inbox Analyzer</div>
        <div class="brand-subtitle">Failed to load dashboard model.</div>
        <pre style="white-space:pre-wrap;border:1px solid rgba(255,59,48,.25);padding:12px;border-radius:16px;">
${String(err?.message || err)}
        </pre>
        <div class="brand-subtitle">
          Tip: open via a local server (e.g. <code>python -m http.server 8000</code>), not file://.
        </div>
      </div>
    `;
  }

  function showToast(type, message) {
    state.toast = { type, message };
    render();

    // auto-hide
    window.setTimeout(() => {
      // only clear if still same toast
      if (state.toast && state.toast.type === type && state.toast.message === message) {
        state.toast = null;
        render();
      }
    }, 2800);
  }

  async function handleRefreshClick() {
    if (state.isRefreshing) return;

    state.isRefreshing = true;
    render();

    // Stub: simulate a 2s network request.
    window.setTimeout(() => {
      const simulateError = false; // keep false for MVP stub

      if (simulateError) {
        state.isRefreshing = false;
        showToast("error", "Could not refresh. Please try again.");
        render();
        return;
      }

      state.lastUpdatedAtIso = new Date().toISOString();
      state.isRefreshing = false;
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

  function render() {
    const counts = computeCountsFromBlocks(sortedBlocks);
    const total = sumCounts(counts);

    const lastUpdatedLabel = state.lastUpdatedAtIso
      ? `Last updated: ${formatWhen(state.lastUpdatedAtIso)}`
      : "Last updated: —";

    const toastHtml = state.toast
      ? `<div class="toast toast--${state.toast.type}" role="status">${state.toast.message}</div>`
      : "";

    const headerHtml = `
      <header class="header">
        <div class="header-left">
          <div class="profile">
            <img class="avatar" src="./assets/avatar.png" alt="User avatar" />
            <div>
              <div class="brand-title">AI Inbox Analyzer</div>
              <div class="brand-subtitle">Polina • inbox dashboard</div>
            </div>
          </div>
        </div>

        <div class="header-right">
          <button class="icon-btn" id="refreshBtn" title="Refresh dashboard" ${state.isRefreshing ? "disabled" : ""}>
            <span class="refresh-icon ${state.isRefreshing ? "spin" : ""}">⟳</span>
          </button>
          ${KPIBar({ counts, total })}
          <div class="last-updated">${lastUpdatedLabel}</div>
        </div>
      </header>

      <div class="toast-host">${toastHtml}</div>
    `;

    const order = ["urgent_attention", "action_required", "documents_to_review", "informational"];
    const panelsHtml = order
      .map((cat) => {
        const meta = panelMeta(cat);
        const block = sortedBlocks.find((b) => b.category === cat);
        const baseItems = block?.items || [];

        const items = baseItems.map((it) => ({
          ...it,
          _show_new: Boolean(isNewEmail(it.received_at, latestMs, 6) && !state.viewedIds.has(it.email_id)),
        }));

        const itemsHtml = items.map((it) => EmailCard({ item: it, category: cat })).join("");

        return Panel({
          title: meta.title,
          subtitle: meta.subtitle,
          accentClass: meta.accentClass,
          itemsHtml,
          count: items.length,
        });
      })
      .join("");

    root.innerHTML = `
      <div class="app">
        ${headerHtml}
        <main class="board" id="board">
          ${panelsHtml}
        </main>
        ${Modal({ isOpen: state.isModalOpen, item: state.modalItem, category: state.modalCategory })}
      </div>
    `;

    wireEvents();
  }

  function wireEvents() {
    const board = qs("#board", root);
    if (board) {
      on(board, "click", (e) => {
        const card = e.target.closest(".email-card");
        if (!card) return;

        const emailId = card.getAttribute("data-email-id");
        const category = card.getAttribute("data-category");
        if (!emailId || !category) return;

        const found = findItem(sortedBlocks, category, emailId);
        if (!found) return;

        state.viewedIds.add(emailId);
        state.isModalOpen = true;
        state.modalItem = found;
        state.modalCategory = category;
        render();
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