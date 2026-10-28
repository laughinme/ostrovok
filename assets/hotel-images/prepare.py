#!/usr/bin/env python3
"""Import image_gen outputs as JPEGs and rebuild the inspectable local catalog."""

import argparse
import hashlib
import json
import shutil
import struct
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOF_MARKERS = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}


def jpeg_size(data):
    if not data.startswith(b"\xff\xd8"):
        raise ValueError("Expected JPEG data")
    offset = 2
    while offset < len(data):
        if data[offset] != 0xFF:
            raise ValueError("Invalid JPEG marker")
        while offset < len(data) and data[offset] == 0xFF:
            offset += 1
        marker = data[offset]
        offset += 1
        if marker in {0xD9, 0xDA}:
            break
        if marker == 0x01 or 0xD0 <= marker <= 0xD8:
            continue
        length = struct.unpack_from(">H", data, offset)[0]
        if length < 2 or offset + length > len(data):
            raise ValueError("Invalid JPEG segment length")
        if marker in SOF_MARKERS:
            height, width = struct.unpack_from(">HH", data, offset + 3)
            return width, height
        offset += length
    raise ValueError("JPEG dimensions not found")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", type=Path, help="JSON object mapping prompt asset IDs to local image_gen output paths; import requires macOS sips")
    args = parser.parse_args()
    prompts = json.loads((ROOT / "prompts.json").read_text())
    sources = json.loads(args.sources.read_text()) if args.sources else None
    if sources is not None and not shutil.which("sips"):
        parser.error("Import requires sips; catalog rebuild without --sources uses only Python's standard library")

    assets = []
    groups = {}
    for spec in prompts["assets"]:
        destination = (ROOT / spec["path"]).resolve()
        if not destination.is_relative_to(ROOT) or destination.suffix != ".jpg":
            raise ValueError(f"Unexpected output path: {spec['path']}")
        if sources is not None:
            source = Path(sources[spec["id"]]).resolve(strict=True)
            destination.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82", str(source), "--out", str(destination)], check=True, capture_output=True)
        data = destination.read_bytes()
        width, height = jpeg_size(data)
        if width < 1200 or width * 2 != height * 3:
            raise ValueError(f"Expected landscape 3:2 image at least 1200 px wide: {spec['path']}")
        asset = {key: value for key, value in spec.items() if key not in {"prompt", "revisions"}}
        asset.update(width=width, height=height, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), mimeType="image/jpeg", synthetic=True, sourceType="ai-generated", license=None, promptId=spec["id"])
        assets.append(asset)
        group = groups.setdefault(spec["demoHotelId"], {"id": spec["demoHotelId"], "name": spec["demoHotelName"], "category": spec["category"], "tags": spec["tags"], "synthetic": True, "gallery": []})
        group["gallery"].append(spec["path"])
        if spec["role"] == "exterior":
            group["cover"] = spec["path"]
    if len({asset["sha256"] for asset in assets}) != len(assets):
        raise ValueError("Duplicate image content")

    manifest = {
        "schemaVersion": 1,
        "createdAt": prompts["createdAt"],
        "source": {"kind": "ai-generated", "tool": "image_gen", "mode": "built-in", "synthetic": True, "license": None, "isCreativeCommons": False},
        "displayLabel": "Сгенерировано · демо",
        "usageNote": "Вымышленные сцены для прототипа; не фотографии реальных объектов и не доказательства характеристик отеля.",
        "pathsRelativeTo": "manifest.json",
        "encoding": {"format": "jpeg", "quality": 82, "resized": False},
        "assetCount": len(assets),
        "totalBytes": sum(asset["bytes"] for asset in assets),
        "sets": list(groups.values()),
        "assets": assets,
    }
    (ROOT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"assets": len(assets), "sets": len(groups), "totalBytes": manifest["totalBytes"], "dimensions": sorted({(asset["width"], asset["height"]) for asset in assets})}, ensure_ascii=False))


if __name__ == "__main__":
    main()
