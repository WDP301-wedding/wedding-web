import styles from '@/src/features/invitation-studio/invitation.module.css';

import Image from 'next/image';
import { ApiClientError } from '@/src/lib/api/client';
import { readPublicEnv } from '@/src/lib/env';
import React from 'react';
import { notFound } from 'next/navigation';
import { createInvitationGateway } from '@/src/features/invitation-studio/invitation-api';

interface PublicInvitationPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicInvitationPage({ params }: PublicInvitationPageProps) {
  const { slug } = await params;
  const gateway = createInvitationGateway();

  let invitation;
  try {
    invitation = await gateway.getPublicInvitation(slug);
  } catch (error: unknown) {
    if (error instanceof ApiClientError && error.status === 404) notFound();
    throw error;
  }

  const { title, textFields, event, timeline } = invitation;
  const apiBase = readPublicEnv().NEXT_PUBLIC_API_BASE_URL;

  return (
    <main className={styles.shell}>
      <article className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-[#D4AF37]/30 overflow-hidden p-8 sm:p-12 text-center">
        <header className="mb-8">
          <p className="text-xs   text-[#879883] mb-2 font-medium">Thiệp Cưới Báo Hỷ</p>
          <div className="h-0.5 w-16 bg-[#D4AF37] mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl  text-[#1E3A2F] font-bold">{title}</h1>
        </header>

        {Array.from(invitation.assets).map((asset) => (
          <Image
            key={asset.url}
            src={new URL(asset.url, apiBase).href}
            alt="Hình ảnh thiệp cưới"
            width={asset.width}
            height={asset.height}
            unoptimized
          />
        ))}
        <section className="my-8 space-y-4">
          <p className="text-lg italic text-[#556952]">
            {textFields.greeting ?? 'Trân trọng kính mời quý khách'}
          </p>
          <div className="text-2xl  text-[#1E3A2F] py-4 border-y border-[#E8E4D9]">
            <span>{textFields.groomName ?? 'Chú Rể'}</span>
            <span className="mx-3 text-[#D4AF37] font-sans">&amp;</span>
            <span>{textFields.brideName ?? 'Cô Dâu'}</span>
          </div>
          <p className="text-sm text-[#879883]">
            {textFields.message ?? 'Đến tham dự buổi tiệc chung vui cùng gia đình chúng tôi'}
          </p>
        </section>

        {event && (
          <section className="mt-8 bg-[#FDFBF7] border border-[#D4AF37]/20 p-5 rounded-xl text-sm text-[#2C3E2D] space-y-1.5 text-left">
            <p className="font-semibold text-[#1E3A2F]  text-xs  mb-2 text-center">
              Thời Gian &amp; Địa Điểm Tiệc Cưới
            </p>
            <div className="flex justify-between border-b border-[#E8E4D9] pb-1">
              <span className="text-[#879883]">Ngày tổ chức:</span>
              <span className="font-medium text-[#1E3A2F]">{event.eventDate}</span>
            </div>
            <div className="flex justify-between border-b border-[#E8E4D9] pb-1">
              <span className="text-[#879883]">Sảnh tiệc:</span>
              <span className="font-medium text-[#1E3A2F]">{event.hallName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#879883]">Buổi tiệc:</span>
              <span className="font-medium text-[#1E3A2F]">
                {event.shiftCode === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối'}
              </span>
            </div>
          </section>
        )}

        {timeline && timeline.length > 0 && (
          <section className="mt-6 text-left">
            <h2 className="text-xs font-semibold text-[#1E3A2F]   mb-3 text-center">
              Chương Trình Tiệc Cưới
            </h2>
            <div className="space-y-2">
              {timeline.map((item) => (
                <div key={item.order} className="flex gap-3 text-xs text-[#2C3E2D]">
                  <span className="font-mono font-medium text-[#D4AF37]">{item.startTime}</span>
                  <span className="font-medium text-[#1E3A2F]">{item.title}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {textFields.footer && (
          <footer className="mt-8 pt-4 text-xs text-[#879883] border-t border-[#E8E4D9]">
            {textFields.footer}
          </footer>
        )}
      </article>
    </main>
  );
}
