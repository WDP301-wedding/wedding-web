'use client';

import { readParentNames } from './invitation-family';
import { useRef, useState } from 'react';
import type { InvitationGateway, DesignView } from './invitation-api';
import { previewAssetId } from './invitation-api';
import { useImageJob, type SucceededImageJob } from './use-image-job';
import { getOrGenerateKey, invitationErrorMessage } from './invitation-studio-utils';
import { notify } from '../../design-system/toast';
import type { CardThemeId, GeneratedInvitationDesign } from './ai-design-presets';
import {
  DEFAULT_PRESENTATION,
  type InvitationPresentation,
  type DesignSuggestion,
} from './invitation-presentation';
import { suggestInvitationDesign } from './design-suggestion-api';
import { browserSession } from '../identity-access/browser-session';

export interface UseInvitationDesignOptions {
  bookingId: string;
  accessToken: string;
  gateway: InvitationGateway;
  initialDesigns?: readonly DesignView[] | undefined;
  coupleNames?: { brideName?: string | null; groomName?: string | null } | undefined;
}

export function useInvitationDesign({
  bookingId,
  accessToken,
  gateway,
  initialDesigns = [],
  coupleNames,
}: UseInvitationDesignOptions) {
  const [designs, setDesigns] = useState<readonly DesignView[]>(initialDesigns);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(
    initialDesigns[0]?.designId ?? null,
  );
  const currentDesign = designs.find((design) => design.designId === selectedDesignId);
  const [includesSeating, setIncludesSeating] = useState(designs[0]?.includesSeating ?? false);

  const [title, setTitle] = useState(designs[0]?.title ?? 'Thiệp Cưới Hạnh Phúc');
  // null = hai bạn chưa nhập tên trên thiệp → dùng tên ở hồ sơ tiệc (có thể tải về sau khi Studio mở).
  const [brideOverride, setBrideName] = useState<string | null>(
    designs[0]?.textFields?.brideName || null,
  );
  const [groomOverride, setGroomName] = useState<string | null>(
    designs[0]?.textFields?.groomName || null,
  );
  const brideName = brideOverride ?? coupleNames?.brideName ?? '';
  const groomName = groomOverride ?? coupleNames?.groomName ?? '';
  const [parentNames, setParentNames] = useState(() => readParentNames(designs[0]?.textFields));
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
  const [presentation, setPresentation] = useState<InvitationPresentation>(
    initialDesigns[0]?.presentation ?? DEFAULT_PRESENTATION,
  );
  const cardTheme = presentation.theme;
  const handleSetCardTheme = (theme: CardThemeId) => {
    setPresentation((current) => ({ ...current, theme }));
    setDesignDirty(true);
  };
  const setCardLayout = (layout: InvitationPresentation['layout']) => {
    setPresentation((current) => ({ ...current, layout }));
    setDesignDirty(true);
  };
  const applyAiDesign = (generated: GeneratedInvitationDesign) => {
    setTitle(generated.title);
    setGreeting(generated.greeting);
    setMessageText(generated.message);
    setFooter(generated.footer);
    setPresentation((current) => ({ ...current, theme: generated.theme }));
    setDesignDirty(true);
    notify.success('Đã áp dụng mẫu. Lưu thiết kế để giữ mẫu khi xuất bản.');
  };
  const [suggestionBusy, setSuggestionBusy] = useState(false);
  const suggestionLock = useRef(false);
  const suggestionKey = useRef<{ signature: string; key: string } | null>(null);
  const [suggestion, setSuggestion] = useState<DesignSuggestion | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const generateSuggestion = async (prompt: string) => {
    if (suggestionLock.current) return;
    suggestionLock.current = true;
    setSuggestionBusy(true);
    setSuggestionError(null);
    setSuggestion(null);
    try {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prompt));
      const promptDigest = Array.from(new Uint8Array(bytes), (value) =>
        value.toString(16).padStart(2, '0'),
      ).join('');
      const storageKey = `invitation-design-intent:${bookingId}:${promptDigest}`;
      const existing = sessionStorage.getItem(storageKey);
      const key = existing ?? getOrGenerateKey(suggestionKey, promptDigest, 'design-suggestion');
      sessionStorage.setItem(storageKey, key);
      const result = await browserSession.authorize((token) =>
        suggestInvitationDesign(token, bookingId, prompt, key),
      );
      setSuggestion(result);
    } catch (error) {
      setSuggestionError(
        invitationErrorMessage(
          error,
          'Chưa nhận được thiết kế. Bạn có thể chọn mẫu có sẵn. Yêu cầu AI cũ không tự động tạo lại.',
        ),
      );
    } finally {
      setSuggestionBusy(false);
      suggestionLock.current = false;
    }
  };
  const applySuggestion = () => {
    if (!suggestion) return;
    setPresentation(suggestion.presentation);
    setTitle(suggestion.title);
    setGreeting(suggestion.greeting);
    setMessageText(suggestion.message);
    setFooter(suggestion.footer);
    setSuggestion(null);
    setDesignDirty(true);
    notify.success('Đã áp dụng thiết kế AI. Kiểm tra thông tin và lưu trước khi xuất bản.');
  };

  const saveKeyRef = useRef<{ signature: string; key: string } | null>(null);

  function selectDesign(designId: string) {
    const selected = designs.find((design) => design.designId === designId);
    if (!selected || saving || aiJob.busy || suggestionBusy) return;
    setSelectedDesignId(designId);
    setTitle(selected.title);
    setBrideName(selected.textFields.brideName || null);
    setGroomName(selected.textFields.groomName || null);
    setParentNames(readParentNames(selected.textFields));
    setGreeting(selected.textFields.greeting ?? '');
    setMessageText(selected.textFields.message ?? '');
    setFooter(selected.textFields.footer ?? '');
    setDerivedAssetIds(selected.derivedAssetIds);
    setPreviewUrl(null);
    setRestoredAiImage(null);
    setPresentation(selected.presentation ?? DEFAULT_PRESENTATION);
    setIncludesSeating(selected.includesSeating);
    setSuggestion(null);
    setSuggestionError(null);
    setDesignDirty(false);
    saveKeyRef.current = null;
  }

  function startNewDesign() {
    if (saving || aiJob.busy || suggestionBusy) return;
    setSelectedDesignId(null);
    setTitle('Thiệp cưới mới');
    setBrideName(null);
    setGroomName(null);
    setParentNames(readParentNames());
    setGreeting('Trân trọng kính mời');
    setMessageText('Đến tham dự buổi tiệc chung vui cùng gia đình chúng tôi');
    setFooter('');
    setDerivedAssetIds([]);
    setPreviewUrl(null);
    setRestoredAiImage(null);
    setPresentation(DEFAULT_PRESENTATION);
    setIncludesSeating(false);
    setSuggestion(null);
    setSuggestionError(null);
    setDesignDirty(true);
    saveKeyRef.current = null;
  }

  const handleSaveDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || suggestionBusy) return;
    setSaving(true);
    const sanitizedSections = (currentDesign?.sections ?? []).filter(
      (section) => !section.derivedAssetId || derivedAssetIds.includes(section.derivedAssetId),
    );
    const newImageSections = derivedAssetIds
      .filter((id) => !sanitizedSections.some((section) => section.derivedAssetId === id))
      .map((id) => ({ kind: 'HERO' as const, textKey: null, derivedAssetId: id }));
    const finalSections = [
      ...sanitizedSections.filter((section) => section.kind !== 'SEATING'),
      ...newImageSections,
      ...(includesSeating
        ? [{ kind: 'SEATING' as const, textKey: null, derivedAssetId: null }]
        : []),
    ];
    const signature = `${currentDesign?.designId ?? 'new'}:${currentDesign?.revisionNumber ?? 0}:${title}:${brideName}:${groomName}:${greeting}:${message}:${footer}:${derivedAssetIds.join(',')}:${includesSeating}:${JSON.stringify(presentation)}:${JSON.stringify(parentNames)}`;
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
                ...parentNames,
                brideName,
                groomName,
                greeting,
                message,
                footer,
              },
              sections: finalSections,
              derivedAssetIds,
              includesSeating,
              presentation,
            },
          },
          key,
        );
        setDesigns((previous) =>
          previous.map((design) => (design.designId === updated.designId ? updated : design)),
        );
        setDesignDirty(false);
        saveKeyRef.current = null;
        notify.success('Đã lưu bản thiết kế thiệp thành công!');
      } else {
        const created = await gateway.createDesign(
          accessToken,
          bookingId,
          {
            title,
            textFields: { ...parentNames, brideName, groomName, greeting, message, footer },
            sections: finalSections,
            derivedAssetIds,
            includesSeating,
            presentation,
          },
          key,
        );
        setDesigns((previous) => [created, ...previous]);
        setSelectedDesignId(created.designId);
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
    includesSeating,
    setIncludesSeating,
    designs,
    refreshDesigns(loaded: readonly DesignView[]) {
      setDesigns(loaded);
      if (selectedDesignId === null) return;
      const selected = loaded.find((item) => item.designId === selectedDesignId) ?? loaded[0];
      if (!selected) {
        setSelectedDesignId(null);
        return;
      }
      setSelectedDesignId(selected.designId);
      setTitle(selected.title);
      setBrideName(selected.textFields.brideName || null);
      setGroomName(selected.textFields.groomName || null);
      setParentNames(readParentNames(selected.textFields));
      setGreeting(selected.textFields.greeting ?? '');
      setMessageText(selected.textFields.message ?? '');
      setFooter(selected.textFields.footer ?? '');
      setDerivedAssetIds(selected.derivedAssetIds);
      setPresentation(selected.presentation ?? DEFAULT_PRESENTATION);
      setIncludesSeating(selected.includesSeating);
    },
    setDesigns,
    currentDesign,
    selectDesign,
    startNewDesign,
    title,
    setTitle,
    brideName,
    setBrideName,
    groomName,
    setGroomName,
    parentNames,
    setParentNames,
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
    presentation,
    setPresentation,
    setCardLayout,
    suggestionBusy,
    suggestion,
    suggestionError,
    generateSuggestion,
    applySuggestion,
    cardTheme,
    setCardTheme: handleSetCardTheme,
    applyAiDesign,
  };
}
