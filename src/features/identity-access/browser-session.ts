import { createIdentityApi, WebIdentitySession } from './session';

export const browserSession = new WebIdentitySession(createIdentityApi());
