import Image from 'next/image';

/**
 * Logo Hỷ Yến: ảnh logo (monogram "Hy" + hoa) + tên thương hiệu.
 *
 * Ảnh chỉ là trang trí (alt rỗng) vì tên "Hỷ Yến" đã có ngay bên cạnh dưới dạng chữ.
 * Tên có dấu tiếng Việt nên luôn dùng font sans của hệ thống (quy tắc trong AGENTS.md).
 */
export function BrandMark({ tagline, compact = false }: { tagline?: string; compact?: boolean }) {
  return (
    <span className={'hy-brand' + (compact ? ' hy-brand-compact' : '')}>
      <Image
        className="hy-brand-logo"
        src="/images/hy-yen-logo.png"
        alt=""
        width={394}
        height={414}
      />
      <span className="hy-brand-text">
        <strong>Hỷ Yến</strong>
        {tagline ? <small>{tagline}</small> : null}
      </span>
    </span>
  );
}
