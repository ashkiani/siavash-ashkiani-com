#!/usr/bin/env python3
"""Embed a UTF-8 message into a jp2a --html-raw file using red-channel LSBs."""

from __future__ import annotations

import argparse
from pathlib import Path
import re
import zlib

MAGIC = b"SAS1"
COLOR_RE = re.compile(r"color:#([0-9a-fA-F]{6})")


def build_frame(message: str) -> bytes:
    payload = message.encode("utf-8")
    if len(payload) > 65535:
        raise ValueError("Message is too long; maximum UTF-8 length is 65,535 bytes.")
    checksum = zlib.crc32(payload) & 0xFFFFFFFF
    return MAGIC + len(payload).to_bytes(2, "big") + payload + checksum.to_bytes(4, "big")


def embed(source: str, frame: bytes) -> tuple[str, int]:
    bits = [(byte >> shift) & 1 for byte in frame for shift in range(7, -1, -1)]
    bit_index = 0
    changed = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal bit_index, changed
        color = match.group(1)
        if bit_index >= len(bits):
            return match.group(0)

        red = int(color[:2], 16)
        desired = bits[bit_index]
        if (red & 1) != desired:
            red = red - 1 if red == 255 else red + 1
            changed += 1

        bit_index += 1
        return f"color:#{red:02x}{color[2:].lower()}"

    result = COLOR_RE.sub(replace, source)
    if bit_index != len(bits):
        raise ValueError(
            f"Not enough colored characters: need {len(bits)}, found {bit_index}."
        )
    return result, changed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="jp2a --html-raw input file")
    parser.add_argument("output", type=Path, help="encoded HTML fragment")
    parser.add_argument("message", help="message to hide")
    args = parser.parse_args()

    frame = build_frame(args.message)
    encoded, changed = embed(args.input.read_text(encoding="utf-8"), frame)
    args.output.write_text(encoded, encoding="utf-8")
    print(f"Embedded {len(frame) * 8} bits; changed {changed} color values.")


if __name__ == "__main__":
    main()
