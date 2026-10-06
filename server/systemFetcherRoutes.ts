import { Router, Request, Response } from 'express';
import { runSystemFetcherScan, SystemFetcherReport } from './systemFetcherEngine.js';

export const systemFetcherRouter = Router();

// In-memory cache for fast dashboard loading
let latestScanReport: SystemFetcherReport | null = null;
let lastScanTime = 0;

type ScanHistoryEntry = Pick<SystemFetcherReport, 'id' | 'scanTimestamp' | 'overallStatus' | 'overallScore' | 'summary' | 'totalDiagnosticsCount'>;
const scanHistory: ScanHistoryEntry[] = [];

const storeScanReport = (report: SystemFetcherReport) => {
  latestScanReport = report;
  lastScanTime = Date.now();
  scanHistory.unshift({
    id: report.id,
    scanTimestamp: report.scanTimestamp,
    overallStatus: report.overallStatus,
    overallScore: report.overallScore,
    summary: report.summary,
    totalDiagnosticsCount: report.totalDiagnosticsCount,
  });
  scanHistory.splice(12);
};

/**
 * GET /api/admin/system-fetcher/scan
 * Runs or returns the latest system fetcher scan.
 */
systemFetcherRouter.get('/scan', async (req: Request, res: Response) => {
  try {
    const forceFresh = req.query.fresh === 'true';
    const now = Date.now();

    // Re-use scan if done within last 10 seconds unless fresh is explicitly requested
    if (!forceFresh && latestScanReport && (now - lastScanTime < 10000)) {
      return res.json({
        success: true,
        cached: true,
        report: latestScanReport,
      });
    }

    const report = await runSystemFetcherScan();
    storeScanReport(report);

    return res.json({
      success: true,
      cached: false,
      report,
    });
  } catch (error: any) {
    console.error('System Fetcher scan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to run System Fetcher scan: ' + (error?.message || 'Unknown error'),
    });
  }
});

/**
 * POST /api/admin/system-fetcher/recheck
 * Forces a fresh re-scan of the complete system.
 */
systemFetcherRouter.post('/recheck', async (_req: Request, res: Response) => {
  try {
    const report = await runSystemFetcherScan();
    storeScanReport(report);

    return res.json({
      success: true,
      message: 'System rechecked successfully.',
      report,
    });
  } catch (error: any) {
    console.error('System Fetcher recheck error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to recheck system: ' + (error?.message || 'Unknown error'),
    });
  }
});

/**
 * GET /api/admin/system-fetcher/history
 * Returns a bounded, safe scan summary history for operator trend awareness.
 */
systemFetcherRouter.get('/history', (_req: Request, res: Response) => {
  return res.json({ success: true, scans: scanHistory });
});

/**
 * GET /api/admin/system-fetcher/export
 * Exports complete markdown or json diagnostic report.
 */
systemFetcherRouter.get('/export', async (req: Request, res: Response) => {
  try {
    const format = req.query.format === 'json' ? 'json' : 'markdown';
    const report = latestScanReport || (await runSystemFetcherScan());
    if (!latestScanReport) storeScanReport(report);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="game-hub-nepal-system-scan-${Date.now()}.json"`);
      return res.send(JSON.stringify(report, null, 2));
    }

    // Markdown formatted report
    let md = `# UNX GAMES SYSTEM FETCHER REPORT\n\n`;
    md += `**Scan ID:** \`${report.id}\`\n`;
    md += `**Scan Timestamp:** ${report.scanTimestamp}\n`;
    md += `**Overall Health:** ${report.overallStatus} (${report.overallScore}% score)\n`;
    md += `**Diagnostics Count:** ${report.totalDiagnosticsCount}\n\n`;

    md += `## 1. Domain Health Summaries\n\n`;
    md += `| Domain | Status | Score | Healthy | Warnings | Errors | Critical |\n`;
    md += `|---|---|---|---|---|---|---|\n`;
    for (const [key, d] of Object.entries(report.domainSummaries)) {
      md += `| ${d.name} | **${d.status}** | ${d.score}% | ${d.healthyCount} | ${d.warningCount} | ${d.errorCount} | ${d.criticalCount} |\n`;
    }

    md += `\n## 2. Granular 15-Report Findings\n\n`;
    for (const [reportKey, findings] of Object.entries(report.reports)) {
      md += `### Report: ${reportKey.toUpperCase()}\n\n`;
      for (const f of findings) {
        md += `#### [${f.severity}] ${f.problem}\n`;
        md += `- **Location:** \`${f.location}\`\n`;
        md += `- **Existing Behavior:** ${f.existingBehavior}\n`;
        md += `- **Expected Behavior:** ${f.expectedBehavior}\n`;
        md += `- **Recommended Fix:** ${f.recommendedFix}\n`;
        md += `- **Impact:** DB (${f.dbChangeRequired ? 'YES' : 'NO'}), Frontend (${f.frontendChangeRequired ? 'YES' : 'NO'}), Backend (${f.backendChangeRequired ? 'YES' : 'NO'})\n\n`;
      }
    }

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="game-hub-nepal-system-report-${Date.now()}.md"`);
    return res.send(md);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Export failed: ' + error?.message });
  }
});
