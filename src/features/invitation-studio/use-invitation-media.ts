'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getOrGenerateKey, invitationErrorMessage } from './invitation-studio-utils';
import { browserSession } from '../identity-access/browser-session';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { notify } from '../../design-system/toast';
import {
  type UploadedMediaItem,
  type UseInvitationMediaOptions,
  removeDerivedAssetFromDesigns,
} from './invitation-media-types';

export type { UploadedMediaItem, UseInvitationMediaOptions };

export function useInvitationMedia({
  bookingId,
  accessToken,
  gateway,
  derivedAssetIds,
  setDerivedAssetIds,
  designs,
  setDesigns,
  previewUrl,
  confirm,
}: UseInvitationMediaOptions) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaAltText, setMediaAltText] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [previewingAssetId, setPreviewingAssetId] = useState<string | null>(null);
  const [detachingAssetId, setDetachingAssetId] = useState<string | null>(null);
  const [derivingAssetId, setDerivingAssetId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [uploadedMediaList, setUploadedMediaList] = useState<readonly UploadedMediaItem[]>([]);

  const uploadKeyRef = useRef<{ signature: string; key: string } | null>(null);
  const deriveKeyRef = useRef<{ signature: string; key: string } | null>(null);
  const detachKeyRef = useRef<{ signature: string; key: string } | null>(null);

  const assetPreviewMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of uploadedMediaList) {
      if (item.signedUrl) {
        map[item.mediaAssetId] = item.signedUrl;
        if (item.derivedAssetId) {
          map[item.derivedAssetId] = item.signedUrl;
        }
      }
    }
    return map;
  }, [uploadedMediaList]);

  const hydratedRef = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    const missing = derivedAssetIds.filter((id) => !hydratedRef.current.has(id));
    if (missing.length === 0) return;
    for (const id of missing) {
      hydratedRef.current.add(id);
    }

    void Promise.all(
      missing.map(async (assetId) => {
        try {
          const preview = await gateway.getMediaPreview(accessToken, bookingId, assetId);
          return {
            mediaAssetId: preview.asset.mediaAssetId,
            revision: preview.asset.revision,
            altText: preview.altText || 'Ảnh thiệp cưới',
            previewPath: preview.asset.previewPath,
            signedUrl: preview.signedUrl,
            derivedAssetId: assetId,
            deriveStatus: 'ready' as const,
          };
        } catch {
          return null;
        }
      }),
    ).then((items) => {
      if (!active) return;
      const valid = items.filter((it): it is NonNullable<typeof it> => it !== null);
      if (valid.length > 0) {
        setUploadedMediaList((prev) => {
          const prevIds = new Set(prev.map((p) => p.mediaAssetId));
          const additions = valid.filter((v) => !prevIds.has(v.mediaAssetId));
          return additions.length > 0 ? [...prev, ...additions] : prev;
        });
      }
    });

    return () => {
      active = false;
    };
  }, [derivedAssetIds, accessToken, bookingId, gateway]);

  const studioAssets = useMemo(() => {
    const assetsFromDerived: { url: string; width: number; height: number }[] = [];
    for (const id of derivedAssetIds) {
      const url = assetPreviewMap[id];
      if (url && !assetsFromDerived.some((a) => a.url === url)) {
        assetsFromDerived.push({ url, width: 800, height: 600 });
      }
    }
    if (previewUrl && !assetsFromDerived.some((a) => a.url === previewUrl)) {
      assetsFromDerived.push({ url: previewUrl, width: 400, height: 300 });
    }
    return assetsFromDerived;
  }, [derivedAssetIds, assetPreviewMap, previewUrl]);

  const handleUploadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !mediaAltText.trim() || isUploadingMedia) return;
    if (selectedFile.size > 25 * 1024 * 1024) {
      notify.error('Tệp hình ảnh vượt quá dung lượng tối đa 25MB.');
      return;
    }
    const signature = `${selectedFile.name}:${selectedFile.size}:${selectedFile.lastModified}:${mediaAltText.trim()}`;
    const key = getOrGenerateKey(uploadKeyRef, signature, 'upload-media');
    setIsUploadingMedia(true);
    try {
      const asset = await gateway.uploadMedia(
        accessToken,
        bookingId,
        selectedFile,
        mediaAltText.trim(),
        undefined,
        key,
      );
      let signedUrl: string | undefined;
      let previewError: FriendlyError | undefined;
      try {
        const preview = await gateway.getMediaPreview(accessToken, bookingId, asset.mediaAssetId);
        signedUrl = preview.signedUrl;
      } catch (error) {
        previewError = describeApiError(error);
      }
      let derivedId: string | undefined;
      let deriveStatus: 'ready' | 'failed' = 'failed';
      let deriveError: string | undefined;
      try {
        const derived = await gateway.deriveAsset(
          accessToken,
          bookingId,
          asset.mediaAssetId,
          asset.revision,
          key + ':derive',
        );
        derivedId = derived.derivedAssetId;
        deriveStatus = 'ready';
        setDerivedAssetIds((ids) =>
          ids.includes(derived.derivedAssetId) ? ids : [...ids, derived.derivedAssetId],
        );
      } catch (dErr: unknown) {
        deriveStatus = 'failed';
        deriveError = invitationErrorMessage(dErr, 'Chưa thể tạo ảnh phái sinh cho thiệp.');
      }
      setUploadedMediaList((prev) => [
        {
          mediaAssetId: asset.mediaAssetId,
          revision: asset.revision,
          altText: mediaAltText.trim(),
          previewPath: asset.previewPath,
          signedUrl,
          previewError,
          derivedAssetId: derivedId,
          deriveStatus,
          deriveError,
        },
        ...prev,
      ]);
      setSelectedFile(null);
      setMediaAltText('');
      uploadKeyRef.current = null;
      notify.success(
        `Đã tải lên tệp ảnh thành công! ${derivedId ? 'Ảnh đã sẵn sàng dùng trong thiệp.' : 'Có thể thử lại tạo ảnh cho thiệp bên dưới.'}`,
      );
    } catch (err: unknown) {
      notify.error(invitationErrorMessage(err, 'Không thể tải lên hình ảnh.'));
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleRetryDerive = async (item: {
    mediaAssetId: string;
    revision: number;
    altText: string;
  }) => {
    if (derivingAssetId) return;
    setDerivingAssetId(item.mediaAssetId);
    const signature = `retry-derive:${item.mediaAssetId}:${item.revision}`;
    const key = getOrGenerateKey(deriveKeyRef, signature, 'derive-image');
    try {
      const derived = await gateway.deriveAsset(
        accessToken,
        bookingId,
        item.mediaAssetId,
        item.revision,
        key,
      );
      setDerivedAssetIds((ids) =>
        ids.includes(derived.derivedAssetId) ? ids : [...ids, derived.derivedAssetId],
      );
      setUploadedMediaList((prev) =>
        prev.map((m) =>
          m.mediaAssetId === item.mediaAssetId
            ? {
                ...m,
                derivedAssetId: derived.derivedAssetId,
                deriveStatus: 'ready' as const,
                deriveError: undefined,
              }
            : m,
        ),
      );
      deriveKeyRef.current = null;
      notify.success('Đã tạo ảnh phái sinh cho thiệp thành công!');
    } catch (err: unknown) {
      notify.error(invitationErrorMessage(err, 'Không thể tạo ảnh phái sinh.'));
    } finally {
      setDerivingAssetId(null);
    }
  };

  const handleInsertImageIntoDesign = (derivedAssetId: string) => {
    setDerivedAssetIds((ids) => (ids.includes(derivedAssetId) ? ids : [...ids, derivedAssetId]));
    notify.success('Đã thêm ảnh vào bản thảo thiệp. Hãy nhấn "Lưu Bản Thiết Kế" để cập nhật.');
  };

  const handleRemoveImageFromDesign = (derivedAssetId: string) => {
    setDerivedAssetIds((ids) => ids.filter((id) => id !== derivedAssetId));
    setDesigns(removeDerivedAssetFromDesigns(designs, derivedAssetId));
    notify.success('Đã bỏ ảnh khỏi bản thảo thiệp. Hãy lưu thiết kế để ghi nhận thay đổi.');
  };

  const handleDetachMedia = async (
    mediaAssetId: string,
    revision: number,
    derivedAssetId?: string,
  ) => {
    if (detachingAssetId) return;
    const agreed = await confirm({
      title: 'Gỡ ảnh gốc khỏi hồ sơ?',
      description:
        'Ảnh gốc và ảnh đã chuẩn bị cho thiệp sẽ bị gỡ vĩnh viễn, thiệp đang dùng ảnh này cũng sẽ bỏ ảnh. Thao tác không thể hoàn tác.',
      confirmLabel: 'Gỡ ảnh',
      tone: 'danger',
    });
    if (!agreed) return;
    setDetachingAssetId(mediaAssetId);
    const signature = `${mediaAssetId}:${revision}`;
    const key = getOrGenerateKey(detachKeyRef, signature, 'detach-media');
    try {
      await gateway.detachMedia(accessToken, bookingId, mediaAssetId, revision, key);
      setUploadedMediaList((prev) => prev.filter((m) => m.mediaAssetId !== mediaAssetId));
      if (derivedAssetId) {
        setDerivedAssetIds((ids) => ids.filter((id) => id !== derivedAssetId));
        setDesigns(removeDerivedAssetFromDesigns(designs, derivedAssetId));
      }
      detachKeyRef.current = null;
      notify.success('Đã gỡ bỏ hình ảnh gốc và làm sạch tham chiếu trong bản thảo thiệp.');
    } catch (err: unknown) {
      notify.error(invitationErrorMessage(err, 'Không thể gỡ bỏ hình ảnh.'));
    } finally {
      setDetachingAssetId(null);
    }
  };

  const retryMediaPreview = async (mediaAssetId: string) => {
    if (previewingAssetId !== null) return;
    setPreviewingAssetId(mediaAssetId);
    try {
      const preview = await browserSession.authorize((token) =>
        gateway.getMediaPreview(token, bookingId, mediaAssetId),
      );
      setUploadedMediaList((current) =>
        current.map((item) =>
          item.mediaAssetId === mediaAssetId
            ? { ...item, signedUrl: preview.signedUrl, previewError: undefined }
            : item,
        ),
      );
    } catch (error) {
      const friendly = describeApiError(error);
      setUploadedMediaList((current) =>
        current.map((item) =>
          item.mediaAssetId === mediaAssetId ? { ...item, previewError: friendly } : item,
        ),
      );
    } finally {
      setPreviewingAssetId(null);
    }
  };

  return {
    selectedFile,
    setSelectedFile,
    mediaAltText,
    setMediaAltText,
    isUploadingMedia,
    previewingAssetId,
    detachingAssetId,
    derivingAssetId,
    isDragging,
    setIsDragging,
    uploadedMediaList,
    setUploadedMediaList,
    assetPreviewMap,
    studioAssets,
    handleUploadMedia,
    handleRetryDerive,
    handleInsertImageIntoDesign,
    handleRemoveImageFromDesign,
    handleDetachMedia,
    retryMediaPreview,
  };
}
