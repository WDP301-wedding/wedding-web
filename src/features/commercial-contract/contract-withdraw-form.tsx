'use client';

import React from 'react';
import { formText } from '../couple-workspace/use-couple-workspace';

export function WithdrawForm({
  pending,
  onSubmit,
}: Readonly<{ pending: boolean; onSubmit: (reason: string) => void }>) {
  return (
    <details>
      <summary>Cần chỉnh sửa? Rút duyệt</summary>
      <form
        className="cw-form"
        onSubmit={(event) => {
          event.preventDefault();
          const reason = formText(new FormData(event.currentTarget), 'reason');
          if (reason) onSubmit(reason);
        }}
      >
        <label>
          Lý do
          <textarea name="reason" required maxLength={500} rows={2} />
        </label>
        <div className="cw-actions">
          <button className="button button-secondary" disabled={pending} type="submit">
            Rút duyệt
          </button>
        </div>
      </form>
    </details>
  );
}

