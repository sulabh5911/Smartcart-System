import React from 'react';

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = 'emerald',
  subtitle
}) {
  const colorMap = {
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      pill: 'text-emerald-600'
    },
    blue: {
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      pill: 'text-blue-600'
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      pill: 'text-amber-600'
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
      pill: 'text-rose-600'
    }
  };

  const scheme = colorMap[color] || colorMap.emerald;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium text-slate-500">{title}</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{value}</div>
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${scheme.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(trendLabel || subtitle) && (
        <div className={`mt-3 text-xs font-semibold flex items-center gap-1 ${scheme.pill}`}>
          {trendLabel || subtitle}
        </div>
      )}
    </div>
  );
}
