'use client';

import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from 'cn';

import { Button } from '../../components/ui/button';
import { control, field } from '../public-website/public-classes';

import { useConfirmDialog } from '../../design-system/confirm-dialog';

import type { TimelineItemInput } from './collaboration-api';

const iconButton =
  'inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4';

type Draft = Readonly<{
  key: string;
  itemId?: string;
  startTime: string;
  title: string;
  description: string;
}>;

export function TimelineEditor({
  disabled,
  initialItems,
  needsReason = false,
  onSave,
}: Readonly<{
  disabled: boolean;
  initialItems: readonly Readonly<{
    itemId: string;
    startTime: string;
    title: string;
    description: string | null;
  }>[];
  needsReason?: boolean;
  onSave: (items: readonly TimelineItemInput[], reason: string) => Promise<void>;
}>) {
  const [drafts, setDrafts] = useState<readonly Draft[]>(() =>
    initialItems.map((item) => ({
      ...item,
      key: item.itemId,
      description: item.description ?? '',
    })),
  );
  const [reason, setReason] = useState('');
  const { confirm, dialog } = useConfirmDialog();
  const update = (key: string, change: Partial<Draft>) =>
    setDrafts((current) =>
      current.map((item) => (item.key === key ? { ...item, ...change } : item)),
    );
  const move = (index: number, direction: number) => {
    setDrafts((current) => {
      const next = [...current];
      const destination = index + direction;
      if (destination < 0 || destination >= next.length) return current;
      [next[index], next[destination]] = [next[destination]!, next[index]!];
      return next;
    });
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const items = drafts.map((item, order) => ({
          ...(item.itemId ? { itemId: item.itemId } : {}),
          order,
          startTime: item.startTime,
          title: item.title,
          ...(item.description.trim() ? { description: item.description } : {}),
        }));
        void onSave(items, reason);
      }}
    >
      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-3 disabled:opacity-60">
        <legend className="mb-1 text-sm font-bold">Chỉnh sửa các mốc chương trình</legend>
        {drafts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Chưa có mốc. Thêm nội dung hoặc lưu bản nháp trống.
          </p>
        ) : null}
        {drafts.map((item, index) => (
          <div
            className="flex animate-in flex-col gap-3 rounded-lg border border-border bg-muted/50 p-3 duration-200 fade-in slide-in-from-top-1 motion-reduce:animate-none sm:p-4"
            key={item.key}
          >
            <div className="flex items-center justify-between gap-2">
              <strong className="text-xs font-semibold text-primary">Mốc {index + 1}</strong>
              <div className="flex gap-1">
                <button
                  type="button"
                  className={iconButton}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Đưa mốc ${index + 1} lên`}
                  title="Đưa lên"
                >
                  <ArrowUp aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={iconButton}
                  disabled={index === drafts.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Đưa mốc ${index + 1} xuống`}
                  title="Đưa xuống"
                >
                  <ArrowDown aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={cn(iconButton, 'text-hy-error hover:bg-hy-error-bg')}
                  aria-label={`Xóa mốc ${index + 1}`}
                  title="Xoá mốc"
                  onClick={() =>
                    void (async () => {
                      // Mốc chỉ bị xoá khỏi bản nháp; bấm "Lưu" mới gửi lên nhà hàng.
                      const removed = await confirm({
                        title: `Xoá mốc ${index + 1}${item.title ? ` “${item.title}”` : ''}?`,
                        description:
                          'Mốc sẽ bị xoá khỏi bản nháp lịch trình. Thay đổi chỉ được gửi khi bạn bấm lưu.',
                        confirmLabel: 'Xoá mốc',
                        tone: 'danger',
                      });
                      if (removed)
                        setDrafts((current) => current.filter((row) => row.key !== item.key));
                    })()
                  }
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
              <label className={field}>
                <span>
                  Giờ bắt đầu<span className="sr-only"> mốc {index + 1}</span>
                </span>
                <input
                  className={cn(control, 'tabular-nums')}
                  type="time"
                  required
                  value={item.startTime}
                  onChange={(event) => update(item.key, { startTime: event.target.value })}
                />
              </label>
              <label className={field}>
                <span>
                  Nội dung<span className="sr-only"> mốc {index + 1}</span>
                </span>
                <input
                  className={control}
                  required
                  maxLength={120}
                  value={item.title}
                  onChange={(event) => update(item.key, { title: event.target.value })}
                />
              </label>
              <label className={cn(field, 'sm:col-span-2')}>
                <span>
                  Ghi chú<span className="sr-only"> mốc {index + 1}</span>
                </span>
                <textarea
                  className={cn(control, 'h-auto py-2.5')}
                  rows={2}
                  maxLength={2000}
                  value={item.description}
                  onChange={(event) => update(item.key, { description: event.target.value })}
                />
              </label>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={drafts.length >= 100}
          onClick={() =>
            setDrafts((current) => [
              ...current,
              { key: crypto.randomUUID(), startTime: '', title: '', description: '' },
            ])
          }
        >
          Thêm mốc chương trình
        </Button>
        {needsReason ? (
          <label className={field}>
            Lý do thay đổi
            <textarea
              className={cn(control, 'h-auto py-2.5')}
              required
              maxLength={500}
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
        ) : null}
        <Button type="submit" className="self-start">
          {needsReason ? 'Gửi yêu cầu thay đổi' : 'Lưu kịch bản mới'}
        </Button>
      </fieldset>
      {dialog}
    </form>
  );
}
