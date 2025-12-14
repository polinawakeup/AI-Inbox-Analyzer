import { loadDashboardModel } from "../lib/data.js";
import { qs, on } from "../lib/dom.js";
import { KPIBar } from "./KPIBar.js";
import { Panel } from "./Panel.js";
import { EmailCard } from "./EmailCard.js";
import { Modal } from "./Modal.js";

const DATA_URL = "./data/dashboard_view_model_v1.json";

function blocksByCategory(blocks) {
  const m = new Map();
  for (const b of blocks || []) m.set(b.category, b);
  return m;
}

function computeCountsFromBlocks(blocks) {
  const m = blocksByCategory(blocks);
  const len = (cat) => (m.get(cat)?.items?.length ?? 0);
  return {
    urgent_attention: len("urgent_attention"),
    action_required: len("action_required"),
    documents_to_review: len("documents_to_review"),
    informational: len("informational"),
  };
}

function sumCounts(counts) {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

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

  let model;
  try {
    model = await loadDashboardModel(DATA_URL);
  } catch (err) {
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
    return;
  }

  const state = {
    isModalOpen: false,
    modalItem: null,
    modalCategory: null,
  };

  function render() {
    const blocks = model.blocks || [];
    const byCat = blocksByCategory(blocks);
    const counts = computeCountsFromBlocks(blocks);
    const total = sumCounts(counts);

    const headerHtml = `
      <header class="header">
        <div>
          <div class="brand-title">AI Inbox Analyzer</div>
          <div class="brand-subtitle">Inbox dashboard — prioritized, explainable, actionable</div>
        </div>
        ${KPIBar({ counts, total })}
      </header>
    `;

    const order = ["urgent_attention", "action_required", "documents_to_review", "informational"];
    const panelsHtml = order
      .map((cat) => {
        const meta = panelMeta(cat);
        const items = byCat.get(cat)?.items || [];
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
        const items = model.blocks?.find((b) => b.category === category)?.items || [];
        const found = items.find((x) => x.email_id === emailId);
        if (!found) return;

        state.isModalOpen = true;
        state.modalItem = found;
        state.modalCategory = category;
        render();
      });
    }

    const backdrop = qs("#modalBackdrop", root);
    const closeBtn = qs("#modalClose", root);

    if (closeBtn) {
      on(closeBtn, "click", () => {
        state.isModalOpen = false;
        state.modalItem = null;
        state.modalCategory = null;
        render();
      });
    }

    if (backdrop) {
      on(backdrop, "click", (e) => {
        if (e.target !== backdrop) return;
        state.isModalOpen = false;
        state.modalItem = null;
        state.modalCategory = null;
        render();
      });
    }

    on(window, "keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!state.isModalOpen) return;
      state.isModalOpen = false;
      state.modalItem = null;
      state.modalCategory = null;
      render();
    });
  }

  render();
}