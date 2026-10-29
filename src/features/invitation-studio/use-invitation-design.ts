'use client';

import { useRef, useState } from 'react';
import type { InvitationGateway, DesignView } from './invitation-api';
import { previewAssetId } from './invitation-api';
import { useImageJob, type SucceededImageJob } from './use-image-job';
import { getOrGenerateKey, invitationErrorMessage } from './invitation-studio-utils';
import { notify } from '../../design-system/toast';
import {
  type CardThemeId,
  type GeneratedInvitationDesign,
  inferThemeFromContent,
} from './ai-invitation-generator';

export interface UseInvitationDesignOptions {
  bookingId: string;
  accessToken: string;
  gateway: InvitationGateway;
  initialDesigns?: readonly DesignView[] | undefined;
}

export function useInvitationDesign({
  bookingId,
  accessToken,
  gateway,
  initialDesigns = [],
}: UseInvitationDesignOptions) {
  const [designs, setDesigns] = useState<readonly DesignView[]>(initialDesigns);
  const currentDesign = designs[0];

  const [title, setTitle] = useState(designs[0]?.title ?? 'Thiệp Cưới Hạnh Phúc');
  const [brideName, setBrideName] = useState(designs[0]?.textFields?.brideName ?? '');
  const [groomName, setGroomName] = useState(designs[0]?.textFields?.groomName ?? '');
  const [greeting, setGreeting] = useState(
    designs[0]?.textFields?.greeting ?? 'Trân trọng kính mời',
  );
  const [message, setMessageText] = useState(
    designs[0]?.textFields?.message ?? 'Đến tham dự buổi tiệc chung vui cùng gia đình chúng tôi',
  );
  const [derivedAssetIds, setDerivedAssetIds] = useState<readonly string[]>(
    designs[0]?.derivedAssetIds ?? [],
  );
  const [footer, setFooter] = useState(designs[0]?.textFields?.footer ?? '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [designDirty, setDesignDirty] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [cardTheme, setCardTheme] = useState<CardThemeId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`invitation-theme:${bookingId}`);
      if (saved) return saved as CardThemeId;
    }
    return inferThemeFromContent(initialDesigns[0]?.title, initialDesigns[0]?.textFields?.message);
  });

  const handleSetCardTheme = (theme: CardThemeId) => {
    setCardTheme(theme);
    setDesignDirty(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`invitation-theme:${bookingId}`, theme);
    }
  };

  const applyAiDesign = (generated: GeneratedInvitationDesign) => {
    setTitle(generated.title);
    if (generated.brideName) setBrideName(generated.brideName);
    if (generated.groomName) setGroomName(generated.groomName);
    setGreeting(generated.greeting);
    setMessageText(generated.message);
    setFooter(generated.footer);
    setCardTheme(generated.theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`invitation-theme:${bookingId}`, generated.theme);
    }
    setDesignDirty(true);
    notify.success(`Đã áp dụng thiết kế "${generated.themeName}"! Xem thiệp trực quan ở khung bên phải.`);
  };

  const saveKeyRef = useRef<{ signature: string; key: string } | null>(null);

  const handleSaveDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const sanitizedSections = (currentDesign?.sections ?? []).filter(
      (section) => !section.derivedAssetId || derivedAssetIds.includes(section.derivedAssetId),
    );
    const newImageSections = derivedAssetIds
      .filter((id) => !sanitizedSections.some((section) => section.derivedAssetId === id))
      .map((id) => ({ kind: 'HERO' as const, textKey: null, derivedAssetId: id }));
    const finalSections = [...sanitizedSections, ...newImageSections];
    const signature = `${currentDesign?.designId ?? 'new'}:${currentDesign?.revisionNumber ?? 0}:${title}:${brideName}:${groomName}:${greeting}:${message}:${footer}:${derivedAssetIds.join(',')}`;
    const key = getOrGenerateKey(saveKeyRef, signature, 'save-design');
    try {
      if (currentDesign) {
        const updated = await gateway.reviseDesign(
          accessToken,
          bookingId,
          currentDesign.designId,
          {
            expectedRevision: currentDesign.revisionNumber,
            content: {
              title,
              textFields: {
                ...currentDesign.textFields,
                brideName,
                groomName,
                greeting,
                message,
                footer,
              },
              sections: finalSections,
              derivedAssetIds,
              includesSeating: currentDesign.includesSeating,
            },
          },
          key,
        );
        setDesigns([updated, ...designs.slice(1)]);
        setDesignDirty(false);
        saveKeyRef.current = null;
        notify.success('Đã lưu bản thiết kế thiệp thành công!');
      } else {
        const created = await gateway.createDesign(
          accessToken,
          bookingId,
          {
            title,
            textFields: { brideName, groomName, greeting, message, footer },
            sections: newImageSections,
            derivedAssetIds,
            includesSeating: false,
          },
          key,
        );
        setDesigns([created]);
        setDesignDirty(false);
        saveKeyRef.current = null;
        notify.success('Đã tạo thiết kế thiệp cưới mới!');
      }
    } catch (err: unknown) {
      notify.error(invitationErrorMessage(err, 'Có lỗi xảy ra khi lưu thiết kế.'));
    } finally {
      setSaving(false);
    }
  };

  const [restoredAiImage, setRestoredAiImage] = useState<{
    derivedAssetId: string;
    previewUrl: string | null;
  } | null>(null);

  const showAiPreview = async (job: SucceededImageJob): Promise<string | null> => {
    const assetId = previewAssetId(job.result.previewPath) ?? job.result.mediaAssetId;
    try {
      return (await gateway.getMediaPreview(accessToken, bookingId, assetId)).signedUrl;
    } catch {
      return null;
    }
  };

  const aiJob = useImageJob({
    gateway,
    accessToken,
    bookingId,
    onSucceeded: (job, restored) => {
      const { derivedAssetId } = job.result;
      if (restored) {
        if (derivedAssetIds.includes(derivedAssetId)) return;
        void showAiPreview(job).then((url) =>
          setRestoredAiImage({ derivedAssetId, previewUrl: url }),
        );
        return;
      }
      setDesignDirty(true);
      setDerivedAssetIds((ids) => (ids.includes(derivedAssetId) ? ids : [...ids, derivedAssetId]));
      void showAiPreview(job).then((url) => url && setPreviewUrl(url));
      notify.success('Ảnh đã sẵn sàng. Lưu thiết kế để sử dụng ảnh trên thiệp.');
    },
  });

  const applyRestoredAiImage = () => {
    if (!restoredAiImage) return;
    const { derivedAssetId } = restoredAiImage;
    setDesignDirty(true);
    setDerivedAssetIds((ids) => (ids.includes(derivedAssetId) ? ids : [...ids, derivedAssetId]));
    if (restoredAiImage.previewUrl) setPreviewUrl(restoredAiImage.previewUrl);
    setRestoredAiImage(null);
    notify.success('Đã thêm ảnh. Lưu thiết kế để sử dụng ảnh trên thiệp.');
  };

  const handleAiGenerate = () => {
    if (!aiPrompt.trim() || aiJob.busy) return;
    setRestoredAiImage(null);
    void aiJob.start(aiPrompt.trim());
  };

  return {
    designs,
    setDesigns,
    currentDesign,
    title,
    setTitle,
    brideName,
    setBrideName,
    groomName,
    setGroomName,
    greeting,
    setGreeting,
    message,
    setMessageText,
    footer,
    setFooter,
    derivedAssetIds,
    setDerivedAssetIds,
    previewUrl,
    setPreviewUrl,
    saving,
    designDirty,
    setDesignDirty,
    handleSaveDesign,
    aiPrompt,
    setAiPrompt,
    aiJob,
    handleAiGenerate,
    restoredAiImage,
    applyRestoredAiImage,
    cardTheme,
    setCardTheme: handleSetCardTheme,
    applyAiDesign,
  };
}
