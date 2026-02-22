(() => {
  // English A-Z
  const EN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // Farsi alphabet (common 32-letter set; tweak later if you prefer a different teaching set)
  const FA = [
    "ا","ب","پ","ت","ث","ج","چ","ح","خ","د","ذ","ر","ز","ژ","س","ش","ص","ض","ط","ظ","ع","غ","ف","ق","ک","گ","ل","م","ن","و","ه","ی"
  ];

  const $ = (id) => document.getElementById(id);

  const alphaSelect = $("alphaSelect");
  const modeSelect = $("modeSelect");        // <-- NEW
  const shiftRange = $("shiftRange");
  const shiftValue = $("shiftValue");
  const preserveCase = $("preserveCase");
  const plain = $("plain");                  // left textarea = "input"
  const cipher = $("cipher");                // right textarea = "output"
  const mapping = $("mapping");

  function getAlphabet(kind) {
    return kind === "fa" ? FA : EN;
  }

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function buildMaps(alpha, shift) {
    const n = alpha.length;
    const enc = new Map();
    const dec = new Map();

    for (let i = 0; i < n; i++) {
      const p = alpha[i];
      const c = alpha[mod(i + shift, n)];
      enc.set(p, c);
      dec.set(c, p);
    }
    return { enc, dec };
  }

  function normalizeShiftForAlphabet(alphaKind) {
    const alpha = getAlphabet(alphaKind);
    const max = Math.max(0, alpha.length - 1);
    shiftRange.max = String(max);

    const cur = Number(shiftRange.value || "0");
    if (cur > max) shiftRange.value = String(max);

    shiftValue.textContent = shiftRange.value;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function badgeArrow(mode) {
    // purely visual; mapping rows still store both sides
    return mode === "dec" ? "←" : "→";
  }

  function renderMapping(alpha, shift, mode, activeIndex) {
    const n = alpha.length;
    const shifted = alpha.map((_, i) => alpha[mod(i + shift, n)]);
    const arrow = badgeArrow(mode);

    const cells = [];
    for (let i = 0; i < n; i++) {
      const top = alpha[i];
      const bottom = shifted[i];

      const isActive = (typeof activeIndex === "number" && i === activeIndex);

      // Store both sides as data attributes so clicks can insert correctly for enc/dec.
      cells.push(`
        <div class="map-row${isActive ? " is-active" : ""}" data-i="${i}" data-top="${escapeHtml(top)}" data-bottom="${escapeHtml(bottom)}">
          <div class="map-cell mono">${escapeHtml(top)}</div>
          <div class="map-arrow muted">${arrow}</div>
          <div class="map-cell mono">${escapeHtml(bottom)}</div>
        </div>
      `);
    }

    mapping.innerHTML = `<div class="map-grid">${cells.join("")}</div>`;
  }

  function transformText(text, alphaKind, shift, preserveCaseFlag, mode) {
    const alpha = getAlphabet(alphaKind);
    const { enc, dec } = buildMaps(alpha, shift);
    const map = (mode === "dec") ? dec : enc;

    if (alphaKind === "en") {
      // English: support lowercase cleanly
      const mapLower = new Map();
      for (const ch of alpha) {
        const mapped = map.get(ch);
        mapLower.set(ch.toLowerCase(), mapped.toLowerCase());
      }

      let out = "";
      for (const ch of text) {
        if (map.has(ch)) {
          out += map.get(ch);
          continue;
        }

        if (mapLower.has(ch)) {
          if (preserveCaseFlag) out += mapLower.get(ch);
          else out += map.get(ch.toUpperCase()); // force upper result
          continue;
        }

        out += ch;
      }
      return out;
    }

    // Farsi: rotate over the FA set; preserve non-letters
    let out = "";
    for (const ch of text) {
      out += map.has(ch) ? map.get(ch) : ch;
    }
    return out;
  }

  function caretCharIndex(text, caretPos, alphaKind) {
    if (!text || text.length === 0) return null;

    const i = Math.min(Math.max(0, caretPos), text.length - 1);
    const ch = text[i] || text[i - 1];
    if (!ch) return null;

    const alpha = getAlphabet(alphaKind);

    if (alphaKind === "en") {
      const up = ch.toUpperCase();
      const idx = alpha.indexOf(up);
      return idx >= 0 ? idx : null;
    }

    const idx = alpha.indexOf(ch);
    return idx >= 0 ? idx : null;
  }

  function insertAtCaret(textarea, s) {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;

    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    textarea.value = before + s + after;

    const pos = start + s.length;
    textarea.focus();
    textarea.setSelectionRange(pos, pos);
  }

  function update() {
    const alphaKind = alphaSelect.value;
    normalizeShiftForAlphabet(alphaKind);

    const alpha = getAlphabet(alphaKind);
    const shift = Number(shiftRange.value || "0");
    const preserve = preserveCase.checked;
    const mode = modeSelect.value; // "enc" or "dec"

    cipher.value = transformText(plain.value, alphaKind, shift, preserve, mode);

    const caretPos = plain.selectionStart ?? plain.value.length;
    const idx = caretCharIndex(plain.value, caretPos, alphaKind);
    renderMapping(alpha, shift, mode, idx);
  }

  // --- Click-to-insert on mapping rows ---
  mapping.addEventListener("click", (e) => {
    const row = e.target.closest(".map-row");
    if (!row) return;

    const alphaKind = alphaSelect.value;
    const mode = modeSelect.value;

    // For encrypt: top is source -> bottom is output
    // For decrypt: bottom is source -> top is output
    const top = row.getAttribute("data-top") || "";
    const bottom = row.getAttribute("data-bottom") || "";

    const srcChar = (mode === "dec") ? bottom : top;

    // Insert into input; output updates automatically.
    insertAtCaret(plain, srcChar);
    update();
  });

  // Events
  alphaSelect.addEventListener("change", update);
  modeSelect.addEventListener("change", update);   // <-- NEW
  shiftRange.addEventListener("input", () => {
    shiftValue.textContent = shiftRange.value;
    update();
  });
  preserveCase.addEventListener("change", update);

  plain.addEventListener("input", update);
  plain.addEventListener("click", update);
  plain.addEventListener("keyup", update);

  // Init
  update();
})();