import { useEffect, useState } from 'react';
import { Download, Flag, Printer } from 'lucide-react';
import { GlassDatePicker } from '../../components/GlassDatePicker.tsx';
import { GlassSelect } from '../../components/GlassSelect.tsx';
import { api } from '../../lib/api.ts';
import type { ReportEntry } from '../../shared/types.ts';

interface AdminReportsSectionProps {
  token: string;
  onToast: (type: 'success' | 'error', message: string) => void;
  onAuthError: (err: unknown) => void;
}

export function AdminReportsSection({ token, onToast, onAuthError }: AdminReportsSectionProps) {
  const [reportType, setReportType] = useState<'requests' | 'donations' | 'stock'>('requests');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [abuseReports, setAbuseReports] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  async function loadReports(
    nextType = reportType,
    nextFrom = fromDate,
    nextTo = toDate
  ) {
    setLoading(true);
    try {
      const data = await api.getAdminReportsData(token, {
        type: nextType,
        from: nextFrom || undefined,
        to: nextTo || undefined,
      });
      setRows(data.rows);
      setAbuseReports(data.abuseReports);
    } catch (err) {
      onAuthError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType]);

  async function handleExportCsv() {
    setExporting(true);
    try {
      const blob = await api.exportAdminReportCsv(token, {
        type: reportType,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blood-portal-${reportType}-report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onToast('success', `Exported ${reportType} CSV report.`);
    } catch (err) {
      onToast('error', (err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function handleAbuseAction(id: string, status: 'resolved' | 'dismissed') {
    try {
      await api.moderateAbuseReport(token, id, status);
      onToast('success', `Marked abuse report as ${status}.`);
      await loadReports();
    } catch (err) {
      onToast('error', (err as Error).message);
    }
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6">
      {/* Filter & Export Controls */}
      <div className="no-print rounded-[20px] ios-glass p-4 sm:p-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[230px]">
          <label htmlFor="admin-report-dataset" className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Report Dataset</label>
          <GlassSelect
            id="admin-report-dataset"
            ariaLabel="Report Dataset"
            value={reportType}
            onChange={(val) => setReportType(val as 'requests' | 'donations' | 'stock')}
            options={[
              { value: 'requests', label: 'Blood Requests Report' },
              { value: 'donations', label: 'Donations Report' },
              { value: 'stock', label: 'Blood Stock Inventory Report' },
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">From Date</label>
          <GlassDatePicker
            value={fromDate}
            onChange={setFromDate}
            placeholder="Select date"
            ariaLabel="From Date"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">To Date</label>
          <GlassDatePicker
            value={toDate}
            onChange={setToDate}
            placeholder="Select date"
            ariaLabel="To Date"
          />
        </div>

        <button
          type="button"
          onClick={() => void loadReports()}
          className="min-h-[44px] px-4 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 text-[#1C1917] dark:text-[#F5F2EE] hover:border-[#B3261E]/50 text-sm font-semibold transition-colors"
        >
          Apply Filter
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExportCsv()}
            className="min-h-[44px] px-4 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 text-sm font-semibold inline-flex items-center gap-1.5 hover:border-[#B3261E]/50 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] px-4 rounded-xl bg-[#B3261E] hover:bg-[#961E17] text-white text-sm font-semibold inline-flex items-center gap-1.5 shadow-[0_4px_14px_rgba(179,38,30,0.3)] transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="rounded-[20px] ios-glass p-5 sm:p-6 space-y-3 overflow-x-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold capitalize text-[#1C1917] dark:text-[#F5F2EE]">
            {reportType} Report ({rows.length} record{rows.length === 1 ? '' : 's'})
          </h2>
          {(fromDate || toDate) && (
            <span className="text-xs text-[#57534E] dark:text-[#A8A29E]">
              Range: {fromDate || 'Beginning'} to {toDate || 'Present'}
            </span>
          )}
        </div>

        {loading ? (
          <p className="py-6 text-sm text-[#57534E] dark:text-[#A8A29E]">Generating report...</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-sm text-[#57534E] dark:text-[#A8A29E]">No records found in selected date range.</p>
        ) : (
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E2DDD6] dark:border-white/10 text-left text-xs uppercase text-[#57534E] dark:text-[#A8A29E]">
                {columns.map((col) => (
                  <th key={col} className="py-2.5 pr-4 font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD6] dark:divide-white/10">
              {rows.map((row, idx) => (
                <tr key={String(row.id ?? idx)} className="hover:bg-[#FAF8F6]/60 dark:hover:bg-white/5 transition-colors">
                  {columns.map((col) => (
                    <td key={col} className="py-2.5 pr-4 whitespace-nowrap tabular-nums">
                      {String(row[col] ?? '—').slice(0, 40)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* User-Submitted Abuse Reports Moderation Queue */}
      <div className="no-print rounded-[20px] ios-glass p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" />
          <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Flagged Entries & Abuse Moderation</h2>
        </div>
        {abuseReports.length === 0 ? (
          <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">No abuse reports submitted.</p>
        ) : (
          <div className="divide-y divide-[#E2DDD6] dark:divide-white/10">
            {abuseReports.map((rep) => (
              <div key={rep.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-semibold">
                    {rep.targetSummary} · <span className="text-[#B3261E] dark:text-[#F28B82]">{rep.reason}</span>
                  </div>
                  {rep.details && <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-0.5">{rep.details}</p>}
                  <div className="text-xs text-[#A8A29E] mt-0.5">
                    Status: <span className="uppercase font-semibold">{rep.status}</span> ·{' '}
                    {rep.createdAt.slice(0, 10)}
                  </div>
                </div>
                {rep.status === 'open' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleAbuseAction(rep.id, 'resolved')}
                      className="min-h-[36px] px-3 rounded-xl bg-[#1D6B44] hover:bg-[#165435] text-white text-xs font-semibold transition-colors"
                    >
                      Mark Resolved
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAbuseAction(rep.id, 'dismissed')}
                      className="min-h-[36px] px-3 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/70 dark:bg-[#141210]/70 text-xs font-medium hover:bg-[#F3EFEA] dark:hover:bg-white/10 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
