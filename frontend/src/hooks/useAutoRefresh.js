import { useEffect, useRef } from 'react';

const useAutoRefresh = (refreshFn, intervalMs = 10000, enabled = true) => {
  const refreshRef = useRef(refreshFn);

  useEffect(() => {
    refreshRef.current = refreshFn;
  }, [refreshFn]);

  useEffect(() => {
    if (!enabled) return undefined;

    const intervalId = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      refreshRef.current();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [enabled, intervalMs]);
};

export default useAutoRefresh;
