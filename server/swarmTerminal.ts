/**
 * UNX Games - Swarm Terminal Logger
 * Stores and sanitizes real execution logs.
 * Strictly prevents exposure of secrets, tokens, keys, passwords.
 */

export interface TerminalLogEntry {
  id: string;
  requestId: string;
  timestamp: string;
  timeString: string;
  stage: 'REQUEST_CREATED' | 'SWARM_STARTED' | 'MODEL_RESPONSE' | 'MODEL_TIMEOUT' | 'MODEL_ERROR' | 'SYNTHESIS_STARTED' | 'SYNTHESIS_FINISHED' | 'RESPONSE_SENT' | 'ACTION_STARTED' | 'ACTION_FINISHED';
  model?: string;
  message: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
}

const terminalLogsBuffer: TerminalLogEntry[] = [];
const MAX_LOGS = 250;

function sanitizeLogMessage(msg: string): string {
  if (!msg) return '';
  return msg
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]')
    .replace(/(apiKey[=:\s]+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]')
    .replace(/(sk-[A-Za-z0-9._-]+)/gi, '[REDACTED_KEY]')
    .replace(/(AIza[A-Za-z0-9_-]+)/gi, '[REDACTED_KEY]')
    .replace(/(password[=:\s]+)[^\s&,]+/gi, '$1[REDACTED]')
    .replace(/(token[=:\s]+)[^\s&,]+/gi, '$1[REDACTED]');
}

export function logTerminalEvent(entry: Omit<TerminalLogEntry, 'id' | 'timestamp' | 'timeString'>): TerminalLogEntry {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  const record: TerminalLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    requestId: entry.requestId,
    timestamp: now.toISOString(),
    timeString,
    stage: entry.stage,
    model: entry.model,
    message: sanitizeLogMessage(entry.message),
    level: entry.level,
  };

  terminalLogsBuffer.push(record);
  if (terminalLogsBuffer.length > MAX_LOGS) {
    terminalLogsBuffer.shift();
  }

  return record;
}

export function getTerminalLogs(limit = 100): TerminalLogEntry[] {
  return terminalLogsBuffer.slice(-limit);
}

export function clearTerminalLogs(): void {
  terminalLogsBuffer.length = 0;
}
