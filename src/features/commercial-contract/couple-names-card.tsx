'use client';

import React, { useState } from 'react';
import { InlineError } from '../../design-system/inline-error';
import { useCommand, formText } from '../couple-workspace/use-couple-workspace';
import { contractApi, type CoupleProfile } from './contract-api';
import { cn } from 'cn';
import { cx } from './contract-classes';

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
      <section className={cx.card} aria-labelledby="names-heading">
        <div className={cx.cardHeader}>
          <h2 id="names-heading">Tên cô dâu &amp; chú rể</h2>
          <button
            type="button"
            className={cn(cx.buttonOutline, 'h-8 px-3 text-xs')}
            onClick={() => setEditing(true)}
          >
            Đổi tên
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted px-3.5 py-2.5 text-sm">
          <div>
            <span className="text-muted-foreground">Cô dâu: </span>
            <strong>{profile.brideName}</strong>
          </div>
          <span aria-hidden className="text-border">
            •
          </span>
          <div>
            <span className="text-muted-foreground">Chú rể: </span>
            <strong>{profile.groomName}</strong>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cx.card} aria-labelledby="names-heading">
      <div className={cx.cardHeader}>
        <h2 id="names-heading">Tên cô dâu &amp; chú rể</h2>
        {missing ? <span className={cx.chipWarning}>Cần nhập đủ tên</span> : null}
      </div>
      <p className={cx.note}>
        Tên sẽ xuất hiện trên hợp đồng tiệc cưới và thiệp in. Vui lòng nhập đúng tên hai bạn.
      </p>
      <InlineError error={command.error} />
      <form
        className={cx.form}
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
        <div className={cx.formRow} key={`${profile.brideName ?? ''}:${profile.groomName ?? ''}`}>
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
        <small className={cx.muted}>
          Nếu đổi tên sau khi hợp đồng đã gửi duyệt, bạn sẽ cần tạo bản nháp mới để gửi lại hai bên
          duyệt.
        </small>
        <div className={cx.actions}>
          <button className={cx.button} disabled={command.pending} type="submit">
            {command.pending ? 'Đang lưu…' : 'Lưu tên'}
          </button>
          {hasNames && (
            <button
              className={cx.buttonOutline}
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
