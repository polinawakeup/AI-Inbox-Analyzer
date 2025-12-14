export function KPIBar({ counts, total }) {
  const items = [
    { key: "urgent_attention", label: "Urgent" },
    { key: "action_required", label: "Action" },
    { key: "documents_to_review", label: "Docs" },
    { key: "informational", label: "Info" },
  ];

  return `
    <div class="kpi-bar">
      <div class="kpi">
        <div class="kpi-label">Total</div>
        <div class="kpi-value">${total}</div>
      </div>

      ${items
        .map(
          (it) => `
        <div class="kpi">
          <div class="kpi-label">${it.label}</div>
          <div class="kpi-value">${counts[it.key] ?? 0}</div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}