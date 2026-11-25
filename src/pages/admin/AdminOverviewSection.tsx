import { AlertTriangle, Building2, ClipboardList, Droplets, ShieldAlert, Users } from 'lucide-react';
import { Perspective3DCard, SmoothReveal, SmoothRow } from '../../components/SmoothSection.tsx';
import { BLOOD_GROUPS, type AdminOverviewPayload } from '../../shared/types.ts';

interface AdminOverviewSectionProps {
  overview: AdminOverviewPayload;
  onNavigateSection: (section: string) => void;
}

export function AdminOverviewSection({ overview, onNavigateSection }: AdminOverviewSectionProps) {
  const { summary, stockByGroup, lowStockAlerts, expiredOrExpiringStock, recentRequests, recentDonations, cityHeatmap } =
    overview;

  const maxStockUnits = Math.max(10, ...stockByGroup.map((s) => s.units));

  const cards = [
    {
      label: 'Total Donors',
      value: summary.totalDonors,
      sub: 'Registered donor profiles',
      icon: Users,
      section: 'users',
    },
    {
      label: 'Recipients & Banks',
      value: summary.totalRecipients + summary.totalHospitals,
      sub: `${summary.totalRecipients} recipients · ${summary.totalHospitals} hospitals`,
      icon: Building2,
      section: 'users',
    },
    {
      label: 'Blood Requests',
      value: summary.totalRequests,
      sub: `${summary.openAbuseReports} open abuse report(s)`,
      icon: ClipboardList,
      section: 'requests',
    },
    {
      label: 'Pending Approvals',
      value: summary.pendingApprovals,
      sub: 'Unverified donors, requests & banks',
      icon: ShieldAlert,
      highlight: summary.pendingApprovals > 0,
      section: 'requests',
    },
    {
      label: 'Total Units Available',
      value: summary.totalUnitsAvailable,
      sub: `${lowStockAlerts.length} blood group(s) in low stock`,
      icon: Droplets,
      section: 'stock',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <SmoothRow key={card.label} index={idx}>
              <Perspective3DCard tiltStrength={3.2} animateEntrance={false} className="rounded-[20px] ios-glass">
                <button
                  type="button"
                  onClick={() => onNavigateSection(card.section)}
                  className="w-full text-left p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#57534E] dark:text-[#A8A29E]">{card.label}</span>
                    <Icon
                      className={`h-4 w-4 ${card.highlight ? 'text-[#B3261E] dark:text-[#F28B82]' : 'text-[#57534E] dark:text-[#A8A29E]'}`}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-2 text-2xl font-bold tabular-nums text-[#1C1917] dark:text-[#F5F2EE]">
                    {card.value}
                  </div>
                  <p className="mt-1 text-xs text-[#57534E] dark:text-[#A8A29E] truncate">{card.sub}</p>
                </button>
              </Perspective3DCard>
            </SmoothRow>
          );
        })}
      </div>

      {/* Stock Chart + Low Stock & Expiry Alerts */}
      <SmoothReveal>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Perspective3DCard tiltStrength={1.8} animateEntrance={false} className="lg:col-span-2 rounded-[22px] ios-glass p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                Blood Stock by Group (Unexpired Units)
              </h2>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                Groups at or below 3 units are flagged as low stock.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('stock')}
              className="text-xs font-semibold text-[#B3261E] dark:text-[#F28B82] hover:underline"
            >
              Manage Stock
            </button>
          </div>

          <div className="grid grid-cols-8 gap-2 sm:gap-3 items-end h-48 pt-4 border-b border-[#E2DDD6] dark:border-white/10 pb-2">
            {stockByGroup.map((item) => {
              const pct = Math.max(6, Math.round((item.units / maxStockUnits) * 100));
              return (
                <div key={item.bloodGroup} className="flex flex-col items-center justify-end h-full gap-1.5">
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      item.lowStock
                        ? 'text-[#B3261E] dark:text-[#F28B82]'
                        : 'text-[#1C1917] dark:text-[#F5F2EE]'
                    }`}
                  >
                    {item.units}
                  </span>
                  <div className="w-full max-w-[42px] flex-1 flex items-end">
                    <div
                      style={{ height: `${pct}%` }}
                      className={`w-full rounded-t-md transition-all ${
                        item.lowStock
                          ? 'bg-[#B3261E] dark:bg-[#E05249]'
                          : 'bg-[#1D6B44] dark:bg-[#38A169]'
                      }`}
                      title={`${item.bloodGroup}: ${item.units} units`}
                    />
                  </div>
                  <span className="text-xs font-bold text-[#1C1917] dark:text-[#F5F2EE]">
                    {item.bloodGroup}
                  </span>
                </div>
              );
            })}
          </div>
        </Perspective3DCard>

        <Perspective3DCard tiltStrength={2.2} animateEntrance={false} className="rounded-[22px] ios-glass p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
              Low-Stock & Expiry Alerts
            </h2>
          </div>

          {lowStockAlerts.length === 0 && expiredOrExpiringStock.length === 0 ? (
            <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">
              All 8 blood groups are adequately stocked with no expired batches.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {lowStockAlerts.map((alert) => (
                <div
                  key={alert.bloodGroup}
                  className="rounded-xl border border-[#E6B8B5] bg-[#FBEAE8] dark:border-[#6A2B27] dark:bg-[#3A1513]/85 px-3 py-2 text-xs"
                >
                  <span className="font-bold text-[#8E1B15] dark:text-[#F28B82]">{alert.bloodGroup}:</span>{' '}
                  <span className="text-[#1C1917] dark:text-[#F5F2EE]">{alert.reason}</span>
                </div>
              ))}
              {expiredOrExpiringStock.map((batch) => (
                <div
                  key={batch.id}
                  className="rounded-xl border border-[#E6D1A6] bg-[#FDF7E8] dark:border-[#614D22] dark:bg-[#2C2412]/85 px-3 py-2 text-xs"
                >
                  <div className="font-semibold text-[#7A4B00] dark:text-[#F6C86E]">
                    {batch.bloodGroup} ({batch.component}) · {batch.isExpired ? 'EXPIRED' : 'Expiring Soon'}
                  </div>
                  <div className="text-[#57534E] dark:text-[#D6CFC7]">
                    {batch.location}, {batch.city} · Expiry: {batch.expiryDate}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Perspective3DCard>
      </div>
      </SmoothReveal>

      {/* Recent Requests & Recent Donations */}
      <SmoothReveal delay={0.05}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Perspective3DCard tiltStrength={1.8} animateEntrance={false} className="rounded-[22px] ios-glass p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Recent Blood Requests</h2>
            <button
              type="button"
              onClick={() => onNavigateSection('requests')}
              className="text-xs font-semibold text-[#B3261E] dark:text-[#F28B82] hover:underline"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-[#E2DDD6] dark:divide-white/10">
            {recentRequests.map((r) => (
              <div key={r.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-[#1C1917] dark:text-[#F5F2EE] truncate">
                    <span className="font-bold text-[#B3261E] dark:text-[#F28B82]">{r.bloodGroup}</span> ·{' '}
                    {r.units} unit(s) · {r.hospital}
                  </div>
                  <div className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                    {r.city} · Urgency: {r.urgency} · Approval: {r.approvalStatus ?? 'pending'}
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-[#57534E] dark:text-[#A8A29E] shrink-0">
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </Perspective3DCard>

        <Perspective3DCard tiltStrength={1.8} animateEntrance={false} className="rounded-[22px] ios-glass p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Recent Donations</h2>
            <button
              type="button"
              onClick={() => onNavigateSection('donations')}
              className="text-xs font-semibold text-[#B3261E] dark:text-[#F28B82] hover:underline"
            >
              Manage donations
            </button>
          </div>
          <div className="divide-y divide-[#E2DDD6] dark:divide-white/10">
            {recentDonations.map((d) => (
              <div key={d.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-[#1C1917] dark:text-[#F5F2EE] truncate">
                    {d.donorName} (<span className="font-semibold">{d.donorBloodGroup}</span>)
                  </div>
                  <div className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                    {d.location} · {d.donatedAt} · {d.units} unit(s)
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-[#57534E] dark:text-[#A8A29E] shrink-0">
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </Perspective3DCard>
      </div>
      </SmoothReveal>

      {/* City Availability Heatmap */}
      <SmoothReveal delay={0.08}>
      <Perspective3DCard tiltStrength={1.4} animateEntrance={false} className="rounded-[22px] ios-glass p-5 space-y-3 overflow-x-auto">
        <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
          Active Search-Eligible Donors by City & Group
        </h2>
        <table className="w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#E2DDD6] dark:border-white/10 text-[#57534E] dark:text-[#A8A29E]">
              <th className="py-2 pr-3 text-left font-semibold">City</th>
              {BLOOD_GROUPS.map((bg) => (
                <th key={bg} className="py-2 px-2 text-center font-semibold">
                  {bg}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2DDD6] dark:divide-white/10">
            {cityHeatmap.map((row) => (
              <tr key={row.city}>
                <td className="py-2 pr-3 font-medium text-[#1C1917] dark:text-[#F5F2EE]">{row.city}</td>
                {BLOOD_GROUPS.map((bg) => {
                  const val = row.counts[bg] ?? 0;
                  return (
                    <td key={bg} className="py-2 px-2 text-center tabular-nums">
                      <span
                        className={`inline-block min-w-[26px] py-0.5 rounded-lg text-xs font-semibold ${
                          val === 0
                            ? 'text-[#A8A29E]'
                            : val <= 1
                              ? 'bg-[#FBEAE8] text-[#B3261E] dark:bg-[#3A1513] dark:text-[#F28B82]'
                              : 'bg-[#ECF8F1] text-[#155E3A] dark:bg-[#10291C] dark:text-[#7CE0A9]'
                        }`}
                      >
                        {val}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Perspective3DCard>
      </SmoothReveal>
    </div>
  );
}
