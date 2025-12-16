export async function loadDashboardModel(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load JSON: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

export async function loadAssistantSummary(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load assistant summary: ${res.status} ${res.statusText}`);
  return res.json();
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

export function getLatestReceivedAt(blocks) {
  let maxT = 0;
  for (const b of blocks || []) {
    for (const it of b.items || []) {
      const t = Date.parse(it.received_at || "");
      if (Number.isFinite(t) && t > maxT) maxT = t;
    }
  }
  return maxT;
}

export function isNewEmail(receivedAtIso, latestMs, windowHours = 6) {
  const t = Date.parse(receivedAtIso || "");
  if (!Number.isFinite(t) || !Number.isFinite(latestMs) || latestMs <= 0) return false;
  const windowMs = windowHours * 60 * 60 * 1000;
  return t >= latestMs - windowMs;
}

// -------- Triage state (localStorage) --------

const TRIAGE_KEY = "ai_inbox_analyzer_triage_v1";

export function loadTriageState() {
  try {
    const raw = localStorage.getItem(TRIAGE_KEY);
    return normalizeTriageState(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeTriageState(null);
  }
}

export function saveTriageState(state) {
  const normalized = normalizeTriageState(state);
  localStorage.setItem(TRIAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function normalizeTriageState(state) {
  const s = state && typeof state === "object" ? state : {};
  return {
    done: Array.isArray(s.done) ? s.done : [],
    ignored: Array.isArray(s.ignored) ? s.ignored : [],
    snoozed: s.snoozed && typeof s.snoozed === "object" ? s.snoozed : {},
  };
}

export function isSnoozedActive(entry, now = new Date()) {
  if (!entry || !entry.until) return false;
  const until = new Date(entry.until);
  return Number.isFinite(until.getTime()) && until > now;
}

export function cleanupExpiredSnoozes(state, now = new Date()) {
  const s = normalizeTriageState(state);
  const next = { ...s, snoozed: { ...s.snoozed } };
  for (const [emailId, entry] of Object.entries(next.snoozed)) {
    if (!isSnoozedActive(entry, now)) delete next.snoozed[emailId];
  }
  return next;
}

export function applyTriageToBlocks(blocks, state, now = new Date()) {
  const s = normalizeTriageState(state);

  const doneSet = new Set(s.done);
  const ignoredSet = new Set(s.ignored);

  const snoozedActiveSet = new Set(
    Object.entries(s.snoozed)
      .filter(([, entry]) => isSnoozedActive(entry, now))
      .map(([emailId]) => emailId)
  );

  const mainBlocks = blocks.map((b) => ({
    ...b,
    items: (b.items || []).filter((it) => {
      const id = it.email_id;
      return !doneSet.has(id) && !ignoredSet.has(id) && !snoozedActiveSet.has(id);
    }),
  }));

  // Collect lists for bottom panels
  const byId = new Map();
  for (const b of blocks)
    for (const it of b.items || []) byId.set(it.email_id, { ...it, _source_category: b.category });

  const snoozedItems = [];
  for (const [emailId, entry] of Object.entries(s.snoozed)) {
    if (isSnoozedActive(entry, now) && byId.has(emailId)) {
      snoozedItems.push({
        ...byId.get(emailId),
        _snooze_until: entry.until,
        _snooze_preset: entry.preset,
      });
    }
  }

  const ignoredItems = s.ignored.map((id) => byId.get(id)).filter(Boolean);
  const doneItems = s.done.map((id) => byId.get(id)).filter(Boolean);

  return { mainBlocks, snoozedItems, ignoredItems, doneItems };
}

// Helpers to compute snooze dates
export function snoozePresetToUntil(preset, now = new Date()) {
  const d = new Date(now);

  if (preset === "later_today") {
    d.setHours(d.getHours() + 3);
    return d.toISOString();
  }

  if (preset === "tomorrow_9") {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    t.setHours(9, 0, 0, 0);
    return t.toISOString();
  }

  if (preset === "next_mon_9") {
    const t = new Date(now);
    const day = t.getDay(); // 0 Sun .. 6 Sat
    const daysUntilMon = (8 - day) % 7 || 7;
    t.setDate(t.getDate() + daysUntilMon);
    t.setHours(9, 0, 0, 0);
    return t.toISOString();
  }

  // fallback: 3h
  d.setHours(d.getHours() + 3);
  return d.toISOString();
}

export function removeFromTriage(state, emailId) {
  const s = normalizeTriageState(state);
  const next = {
    ...s,
    done: s.done.filter((x) => x !== emailId),
    ignored: s.ignored.filter((x) => x !== emailId),
    snoozed: { ...s.snoozed },
  };
  delete next.snoozed[emailId];
  return next;
}