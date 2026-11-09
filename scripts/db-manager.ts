import net from 'net';
import fs from 'fs';
import cp from 'child_process';
import path from 'path';

/**
 * Known paths for MySQL/MariaDB binaries on Windows, Linux, and macOS.
 */
const COMMON_MYSQL_PATHS = [
  // XAMPP Windows
  'C:\\xampp\\mysql\\bin\\mysqld.exe',
  'D:\\xampp\\mysql\\bin\\mysqld.exe',
  // Standard Windows installations
  'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqld.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqld.exe',
  'C:\\Program Files\\MariaDB 10.4\\bin\\mysqld.exe',
  'C:\\Program Files\\MariaDB 10.5\\bin\\mysqld.exe',
  'C:\\Program Files\\MariaDB 10.11\\bin\\mysqld.exe',
  // Linux / macOS
  '/usr/local/mysql/bin/mysqld',
  '/usr/bin/mysqld',
  '/usr/sbin/mysqld',
];

const COMMON_MYSQLADMIN_PATHS = [
  'C:\\xampp\\mysql\\bin\\mysqladmin.exe',
  'D:\\xampp\\mysql\\bin\\mysqladmin.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqladmin.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqladmin.exe',
  '/usr/local/mysql/bin/mysqladmin',
  '/usr/bin/mysqladmin',
];

/**
 * Checks if a TCP port is open and accepting connections.
 */
export function isPortListening(port = 3306, host = '127.0.0.1', timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/**
 * Locates the first existing MySQL/MariaDB server executable on the filesystem.
 */
export function findMysqlExecutable(): string | null {
  for (const p of COMMON_MYSQL_PATHS) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Locates the mysqladmin executable.
 */
export function findMysqlAdminExecutable(): string | null {
  for (const p of COMMON_MYSQLADMIN_PATHS) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Automatically ensures MySQL is running on localhost:3306.
 * If not running, attempts to start it from local XAMPP/MySQL binaries.
 * Returns true if MySQL is running and accepting connections.
 */
export async function ensureMysqlRunning(verbose = true): Promise<boolean> {
  // 1. Check if port 3306 is already responding
  if (await isPortListening(3306)) {
    if (verbose) {
      console.log('[DB-MANAGER] MySQL server is already running on port 3306.');
    }
    return true;
  }

  // 2. Locate local binary
  const binaryPath = findMysqlExecutable();
  if (!binaryPath) {
    if (verbose) {
      console.warn('[DB-MANAGER] MySQL is not running on port 3306 and no local MySQL binary was found.');
      console.warn('[DB-MANAGER] Please start MySQL manually (e.g. via XAMPP Control Panel).');
    }
    return false;
  }

  if (verbose) {
    console.log(`[DB-MANAGER] MySQL not detected on port 3306. Auto-starting from ${binaryPath}...`);
  }

  // 3. Prepare startup arguments
  const isXampp = binaryPath.toLowerCase().includes('xampp');
  const dir = path.dirname(binaryPath);
  const iniPath = path.join(dir, 'my.ini');

  let args: string[] = ['--standalone'];
  if (isXampp && fs.existsSync(iniPath)) {
    args = [`--defaults-file=${iniPath}`, '--standalone'];
  }

  try {
    const child = cp.spawn(binaryPath, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
  } catch (err: any) {
    if (verbose) {
      console.error(`[DB-MANAGER] Failed to spawn mysqld: ${err.message}`);
    }
    return false;
  }

  // 4. Poll until port 3306 is open (up to 10 seconds)
  const maxAttempts = 25;
  const pollIntervalMs = 400;

  for (let i = 1; i <= maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    if (await isPortListening(3306)) {
      if (verbose) {
        console.log(`[DB-MANAGER] MySQL server successfully started and accepting connections on port 3306.`);
      }
      return true;
    }
  }

  if (verbose) {
    console.warn('[DB-MANAGER] Timed out waiting for MySQL server to start on port 3306.');
  }
  return false;
}

/**
 * Stops the running MySQL instance if mysqladmin is available.
 */
export async function stopMysql(): Promise<boolean> {
  if (!(await isPortListening(3306))) {
    console.log('[DB-MANAGER] MySQL is not currently running.');
    return true;
  }

  const adminPath = findMysqlAdminExecutable();
  if (!adminPath) {
    console.warn('[DB-MANAGER] mysqladmin not found. Please stop MySQL from XAMPP Control Panel.');
    return false;
  }

  console.log('[DB-MANAGER] Stopping MySQL server...');
  try {
    cp.execSync(`"${adminPath}" -u root shutdown`, { stdio: 'inherit' });
    console.log('[DB-MANAGER] MySQL server stopped.');
    return true;
  } catch (err: any) {
    console.error('[DB-MANAGER] Error stopping MySQL:', err.message);
    return false;
  }
}

// CLI handler if executed directly
if (require.main === module || process.argv[1]?.includes('db-manager')) {
  const command = process.argv[2] || 'ensure';

  (async () => {
    switch (command) {
      case 'start':
      case 'ensure': {
        const ok = await ensureMysqlRunning(true);
        process.exit(ok ? 0 : 1);
        break;
      }
      case 'stop': {
        const ok = await stopMysql();
        process.exit(ok ? 0 : 1);
        break;
      }
      case 'status': {
        const running = await isPortListening(3306);
        console.log(`[DB-MANAGER] MySQL port 3306 status: ${running ? 'ONLINE' : 'OFFLINE'}`);
        process.exit(running ? 0 : 1);
        break;
      }
      default:
        console.log('Usage: tsx scripts/db-manager.ts [start|ensure|stop|status]');
        process.exit(1);
    }
  })();
}

