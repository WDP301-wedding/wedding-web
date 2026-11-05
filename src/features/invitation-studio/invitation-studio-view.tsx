'use client';

import React from 'react';
import { LiveUpdateNotice } from '../realtime/use-live-refresh';
import { useInvitationStudio, type UseInvitationStudioOptions } from './use-invitation-studio';
import { StudioDesignTab } from './studio-design-tab';
import { StudioPublishTab } from './studio-publish-tab';
import { StudioPrintTab } from './studio-print-tab';
import { ix } from './studio-classes';

export type InvitationStudioViewProps = UseInvitationStudioOptions;

export function InvitationStudioView(props: InvitationStudioViewProps) {
  const studio = useInvitationStudio(props);
  const {
    activeTab,
    selectTab,
    publicationRevision,
    designLive,
    designDirty,
    writing,
    confirm,
    dialog,
  } = studio;

  return (
    <div className={`${ix.root} @container/studio`}>
      {publicationRevision === null ? (
        <p role="status">Đang đồng bộ trạng thái xuất bản thiệp…</p>
      ) : null}
      <LiveUpdateNotice waiting={designLive.waiting} />
      {designLive.waiting && designDirty ? (
        <button
          type="button"
          className={ix.btn}
          disabled={writing}
          onClick={() => {
            void confirm({
              title: 'Nhận bản cập nhật mới?',
              description: 'Các thay đổi chưa lưu trên thiệp sẽ được bỏ. Bạn muốn tiếp tục?',
              confirmLabel: 'Bỏ thay đổi và cập nhật',
            }).then((agreed) => {
              if (agreed) {
                studio.setDesignDirty(false);
                void designLive.refresh();
              }
            });
          }}
        >
          Bỏ thay đổi chưa lưu và cập nhật
        </button>
      ) : null}

      {/* Header */}
      <header className={ix.heading}>
        <h1>Thiệp & in</h1>
        <p className={ix.lead}>
          Thiết kế thiệp, gửi liên kết cho khách mời và theo dõi yêu cầu in.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <strong>{studio.title || 'Thiệp chưa đặt tên'}</strong>
          <span className={ix.chip}>
            {designDirty ? 'Có thay đổi chưa lưu' : studio.currentDesign ? 'Đã lưu' : 'Bản mới'}
          </span>
          {studio.publishedSlug && <span className={ix.chipSuccess}>Có thiệp đang chia sẻ</span>}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav aria-label="Các mục thiệp và in" className={ix.tabs}>
        <button
          type="button"
          onClick={() => selectTab('design')}
          aria-pressed={activeTab === 'design'}
          className={ix.tab}
        >
          Thiết kế
        </button>
        <button
          type="button"
          onClick={() => selectTab('publish')}
          aria-pressed={activeTab === 'publish'}
          className={ix.tab}
        >
          Chia sẻ
        </button>
        <button
          type="button"
          onClick={() => selectTab('print')}
          aria-pressed={activeTab === 'print'}
          className={ix.tab}
        >
          Đặt in
        </button>
      </nav>

      {/* Active Tab Content */}
      <div key={activeTab} className={ix.tabPanel}>
        {activeTab === 'design' && <StudioDesignTab studio={studio} />}
        {activeTab === 'publish' && <StudioPublishTab studio={studio} />}
        {activeTab === 'print' && <StudioPrintTab studio={studio} />}
      </div>

      {dialog}
    </div>
  );
}
