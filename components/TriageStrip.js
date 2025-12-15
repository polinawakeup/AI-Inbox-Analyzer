export function TriageStrip({ id, title, subtitle, count, collapsed, itemsHtml }) {
  const expanded = collapsed ? "false" : "true";

  return `
    <section class="triage-strip" data-triage-strip="${id}" data-collapsed="${collapsed ? "true" : "false"}">
      <div class="triage-head"
        role="button"
        tabindex="0"
        data-triage-toggle="${id}"
        aria-expanded="${expanded}"
        title="${collapsed ? "Expand" : "Collapse"}"
      >
        <div class="triage-head-left">
          <div class="triage-title">${title}</div>
          <div class="triage-subtitle">${subtitle || ""}</div>
        </div>

        <div class="triage-head-right">
          <div class="triage-count">${count ?? 0}</div>
          <span class="triage-toggle" aria-hidden="true">
            <img class="triage-toggle-icon" src="./assets/triage_chevron.svg" alt="" aria-hidden="true" />
          </span>
        </div>
      </div>

      ${collapsed ? "" : `
        <div class="triage-row">
          ${itemsHtml && itemsHtml.trim().length ? itemsHtml : `<div class="triage-empty">No items</div>`}
        </div>
      `}
    </section>
  `;
}