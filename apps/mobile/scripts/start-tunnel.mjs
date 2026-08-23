import { spawn, execSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const METRO_PORT = 8081;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN_DIR = path.join(__dirname, ".bin");
const CF_VERSION = "2026.8.2";
const CF_WIN_URL = `https://github.com/cloudflare/cloudflared/releases/download/${CF_VERSION}/cloudflared-windows-amd64.exe`;

/**
 * Expo's built-in `--tunnel` uses a shared ngrok account that frequently fails
 * with "remote gone away" (rate limits / deprecated agent). This script tunnels
 * Metro through Cloudflare's free quick tunnel instead.
 */

function freeMetroPortIfStale() {
  if (process.platform !== "win32") return;

  try {
    const out = execSync(`netstat -ano -p tcp`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split("\n")) {
      const match = line.match(/^\s*TCP\s+\S*:(\d+)\s+\S+\s+LISTENING\s+(\d+)/i);
      if (match && Number(match[1]) === METRO_PORT) {
        pids.add(match[2]);
      }
    }

    for (const pid of pids) {
      try {
        const info = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
          encoding: "utf8",
        });
        if (!/node\.exe/i.test(info)) continue;
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        console.log(`Freed port ${METRO_PORT} (killed stale node.exe process ${pid}).`);
      } catch {
        // Ignore: process may have exited already, or we lack permission.
      }
    }
  } catch {
    // netstat/tasklist unavailable; fall back to Expo's own port negotiation.
  }
}

function whichAll(cmd) {
  try {
    const out = execSync(
      process.platform === "win32" ? `where.exe ${cmd}` : `command -v ${cmd}`,
      { encoding: "utf8" },
    );
    return out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isRunnableCloudflared(bin) {
  if (!bin || !fs.existsSync(bin)) return false;
  // pnpm/npm shims are shell wrappers — execFileSync cannot run them on Windows.
  if (/node_modules[\\/]\.bin[\\/]/i.test(bin)) return false;
  if (process.platform === "win32" && !/\.exe$/i.test(bin)) return false;
  try {
    execFileSync(bin, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = (u, redirects = 0) => {
      https
        .get(u, (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location &&
            redirects < 5
          ) {
            res.resume();
            get(res.headers.location, redirects + 1);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`Download failed: HTTP ${res.statusCode}`));
            res.resume();
            return;
          }
          res.pipe(file);
          file.on("finish", () => file.close(() => resolve()));
        })
        .on("error", reject);
    };
    get(url);
  });
}

async function resolveCloudflared() {
  const candidates = [
    ...whichAll("cloudflared"),
    ...(process.platform === "win32"
      ? [
          "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe",
          "C:\\Program Files\\cloudflared\\cloudflared.exe",
        ]
      : []),
    path.join(BIN_DIR, process.platform === "win32" ? "cloudflared.exe" : "cloudflared"),
  ];

  for (const candidate of candidates) {
    if (isRunnableCloudflared(candidate)) return candidate;
  }

  if (process.platform !== "win32") {
    console.error("cloudflared not found on PATH.");
    console.error(
      "Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/",
    );
    console.error("Or use LAN: pnpm start (same Wi-Fi / phone hotspot).");
    process.exit(1);
  }

  const local = path.join(BIN_DIR, "cloudflared.exe");
  console.log("cloudflared not found — downloading portable binary...");
  fs.mkdirSync(BIN_DIR, { recursive: true });
  await downloadFile(CF_WIN_URL, local);
  if (!isRunnableCloudflared(local)) {
    console.error(`Downloaded cloudflared but it failed to run: ${local}`);
    process.exit(1);
  }
  console.log(`Saved ${local}`);
  return local;
}

function startCloudflareTunnel(bin) {
  console.log("Starting Cloudflare quick tunnel for Metro...");

  const child = spawn(bin, ["tunnel", "--url", `http://127.0.0.1:${METRO_PORT}`], {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    windowsHide: true,
  });

  let publicUrl = null;
  let settled = false;

  const tryParse = (chunk) => {
    const text = chunk.toString();
    // cloudflared logs progress to stderr; keep it visible but quieter once URL is known
    if (!publicUrl) process.stderr.write(text);
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (match) publicUrl = match[0];
  };

  child.stdout.on("data", tryParse);
  child.stderr.on("data", tryParse);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(
        new Error(
          "Timed out waiting for Cloudflare tunnel URL. Check network / VPN.",
        ),
      );
    }, 60_000);

    const check = () => {
      if (!publicUrl || settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ child, publicUrl });
    };

    child.stdout.on("data", check);
    child.stderr.on("data", check);

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });

    child.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`cloudflared exited early (code ${code})`));
    });
  });
}

freeMetroPortIfStale();

const bin = await resolveCloudflared();
console.log(`Using cloudflared: ${bin}`);

const { child: tunnel, publicUrl } = await startCloudflareTunnel(bin);

process.env.EXPO_PACKAGER_PROXY_URL = publicUrl;
delete process.env.EXPO_UNSTABLE_TUNNEL_V2;

console.log("");
console.log(`Tunnel ready: ${publicUrl}`);
console.log(`Expo Go URL:  exp://${publicUrl.replace(/^https?:\/\//, "")}:443`);
console.log("");

const extraArgs = process.argv.slice(2);
// Ignore stdin: when this script is launched from a non-TTY / background
// shell, stdin EOF makes Expo CLI exit with code 1 after ~1–3 minutes.
const expo = spawn(
  "pnpm",
  ["exec", "expo", "start", "--lan", "--port", String(METRO_PORT), ...extraArgs],
  {
    stdio: ["ignore", "inherit", "inherit"],
    env: process.env,
    shell: true,
    cwd: path.join(__dirname, ".."),
  },
);

let shuttingDown = false;
const shutdown = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    tunnel.kill();
  } catch {
    // ignore
  }
  try {
    expo.kill();
  } catch {
    // ignore
  }
  process.exit(code);
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

tunnel.on("exit", (code) => {
  if (shuttingDown) return;
  console.error(`\ncloudflared exited (code ${code}). Stopping Metro.`);
  shutdown(1);
});

expo.on("exit", (code, signal) => {
  if (shuttingDown) return;
  if (signal) {
    shutdown(1);
    return;
  }
  shutdown(code ?? 1);
});
