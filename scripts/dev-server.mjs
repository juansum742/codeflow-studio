import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 4173);

const contentTypes = new Map([
  [".html", "text/html; charset=UTF-8"],
  [".css", "text/css; charset=UTF-8"],
  [".js", "application/javascript; charset=UTF-8"],
  [".json", "application/json; charset=UTF-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=UTF-8"]
]);

const safeJoin = (requestPath) => {
  const normalizedPath = decodeURIComponent(requestPath.split("?")[0]).replace(/^\/+/, "");
  const resolvedPath = path.resolve(rootDir, normalizedPath || "index.html");

  if (!resolvedPath.startsWith(rootDir)) {
    throw new Error("Forbidden");
  }

  return resolvedPath;
};

const resolveFilePath = async (requestPath) => {
  const requested = safeJoin(requestPath);

  try {
    const requestedStats = await stat(requested);
    if (requestedStats.isDirectory()) {
      return path.join(requested, "index.html");
    }

    return requested;
  } catch {
    if (!path.extname(requested)) {
      return path.join(requested, "index.html");
    }

    return requested;
  }
};

const server = http.createServer(async (request, response) => {
  try {
    const filePath = await resolveFilePath(request.url || "/");
    await access(filePath);

    response.writeHead(200, {
      "Content-Type": contentTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream",
      "Cache-Control": "no-store"
    });

    createReadStream(filePath).pipe(response);
  } catch (error) {
    const statusCode = error.message === "Forbidden" ? 403 : 404;
    response.writeHead(statusCode, {
      "Content-Type": "text/plain; charset=UTF-8"
    });
    response.end(statusCode === 403 ? "Forbidden" : "Not found");
  }
});

server.listen(port, host, () => {
  console.log(`CodeFlow Studio local server running at http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
});
