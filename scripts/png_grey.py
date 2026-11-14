"""Read 8-bit greyscale PNG files with the standard library only.

NASA Mars Trek serves its elevation layers as 8-bit greyscale PNG tiles (with
or without an alpha channel). This reader decodes exactly that format, so the
calibration script needs no image library. Anything else raises ValueError.
"""
from __future__ import annotations

import struct
import zlib

_SIGNATURE = b"\x89PNG\r\n\x1a\n"
_GREY = 0
_GREY_ALPHA = 4
_CHANNELS = {_GREY: 1, _GREY_ALPHA: 2}


def _paeth(left: int, up: int, up_left: int) -> int:
    estimate = left + up - up_left
    to_left, to_up, to_up_left = abs(estimate - left), abs(estimate - up), abs(estimate - up_left)
    if to_left <= to_up and to_left <= to_up_left:
        return left
    return up if to_up <= to_up_left else up_left


def _unfilter(raw: bytes, width: int, height: int, step: int) -> list[bytearray]:
    """Undo PNG's per-row filters. `step` is bytes per pixel."""
    stride = width * step
    rows: list[bytearray] = []
    previous = bytearray(stride)
    offset = 0
    for _ in range(height):
        kind = raw[offset]
        row = bytearray(raw[offset + 1: offset + 1 + stride])
        offset += 1 + stride
        for i in range(stride):
            left = row[i - step] if i >= step else 0
            up = previous[i]
            up_left = previous[i - step] if i >= step else 0
            if kind == 1:
                row[i] = (row[i] + left) & 0xFF
            elif kind == 2:
                row[i] = (row[i] + up) & 0xFF
            elif kind == 3:
                row[i] = (row[i] + (left + up) // 2) & 0xFF
            elif kind == 4:
                row[i] = (row[i] + _paeth(left, up, up_left)) & 0xFF
            elif kind != 0:
                raise ValueError(f"Unknown PNG filter {kind}")
        rows.append(row)
        previous = row
    return rows


def read_grey_png(data: bytes) -> list[list[int | None]]:
    """Decode an 8-bit greyscale PNG.

    Args:
        data: The PNG file's bytes.

    Returns:
        Rows of grey values 0 to 255, top row first. A pixel whose alpha is 0
        (no data) is None.

    Raises:
        ValueError: if the file is not an 8-bit, non-interlaced greyscale PNG.
    """
    if not data.startswith(_SIGNATURE):
        raise ValueError("Not a PNG file")
    offset = len(_SIGNATURE)
    width = height = colour_type = 0
    compressed = bytearray()
    while offset < len(data):
        (length,) = struct.unpack(">I", data[offset: offset + 4])
        kind = data[offset + 4: offset + 8]
        body = data[offset + 8: offset + 8 + length]
        offset += 12 + length
        if kind == b"IHDR":
            width, height, depth, colour_type, _, _, interlace = struct.unpack(">IIBBBBB", body)
            if depth != 8 or colour_type not in _CHANNELS or interlace != 0:
                raise ValueError("Only 8-bit, non-interlaced greyscale PNG files are supported")
        elif kind == b"IDAT":
            compressed += body
        elif kind == b"IEND":
            break
    step = _CHANNELS[colour_type]
    rows = _unfilter(zlib.decompress(bytes(compressed)), width, height, step)
    if step == 1:
        return [list(row) for row in rows]
    return [[row[i] if row[i + 1] else None for i in range(0, len(row), 2)] for row in rows]
