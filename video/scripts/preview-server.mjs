import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
  "outputs/promo-video",
);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".json": "application/json",
};
http
  .createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = path.resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      res.writeHead(404).end();
      return;
    }
    if (!stat.isFile()) {
      res.writeHead(404).end();
      return;
    }
    const headers = {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache",
    };
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]),
        end = range[2]
          ? Math.min(Number(range[2]), stat.size - 1)
          : stat.size - 1;
      if (start > end || start >= stat.size) {
        res.writeHead(416, { "Content-Range": `bytes */${stat.size}` }).end();
        return;
      }
      res.writeHead(206, {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Content-Length": end - start + 1,
      });
    const stream = fs.createReadStream(file, { start, end });
    res.once("close", () => stream.destroy());
    stream.pipe(res);
      return;
    }
    res.writeHead(200, { ...headers, "Content-Length": stat.size });
  const stream = fs.createReadStream(file);
  res.once("close", () => stream.destroy());
  stream.pipe(res);
  })
  .listen(3301, "127.0.0.1", () =>
    console.log("Furfolio video review: http://127.0.0.1:3301/"),
  );
