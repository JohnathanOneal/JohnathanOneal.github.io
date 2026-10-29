"""Preview the travel Liquid templates locally without a Ruby installation.

This serves only the travel pages and public docs assets. Production still uses
Jekyll. Install requirements-travel-preview.txt, then run this script.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import socket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

import markdown
import yaml
from liquid import Environment
from photo_review import get_review, post_review


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
PAGES = {
    "/travels/": DOCS / "travels/index.html",
    "/travels/scotland-2026/": DOCS / "travels/scotland-2026/index.html",
    "/travels/japan-2025/": DOCS / "travels/japan-2025/index.html",
}


def read_page(path: Path) -> tuple[dict, str]:
    text = path.read_text(encoding="utf-8")
    if text.startswith("---\n"):
        _, frontmatter, body = text.split("---", 2)
        return yaml.safe_load(frontmatter) or {}, body.lstrip("\n")
    return {}, text


def version() -> str:
    files = list((DOCS / "travels").rglob("*.html"))
    files += list((DOCS / "assets/travels").rglob("*"))
    files += [
        DOCS / "_config.yml",
        DOCS / "_data/travels.json",
        DOCS / "_layouts/travel.html",
        DOCS / "_layouts/travel-trip.html",
        DOCS / "assets/css/travels.css",
        DOCS / "assets/js/travels.js",
        DOCS / "assets/css/journey.css",
        DOCS / "assets/js/journey.js",
    ]
    values = [f"{path}:{path.stat().st_mtime_ns}:{path.stat().st_size}" for path in sorted(files) if path.is_file()]
    return hashlib.sha256("\n".join(values).encode()).hexdigest()


def render_page(path: Path, live_reload: bool = True) -> str:
    site = yaml.safe_load((DOCS / "_config.yml").read_text(encoding="utf-8"))
    site["data"] = {"travels": json.loads((DOCS / "_data/travels.json").read_text(encoding="utf-8"))}
    environment = Environment()
    environment.add_filter("relative_url", lambda value: f"{site.get('baseurl', '').rstrip('/')}/{str(value).lstrip('/')}")
    environment.add_filter("jsonify", lambda value: json.dumps(value, ensure_ascii=False))
    environment.add_filter("markdownify", lambda value: markdown.markdown(str(value or "")))

    page, body = read_page(path)
    content = environment.from_string(body).render(site=site, page=page)
    layout = page.get("layout")
    visited = set()
    while layout:
        if layout in visited or layout not in {"travel", "travel-trip"}:
            raise ValueError(f"Unsupported or circular travel layout: {layout}")
        visited.add(layout)
        metadata, template = read_page(DOCS / "_layouts" / f"{layout}.html")
        content = environment.from_string(template).render(site=site, page=page, content=content)
        layout = metadata.get("layout")

    if live_reload:
        reload_script = """<script>
(() => {
  const current = VERSION;
  setInterval(async () => {
    try {
      const response = await fetch('/__travel_preview_version', {cache: 'no-store'});
      if (response.ok && (await response.text()) !== current) location.reload();
    } catch (_) { /* Keep the current page visible while the server restarts. */ }
  }, 1500);
})();
</script>""".replace("VERSION", json.dumps(version()))
        content = content.replace("</body>", reload_script + "\n</body>")
    return content


class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DOCS), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        path = urlsplit(self.path).path
        if path.startswith(("/review/", "/__photo-review/")):
            try:
                result = get_review(path)
                if result is None:
                    self.send_error(404)
                else:
                    self.send_bytes(*result)
            except FileNotFoundError:
                self.send_error(503, "The photo library is still being prepared.")
            except ValueError:
                self.send_error(404, "Photo or review page not found.")
            except Exception as error:
                self.log_error("Photo review failed: %s", error)
                self.send_error(500, "The photo could not be loaded.")
            return
        if path == "/__travel_preview_version":
            self.send_bytes(version().encode(), "text/plain; charset=utf-8")
            return
        if path == "/":
            self.send_response(302)
            self.send_header("Location", "/travels/")
            self.end_headers()
            return
        normalized = path.removesuffix("index.html")
        if not normalized.endswith("/"):
            normalized += "/"
        if normalized in PAGES:
            try:
                html = render_page(PAGES[normalized])
                self.send_bytes(html.encode("utf-8"), "text/html; charset=utf-8")
            except Exception as error:
                self.log_error("Travel render failed: %s", error)
                self.send_error(500, "The travel template could not be rendered; see the preview server log.")
            return
        super().do_GET()

    def do_POST(self):
        path = urlsplit(self.path).path
        origin = self.headers.get("Origin")
        if origin and urlsplit(origin).netloc != self.headers.get("Host"):
            self.send_error(403)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 8192:
                raise ValueError("Invalid request length")
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError("Invalid selection")
            state = post_review(path, payload)
            if state is None:
                self.send_error(404)
                return
            self.send_bytes(json.dumps(state).encode(), "application/json")
        except (ValueError, TypeError):
            self.send_error(400, "Invalid photo selection.")
        except OSError as error:
            self.log_error("Could not save photo selection: %s", error)
            self.send_error(500, "Your selection could not be saved. Please try again.")

    def send_bytes(self, content: bytes, content_type: str):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


class LocalPreviewServer(ThreadingHTTPServer):
    # Permit a quick restart after old connections close, but reject a second
    # active listener (Windows otherwise permits this with SO_REUSEADDR).
    allow_reuse_address = True

    def server_bind(self):
        with socket.socket() as probe:
            probe.settimeout(.5)
            if probe.connect_ex(self.server_address) == 0:
                raise OSError(f"A preview is already listening on port {self.server_address[1]}")
        super().server_bind()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4173)
    options = parser.parse_args()
    server = LocalPreviewServer(("127.0.0.1", options.port), PreviewHandler)
    print(f"Travel preview: http://127.0.0.1:{options.port}/travels/scotland-2026/#stop-1", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
