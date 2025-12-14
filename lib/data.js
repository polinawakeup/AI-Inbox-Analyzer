export async function loadDashboardModel(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load JSON: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

export function indexBlocks(blocks) {
  const m = new Map();
  for (const b of blocks || []) {
    if (b && b.category) m.set(b.category, b);
  }
  return m;
}

export function computeCountsFromBlocks(blocks) {
  const byCat = indexBlocks(blocks);
  const len = (cat) => byCat.get(cat)?.items?.length ?? 0;

  return {
    urgent_attention: len("urgent_attention"),
    action_required: len("action_required"),
    documents_to_review: len("documents_to_review"),
    informational: len("informational"),
  };
}

export function sumCounts(counts) {
  return Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0);
}

function num(v, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function timeValue(iso) {
  const t = Date.parse(iso || "");
  return Number.isFinite(t) ? t : 0;
}

export function sortItemsForCategory(category, items) {
  const arr = [...(items || [])];

  const byReceivedDesc = (a, b) => timeValue(b.received_at) - timeValue(a.received_at);
  const byConfidenceDesc = (a, b) => num(b.confidence) - num(a.confidence);
  const byAttachmentsDesc = (a, b) => num(b.attachments_count) - num(a.attachments_count);

  arr.sort((a, b) => {
    switch (category) {
      case "urgent_attention":
        return byConfidenceDesc(a, b) || byReceivedDesc(a, b);
      case "action_required":
        return byReceivedDesc(a, b);
      case "documents_to_review":
        return byAttachmentsDesc(a, b) || byReceivedDesc(a, b);
      case "informational":
        return byReceivedDesc(a, b);
      default:
        return byReceivedDesc(a, b);
    }
  });

  return arr;
}

export function getSortedBlocks(blocks) {
  return (blocks || []).map((b) => ({
    ...b,
    items: sortItemsForCategory(b.category, b.items),
  }));
}

export function findItem(blocks, category, emailId) {
  const byCat = indexBlocks(blocks);
  const block = byCat.get(category);
  if (!block) return null;
  return (block.items || []).find((it) => it.email_id === emailId) || null;
}