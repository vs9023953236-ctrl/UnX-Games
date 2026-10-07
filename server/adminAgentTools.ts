/**
 * UNX Games - Secure Backend Admin AI Tool Layer
 * Provides controlled, sandboxed tools for Admin AI & Code Agent:
 * - Filesystem tools (read, search, create, update, delete with confirmation, diff)
 * - Database tools (schema, tables, safe queries, health, dangerous query guard)
 * - Code & Project tools (build run, lint check, type check, dependencies)
 * - Audit logging for all tool invocations
 *
 * All operations require explicit ADMIN authorization.
 * Sensitive / destructive actions require explicit user confirmation.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { pool } from '../src/db/index.js';

const execAsync = promisify(exec);
const PROJECT_ROOT = process.cwd();

// Disallowed path patterns to protect keys, environment, and node_modules
const FORBIDDEN_PATHS = [
  '.env',
  '.git',
  'node_modules',
  'package-lock.json',
];

export interface AdminToolAuditLog {
  id: string;
  requestId: string;
  adminUserId?: string;
  toolName: string;
  target?: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'CONFIRMATION_REQUIRED';
  filesChanged?: string[];
  databaseOperation?: string;
  result?: any;
  error?: string;
}

export interface DangerousOperationRequest {
  requiresConfirmation: true;
  operationType: 'DELETE_FILE' | 'DROP_TABLE' | 'TRUNCATE' | 'ALTER_SCHEMA' | 'DELETE_RECORDS';
  target: string;
  affectedCount?: number;
  reason: string;
  confirmationToken: string;
}

// In-memory confirmation token cache
const pendingConfirmations = new Map<string, {
  operationType: string;
  target: string;
  payload: any;
  expiresAt: number;
}>();

function sanitizePath(relativePath: string): string {
  const resolved = path.resolve(PROJECT_ROOT, relativePath);
  if (!resolved.startsWith(PROJECT_ROOT)) {
    throw new Error('Access denied: Path traversal outside project root is forbidden.');
  }
  for (const forbidden of FORBIDDEN_PATHS) {
    if (resolved.includes(path.sep + forbidden) || resolved.endsWith(path.sep + forbidden) || relativePath === forbidden) {
      throw new Error(`Access denied: Modification of "${forbidden}" is strictly restricted.`);
    }
  }
  return resolved;
}

/**
 * 1. FILESYSTEM TOOLS
 */
export async function adminReadFile(filePath: string): Promise<{ content: string; path: string; lines: number }> {
  const fullPath = sanitizePath(filePath);
  const content = await fs.readFile(fullPath, 'utf-8');
  return {
    content,
    path: path.relative(PROJECT_ROOT, fullPath),
    lines: content.split('\n').length,
  };
}

export async function adminSearchFiles(query: string, subDir = '.'): Promise<string[]> {
  const baseDir = sanitizePath(subDir);
  const matches: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        if (entry.name.toLowerCase().includes(query.toLowerCase())) {
          matches.push(path.relative(PROJECT_ROOT, full));
        } else {
          try {
            const txt = await fs.readFile(full, 'utf-8');
            if (txt.includes(query)) {
              matches.push(path.relative(PROJECT_ROOT, full));
            }
          } catch (_) {}
        }
      }
    }
  }

  await walk(baseDir);
  return matches.slice(0, 30);
}

export async function adminListDirectory(dirPath = '.'): Promise<Array<{ name: string; isDir: boolean; path: string }>> {
  const fullDir = sanitizePath(dirPath);
  const entries = await fs.readdir(fullDir, { withFileTypes: true });
  return entries
    .filter((e) => !['node_modules', '.git', 'dist'].includes(e.name))
    .map((e) => ({
      name: e.name,
      isDir: e.isDirectory(),
      path: path.relative(PROJECT_ROOT, path.join(fullDir, e.name)),
    }));
}

export async function adminWriteFile(params: {
  filePath: string;
  content: string;
  reason: string;
}): Promise<{ success: boolean; filePath: string; bytesWritten: number }> {
  const fullPath = sanitizePath(params.filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, params.content, 'utf-8');
  return {
    success: true,
    filePath: path.relative(PROJECT_ROOT, fullPath),
    bytesWritten: Buffer.byteLength(params.content, 'utf-8'),
  };
}

