'use client';

import React from 'react';
import { LiveUpdateNotice } from '../realtime/use-live-refresh';
import { useInvitationStudio, type UseInvitationStudioOptions } from './use-invitation-studio';
import { StudioDesignTab } from './studio-design-tab';
import { StudioMediaTab } from './studio-media-tab';
import { StudioPublishTab } from './studio-publish-tab';
import { StudioPrintTab } from './studio-print-tab';

export type InvitationStudioViewProps = UseInvitationStudioOptions;

export function InvitationStudioView(props: InvitationStudioViewProps) {
  const studio = useInvitationStudio(props);
  const {
    activeTab,
    selectTab,
    orders,
    publicationRevision,
    designLive,
    designDirty,
    setDesignDirty,
    writing,
    confirm,
    dialog,
  } = studio;

  return (
    <div
      className="invitation-live"
      onChangeCapture={() => {
        if (activeTab === 'design') setDesignDirty(true);
      }}
    >
      {publicationRevision === null ? (
        <p role="status">Đang đồng bộ trạng thái xuất bản thiệp…</p>
      ) : null}
      <LiveUpdateNotice waiting={designLive.waiting} />
      {designLive.waiting && designDirty ? (
        <button
          type="button"
          className="studio-btn"
          disabled={writing}
          onClick={() => {
            void confirm({
              title: 'Nhận bản cập nhật mới?',
              description: 'Các thay đổi chưa lưu trên thiệp sẽ được bỏ. Bạn muốn tiếp tục?',
              confirmLabel: 'Bỏ thay đổi và cập nhật',
            }).then((agreed) => {
              if (agreed) {
                setDesignDirty(false);
                void designLive.refresh();
              }
            });
          }}
        >
          Bỏ thay đổi chưa lưu và cập nhật
        </button>
      ) : null}

      {/* Header */}
      <header className="page-heading">
        <h1>Studio Thiệp Cưới & In Ấn</h1>
        <p className="studio-lead">
          Thiết kế thiệp cưới sang trọng, tạo ảnh AI độc bản, chia sẻ mã QR và đặt in thiệp giấy
          truyền thống.
        </p>
      </header>

      {/* Navigation Tabs */}
      <nav aria-label="Studio Tabs" className="studio-tabs">
        <button
          type="button"
          onClick={() => selectTab('design')}
          aria-pressed={activeTab === 'design'}
          className="studio-tab"
        >
          Thiết Kế & AI
        </button>
        <button
          type="button"
          onClick={() => selectTab('media')}
          aria-pressed={activeTab === 'media'}
          className="studio-tab"
        >
          Bộ Sưu Tập Ảnh
        </button>
        <button
          type="button"
          onClick={() => selectTab('publish')}
          aria-pressed={activeTab === 'publish'}
          className="studio-tab"
        >
          Xuất Bản & Mã QR
        </button>
        <button
          type="button"
          onClick={() => selectTab('print')}
          aria-pressed={activeTab === 'print'}
          className="studio-tab"
        >
          {orders ? `Đặt In Thiệp Giấy (${orders.length})` : 'Đặt In Thiệp Giấy'}
        </button>
      </nav>

      {/* Active Tab Content */}
      {activeTab === 'design' && <StudioDesignTab studio={studio} />}
      {activeTab === 'media' && <StudioMediaTab studio={studio} />}
      {activeTab === 'publish' && <StudioPublishTab studio={studio} />}
      {activeTab === 'print' && <StudioPrintTab studio={studio} />}

      {dialog}
    </div>
  );
}
