export function Panel({
  title,
  subtitle,
  accentClass,
  itemsHtml,
  count,
  collapsible = false,
  isCollapsed = false,
  onToggleId = ""
}) {
  const hasItems = Boolean(itemsHtml && itemsHtml.trim().length > 0);
  const bodyHtml = isCollapsed
    ? ""
    : (hasItems ? itemsHtml : `<div class="empty-state">No items</div>`);

  const toggleBtn = collapsible
    ? `<button class="panel-toggle" type="button" data-toggle="${onToggleId}" title="${isCollapsed ? "Expand" : "Collapse"}" aria-label="${isCollapsed ? "Expand" : "Collapse"}">${isCollapsed ? "▸" : "▾"}</button>`
    : "";

  return `
    <section class="panel ${accentClass}">
      <div class="panel-head">
        <div>
          <div class="panel-title"><span class="dot"></span>${title}</div>
          <div class="panel-subtitle">${subtitle ?? ""}</div>
        </div>
        <div class="panel-head-right">
          <div class="panel-count">${count ?? 0}</div>
          ${toggleBtn}
        </div>
      </div>
      <div class="panel-body">
        ${bodyHtml}
      </div>
    </section>
  `;
}