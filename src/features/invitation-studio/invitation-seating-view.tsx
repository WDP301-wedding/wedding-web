import type { InvitationSeating } from './print-purchase-api';
export function InvitationSeatingView({ tables }: Readonly<{ tables: InvitationSeating }>) {
  if (!tables.length) return null;
  const bounds = tables.map((t) => {
    const r = (t.rotationDegrees * Math.PI) / 180;
    const w = Math.abs(Math.cos(r)) * t.width + Math.abs(Math.sin(r)) * t.height,
      h = Math.abs(Math.sin(r)) * t.width + Math.abs(Math.cos(r)) * t.height;
    return { x: t.x + t.width / 2, y: t.y + t.height / 2, w, h };
  });
  const minX = Math.min(...bounds.map((b) => b.x - b.w / 2)),
    minY = Math.min(...bounds.map((b) => b.y - b.h / 2));
  const width = Math.max(...bounds.map((b) => b.x + b.w / 2)) - minX,
    height = Math.max(...bounds.map((b) => b.y + b.h / 2)) - minY;
  const margin = Math.max(width, height) * 0.04;
  const fontSize = Math.min(...tables.map((t) => Math.min(t.width, t.height))) / 5;
  const groups = [...new Set(tables.flatMap((t) => (t.guestGroupName ? [t.guestGroupName] : [])))];
  return (
    <section aria-label="Sơ đồ bàn theo nhóm">
      <h3>Sơ đồ bàn</h3>
      <svg
        role="img"
        aria-label="Vị trí và tên bàn"
        viewBox={`${minX - margin} ${minY - margin} ${width + margin * 2} ${height + margin * 2}`}
        width="100%"
      >
        {tables.map((t, i) => (
          <g key={t.tableLabel + i}>
            <g
              transform={`rotate(${t.rotationDegrees} ${t.x + t.width / 2} ${t.y + t.height / 2})`}
              fill={t.color ?? 'var(--hy-surface, white)'}
              stroke="currentColor"
              strokeWidth={fontSize / 15}
            >
              {t.shape === 'ROUND' ? (
                <ellipse
                  cx={t.x + t.width / 2}
                  cy={t.y + t.height / 2}
                  rx={t.width / 2}
                  ry={t.height / 2}
                />
              ) : (
                <rect x={t.x} y={t.y} width={t.width} height={t.height} />
              )}
            </g>
            <text
              x={t.x + t.width / 2}
              y={t.y + t.height / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fill="currentColor"
              stroke="white"
              strokeWidth={fontSize / 6}
              paintOrder="stroke"
            >
              {t.tableLabel}
            </text>
          </g>
        ))}
      </svg>
      <ul>
        {groups.map((group) => (
          <li key={group}>
            {group}:{' '}
            {tables
              .filter((t) => t.guestGroupName === group)
              .map((t) => t.tableLabel)
              .join(', ')}
          </li>
        ))}
      </ul>
    </section>
  );
}
