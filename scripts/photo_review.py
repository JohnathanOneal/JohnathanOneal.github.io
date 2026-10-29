"""Local-only photo-review storage and HTTP routes for the preview server."""

from datetime import datetime, timezone
import io
import json
from pathlib import Path
import threading
import zipfile

from PIL import Image

from prepare_photo_review import display_image


ROOT = Path(__file__).resolve().parents[1]
UI = Path(__file__).resolve().parent / "photo_review_ui"
TRIP = "scotland-2026"
PREFIX = f"/__photo-review/{TRIP}/"


class PhotoReview:
    def __init__(self, root=ROOT):
        self.library = Path(root) / ".travel-review" / TRIP
        self.lock = threading.Lock()
        self.image_lock = threading.Lock()
        self._manifest = None

    @property
    def manifest(self):
        if self._manifest is None:
            self._manifest = json.loads((self.library / "manifest.json").read_text(encoding="utf-8"))
        return self._manifest

    def photo(self, identity):
        for photo in self.manifest["photos"]:
            if photo["id"] == identity:
                return photo
        raise ValueError("Unknown photo")

    def favorites(self):
        return json.loads((self.library / "favorites.json").read_text(encoding="utf-8"))

    def select(self, identity, favorite):
        self.photo(identity)
        if type(favorite) is not bool:
            raise ValueError("favorite must be a boolean")
        with self.lock:
            state = self.favorites()
            selected = set(state["favorite_ids"])
            selected.add(identity) if favorite else selected.discard(identity)
            # Keep the saved selection in the same chronology as the contact sheet.
            state["favorite_ids"] = [photo["id"] for photo in self.manifest["photos"] if photo["id"] in selected]
            state["updated_at"] = datetime.now(timezone.utc).isoformat()
            target = self.library / "favorites.json"
            temporary = target.with_suffix(".tmp")
            temporary.write_text(json.dumps(state, indent=2), encoding="utf-8")
            temporary.replace(target)
            return state

    def preview(self, identity):
        photo = self.photo(identity)
        target = self.library / "previews" / f"{identity}.webp"
        with self.image_lock:
            if not target.exists():
                archive = json.loads((self.library / "source.json").read_text(encoding="utf-8"))["archive"]
                with zipfile.ZipFile(archive) as source_zip:
                    with Image.open(io.BytesIO(source_zip.read(photo["member"]))) as source:
                        image = display_image(source, 1500)
                        target.parent.mkdir(parents=True, exist_ok=True)
                        temporary = target.with_suffix(".tmp")
                        image.save(temporary, "WEBP", quality=88, method=4)
                        temporary.replace(target)
        return target.read_bytes()


STORE = PhotoReview()


def get_review(path):
    """Return (bytes, content type), or None when this is not a review route."""
    if path in (f"/review/{TRIP}", f"/review/{TRIP}/"):
        return (UI / "index.html").read_bytes(), "text/html; charset=utf-8"
    static = {
        "/__photo-review/ui/app.js": ("app.js", "application/javascript"),
        "/__photo-review/ui/style.css": ("style.css", "text/css"),
    }
    if path in static:
        filename, content_type = static[path]
        return (UI / filename).read_bytes(), content_type
    if not path.startswith(PREFIX):
        return None
    endpoint = path[len(PREFIX):]
    if endpoint == "manifest":
        # ZIP member paths and the local archive location stay on the server.
        public = {**STORE.manifest, "photos": [{key: value for key, value in photo.items() if key != "member"} for photo in STORE.manifest["photos"]]}
        return json.dumps(public).encode(), "application/json"
    if endpoint == "favorites":
        return json.dumps(STORE.favorites()).encode(), "application/json"
    kind, _, filename = endpoint.partition("/")
    if kind in ("thumb", "preview") and filename.endswith(".webp"):
        identity = filename.removesuffix(".webp")
        STORE.photo(identity)
        body = (STORE.library / "thumbs" / filename).read_bytes() if kind == "thumb" else STORE.preview(identity)
        return body, "image/webp"
    raise ValueError("Unknown review endpoint")


def post_review(path, payload):
    if path != PREFIX + "favorites":
        return None
    return STORE.select(payload.get("photo_id"), payload.get("favorite"))
