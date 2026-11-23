import React from 'react';
import { ZONES } from '../services/mockData';

const ST = {
  ok: 'Khỏe mạnh',
  warn: 'Cần theo dõi',
  bad: 'Có vấn đề',
};

export function Honeycomb({ hives, filterZone, onSelectHive, matchesFilter }) {
  const matchingCount = hives.filter((h) => (matchesFilter ? matchesFilter(h) : true)).length;

  if (matchingCount === 0) {
    return <div className="empty">Không có thùng nào khớp bộ lọc.</div>;
  }

  const zonesToDisplay = ZONES.filter(
    (z) => filterZone === 'all' || z === filterZone
  );

  return (
    <div>
      {zonesToDisplay.map((z) => {
        const zoneHives = hives.filter((h) => h.zone === z);
        const problems = zoneHives.filter((h) => h.status !== 'ok').length;

        const rows = [];
        for (let i = 0; i < zoneHives.length; i += 6) {
          const slice = zoneHives.slice(i, i + 6);
          const isOdd = Math.floor(i / 6) % 2 === 1;
          rows.push(
            <div key={i} className={`hexrow ${isOdd ? 'odd' : ''}`}>
              {slice.map((h) => {
                const match = matchesFilter ? matchesFilter(h) : true;
                const statusClass = h.status === 'watch' ? 'warn' : h.status;
                return (
                  <button
                    key={h.n || h.id}
                    className={`hex ${statusClass} ${!match ? 'dim' : ''}`}
                    onClick={() => onSelectHive(h)}
                    title={`${h.id || h.code} · ${h.t}°C · ${h.h}%`}
                    aria-label={`${h.id || h.code}, khu ${h.zone}, ${h.t} độ C, ${ST[statusClass] || ''}`}
                  >
                    {String(h.n).padStart(3, '0')}
                  </button>
                );
              })}
            </div>
          );
        }

        return (
          <div key={z} className="zone">
            <div className="zone-h">
              Khu {z}
              <span>
                {zoneHives.length} thùng
                {problems > 0 ? ` · ${problems} cần xem` : ''}
              </span>
            </div>
            <div className="mx">{rows}</div>
          </div>
        );
      })}
    </div>
  );
}
