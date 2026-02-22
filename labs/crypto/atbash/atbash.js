(() => {
    // English A-Z
    const EN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    // Farsi alphabet (common 32-letter set; same set you used for Caesar)
    const FA = [
        "ا", "ب", "پ", "ت", "ث", "ج", "چ", "ح", "خ", "د", "ذ", "ر", "ز", "ژ", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ک", "گ", "ل", "م", "ن", "و", "ه", "ی"
    ];

    const $ = (id) => document.getElementById(id);

    const alphaSelect = $("alphaSelect");
    const modeSelect = $("modeSelect"); // kept for consistency; Atbash is symmetric
    const preserveCase = $("preserveCase");
    const plain = $("plain");
    const cipher = $("cipher");
    const mapping = $("mapping");

    function getAlphabet(kind) {
        return kind === "fa" ? FA : EN;
    }

    function escapeHtml(s) {
        return String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function buildAtbashMap(alpha) {
        const n = alpha.length;
        const map = new Map();
        for (let i = 0; i < n; i++) {
            map.set(alpha[i], alpha[n - 1 - i]);
        }
        return map;
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

    function renderMapping(alpha, mode, activeIndex) {
        // Visual arrow only (mode is cosmetic here).
        const arrow = (mode === "dec") ? "←" : "→";
        const n = alpha.length;

        const cells = [];
        for (let i = 0; i < n; i++) {
            const left = alpha[i];
            const right = alpha[n - 1 - i];
            const isActive = (typeof activeIndex === "number" && i === activeIndex);

            cells.push(`
        <div class="map-row${isActive ? " is-active" : ""}"
             data-i="${i}"
             data-left="${escapeHtml(left)}"
             data-right="${escapeHtml(right)}">
          <div class="map-cell mono">${escapeHtml(left)}</div>
          <div class="map-arrow muted">${arrow}</div>
          <div class="map-cell mono">${escapeHtml(right)}</div>
        </div>
      `);
        }

        mapping.innerHTML = `<div class="map-grid">${cells.join("")}</div>`;
    }

    function transformText(text, alphaKind, preserveCaseFlag) {
        const alpha = getAlphabet(alphaKind);
        const map = buildAtbashMap(alpha);

        if (alphaKind === "en") {
            const mapLower = new Map();
            for (const ch of alpha) mapLower.set(ch.toLowerCase(), map.get(ch).toLowerCase());

            let out = "";
            for (const ch of text) {
                if (map.has(ch)) {
                    out += map.get(ch);
                    continue;
                }
                if (mapLower.has(ch)) {
                    if (preserveCaseFlag) out += mapLower.get(ch);
                    else out += map.get(ch.toUpperCase());
                    continue;
                }
                out += ch;
            }
            return out;
        }

        // Farsi: substitute over FA set; preserve non-letters
        let out = "";
        for (const ch of text) {
            out += map.has(ch) ? map.get(ch) : ch;
        }
        return out;
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
        const preserve = preserveCase.checked;
        const mode = modeSelect.value;

        cipher.value = transformText(plain.value, alphaKind, preserve);

        const caretPos = plain.selectionStart ?? plain.value.length;
        const idx = caretCharIndex(plain.value, caretPos, alphaKind);

        renderMapping(getAlphabet(alphaKind), mode, idx);
    }

    // Click-to-insert: insert the "source-side" letter based on mode direction.
    // For Atbash, either side is fine, but we’ll make it consistent with the arrow:
    // Encrypt (→): clicking row inserts LEFT into input
    // Decrypt (←): clicking row inserts RIGHT into input
    mapping.addEventListener("click", (e) => {
        const row = e.target.closest(".map-row");
        if (!row) return;

        const mode = modeSelect.value;
        const left = row.getAttribute("data-left") || "";
        const right = row.getAttribute("data-right") || "";

        const srcChar = (mode === "dec") ? right : left;
        insertAtCaret(plain, srcChar);
        update();
    });

    // Events
    alphaSelect.addEventListener("change", update);
    modeSelect.addEventListener("change", update);
    preserveCase.addEventListener("change", update);

    plain.addEventListener("input", update);
    plain.addEventListener("click", update);
    plain.addEventListener("keyup", update);

    // Init
    update();
})();