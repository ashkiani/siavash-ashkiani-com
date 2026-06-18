(() => {
  const MAGIC = "SAS1";
  const HEADER_BYTES = 6;
  const CHECKSUM_BYTES = 4;

  const decodeButton = document.getElementById("decode-steg");
  const highlightButton = document.getElementById("highlight-steg");
  const output = document.getElementById("steg-output");
  const original = document.getElementById("ascii-original");
  const encoded = document.getElementById("ascii-encoded");
  const originalFrame = document.getElementById("original-frame");
  const encodedFrame = document.getElementById("encoded-frame");

  if (!decodeButton || !highlightButton || !output || !original || !encoded) return;

  const sleep = (milliseconds) =>
    new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function redChannel(span) {
    const color = window.getComputedStyle(span).color;
    const values = color.match(/[\d.]+/g);
    if (!values || values.length < 3) {
      throw new Error("A character color could not be read.");
    }
    return Number(values[0]);
  }

  function readBytes(spans, byteCount, startBit = 0) {
    const requiredBits = byteCount * 8;
    if (startBit + requiredBits > spans.length) {
      throw new Error("The portrait does not contain enough encoded characters.");
    }

    const bytes = new Uint8Array(byteCount);
    for (let bitIndex = 0; bitIndex < requiredBits; bitIndex += 1) {
      const bit = redChannel(spans[startBit + bitIndex]) & 1;
      bytes[Math.floor(bitIndex / 8)] |= bit << (7 - (bitIndex % 8));
    }
    return bytes;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        const mask = -(crc & 1);
        crc = (crc >>> 1) ^ (0xedb88320 & mask);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function uint32FromBytes(bytes) {
    return (
      ((bytes[0] << 24) >>> 0) |
      (bytes[1] << 16) |
      (bytes[2] << 8) |
      bytes[3]
    ) >>> 0;
  }

  function decodePayload() {
    const spans = Array.from(encoded.querySelectorAll("span"));
    const header = readBytes(spans, HEADER_BYTES);
    const magic = new TextDecoder().decode(header.slice(0, 4));

    if (magic !== MAGIC) {
      throw new Error("No supported payload signature was found.");
    }

    const payloadLength = (header[4] << 8) | header[5];
    const totalBytes = HEADER_BYTES + payloadLength + CHECKSUM_BYTES;
    const frame = readBytes(spans, totalBytes);
    const payload = frame.slice(HEADER_BYTES, HEADER_BYTES + payloadLength);
    const storedChecksum = uint32FromBytes(frame.slice(-CHECKSUM_BYTES));
    const computedChecksum = crc32(payload);

    if (storedChecksum !== computedChecksum) {
      throw new Error("A payload was found, but its checksum did not match.");
    }

    return {
      message: new TextDecoder("utf-8", { fatal: true }).decode(payload),
      spanCount: spans.length,
      encodedBits: totalBytes * 8,
      checksum: storedChecksum.toString(16).padStart(8, "0"),
    };
  }

  function modifiedPairs() {
    const sourceSpans = Array.from(original.querySelectorAll("span"));
    const encodedSpans = Array.from(encoded.querySelectorAll("span"));
    const pairs = [];
    const count = Math.min(sourceSpans.length, encodedSpans.length);

    for (let index = 0; index < count; index += 1) {
      if (redChannel(sourceSpans[index]) !== redChannel(encodedSpans[index])) {
        pairs.push([sourceSpans[index], encodedSpans[index]]);
      }
    }
    return pairs;
  }

  let highlightsVisible = false;
  let scanInProgress = false;
  let cachedModifiedPairs = null;

  function updateButtonStates() {
    decodeButton.disabled = scanInProgress || highlightsVisible;
    highlightButton.disabled = scanInProgress;
  }

  highlightButton.addEventListener("click", () => {
    cachedModifiedPairs ??= modifiedPairs();
    highlightsVisible = !highlightsVisible;

    for (const [sourceSpan, encodedSpan] of cachedModifiedPairs) {
      sourceSpan.classList.toggle("steg-modified-source", highlightsVisible);
      encodedSpan.classList.toggle("steg-modified", highlightsVisible);
    }

    highlightButton.textContent = highlightsVisible
      ? "Hide modification highlights"
      : "Highlight modified characters";
    updateButtonStates();

    output.textContent = highlightsVisible
      ? `> highlighted ${cachedModifiedPairs.length.toLocaleString()} red-channel values\n> each differs from the original by exactly one level`
      : "> modification highlights hidden";
    output.classList.remove("is-error");
    output.classList.add("is-success");
  });

  decodeButton.addEventListener("click", async () => {
    scanInProgress = true;
    updateButtonStates();
    output.classList.remove("is-error", "is-success");
    output.textContent = "> scanning encoded character colors...";

    try {
      await sleep(220);
      const result = decodePayload();
      output.textContent = [
        `> inspected ${result.spanCount.toLocaleString()} colored characters`,
        `> detected SAS1 payload (${result.encodedBits.toLocaleString()} encoded bits)`,
        `> CRC-32 verified: 0x${result.checksum}`,
        "> payload recovered:",
        "",
        result.message,
      ].join("\n");
      output.classList.add("is-success");
    } catch (error) {
      output.textContent = `> scan failed\n> ${error.message}`;
      output.classList.add("is-error");
    } finally {
      scanInProgress = false;
      updateButtonStates();
    }
  });

  updateButtonStates();

  if (originalFrame && encodedFrame) {
    let syncing = false;
    const sync = (source, destination) => {
      if (syncing) return;
      syncing = true;
      destination.scrollLeft = source.scrollLeft;
      destination.scrollTop = source.scrollTop;
      window.requestAnimationFrame(() => { syncing = false; });
    };
    originalFrame.addEventListener("scroll", () => sync(originalFrame, encodedFrame));
    encodedFrame.addEventListener("scroll", () => sync(encodedFrame, originalFrame));
  }
})();
