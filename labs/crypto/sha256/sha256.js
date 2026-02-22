(() => {
    const $ = (id) => document.getElementById(id);

    // Inputs
    const input = $("input");
    const treatAsHex = $("treatAsHex");
    const showAscii = $("showAscii");
    const blockSelect = $("blockSelect");
    const roundRange = $("roundRange");
    const roundValue = $("roundValue");
    const stepBack = $("stepBack");
    const stepFwd = $("stepFwd");
    const runFull = $("runFull");

    // Errors
    const inputError = $("inputError");

    // Digest outputs
    const digestLocal = $("digestLocal");
    const digestWeb = $("digestWeb");
    const copyLocal = $("copyLocal");
    const copyWeb = $("copyWeb");

    // Bytes / padding
    const rawLenBytes = $("rawLenBytes");
    const rawLenBits = $("rawLenBits");
    const blockCount = $("blockCount");
    const lenField = $("lenField");
    const rawBytesEl = $("rawBytes");
    const paddedBytesEl = $("paddedBytes");
    const blocksEl = $("blocks");

    // Schedule + rounds
    const wGrid = $("wGrid");
    const roundMeta = $("roundMeta");
    const roundMeta2 = $("roundMeta2");
    const roundMeta3 = $("roundMeta3");
    const regsBefore = $("regsBefore");
    const regsAfter = $("regsAfter");
    const regTitle = $("regTitle");
    const regExplain = $("regExplain");
    const regExplain2 = $("regExplain2");
    const formulaBox = $("formulaBox");

    // --- Constants ---
    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    const H0 = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

    // --- 32-bit ops (use BigInt internally for clean modulo behavior) ---
    const MASK32 = 0xffffffffn;
    const u32 = (x) => Number(x & MASK32);

    const add32 = (...xs) => {
        let s = 0n;
        for (const x of xs) s = (s + BigInt(x)) & MASK32;
        return u32(s);
    };

    const rotr = (x, n) => {
        const X = BigInt(x) & MASK32;
        const N = BigInt(n);
        const r = ((X >> N) | ((X << (32n - N)) & MASK32)) & MASK32;
        return u32(r);
    };

    const shr = (x, n) => u32((BigInt(x) & MASK32) >> BigInt(n));

    const Ch = (x, y, z) => u32((BigInt(x) & MASK32) ^ ((BigInt(x) & MASK32) & ((BigInt(y) & MASK32) ^ (BigInt(z) & MASK32))));
    const Maj = (x, y, z) => u32(((BigInt(x) & MASK32) & (BigInt(y) & MASK32)) ^ ((BigInt(x) & MASK32) & (BigInt(z) & MASK32)) ^ ((BigInt(y) & MASK32) & (BigInt(z) & MASK32)));

    const Sigma0 = (x) => u32(BigInt(rotr(x, 2)) ^ BigInt(rotr(x, 13)) ^ BigInt(rotr(x, 22)));
    const Sigma1 = (x) => u32(BigInt(rotr(x, 6)) ^ BigInt(rotr(x, 11)) ^ BigInt(rotr(x, 25)));
    const sigma0 = (x) => u32(BigInt(rotr(x, 7)) ^ BigInt(rotr(x, 18)) ^ BigInt(shr(x, 3)));
    const sigma1 = (x) => u32(BigInt(rotr(x, 17)) ^ BigInt(rotr(x, 19)) ^ BigInt(shr(x, 10)));

    const hex8 = (x) => (x >>> 0).toString(16).padStart(8, "0");
    const hex2 = (b) => b.toString(16).padStart(2, "0");

    // --- Input parsing ---
    function parseHexBytes(s) {
        const cleaned = s.trim().replaceAll(/0x/gi, "").replaceAll(/[^0-9a-fA-F]/g, "");
        if (cleaned.length === 0) return new Uint8Array([]);
        if (cleaned.length % 2 !== 0) throw new Error("Hex input must contain an even number of hex digits.");
        const out = new Uint8Array(cleaned.length / 2);
        for (let i = 0; i < cleaned.length; i += 2) out[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
        return out;
    }

    function toUtf8Bytes(s) {
        return new TextEncoder().encode(s);
    }

    // --- Padding + blocks ---
    function uint64beBytesFromBitLen(bitLen) {
        const hi = Math.floor(bitLen / 2 ** 32);
        const lo = bitLen >>> 0;
        return new Uint8Array([
            (hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff,
            (lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff,
        ]);
    }

    function sha256Pad(messageBytes) {
        const ml = messageBytes.length; // bytes
        const bitLen = ml * 8;

        const withOne = ml + 1;
        const mod64 = withOne % 64;
        const padZeros = mod64 <= 56 ? (56 - mod64) : (56 + (64 - mod64));

        const outLen = ml + 1 + padZeros + 8;
        const out = new Uint8Array(outLen);

        out.set(messageBytes, 0);
        out[ml] = 0x80;

        const lenBytes = uint64beBytesFromBitLen(bitLen);
        out.set(lenBytes, outLen - 8);

        return { padded: out, bitLen, lenBytes };
    }

    function splitBlocks(padded) {
        const blocks = [];
        for (let i = 0; i < padded.length; i += 64) blocks.push(padded.slice(i, i + 64));
        return blocks;
    }

    function blockToWords16(block64) {
        const w = new Array(16);
        for (let i = 0; i < 16; i++) {
            const j = i * 4;
            w[i] = ((block64[j] << 24) | (block64[j + 1] << 16) | (block64[j + 2] << 8) | (block64[j + 3])) >>> 0;
        }
        return w;
    }

    function buildSchedule(block64) {
        const W = new Array(64);
        const w0 = blockToWords16(block64);
        for (let t = 0; t < 16; t++) W[t] = w0[t];
        for (let t = 16; t < 64; t++) {
            W[t] = add32(sigma1(W[t - 2]), W[t - 7], sigma0(W[t - 15]), W[t - 16]);
        }
        return W;
    }

    // --- Compression with snapshots (so UI can show exact intermediate values) ---
    function compressBlockWithSnapshots(H, block64) {
        const W = buildSchedule(block64);

        let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

        const snaps = [];
        for (let t = 0; t < 64; t++) {
            const T1 = add32(h, Sigma1(e), Ch(e, f, g), K[t], W[t]);
            const T2 = add32(Sigma0(a), Maj(a, b, c));

            const hN = g;
            const gN = f;
            const fN = e;
            const eN = add32(d, T1);
            const dN = c;
            const cN = b;
            const bN = a;
            const aN = add32(T1, T2);

            snaps.push({
                t,
                Wt: W[t],
                Kt: K[t],
                T1, T2,
                // Useful components to display exact formulas:
                S1e: Sigma1(e),
                Ch_efg: Ch(e, f, g),
                S0a: Sigma0(a),
                Maj_abc: Maj(a, b, c),
                before: { a, b, c, d, e, f, g, h },
                after: { a: aN, b: bN, c: cN, d: dN, e: eN, f: fN, g: gN, h: hN }
            });

            a = aN; b = bN; c = cN; d = dN; e = eN; f = fN; g = gN; h = hN;
        }

        const Hout = [
            add32(H[0], a), add32(H[1], b), add32(H[2], c), add32(H[3], d),
            add32(H[4], e), add32(H[5], f), add32(H[6], g), add32(H[7], h),
        ];

        return { W, snaps, Hout };
    }

    function sha256DigestAndTrace(bytes) {
        const { padded, bitLen, lenBytes } = sha256Pad(bytes);
        const blocks = splitBlocks(padded);

        let H = H0.slice();

        // We keep per-block trace so you can inspect any block/round later.
        const blockTraces = [];
        for (let i = 0; i < blocks.length; i++) {
            const beforeH = H.slice();
            const trace = compressBlockWithSnapshots(H, blocks[i]);
            H = trace.Hout;
            blockTraces.push({
                index: i,
                block: blocks[i],
                beforeH,
                afterH: H.slice(),
                W: trace.W,
                snaps: trace.snaps,
            });
        }

        const digestHex = H.map(hex8).join("");
        return { bytes, padded, bitLen, lenBytes, blocks, blockTraces, digestHex };
    }

    async function sha256WebCrypto(bytes) {
        if (!globalThis.crypto?.subtle) return null;
        const buf = await crypto.subtle.digest("SHA-256", bytes);
        return Array.from(new Uint8Array(buf)).map(hex2).join("");
    }

    // --- Rendering helpers ---
    function setError(msg) {
        if (!msg) {
            inputError.style.display = "none";
            inputError.textContent = "";
            return;
        }
        inputError.style.display = "block";
        inputError.textContent = msg;
    }

    function asciiHint(b) {
        if (b >= 0x20 && b <= 0x7e) return String.fromCharCode(b);
        if (b === 0x0a) return "⏎";
        if (b === 0x09) return "⇥";
        return "·";
    }

    function chunk(arr, size) {
        const out = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
    }

    function renderByteLines(bytes, opts = {}) {
        const wantAscii = showAscii.checked;
        const onePos = opts.onePos ?? -1;
        const lenStart = opts.lenStart ?? -1; // inclusive
        const lenEnd = opts.lenEnd ?? -1;     // exclusive

        const rows = chunk(Array.from(bytes), 16).map((row, r) => {
            const offset = r * 16;

            const hexCells = row.map((b, i) => {
                const idx = offset + i;
                let cls = "byte";
                if (idx === onePos) cls = "byte hi80";
                else if (idx >= lenStart && idx < lenEnd) cls = "byte hiln";
                return `<span class="${cls}">${hex2(b)}</span>`;
            }).join(" ");

            const ascii = wantAscii
                ? ` <span class="muted">|</span> ${row.map(asciiHint).join("")}`
                : "";

            return `<div><span class="muted mono">${offset.toString(16).padStart(4, "0")}</span>  ${hexCells}${ascii}</div>`;
        });

        return rows.join("");
    }

    function populateBlockSelect(blocks) {
        blockSelect.innerHTML = "";
        blocks.forEach((_, i) => {
            const opt = document.createElement("option");
            opt.value = String(i);
            opt.textContent = `Block ${i}`;
            blockSelect.appendChild(opt);
        });
    }

    function renderBlocks(paddedBytes) {
        const blocks = chunk(Array.from(paddedBytes), 64);
        const lenFieldStart = paddedBytes.length - 8;
        const lenFieldEnd = paddedBytes.length;
        // 0x80 position is exactly at raw length, but we don’t have raw length here; caller supplies via padded renderer.
        // For blocks view, we find it once:
        let onePos = -1;
        for (let k = 0; k < paddedBytes.length; k++) { if (paddedBytes[k] === 0x80) { onePos = k; break; } }

        blocksEl.innerHTML = blocks.map((blk, i) => {
            const start = i * 64;

            const lines = chunk(blk, 16).map((row, r) => {
                const rowOffset = start + r * 16;
                const hexCells = row.map((b, j) => {
                    const idx = rowOffset + j;
                    let cls = "byte";
                    if (idx === onePos) cls = "byte hi80";
                    else if (idx >= lenFieldStart && idx < lenFieldEnd) cls = "byte hiln";
                    return `<span class="${cls}">${hex2(b)}</span>`;
                }).join(" ");

                const ascii = showAscii.checked
                    ? ` <span class="muted">|</span> ${row.map(asciiHint).join("")}`
                    : "";

                return `<div><span class="muted mono">${(r * 16).toString(16).padStart(2, "0")}</span>  ${hexCells}${ascii}</div>`;
            }).join("");

            return `
        <div class="card-inner" style="margin-top:14px">
          <div style="display:flex; justify-content:space-between; gap:12px; align-items:baseline">
            <div><strong>Block ${i}</strong> <span class="muted mono">(64 bytes)</span></div>
            <div class="muted mono">offset ${start}</div>
          </div>
          <div class="mono bytes" style="margin-top:10px">${lines}</div>
        </div>
      `;
        }).join("");
    }

    // Visual registers
    let activeReg = "a";

    function setRegPanel(name, line1, line2 = "") {
        regTitle.textContent = name || "—";
        regExplain.textContent = line1 || "Click any a..h box to see how it updates.";
        regExplain2.textContent = line2 || "";
    }

    function makeRegBox(name, valueHex, opts = {}) {
        const div = document.createElement("div");
        div.className = "reg mono";
        if (opts.active) div.classList.add("is-active");
        if (opts.changed) div.classList.add("is-changed");
        div.dataset.reg = name;

        const n = document.createElement("div");
        n.className = "reg-name";
        n.textContent = name;

        const v = document.createElement("div");
        v.className = "reg-val";
        v.textContent = valueHex;

        div.appendChild(n);
        div.appendChild(v);
        return div;
    }

    function renderRegs(before, after) {
        regsBefore.innerHTML = "";
        regsAfter.innerHTML = "";
        const order = ["a", "b", "c", "d", "e", "f", "g", "h"];

        for (const r of order) {
            const bv = before[r] >>> 0;
            const av = after[r] >>> 0;
            const changed = bv !== av;

            regsBefore.appendChild(makeRegBox(r, hex8(bv), { active: activeReg === r }));
            regsAfter.appendChild(makeRegBox(r, hex8(av), { active: activeReg === r, changed }));
        }
    }

    function explainReg(snap, reg) {
        // Update rules:
        // a' = T1 + T2
        // b' = a
        // c' = b
        // d' = c
        // e' = d + T1
        // f' = e
        // g' = f
        // h' = g
        const b = snap.before;
        const a = snap.after;

        const beforeVal = hex8(b[reg]);
        const afterVal = hex8(a[reg]);

        if (reg === "a") {
            setRegPanel(
                `Register a`,
                `a' = T1 + T2 = ${hex8(snap.T1)} + ${hex8(snap.T2)} = ${afterVal}`,
                `Before: ${beforeVal}`
            );
            return;
        }
        if (reg === "e") {
            setRegPanel(
                `Register e`,
                `e' = d + T1 = ${hex8(b.d)} + ${hex8(snap.T1)} = ${afterVal}`,
                `Before: ${beforeVal}`
            );
            return;
        }

        const shiftFrom = { b: "a", c: "b", d: "c", f: "e", g: "f", h: "g" }[reg];
        if (shiftFrom) {
            setRegPanel(
                `Register ${reg}`,
                `${reg}' = ${shiftFrom} (previous) = ${hex8(b[shiftFrom])}`,
                `Before: ${beforeVal}  →  After: ${afterVal}`
            );
            return;
        }

        setRegPanel(`Register ${reg}`, `Before: ${beforeVal}`, `After: ${afterVal}`);
    }

    function renderRoundMeta(snap) {
        roundMeta.textContent = `t=${snap.t}`;
        roundMeta2.textContent = `W[t]=${hex8(snap.Wt)}  K[t]=${hex8(snap.Kt)}`;
        roundMeta3.textContent = `T1=${hex8(snap.T1)}  T2=${hex8(snap.T2)}`;
    }

    function renderFormulaBox(snap) {
        // Show the exact computed components used in the round:
        // T1 = h + Σ1(e) + Ch(e,f,g) + K[t] + W[t]
        // T2 = Σ0(a) + Maj(a,b,c)
        const b = snap.before;
        const lines = [
            `T1 = h + Σ1(e) + Ch(e,f,g) + K[t] + W[t]`,
            `   = ${hex8(b.h)} + ${hex8(snap.S1e)} + ${hex8(snap.Ch_efg)} + ${hex8(snap.Kt)} + ${hex8(snap.Wt)}`,
            `   = ${hex8(snap.T1)}`,
            ``,
            `T2 = Σ0(a) + Maj(a,b,c)`,
            `   = ${hex8(snap.S0a)} + ${hex8(snap.Maj_abc)}`,
            `   = ${hex8(snap.T2)}`,
            ``,
            `a' = T1 + T2 = ${hex8(snap.T1)} + ${hex8(snap.T2)} = ${hex8(snap.after.a)}`,
            `e' = d + T1  = ${hex8(b.d)} + ${hex8(snap.T1)} = ${hex8(snap.after.e)}`,
        ];
        formulaBox.textContent = lines.join("\n");
    }

    function renderWGrid(W, activeT) {
        wGrid.innerHTML = "";
        for (let t = 0; t < 64; t++) {
            const cell = document.createElement("div");
            cell.className = "wcell mono";
            if (t === activeT) cell.classList.add("is-active");
            cell.dataset.t = String(t);

            const top = document.createElement("div");
            top.className = "wcell-top";
            top.innerHTML = `<span>t=${t}</span><span>W[t]</span>`;

            const val = document.createElement("div");
            val.className = "wcell-val";
            val.textContent = hex8(W[t]);

            cell.appendChild(top);
            cell.appendChild(val);
            wGrid.appendChild(cell);
        }
    }

    // --- State cache ---
    let latest = null; // { trace, webDigest }

    function clamp(n, lo, hi) {
        return Math.max(lo, Math.min(hi, n));
    }

    async function recomputeAll() {
        try {
            setError("");

            const raw = treatAsHex.checked ? parseHexBytes(input.value) : toUtf8Bytes(input.value);

            // End-to-end trace (this is the ground truth for the UI)
            const trace = sha256DigestAndTrace(raw);

            // Digests (local + WebCrypto)
            digestLocal.textContent = trace.digestHex;
            const web = await sha256WebCrypto(raw);
            digestWeb.textContent = web || "—";

            // Basic lengths
            rawLenBytes.textContent = String(raw.length);
            rawLenBits.textContent = String(trace.bitLen);
            blockCount.textContent = String(trace.blocks.length);
            lenField.textContent = Array.from(trace.lenBytes).map(hex2).join(" ");

            // Raw bytes
            rawBytesEl.innerHTML = renderByteLines(raw);

            // Padded bytes (highlight 0x80 + length field)
            const onePos = raw.length;
            const lenStart = trace.padded.length - 8;
            const lenEnd = trace.padded.length;
            paddedBytesEl.innerHTML = renderByteLines(trace.padded, { onePos, lenStart, lenEnd });

            // Blocks view
            renderBlocks(trace.padded);

            // Populate select
            populateBlockSelect(trace.blocks);

            // Keep selection in-range
            let bi = Number(blockSelect.value || "0");
            if (!Number.isFinite(bi)) bi = 0;
            bi = clamp(bi, 0, trace.blocks.length - 1);
            blockSelect.value = String(bi);

            // Keep round in-range
            let t = Number(roundRange.value || "0");
            if (!Number.isFinite(t)) t = 0;
            t = clamp(t, 0, 63);
            roundRange.value = String(t);
            roundValue.textContent = String(t);

            latest = { trace, web };

            // Render inspected views
            renderInspectors();

        } catch (e) {
            latest = null;
            digestLocal.textContent = "—";
            digestWeb.textContent = "—";
            rawLenBytes.textContent = "—";
            rawLenBits.textContent = "—";
            blockCount.textContent = "—";
            lenField.textContent = "—";
            rawBytesEl.innerHTML = "";
            paddedBytesEl.innerHTML = "";
            blocksEl.innerHTML = "";
            wGrid.innerHTML = "";
            regsBefore.innerHTML = "";
            regsAfter.innerHTML = "";
            roundMeta.textContent = "—";
            roundMeta2.textContent = "—";
            roundMeta3.textContent = "—";
            formulaBox.textContent = "";
            setRegPanel("—", "");
            setError(e?.message || String(e));
        }
    }

    function renderInspectors() {
        if (!latest) return;

        const trace = latest.trace;

        const bi = Number(blockSelect.value || "0");
        const t = Number(roundRange.value || "0");
        roundValue.textContent = String(t);

        const bt = trace.blockTraces[bi];
        const snap = bt.snaps[t];

        // schedule
        renderWGrid(bt.W, t);

        // round view
        renderRoundMeta(snap);
        renderRegs(snap.before, snap.after);
        explainReg(snap, activeReg);
        renderFormulaBox(snap);
    }

    function step(delta) {
        const t = clamp(Number(roundRange.value || "0") + delta, 0, 63);
        roundRange.value = String(t);
        renderInspectors();
    }

    // --- Click handlers ---
    regsBefore.addEventListener("click", (e) => {
        const box = e.target.closest(".reg");
        if (!box) return;
        activeReg = box.dataset.reg || "a";
        renderInspectors();
    });

    regsAfter.addEventListener("click", (e) => {
        const box = e.target.closest(".reg");
        if (!box) return;
        activeReg = box.dataset.reg || "a";
        renderInspectors();
    });

    wGrid.addEventListener("click", (e) => {
        const cell = e.target.closest(".wcell");
        if (!cell) return;
        const t = Number(cell.dataset.t);
        if (!Number.isFinite(t)) return;
        roundRange.value = String(clamp(t, 0, 63));
        renderInspectors();
    });

    // --- Events ---
    input.addEventListener("input", () => recomputeAll());
    treatAsHex.addEventListener("change", () => recomputeAll());
    showAscii.addEventListener("change", () => recomputeAll());

    blockSelect.addEventListener("change", () => renderInspectors());
    roundRange.addEventListener("input", () => renderInspectors());

    stepBack.addEventListener("click", () => step(-1));
    stepFwd.addEventListener("click", () => step(+1));
    runFull.addEventListener("click", () => {
        roundRange.value = "63";
        renderInspectors();
    });


    async function copyText(s) {
        try {
            await navigator.clipboard.writeText(s || "");
        } catch {
            // ignore (clipboard may be blocked)
        }
    }

    copyLocal.addEventListener("click", () => copyText(digestLocal.textContent));
    copyWeb.addEventListener("click", () => copyText(digestWeb.textContent));

    // Init
    input.value = "abc";
    recomputeAll();
})();