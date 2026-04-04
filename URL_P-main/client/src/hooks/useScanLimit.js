import { useState, useEffect } from 'react';

const useScanLimit = () => {
  const [scanCount, setScanCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const MAX_FREE_SCANS = 2;

  useEffect(() => {
    // Load scan count from localStorage
    const savedCount = localStorage.getItem('freeScanCount');
    if (savedCount) {
      setScanCount(parseInt(savedCount, 10));
    }

    const syncAuthState = () => {
      setIsLoggedIn(!!localStorage.getItem('token'));
    };

    syncAuthState();
    window.addEventListener('storage', syncAuthState);
    window.addEventListener('auth-changed', syncAuthState);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener('auth-changed', syncAuthState);
    };
  }, []);

  const incrementScanCount = () => {
    const newCount = scanCount + 1;
    setScanCount(newCount);
    localStorage.setItem('freeScanCount', newCount.toString());
  };

  const canScan = () => {
    return isLoggedIn || scanCount < MAX_FREE_SCANS;
  };

  const getRemainingScans = () => {
    if (isLoggedIn) return Infinity; // Unlimited scans for logged in users
    return Math.max(0, MAX_FREE_SCANS - scanCount);
  };

  const resetFreeScans = () => {
    setScanCount(0);
    localStorage.removeItem('freeScanCount');
  };

  return {
    scanCount,
    canScan,
    getRemainingScans,
    incrementScanCount,
    isLoggedIn,
    setIsLoggedIn,
    resetFreeScans
  };
};

export default useScanLimit;
