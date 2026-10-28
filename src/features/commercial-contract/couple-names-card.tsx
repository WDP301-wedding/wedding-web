'use client';

import React from 'react';
import { InlineError } from '../../design-system/inline-error';
import { useCommand, formText } from '../couple-workspace/use-couple-workspace';
import { contractApi, type CoupleProfile } from './contract-api';

export interface CoupleNamesCardProps {
  profile: CoupleProfile;
  onSaved: (profile: CoupleProfile) => void;
}

/** Tên cô dâu và chú rể là 2 trường riêng, bắt buộc trước khi gửi duyệt hợp đồng. */
export function CoupleNamesCard({ profile, onSaved }: CoupleNamesCardProps) {
  const command = useCommand({ errorPresentation: 'inline' });
  const missing = !profile.brideName || !profile.groomName;
  return (
    <section className="cw-card" aria-labelledby="names-heading">
      <div className="cw-card-header">
        <h2 id="names-heading">Tên cô dâu & chú rể</h2>
        {missing ? <span className="cw-chip is-warning">Cần nhập đủ tên</span> : null}
      </div>
      <p className="cw-note">
        Tên sẽ xuất hiện trên hợp đồng tiệc cưới và thiệp in. Vui lòng nhập đúng tên hai bạn.
      </p>
      <InlineError error={command.error} />
      <form
        className="cw-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const brideName = formText(form, 'brideName');
          const groomName = formText(form, 'groomName');
          if (!brideName || !groomName) return;
          void command
            .run(
              (token, key) =>
                contractApi.updateProfile(token, key, profile.consultationId, {
                  expectedRevision: profile.revision,
                  brideName,
                  groomName,
                }),
              'Đã lưu tên cô dâu & chú rể.',
            )
            .then((updated) => {
              if (updated) onSaved(updated);
            });
        }}
      >
        <div className="cw-form-grid">
          <label>
            Tên cô dâu
            <input
              name="brideName"
              defaultValue={profile.brideName ?? ''}
              required
              maxLength={100}
              placeholder="Ví dụ: Nguyễn Thị Mai"
            />
          </label>
          <label>
            Tên chú rể
            <input
              name="groomName"
              defaultValue={profile.groomName ?? ''}
              required
              maxLength={100}
              placeholder="Ví dụ: Trần Văn An"
            />
          </label>
        </div>
        <small className="muted">
          Nếu đổi tên sau khi hợp đồng đã gửi duyệt, bạn sẽ cần tạo bản nháp mới để gửi lại hai bên
          duyệt.
        </small>
        <div className="cw-actions">
          <button className="button" disabled={command.pending} type="submit">
            {command.pending ? 'Đang lưu…' : 'Lưu tên'}
          </button>
        </div>
      </form>
    </section>
  );
}
