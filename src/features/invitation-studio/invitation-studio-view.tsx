'use client';

import React from 'react';
import { LiveUpdateNotice } from '../realtime/use-live-refresh';
import { useInvitationStudio, type UseInvitationStudioOptions } from './use-invitation-studio';
import { StudioDesignTab } from './studio-design-tab';
import { StudioPublishTab } from './studio-publish-tab';
import { StudioPrintTab } from './studio-print-tab';
import { PreparationReadOnlyNotice } from '../couple-workspace/preparation-access';
import { ix } from './studio-classes';

export type InvitationStudioViewProps = UseInvitationStudioOptions;

export function InvitationStudioView(props: InvitationStudioViewProps) {
  const studio = useInvitationStudio(props);
  const { activeTab, selectTab, designLive, designDirty, writing, confirm, dialog } = studio;

  return (
    <div className={`${ix.root} @container/studio`}>
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

      {studio.locked && <PreparationReadOnlyNotice reason={studio.locked} />}
      {/* Header */}
      <header className={ix.heading}>
        <h1>Thiệp & in</h1>
        <p className={ix.lead}>
          {studio.locked
            ? 'Xem thiết kế đã lưu và lịch sử in thiệp.'
            : 'Thiết kế thiệp, gửi liên kết cho khách mời và theo dõi yêu cầu in.'}
        </p>
        {activeTab !== 'publish' && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <strong>{studio.title || 'Thiệp chưa đặt tên'}</strong>
            <span className={ix.chip}>
              {designDirty ? 'Có thay đổi chưa lưu' : studio.currentDesign ? 'Đã lưu' : 'Bản mới'}
            </span>
          </div>
        )}
      </header>

      {/* Navigation Tabs */}
      <nav aria-label="Các mục thiệp và in" className={ix.tabs}>
        <button
          type="button"
          onClick={() => selectTab('design')}
          aria-pressed={activeTab === 'design'}
          className={ix.tab}
        >
          {studio.locked ? 'Thiệp đã lưu' : 'Thiết kế'}
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
          {studio.locked ? 'Lịch sử in' : 'Đặt in'}
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
