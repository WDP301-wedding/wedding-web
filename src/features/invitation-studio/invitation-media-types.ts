import type { FriendlyError } from '../../lib/api/api-errors';
import type { ConfirmOptions } from '../../design-system/confirm-dialog';
import type { DesignView, InvitationGateway } from './invitation-api';

export type UploadedMediaItem = {
  mediaAssetId: string;
  revision: number;
  altText: string;
  previewPath: string;
  signedUrl?: string | undefined;
  previewError?: FriendlyError | undefined;
  derivedAssetId?: string | undefined;
  deriveStatus?: 'ready' | 'failed' | 'pending' | undefined;
  deriveError?: string | undefined;
};

export interface UseInvitationMediaOptions {
  bookingId: string;
  accessToken: string;
  gateway: InvitationGateway;
  derivedAssetIds: readonly string[];
  setDerivedAssetIds: React.Dispatch<React.SetStateAction<readonly string[]>>;
  designs: readonly DesignView[];
  setDesigns: React.Dispatch<React.SetStateAction<readonly DesignView[]>>;
  previewUrl: string | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export function removeDerivedAssetFromDesigns(
  designs: readonly DesignView[],
  derivedAssetId: string,
): readonly DesignView[] {
  const currentDesign = designs[0];
  if (!currentDesign) return designs;
  const updatedSections = currentDesign.sections.filter(
    (s) => s.derivedAssetId !== derivedAssetId,
  );
  return [
    {
      ...currentDesign,
      sections: updatedSections,
    },
    ...designs.slice(1),
  ];
}

