import React from 'react';
import { cx } from './contract-classes';

export function SelectorTable({
  title,
  emptyText,
  children,
}: Readonly<{ title: string; emptyText: string; children: React.ReactNode[] }>) {
  return (
    <fieldset className={`${cx.card} ${cx.selectorFieldset}`}>
      <legend>
        <strong>{title}</strong>
      </legend>
      {children.length === 0 ? (
        <p className={cx.note}>{emptyText}</p>
      ) : (
        <div className={cx.tableWrap}>
          <table className={cx.table}>
            <thead>
              <tr>
                <th scope="col">Hạng mục</th>
                <th scope="col" className={cx.num}>
                  Đơn giá
                </th>
                <th scope="col" className={cx.num}>
                  Số lượng
                </th>
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
    </fieldset>
  );
}
