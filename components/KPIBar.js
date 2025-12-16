import { escapeHtml } from "../utils/escapeHtml.js";

export function KPIBar({ counts, total }) {
  const items = [
    { key: "total", label: "Total", value: Number(total || 0), dot: null },
    { key: "urgent_attention", label: "Urgent", value: Number(counts?.urgent_attention || 0), dot: "dot-urgent" },
    { key: "action_required", label: "Action", value: Number(counts?.action_required || 0), dot: "dot-action" },
    { key: "documents_to_review", label: "Docs", value: Number(counts?.documents_to_review || 0), dot: "dot-docs" },
    { key: "informational", label: "Info", value: Number(counts?.informational || 0), dot: "dot-info" },
  ];

  return `
    <div class="kpi-bar" aria-label="Dashboard KPIs">
      ${items
        .map((it) => {
          const label = escapeHtml(it.label);
          const value = escapeHtml(String(it.value));
          const dotHtml = it.dot ? `<span class="kpi-dot ${it.dot}" aria-hidden="true"></span>` : "";
          return `
            <div class="kpi">
              <div class="kpi-label">
                <span class="kpi-label-row">${dotHtml}<span>${label}</span></span>
              </div>
              <div class="kpi-value">${value}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}