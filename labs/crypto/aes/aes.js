(() => {
    const $ = (id) => document.getElementById(id);

    // Inputs
    const input = $("input");
    const treatAsHex = $("treatAsHex");
    const pkcs7 = $("pkcs7");
    const keyHex = $("keyHex");
    const loadVector = $("loadVector");
    const inputError = $("inputError");

    // Blocks nav
    const prevBlockBtn = $("prevBlock");
    const nextBlockBtn = $("nextBlock");

    // Output
    const outHex = $("outHex");
    const copyOut = $("copyOut");
    const vectorCheck = $("vectorCheck");

    // Bytes/meta
    const inLenBytes = $("inLenBytes");
    const paddedLenBytes = $("paddedLenBytes");
    const blockCount = $("blockCount");
    const blockMeta = $("blockMeta");
    const rawBytesEl = $("rawBytes");

    // Walkthrough UI
    const walkMeta = $("walkMeta");
    const walkBack = $("walkBack");
    const walkNext = $("walkNext");
    const walkReset = $("walkReset");
    const walkBefore = $("walkBefore");
    const walkAfter = $("walkAfter");
    const walkExplain = $("walkExplain");

    // Round keys UI
    const roundKeysEl = $("roundKeys");

    // ---- AES tables (S-box etc.) ----
    const SBOX = new Uint8Array([
        0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
        0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
        0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
        0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
        0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
        0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
        0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
        0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
        0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
        0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
        0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
        0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
        0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
        0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
        0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
        0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
    ]);

    const RCON = new Uint8Array([0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1B, 0x36]);

    // ---- Utilities ----
    const hex2 = (b) => (b & 0xff).toString(16).padStart(2, "0");
    const hexBlock = (bytes) => Array.from(bytes).map(hex2).join("");

    function setError(msg) {
        if (!msg) {
            inputError.style.display = "none";
            inputError.textContent = "";
            return;
        }
        inputError.style.display = "block";
        inputError.textContent = msg;
    }

    function parseHexBytes(s) {
        const cleaned = s.trim().replaceAll(/0x/gi, "").replaceAll(/[^0-9a-fA-F]/g, "");
        if (cleaned.length === 0) return new Uint8Array([]);
        if (cleaned.length % 2 !== 0) throw new Error("Hex input must have an even number of digits.");
        const out = new Uint8Array(cleaned.length / 2);
        for (let i = 0; i < cleaned.length; i += 2) out[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
        return out;
    }

    function toUtf8Bytes(s) {
        return new TextEncoder().encode(s);
    }

    function pkcs7Pad(bytes, blockSize = 16) {
        const rem = bytes.length % blockSize;
        const pad = rem === 0 ? blockSize : (blockSize - rem);
        const out = new Uint8Array(bytes.length + pad);
        out.set(bytes, 0);
        out.fill(pad, bytes.length);
        return { out, pad };
    }

    function splitBlocks16(bytes) {
        const blocks = [];
        for (let i = 0; i < bytes.length; i += 16) blocks.push(bytes.slice(i, i + 16));
        return blocks;
    }

    // ---- GF(2^8) helpers ----
    function xtime(a) {
        a &= 0xff;
        return ((a << 1) ^ ((a & 0x80) ? 0x1b : 0x00)) & 0xff;
    }

    function gfMul(a, b) {
        a &= 0xff; b &= 0xff;
        let p = 0;
        for (let i = 0; i < 8; i++) {
            if (b & 1) p ^= a;
            const hi = a & 0x80;
            a = (a << 1) & 0xff;
            if (hi) a ^= 0x1b;
            b >>= 1;
        }
        return p & 0xff;
    }

    // Exact, readable explanation for MixColumns constants used in encryption (01/02/03)
    function gfMulExplain(a, mul) {
        a &= 0xff;
        mul &= 0xff;

        const hx = (x) => hex2(x & 0xff);
        const x2 = xtime(a);

        if (mul === 0x01) return { val: a, text: `01·${hx(a)} = ${hx(a)}` };
        if (mul === 0x02) return { val: x2, text: `02·${hx(a)} = xtime(${hx(a)}) = ${hx(x2)}` };
        if (mul === 0x03) {
            const v = (x2 ^ a) & 0xff;
            return { val: v, text: `03·${hx(a)} = (02·${hx(a)}) XOR ${hx(a)} = ${hx(x2)} XOR ${hx(a)} = ${hx(v)}` };
        }

        const v = gfMul(a, mul);
        return { val: v, text: `${hx(mul)}·${hx(a)} = ${hx(v)} (GF(2^8))` };
    }

    // ---- AES state representation ----
    // AES state is column-major: state[r + 4*c]
    function bytesToState(block16) {
        const s = new Uint8Array(16);
        s.set(block16);
        return s;
    }

    function stateClone(s) {
        const out = new Uint8Array(16);
        out.set(s);
        return out;
    }

    function addRoundKey(state, rk16) {
        for (let i = 0; i < 16; i++) state[i] ^= rk16[i];
    }

    function subBytes(state) {
        for (let i = 0; i < 16; i++) state[i] = SBOX[state[i]];
    }

    function shiftRows(state) {
        const tmp = stateClone(state);
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                state[r + 4 * c] = tmp[r + 4 * ((c + r) % 4)];
            }
        }
    }

    function mixColumns(state) {
        for (let c = 0; c < 4; c++) {
            const i = 4 * c;
            const a0 = state[i], a1 = state[i + 1], a2 = state[i + 2], a3 = state[i + 3];

            state[i] = (gfMul(a0, 2) ^ gfMul(a1, 3) ^ a2 ^ a3) & 0xff;
            state[i + 1] = (a0 ^ gfMul(a1, 2) ^ gfMul(a2, 3) ^ a3) & 0xff;
            state[i + 2] = (a0 ^ a1 ^ gfMul(a2, 2) ^ gfMul(a3, 3)) & 0xff;
            state[i + 3] = (gfMul(a0, 3) ^ a1 ^ a2 ^ gfMul(a3, 2)) & 0xff;
        }
    }

    // ---- Key expansion (AES-128) ----
    function rotWord(w) { return [w[1], w[2], w[3], w[0]]; }
    function subWord(w) { return [SBOX[w[0]], SBOX[w[1]], SBOX[w[2]], SBOX[w[3]]]; }

    function expandKey128(key16) {
        const Nr = 10;
        const w = new Uint8Array(16 * (Nr + 1)); // 176 bytes
        w.set(key16, 0);

        let bytesGenerated = 16;
        let rconIter = 1;
        const temp = new Uint8Array(4);

        while (bytesGenerated < w.length) {
            temp[0] = w[bytesGenerated - 4];
            temp[1] = w[bytesGenerated - 3];
            temp[2] = w[bytesGenerated - 2];
            temp[3] = w[bytesGenerated - 1];

            if (bytesGenerated % 16 === 0) {
                const t = rotWord([temp[0], temp[1], temp[2], temp[3]]);
                temp[0] = t[0]; temp[1] = t[1]; temp[2] = t[2]; temp[3] = t[3];

                const s = subWord([temp[0], temp[1], temp[2], temp[3]]);
                temp[0] = s[0]; temp[1] = s[1]; temp[2] = s[2]; temp[3] = s[3];

                temp[0] ^= RCON[rconIter++];
            }

            for (let i = 0; i < 4; i++) {
                w[bytesGenerated] = w[bytesGenerated - 16] ^ temp[i];
                bytesGenerated++;
            }
        }

        const rks = [];
        for (let r = 0; r <= Nr; r++) rks.push(w.slice(r * 16, r * 16 + 16));
        return rks;
    }

    function renderRoundKeys(rks) {
        roundKeysEl.innerHTML = "";
        rks.forEach((rk, i) => {
            const row = document.createElement("div");
            row.className = "rkrow mono";
            row.innerHTML = `
        <div class="rklabel">RoundKey[${i}]</div>
        <div class="rkval">${hexBlock(rk)}</div>
      `;
            roundKeysEl.appendChild(row);
        });
    }

    // ---- Walkthrough plan ----
    // Round 0: AddRoundKey only.
    // Rounds 1..9: SubBytes -> ShiftRows -> MixColumns -> AddRoundKey
    // Round 10: SubBytes -> ShiftRows -> AddRoundKey (no MixColumns)
    const WALK = (() => {
        const steps = [];
        steps.push({ round: 0, step: "start", title: "Start: plaintext block as a 4×4 state" });
        steps.push({ round: 0, step: "ark", title: "Round 0: AddRoundKey (XOR with RoundKey[0])" });

        for (let r = 1; r <= 9; r++) {
            steps.push({ round: r, step: "sub", title: `Round ${r}: SubBytes (S-box substitution)` });
            steps.push({ round: r, step: "shift", title: `Round ${r}: ShiftRows (row rotations)` });
            steps.push({ round: r, step: "mix", title: `Round ${r}: MixColumns (GF(2^8) column mixing)` });
            steps.push({ round: r, step: "ark", title: `Round ${r}: AddRoundKey (XOR with RoundKey[${r}])` });
        }

        steps.push({ round: 10, step: "sub", title: "Round 10 (final): SubBytes" });
        steps.push({ round: 10, step: "shift", title: "Round 10 (final): ShiftRows" });
        steps.push({ round: 10, step: "ark", title: "Round 10 (final): AddRoundKey (no MixColumns)" });
        steps.push({ round: 10, step: "end", title: "End: ciphertext block" });

        return steps;
    })();

    // ---- Rendering states (clickable byte focus) ----
    let focus = { r: 0, c: 0 };   // which byte to explain
    let selectedBlockIndex = 0;
    let walkIndex = 0;

    function renderStateGrid(container, state16, clickable) {
        container.innerHTML = "";
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const idx = r + 4 * c;
                const b = state16[idx];

                const box = document.createElement("div");
                box.className = "bytebox mono";
                if (r === focus.r && c === focus.c) box.classList.add("is-active");
                box.innerHTML = `
          <div class="bhex">${hex2(b)}</div>
          <div class="pos">r${r} c${c}</div>
        `;

                if (clickable) {
                    box.style.cursor = "pointer";
                    box.addEventListener("click", () => {
                        focus = { r, c };
                        // Re-render current step to refresh explanation + highlight
                        renderWalk();
                    });
                }

                container.appendChild(box);
            }
        }
    }

    function renderRawBytes(bytes) {
        // 16 bytes per line, with offsets
        const lines = [];
        for (let i = 0; i < bytes.length; i += 16) {
            const chunk = Array.from(bytes.slice(i, i + 16)).map(hex2).map(h => `<span class="byte">${h}</span>`).join(" ");
            lines.push(`<div><span class="muted mono">${i.toString(16).padStart(4, "0")}</span>  ${chunk}</div>`);
        }
        rawBytesEl.innerHTML = lines.join("");
    }

    // ---- Trace a single block and collect states per step ----
    function traceEncryptBlock(block16, rks) {
        const Nr = 10;
        const states = []; // each entry: { round, step, before, after, rkIndex? }

        let s = bytesToState(block16);

        // Start
        states.push({ round: 0, step: "start", before: stateClone(s), after: stateClone(s), rkIndex: null });

        // Round 0 AddRoundKey
        const b0 = stateClone(s);
        addRoundKey(s, rks[0]);
        states.push({ round: 0, step: "ark", before: b0, after: stateClone(s), rkIndex: 0 });

        // Rounds 1..9
        for (let r = 1; r <= 9; r++) {
            const bSub = stateClone(s);
            subBytes(s);
            states.push({ round: r, step: "sub", before: bSub, after: stateClone(s), rkIndex: null });

            const bShift = stateClone(s);
            shiftRows(s);
            states.push({ round: r, step: "shift", before: bShift, after: stateClone(s), rkIndex: null });

            const bMix = stateClone(s);
            mixColumns(s);
            states.push({ round: r, step: "mix", before: bMix, after: stateClone(s), rkIndex: null });

            const bArk = stateClone(s);
            addRoundKey(s, rks[r]);
            states.push({ round: r, step: "ark", before: bArk, after: stateClone(s), rkIndex: r });
        }

        // Round 10 (final): Sub, Shift, AddRoundKey (no Mix)
        const bSub10 = stateClone(s);
        subBytes(s);
        states.push({ round: 10, step: "sub", before: bSub10, after: stateClone(s), rkIndex: null });

        const bShift10 = stateClone(s);
        shiftRows(s);
        states.push({ round: 10, step: "shift", before: bShift10, after: stateClone(s), rkIndex: null });

        const bArk10 = stateClone(s);
        addRoundKey(s, rks[10]);
        states.push({ round: 10, step: "ark", before: bArk10, after: stateClone(s), rkIndex: 10 });

        // End marker
        states.push({ round: 10, step: "end", before: stateClone(s), after: stateClone(s), rkIndex: null });

        return { states, out: new Uint8Array(s) };
    }

    // ---- Explanation text for the current walkthrough step ----
    function explainStep(entry, rks) {
        const { round, step, before, after, rkIndex } = entry;
        const idx = focus.r + 4 * focus.c;
        const b0 = before[idx];
        const b1 = after[idx];

        const hx = (x) => hex2(x & 0xff);

        if (step === "start") {
            return (
                `AES takes 16 bytes and interprets them as a 4×4 state matrix (column-major).

Indexing:
state[r + 4*c]

This "Start" state is the plaintext block placed into that matrix.

Selected byte (r${focus.r}, c${focus.c}) = ${hx(b0)}`
            );
        }

        if (step === "ark") {
            const rk = rks[rkIndex];
            const k = rk[idx];
            return (
                `AddRoundKey = XOR with the round key.

Formula:
state[r,c] = state[r,c] XOR RoundKey[r,c]

RoundKey used: RoundKey[${rkIndex}]

Selected byte:
before = ${hx(b0)}
key    = ${hx(k)}
after  = ${hx(b1)}

Why this matters:
- XOR is simple, fast, and reversible.
- The key material is injected at every round.`
            );
        }

        if (step === "sub") {
            const out = SBOX[b0];
            return (
                `SubBytes applies a substitution box (S-box) to every byte.

Think of it as a lookup table:
after = SBOX[before]

Selected byte:
before = ${hx(b0)}
SBOX[${hx(b0)}] = ${hx(out)}
after  = ${hx(b1)}

Why this matters:
- This is the main non-linear part of AES (breaks simple linear patterns).`
            );
        }

        if (step === "shift") {
            const r = focus.r;
            const c = focus.c;
            const fromC = (c + r) % 4; // encryption shift left by row index
            const srcIdx = r + 4 * fromC;
            return (
                `ShiftRows rotates each row left by its row index:
row0: 0, row1: 1, row2: 2, row3: 3

This moves bytes across columns.

For your selected position (r${r}, c${c}):
it comes from (r${r}, c${fromC}) in the previous state.

source byte = ${hx(before[srcIdx])}
after here  = ${hx(b1)}

Why this matters:
- It spreads byte influence across columns before MixColumns.`
            );
        }

        if (step === "mix") {
            // Exact per-byte math breakdown for the selected output byte
            const col = focus.c;
            const base = 4 * col;
            const a0 = before[base], a1 = before[base + 1], a2 = before[base + 2], a3 = before[base + 3];

            // AES encryption matrix row coefficients:
            // r0: [02 03 01 01]
            // r1: [01 02 03 01]
            // r2: [01 01 02 03]
            // r3: [03 01 01 02]
            const coeffs =
                focus.r === 0 ? [0x02, 0x03, 0x01, 0x01] :
                    focus.r === 1 ? [0x01, 0x02, 0x03, 0x01] :
                        focus.r === 2 ? [0x01, 0x01, 0x02, 0x03] :
                            [0x03, 0x01, 0x01, 0x02];

            const inputs = [a0, a1, a2, a3];
            const terms = coeffs.map((k, i) => gfMulExplain(inputs[i], k));
            const outVal = (terms[0].val ^ terms[1].val ^ terms[2].val ^ terms[3].val) & 0xff;

            return (
                `MixColumns mixes each column using GF(2^8) arithmetic.

We are computing output byte at (r${focus.r}, c${col}) from input column c${col}:
[a0 a1 a2 a3] = [${hx(a0)} ${hx(a1)} ${hx(a2)} ${hx(a3)}]

Encryption matrix row for r${focus.r}:
[${coeffs.map(hx).join(" ")}]

Term-by-term products (exact):
1) ${terms[0].text}
2) ${terms[1].text}
3) ${terms[2].text}
4) ${terms[3].text}

Now XOR them:
out = ${hx(terms[0].val)} XOR ${hx(terms[1].val)} XOR ${hx(terms[2].val)} XOR ${hx(terms[3].val)}
    = ${hx(outVal)}

So after MixColumns, selected byte is:
after = ${hx(b1)}   (computed = ${hx(outVal)})

Why this matters:
- This is diffusion: each output byte depends on multiple input bytes.
- In AES, 03·x = (02·x) XOR x (that’s why the math looks “structured”).`
            );
        }

        if (step === "end") {
            return (
                `This is the final ciphertext state for the selected block.

The ciphertext block is the 16 bytes of this state (still column-major).

Tip: keep hitting Back to see how it got here.`
            );
        }

        return "";
    }

    // ---- Main computed model ----
    let model = null; // { inBytes, padded, blocks, rks, traces[], outAllHex }

    function recompute() {
        try {
            setError("");

            const inBytes = treatAsHex.checked ? parseHexBytes(input.value) : toUtf8Bytes(input.value);

            let padded = inBytes;
            let padCount = 0;
            if (pkcs7.checked) {
                const res = pkcs7Pad(inBytes, 16);
                padded = res.out;
                padCount = res.pad;
            } else {
                // teaching-friendly: if no padding, drop incomplete tail
                const cut = inBytes.length - (inBytes.length % 16);
                padded = inBytes.slice(0, cut);
            }

            if (padded.length === 0) {
                model = null;
                outHex.textContent = "";
                vectorCheck.textContent = "—";
                rawBytesEl.innerHTML = "";
                inLenBytes.textContent = String(inBytes.length);
                paddedLenBytes.textContent = String(padded.length);
                blockCount.textContent = "0";
                blockMeta.textContent = "—";
                roundKeysEl.innerHTML = "";
                walkMeta.textContent = "—";
                walkBefore.innerHTML = "";
                walkAfter.innerHTML = "";
                walkExplain.textContent = "Type an input to begin.";
                return;
            }

            const keyBytes = parseHexBytes(keyHex.value);
            if (keyBytes.length !== 16) throw new Error("Key must be exactly 16 bytes (32 hex hex chars) for AES-128.");

            const blocks = splitBlocks16(padded);
            const rks = expandKey128(keyBytes);
            renderRoundKeys(rks);

            // clamp selected block
            selectedBlockIndex = Math.max(0, Math.min(selectedBlockIndex, blocks.length - 1));

            // trace each block + encrypt outputs
            const traces = [];
            const outs = [];
            for (const b of blocks) {
                const tr = traceEncryptBlock(b, rks);
                traces.push(tr);
                outs.push(tr.out);
            }

            // full output hex
            const outAll = new Uint8Array(outs.length * 16);
            outs.forEach((b, i) => outAll.set(b, i * 16));
            outHex.textContent = hexBlock(outAll);

            // NIST KAT check when vector loaded
            const isVector =
                treatAsHex.checked &&
                !pkcs7.checked &&
                keyHex.value.toLowerCase().replaceAll(/[^0-9a-f]/g, "") === "000102030405060708090a0b0c0d0e0f" &&
                input.value.toLowerCase().replaceAll(/[^0-9a-f]/g, "") === "00112233445566778899aabbccddeeff";

            if (isVector) {
                const expected = "69c4e0d86a7b0430d8cdb78070b4c55a";
                const got = hexBlock(outs[0]);
                vectorCheck.textContent = (got === expected) ? "PASS: AES-128 known-answer test" : "FAIL (unexpected output)";
            } else {
                vectorCheck.textContent = "—";
            }

            // bytes meta
            inLenBytes.textContent = String(inBytes.length);
            paddedLenBytes.textContent = String(padded.length);
            blockCount.textContent = String(blocks.length);
            blockMeta.textContent = `Block ${selectedBlockIndex + 1} of ${blocks.length} (16 bytes)`;
            renderRawBytes(padded);

            model = { inBytes, padded, blocks, rks, traces };

            // keep walkIndex in range (WALK has fixed length)
            walkIndex = Math.max(0, Math.min(walkIndex, WALK.length - 1));

            renderWalk();
        } catch (e) {
            model = null;
            outHex.textContent = "";
            vectorCheck.textContent = "—";
            roundKeysEl.innerHTML = "";
            walkBefore.innerHTML = "";
            walkAfter.innerHTML = "";
            walkExplain.textContent = "";
            walkMeta.textContent = "—";
            setError(e?.message || String(e));
        }
    }

    function renderWalk() {
        if (!model) return;

        // Map WALK[walkIndex] to the actual traced state entry for the selected block.
        // The trace contains steps with round+step, so we search for the first match.
        const plan = WALK[walkIndex];
        const tr = model.traces[selectedBlockIndex].states;

        const entry = tr.find(x => x.round === plan.round && x.step === plan.step)
            || tr[0];

        // Render before/after matrices (clickable)
        renderStateGrid(walkBefore, entry.before, true);
        renderStateGrid(walkAfter, entry.after, true);

        // Meta line
        const stepNum = walkIndex + 1;
        const total = WALK.length;
        const title = plan.title;
        walkMeta.textContent = `Step ${stepNum}/${total} · ${title} · Selected byte: (r${focus.r}, c${focus.c})`;

        // Explanation
        walkExplain.textContent = explainStep(entry, model.rks);

        // Enable/disable nav
        walkBack.disabled = (walkIndex === 0);
        walkNext.disabled = (walkIndex === WALK.length - 1);
    }

    async function copyText(s) {
        try { await navigator.clipboard.writeText(s || ""); } catch { }
    }

    // ---- Events ----
    input.addEventListener("input", () => { walkIndex = 0; recompute(); });
    treatAsHex.addEventListener("change", () => { walkIndex = 0; recompute(); });
    pkcs7.addEventListener("change", () => { walkIndex = 0; recompute(); });
    keyHex.addEventListener("input", () => { walkIndex = 0; recompute(); });

    walkBack.addEventListener("click", () => { walkIndex = Math.max(0, walkIndex - 1); renderWalk(); });
    walkNext.addEventListener("click", () => { walkIndex = Math.min(WALK.length - 1, walkIndex + 1); renderWalk(); });
    walkReset.addEventListener("click", () => { walkIndex = 0; renderWalk(); });

    prevBlockBtn.addEventListener("click", () => {
        if (!model) return;
        selectedBlockIndex = Math.max(0, selectedBlockIndex - 1);
        walkIndex = 0;
        recompute();
    });

    nextBlockBtn.addEventListener("click", () => {
        if (!model) return;
        selectedBlockIndex = Math.min(model.blocks.length - 1, selectedBlockIndex + 1);
        walkIndex = 0;
        recompute();
    });

    copyOut.addEventListener("click", () => copyText(outHex.textContent));

    loadVector.addEventListener("click", () => {
        // NIST AES-128 Known Answer Test:
        // Key: 000102030405060708090a0b0c0d0e0f
        // PT : 00112233445566778899aabbccddeeff
        // CT : 69c4e0d86a7b0430d8cdb78070b4c55a
        treatAsHex.checked = true;
        pkcs7.checked = false;
        input.value = "00112233445566778899aabbccddeeff";
        keyHex.value = "000102030405060708090a0b0c0d0e0f";
        selectedBlockIndex = 0;
        focus = { r: 0, c: 0 };
        walkIndex = 0;
        recompute();
    });

    // Init defaults
    keyHex.value = "00112233445566778899aabbccddeeff";
    recompute();
})();