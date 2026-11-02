import Image from 'next/image';

/**
 * Logo Hỷ Yến: ảnh logo (monogram "Hy" + hoa) + tên thương hiệu.
 *
 * Ảnh chỉ là trang trí (alt rỗng) vì tên "Hỷ Yến" đã có ngay bên cạnh dưới dạng chữ.
 * Tên có dấu tiếng Việt nên luôn dùng font sans của hệ thống (quy tắc trong AGENTS.md).
 */
export function BrandMark({ tagline, compact = false }: { tagline?: string; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3 text-foreground">
      <Image
        className={compact ? 'block h-11 w-auto flex-none' : 'block h-[52px] w-auto flex-none'}
        src="/images/hy-yen-logo.png"
        alt=""
        width={394}
        height={414}
      />
      <span className="grid leading-tight">
        <strong className={compact ? 'text-lg font-bold' : 'text-[19px] font-bold sm:text-[22px]'}>
          Hỷ Yến
        </strong>
        {tagline ? <small className="text-2xs text-muted-foreground">{tagline}</small> : null}
      </span>
    </span>
  );
}
