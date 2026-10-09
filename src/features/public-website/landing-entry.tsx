'use client';
import { useSyncExternalStore } from 'react';
import { hasBootstrapCredential, PublicIdentityPage } from '../identity-access/identity-page';
import { PublicWebsite } from './public-pages';
const subscribe = () => () => undefined;
export function LandingEntry() {
  const credential = useSyncExternalStore(subscribe, hasBootstrapCredential, () => false);
  return credential ? <PublicIdentityPage /> : <PublicWebsite />;
}
