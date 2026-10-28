import React from 'react';
import styles from './line-selector.module.css';

export function SelectorTable({
  title,
  emptyText,
  children,
}: Readonly<{ title: string; emptyText: string; children: React.ReactNode[] }>) {
  return (
    <fieldset className={`cw-card ${styles.selectorFieldset}`}>
      <legend>
        <strong>{title}</strong>
      </legend>
      {children.length === 0 ? (
        <p className="cw-note">{emptyText}</p>
      ) : (
        <div className="cw-table-wrap">
          <table className="cw-table">
            <thead>
              <tr>
                <th scope="col">Hạng mục</th>
                <th scope="col" className="num">
                  Đơn giá
                </th>
                <th scope="col" className="num">
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
