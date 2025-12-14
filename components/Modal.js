import { escapeHtml } from "../utils/escapeHtml.js";
import { formatWhen } from "../utils/formatWhen.js";

export function Modal({ isOpen, item, category }) {
  const hidden = isOpen ? "" : " hidden";
  const subject = escapeHtml(item?.subject || "Email details");

  const meta =
    item
      ? `${escapeHtml(item.from_name || "")} <${escapeHtml(item.from_email || "")}> • ${escapeHtml(
          formatWhen(item.received_at)
        )} • ${escapeHtml(item.email_id)}`
      : "";

  const cat = escapeHtml(category || "—");
  const reason = escapeHtml(item?.reason || "—");
  const action = escapeHtml(item?.suggested_action || "—");
  const attachments =
    item?.attachment_filenames?.length
      ? escapeHtml(item.attachment_filenames.join(", "))
      : "No attachments";

  return `
    <div class="modal-backdrop${hidden}" id="modalBackdrop" aria-hidden="${isOpen ? "false" : "true"}">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-head">
          <div>
            <div class="modal-title" id="modalTitle">${subject}</div>
            <div class="modal-meta" id="modalMeta">${meta}</div>
          </div>
          <button class="modal-close" id="modalClose" aria-label="Close">✕</button>
        </div>

        <div class="modal-body">
          <div class="modal-card">
            <h4>Classification</h4>
            <div class="modal-text"><b>Category:</b> ${cat}</div>
          </div>

          <div class="modal-card">
            <h4>Attachments</h4>
            <div class="modal-text">${attachments}</div>
          </div>

          <div class="modal-card">
            <h4>Why</h4>
            <div class="modal-text">${reason}</div>
          </div>

          <div class="modal-card">
            <h4>Suggested action</h4>
            <div class="modal-text">${action}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}