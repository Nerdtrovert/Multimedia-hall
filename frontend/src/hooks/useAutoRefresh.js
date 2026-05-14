import { useEffect, useRef } from 'react';

const isPageVisible = () =>
  typeof document !== 'undefined' && document.visibilityState === 'visible';

const useAutoRefresh = (refreshFn, intervalMs = 10000, enabled = true) => {
  const refreshRef = useRef(refreshFn);

  useEffect(() => {
    refreshRef.current = refreshFn;
  }, [refreshFn]);

  useEffect(() => {
    if (!enabled) return undefined;

    const intervalId = setInterval(() => {
      if (!isPageVisible()) return;

      Promise.resolve(refreshRef.current()).catch((err) => {
        console.error('Auto refresh failed:', err);
      });
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [enabled, intervalMs]);
};

export default useAutoRefresh;
