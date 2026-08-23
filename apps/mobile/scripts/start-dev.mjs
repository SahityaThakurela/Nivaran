import { networkInterfaces } from "node:os";
import { spawn, execSync } from "node:child_process";

const METRO_PORT = 8081;

/**
 * Metro silently falls back to 8082, 8083, ... when 8081 is occupied.
 * That's almost always a stale/orphaned node process from a previous
 * `pnpm start` that crashed or was closed without releasing the port
 * (common on Windows). Left unchecked, Expo Go ends up pointed at a
 * port the Windows Firewall rule (see fix-windows-network.ps1) never
 * opened, which surfaces as "Failed to download remote update" on the
 * phone. Proactively free the port before starting so the dev server
 * always binds to the well-known port.
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
        const info = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: "utf8" });
        if (!/node\.exe/i.test(info)) continue; // don't touch anything that isn't our own tooling
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

function pickLanIpv4() {
  const nets = networkInterfaces();
  const preferred = [];
  const fallback = [];

  for (const [name, entries] of Object.entries(nets)) {
    for (const net of entries ?? []) {
      const family = String(net.family);
      if (family !== "IPv4" && family !== "4") continue;
      if (net.internal) continue;
      if (net.address.startsWith("169.254.")) continue;

      const row = { name, address: net.address };
      if (/wi-?fi|wireless|wlan/i.test(name)) preferred.push(row);
      else fallback.push(row);
    }
  }

  return preferred[0]?.address ?? fallback[0]?.address ?? null;
}

freeMetroPortIfStale();

const lanIp = pickLanIpv4();
if (lanIp) {
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = lanIp;
  console.log(`Using LAN host: ${lanIp}`);
  console.log(`Expo Go URL:   exp://${lanIp}:${METRO_PORT}`);
  console.log("");
  console.log("If Expo Go shows 'Failed to download remote update':");
  console.log("  1. Campus/public Wi-Fi often blocks phone↔PC. Use your phone hotspot.");
  console.log("  2. Connect this PC to the hotspot, restart pnpm start, open the new URL.");
  console.log("  3. Or run scripts/fix-windows-network.ps1 as Administrator.");
  console.log("");
} else {
  console.warn("No LAN IPv4 found; Expo will auto-detect (may be wrong).");
}

const extraArgs = process.argv.slice(2);
const child = spawn(
  "pnpm",
  ["exec", "expo", "start", "--lan", ...extraArgs],
  {
    stdio: "inherit",
    env: process.env,
    shell: true,
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
