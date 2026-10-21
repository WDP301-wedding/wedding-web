import type { Proposal } from './use-couple-workspace';

const vnd = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

export type MenuLine = Readonly<{
  key: string;
  name: string;
  tableCount: number;
  priceVndPerTable: number;
  lineTotalVnd: number;
}>;

/**
 * Các dòng thực đơn của đề xuất (BE PR #65: một tiệc có thể chọn nhiều thực đơn, mỗi thực đơn
 * một số bàn). `proposal.menu` chỉ còn là bản xem trước của dòng đầu tiên nên KHÔNG dùng để
 * hiển thị. Số tiền mỗi dòng lấy từ backend (`lineTotalVnd`), giao diện không tự nhân lại.
 */
export function menuLines(offer: Proposal['proposal']): MenuLine[] {
  const menus = offer.menus as readonly Proposal['proposal']['menus'][number][] | undefined;
  if (menus && menus.length > 0)
    return menus.map((menu) => ({
      key: menu.versionId,
      name: menu.name,
      tableCount: menu.tableCount,
      priceVndPerTable: menu.priceVndPerTable,
      lineTotalVnd: menu.lineTotalVnd,
    }));
  // Phòng hờ response cũ chưa có `menus`: một dòng từ `menu` + `tableCount` tổng.
  return [
    {
      key: offer.menu.versionId,
      name: offer.menu.name,
      tableCount: offer.tableCount,
      priceVndPerTable: offer.menu.priceVndPerTable,
      lineTotalVnd: offer.tableCount * offer.menu.priceVndPerTable,
    },
  ];
}

/** Danh sách thực đơn dạng gọn: "Tên · 20 bàn × 5.000.000 ₫". */
export function ProposalMenus({ offer }: Readonly<{ offer: Proposal['proposal'] }>) {
  const lines = menuLines(offer);
  if (lines.length === 1) {
    const [line] = lines as [MenuLine];
    return (
      <>
        {line.name} · {line.tableCount} bàn × {vnd(line.priceVndPerTable)}
      </>
    );
  }
  return (
    <ul className="hy-menu-lines">
      {lines.map((line) => (
        <li key={line.key}>
          <span>
            {line.name}
            <small>
              {line.tableCount} bàn × {vnd(line.priceVndPerTable)}
            </small>
          </span>
          <strong>{vnd(line.lineTotalVnd)}</strong>
        </li>
      ))}
    </ul>
  );
}
