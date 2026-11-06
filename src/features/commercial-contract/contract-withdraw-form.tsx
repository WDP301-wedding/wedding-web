'use client';

import React from 'react';
import { formText } from '../couple-workspace/use-couple-workspace';
import { cx } from './contract-classes';

export function WithdrawForm({
  pending,
  onSubmit,
  requestChanges = false,
}: Readonly<{ pending: boolean; onSubmit: (reason: string) => void; requestChanges?: boolean }>) {
  return (
    <details>
      <summary>
        {requestChanges ? 'Yêu cầu nhà hàng chỉnh sửa' : 'Cần chỉnh sửa? Rút duyệt'}
      </summary>
      <form
        className={cx.form}
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
        <div className={cx.actions}>
          <button className={cx.buttonOutline} disabled={pending} type="submit">
            {requestChanges ? 'Gửi yêu cầu chỉnh sửa' : 'Rút duyệt'}
          </button>
        </div>
      </form>
    </details>
  );
}