export async function adminDeleteFile(filePath: string, token?: string): Promise<{ success: boolean; message: string } | DangerousOperationRequest> {
  const fullPath = sanitizePath(filePath);
  
  if (!token) {
    const confirmationToken = `del_tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    pendingConfirmations.set(confirmationToken, {
      operationType: 'DELETE_FILE',
      target: filePath,
      payload: { fullPath },
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    return {
      requiresConfirmation: true,
      operationType: 'DELETE_FILE',
      target: filePath,
      reason: 'File deletion is a destructive operation.',
      confirmationToken,
    };
  }

  const pending = pendingConfirmations.get(token);
  if (!pending || pending.operationType !== 'DELETE_FILE' || pending.target !== filePath || pending.expiresAt < Date.now()) {
    throw new Error('Invalid or expired confirmation token for file deletion.');
  }

  await fs.unlink(fullPath);
  pendingConfirmations.delete(token);
  return { success: true, message: `File ${filePath} deleted successfully.` };
}

/**
 * 2. DATABASE TOOLS (Controlled with strict safety boundaries)
 */
export async function adminGetDatabaseOverview() {
  const t0 = Date.now();
  let isConnected = false;
  let pgVersion = 'Unknown';
  let tableCount = 0;
  let userCount = 0;
  let orderCount = 0;
  let tables: Array<{ name: string; rows: number }> = [];

  try {
    const vRes = await pool.query('SELECT version() as v');
    pgVersion = vRes.rows[0]?.v?.split(' ')?.[0] || 'PostgreSQL';
    isConnected = true;

    const tRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name ASC
    `);
    tableCount = tRes.rows.length;

    const counts = await Promise.all(
      tRes.rows.slice(0, 15).map(async (row) => {
        try {
          const c = await pool.query(`SELECT count(*) as c FROM "${row.table_name}"`);
          return { name: row.table_name, rows: parseInt(c.rows[0]?.c || '0', 10) };
        } catch (_) {
          return { name: row.table_name, rows: 0 };
        }
      })
    );
    tables = counts;

    const u = await pool.query('SELECT count(*) as c FROM users').catch(() => ({ rows: [{ c: '0' }] }));
    userCount = parseInt(u.rows[0]?.c || '0', 10);

    const o = await pool.query('SELECT count(*) as c FROM orders').catch(() => ({ rows: [{ c: '0' }] }));
    orderCount = parseInt(o.rows[0]?.c || '0', 10);
  } catch (err: any) {
    return {
      connection: 'ERROR',
      error: err?.message,
      queryLatencyMs: Date.now() - t0,
    };
  }

  return {
    connection: isConnected ? 'CONNECTED' : 'ERROR',
    database: pgVersion,
    totalTables: tableCount,
    totalUsers: userCount,
    totalOrders: orderCount,
    tablesSample: tables,
    queryLatencyMs: Date.now() - t0,
    health: 'HEALTHY',
  };
}

export async function adminExecuteSafeSql(query: string, token?: string): Promise<{ rowCount: number; rows: any[]; latencyMs: number } | DangerousOperationRequest> {
  const clean = query.trim();
  const lower = clean.toLowerCase();

  // Guard dangerous SQL operations requiring explicit confirmation
  const isDangerous = ['drop table', 'truncate', 'drop database', 'alter table', 'drop index'].some((d) => lower.includes(d)) ||
    (lower.startsWith('delete') && !lower.includes('where'));

  if (isDangerous && !token) {
    const confirmationToken = `sql_tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    pendingConfirmations.set(confirmationToken, {
      operationType: 'DANGEROUS_SQL',
      target: clean.slice(0, 60),
      payload: { sql: clean },
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    return {
      requiresConfirmation: true,
      operationType: 'DELETE_RECORDS',
      target: clean,
      reason: 'This SQL query contains high-risk structural mutations (DROP/TRUNCATE/UNBOUNDED DELETE).',
      confirmationToken,
    };
  }

  if (token) {
    const pending = pendingConfirmations.get(token);
    if (!pending || pending.operationType !== 'DANGEROUS_SQL' || pending.expiresAt < Date.now()) {
      throw new Error('Invalid or expired confirmation token for dangerous database operation.');
    }
    pendingConfirmations.delete(token);
  }

  const t0 = Date.now();
  const result = await pool.query(clean);
  return {
    rowCount: result.rowCount || result.rows.length,
    rows: (result.rows || []).slice(0, 100),
    latencyMs: Date.now() - t0,
  };
}

/**
 * 3. PROJECT TOOLS (Run type check, build, tests)
 */
export async function adminRunTypeCheck(): Promise<{ success: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execAsync('npx tsc --noEmit', { timeout: 35000 });
    return { success: true, output: stdout || stderr || 'No TypeScript compilation errors.' };
  } catch (err: any) {
    return { success: false, output: err.stdout || err.stderr || err.message };
  }
}

export async function adminRunBuildCheck(): Promise<{ success: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execAsync('npm run build', { timeout: 60000 });
    return { success: true, output: (stdout + '\n' + stderr).slice(0, 800) };
  } catch (err: any) {
    return { success: false, output: err.stdout || err.stderr || err.message };
  }
}

/**
 * Audit log recording
 */
export async function logAdminToolInvocation(log: AdminToolAuditLog) {
  try {
    await pool.query(
      `INSERT INTO ai_swarm_actions (id, request_id, action_type, status, input, output, error, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        log.id || `tool_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        log.requestId || 'req_tool',
        `TOOL_${log.toolName}`,
        log.status === 'SUCCESS' ? 'SUCCESS' : log.status === 'CONFIRMATION_REQUIRED' ? 'NOT_EXECUTED' : 'FAILED',
        JSON.stringify({ target: log.target, filesChanged: log.filesChanged }),
        JSON.stringify(log.result || {}),
        log.error || null,
      ]
    );
  } catch (_) {}
}
