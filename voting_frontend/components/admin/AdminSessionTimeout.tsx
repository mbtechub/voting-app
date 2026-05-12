'use client';

import { useEffect } from 'react';

const INACTIVITY_LIMIT =
  30 * 60 * 1000; // 30 mins

export default function AdminSessionTimeout() {
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    async function logout() {
      try {
        await fetch(
          '/api/admin/auth/logout',
          {
            method: 'POST',
            credentials: 'include',
          },
        );
      } catch {}

      window.location.replace(
        '/admin/login?reason=session-expired',
      );
    }

    function resetTimer() {
      clearTimeout(timeout);

      timeout = setTimeout(() => {
        logout();
      }, INACTIVITY_LIMIT);
    }

    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ];

    events.forEach((event) => {
      window.addEventListener(
        event,
        resetTimer,
      );
    });

    resetTimer();

    return () => {
      clearTimeout(timeout);

      events.forEach((event) => {
        window.removeEventListener(
          event,
          resetTimer,
        );
      });
    };
  }, []);

  return null;
}