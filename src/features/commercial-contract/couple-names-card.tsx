'use client';

import React, { useState } from 'react';
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
  const hasNames = Boolean(profile.brideName?.trim() && profile.groomName?.trim());
  const [editing, setEditing] = useState(!hasNames);
  const isEditing = editing || !hasNames;
  const missing = !profile.brideName?.trim() || !profile.groomName?.trim();

  if (!isEditing && hasNames) {
    return (
      <section className="cw-card" aria-labelledby="names-heading">
        <div
          className="cw-card-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.4rem',
          }}
        >
          <h2 id="names-heading" style={{ margin: 0, fontSize: '1.05rem' }}>
            Tên cô dâu &amp; chú rể
          </h2>
          <button
            type="button"
            className="button button-secondary"
            style={{
              padding: '4px 12px',
              fontSize: '0.8rem',
              minHeight: 'unset',
              lineHeight: 1.4,
            }}
            onClick={() => setEditing(true)}
          >
            Đổi tên
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            alignItems: 'center',
            padding: '10px 14px',
            background: 'var(--canvas, #fbf4ee)',
            borderRadius: '8px',
            border: '1px solid var(--rule, #eadfd6)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #6e5d63)' }}>
              Cô dâu:{' '}
            </span>
            <strong style={{ fontSize: '0.95rem' }}>{profile.brideName}</strong>
          </div>
          <span style={{ color: 'var(--rule, #eadfd6)' }}>•</span>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #6e5d63)' }}>
              Chú rể:{' '}
            </span>
            <strong style={{ fontSize: '0.95rem' }}>{profile.groomName}</strong>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cw-card" aria-labelledby="names-heading">
      <div className="cw-card-header">
        <h2 id="names-heading">Tên cô dâu &amp; chú rể</h2>
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
              if (updated) {
                onSaved(updated);
                setEditing(false);
              }
            });
        }}
      >
        <div className="cw-form-row" key={`${profile.brideName ?? ''}:${profile.groomName ?? ''}`}>
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
        <div className="cw-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="button" disabled={command.pending} type="submit">
            {command.pending ? 'Đang lưu…' : 'Lưu tên'}
          </button>
          {hasNames && (
            <button
              className="button button-secondary"
              type="button"
              disabled={command.pending}
              onClick={() => setEditing(false)}
            >
              Hủy
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
