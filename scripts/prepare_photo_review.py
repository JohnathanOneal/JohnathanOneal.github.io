"""Build a chronological local contact sheet from an original-photo ZIP.

The generated library and favourites live in gitignored .travel-review/, outside
the public site. Originals are read directly from the ZIP and never changed.
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
import hashlib
import io
import json
from pathlib import Path
import zipfile

from PIL import Image, ImageCms, ImageOps
import pillow_heif


ROOT = Path(__file__).resolve().parents[1]
pillow_heif.register_heif_opener()


def photo_id(member: str) -> str:
    return hashlib.sha256(member.encode("utf-8")).hexdigest()[:20]


def display_image(source, longest_edge: int):
    image = ImageOps.exif_transpose(source)
    profile = source.info.get("icc_profile")
    image.thumbnail((longest_edge, longest_edge), Image.Resampling.LANCZOS)
    if profile:
        image = ImageCms.profileToProfile(
            image,
            ImageCms.ImageCmsProfile(io.BytesIO(profile)),
            ImageCms.createProfile("sRGB"),
            outputMode="RGB",
        )
    else:
        image = image.convert("RGB")
    return image


def build(archive: Path, inventory_path: Path, trip: str, workers: int):
    library = ROOT / ".travel-review" / trip
    thumbs = library / "thumbs"
    thumbs.mkdir(parents=True, exist_ok=True)
    records = [row for row in json.loads(inventory_path.read_text(encoding="utf-8")) if "width" in row]
    if not records:
        raise ValueError("The inventory has no photos")
    day_offsets = defaultdict(Counter)
    for row in records:
        if row.get("date") and row.get("offset"):
            day_offsets[row["date"][:10]][row["offset"]] += 1

    def prepare(row):
        identity = photo_id(row["source"])
        with zipfile.ZipFile(archive) as source_zip:
            with Image.open(io.BytesIO(source_zip.read(row["source"]))) as source:
                exif = source.getexif().get_ifd(34665)
                capture = row["date"]
                offset = row.get("offset")
                inferred = not bool(offset)
                if inferred:
                    candidates = day_offsets[capture[:10]]
                    if not candidates:
                        raise ValueError(f"Cannot infer a timezone for {row['source']}")
                    offset = candidates.most_common(1)[0][0]
                sign = -1 if offset.startswith("-") else 1
                hours, minutes = (int(value) for value in offset[1:].split(":"))
                zone = timezone(sign * timedelta(hours=hours, minutes=minutes))
                subsecond = str(exif.get(37521) or "").strip()
                microsecond = int((subsecond + "000000")[:6]) if subsecond.isdigit() else 0
                moment = datetime.strptime(capture, "%Y:%m:%d %H:%M:%S").replace(tzinfo=zone, microsecond=microsecond)
                target = thumbs / f"{identity}.webp"
                if not target.exists():
                    display_image(source, 520).save(target, "WEBP", quality=82, method=4)
        return {
            "id": identity,
            "filename": Path(row["source"]).name,
            "member": row["source"],
            "date": moment.date().isoformat(),
            "captured_at": moment.isoformat(),
            "captured_utc": moment.astimezone(timezone.utc).isoformat(),
            "display_time": moment.strftime("%H:%M:%S"),
            "timezone_inferred": inferred,
            "width": row["width"],
            "height": row["height"],
        }

    photos = []
    failures = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        jobs = {pool.submit(prepare, row): row for row in records}
        for index, job in enumerate(as_completed(jobs), 1):
            try:
                photos.append(job.result())
            except Exception as error:
                failures.append({"source": jobs[job]["source"], "error": str(error)})
            if index % 25 == 0 or index == len(jobs):
                print(f"Prepared {index}/{len(jobs)} photos", flush=True)
    if failures:
        (library / "errors.json").write_text(json.dumps(failures, indent=2), encoding="utf-8")
        raise RuntimeError(f"{len(failures)} photos could not be prepared; see {library / 'errors.json'}")

    photos.sort(key=lambda photo: (photo["captured_utc"], photo["filename"], photo["id"]))
    first_date = min(datetime.fromisoformat(photo["date"]).date() for photo in photos)
    day_counts = Counter()
    for index, photo in enumerate(photos, 1):
        day_counts[photo["date"]] += 1
        photo["sequence"] = index
        photo["day_sequence"] = day_counts[photo["date"]]
        photo["day_number"] = (datetime.fromisoformat(photo["date"]).date() - first_date).days

    manifest = {"trip": trip, "title": "Scotland · October 2026", "photos": photos}
    (library / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (library / "source.json").write_text(json.dumps({"archive": str(archive.resolve())}), encoding="utf-8")
    favorites = library / "favorites.json"
    if not favorites.exists():
        approved_day_zero = {"IMG_2891.HEIC", "IMG_2894.HEIC", "IMG_2896.HEIC"}
        selected = [photo["id"] for photo in photos if photo["filename"] in approved_day_zero]
        favorites.write_text(json.dumps({"trip": trip, "favorite_ids": selected}, indent=2), encoding="utf-8")
    print(f"Ready: {len(photos)} photos across {len(day_counts)} days. Library: {library}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", required=True, type=Path)
    parser.add_argument("--inventory", required=True, type=Path)
    parser.add_argument("--trip", default="scotland-2026", choices=["scotland-2026"])
    parser.add_argument("--workers", type=int, default=3)
    options = parser.parse_args()
    build(options.archive, options.inventory, options.trip, options.workers)
