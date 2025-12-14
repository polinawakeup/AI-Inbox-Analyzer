export function Panel({ title, subtitle, accentClass, itemsHtml, count }) {
  const hasItems = Boolean(itemsHtml && itemsHtml.trim().length > 0);

  return `
    <section class="panel ${accentClass}">
      <div class="panel-head">
        <div>
          <div class="panel-title"><span class="dot"></span>${title}</div>
          <div class="panel-subtitle">${subtitle ?? ""}</div>
        </div>
        <div class="panel-count">${count ?? 0}</div>
      </div>
      <div class="panel-body">
        ${hasItems ? itemsHtml : `<div class="empty-state">No items</div>`}
      </div>
    </section>
  `;
}