/**
 * Logo Hỷ Yến: monogram "HY" + tên thương hiệu.
 *
 * Monogram là chữ Latin không dấu nên được dùng font trang trí (`.latin-wordmark`, lang="en").
 * Tên "Hỷ Yến" có dấu tiếng Việt nên luôn dùng font sans của hệ thống (quy tắc trong AGENTS.md).
 */
export function BrandMark({ tagline, compact = false }: { tagline?: string; compact?: boolean }) {
  return (
    <span className={'hy-brand' + (compact ? ' hy-brand-compact' : '')}>
      <span className="hy-monogram" aria-hidden="true">
        <span className="latin-wordmark" lang="en">
          HY
        </span>
      </span>
      <span className="hy-brand-text">
        <strong>Hỷ Yến</strong>
        {tagline ? <small>{tagline}</small> : null}
      </span>
    </span>
  );
}
