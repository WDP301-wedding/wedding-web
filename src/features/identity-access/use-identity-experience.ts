'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';

import { describeApiError } from '../../lib/api/api-errors';
import { ApiClientError } from '../../lib/api/client';
import { routes } from '../../routes';
import { identityErrorMessage, readField, type IdentityView } from './identity-error-utils';
import type { BootstrapCredential, WebIdentitySession, WebSessionSnapshot } from './session';

/** Khôi phục phiên, đăng nhập, nhận lời mời và chuyển giữa các màn của trang tài khoản. */
export function useIdentityExperience({
  session,
  initialCredential,
  startView,
  onAuthenticated,
}: Readonly<{
  session: WebIdentitySession;
  initialCredential: BootstrapCredential | null;
  startView: 'login' | 'reset-request';
  onAuthenticated: (() => void) | undefined;
}>) {
  const [snapshot, setSnapshot] = useState<WebSessionSnapshot>(() => session.snapshot());
  const [view, setView] = useState<IdentityView>('restoring');
  const [pending, setPending] = useState(false);
  const [credentialConsumed, setCredentialConsumed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const credentialSubmitted = useRef(false);

  useEffect(() => {
    let active = true;
    if (initialCredential !== null) {
      queueMicrotask(() => {
        if (!active) return;
        setView(initialCredential.kind === 'invitation' ? 'invitation' : 'reset-request');
      });
      return () => {
        active = false;
      };
    }

    void session
      .restore()
      .then((nextSnapshot) => {
        if (!active) return;
        setSnapshot(nextSnapshot);
        setView(startView);
      })
      .catch((caught: unknown) => {
        if (active) {
          setSnapshot(session.snapshot());
          setView(startView);
          setError(describeApiError(caught).message);
        }
      });
    return () => {
      active = false;
    };
  }, [initialCredential, session, startView]);

  const authenticated = snapshot.status === 'authenticated';
  useEffect(() => {
    if (authenticated) {
      if (onAuthenticated) {
        onAuthenticated();
      } else if (typeof window !== 'undefined') {
        window.location.assign(routes.space);
      }
    }
  }, [authenticated, onAuthenticated]);

  const run = async (operation: () => Promise<void>) => {
    setPending(true);
    setError(null);
    setFieldErrors({});
    setNotice(null);
    try {
      await operation();
    } catch (caught) {
      credentialSubmitted.current = false;
      setCredentialConsumed(false);

      if (caught instanceof ApiClientError && caught.details && caught.details.length > 0) {
        const errors: Record<string, string> = {};
        for (const detail of caught.details) {
          if (detail.path) {
            let msg = detail.message;
            if (detail.path === 'password' || detail.path === 'newPassword') {
              if (detail.code === 'too_small') {
                msg = 'Mật khẩu quá ngắn. Vui lòng nhập mật khẩu hợp lệ.';
              } else if (detail.code === 'too_big') {
                msg = 'Mật khẩu quá dài (tối đa 128 ký tự).';
              } else {
                msg = detail.message || 'Mật khẩu không hợp lệ.';
              }
            } else if (detail.path === 'email') {
              msg = 'Email không hợp lệ.';
            }
            errors[detail.path] = msg;
          }
        }
        setFieldErrors(errors);
        setError(null);
      } else if (
        caught instanceof ApiClientError &&
        (caught.status === 422 || caught.code === 'VALIDATION_ERROR') &&
        view === 'invitation'
      ) {
        setFieldErrors({
          password: 'Mật khẩu chưa hợp lệ hoặc không đáp ứng chính sách bảo mật.',
        });
        setError(null);
      } else {
        setError(identityErrorMessage(caught, view));
      }
    } finally {
      setPending(false);
    }
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = readField(form, 'email');
    const password = readField(form, 'password');
    const errors: Record<string, string> = {};
    if (!email) {
      errors.email = 'Vui lòng nhập email.';
    }
    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(null);
      return;
    }
    void run(async () => {
      const nextSnapshot = await session.login(email, password);
      setSnapshot(nextSnapshot);
    });
  };

  const handleInvitation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (credentialSubmitted.current || initialCredential?.kind !== 'invitation') return;
    const form = new FormData(event.currentTarget);
    const password = readField(form, 'password');
    const passwordConfirmation = readField(form, 'passwordConfirmation');
    const errors: Record<string, string> = {};
    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    }
    if (!passwordConfirmation) {
      errors.passwordConfirmation = 'Vui lòng xác nhận mật khẩu.';
    } else if (password !== passwordConfirmation) {
      errors.passwordConfirmation = 'Hai mật khẩu chưa trùng khớp.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(null);
      return;
    }
    credentialSubmitted.current = true;
    setCredentialConsumed(true);
    void run(async () => {
      const nextSnapshot = await session.acceptInvitation(initialCredential.token, password);
      setSnapshot(nextSnapshot);
    });
  };

  return {
    snapshot,
    view,
    setView,
    pending,
    credentialConsumed,
    error,
    fieldErrors,
    notice,
    setNotice,
    handleLogin,
    handleInvitation,
  };
}
