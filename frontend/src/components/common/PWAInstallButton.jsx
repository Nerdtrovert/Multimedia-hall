import React, { useState, useEffect } from 'react';
import './PWAInstallButton.css';

const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isInstandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSInstalled = window.navigator.standalone === true;
    if (isInstandaloneMode || isIOSInstalled) {
      setIsInstalled(true);
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
        setIsInstalled(true);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || isInstalled) {
    return null;
  }

  return (
    <div className="pwa-install-container">
      <div className="pwa-install-prompt">
        <div className="pwa-install-content">
          <h3 className="pwa-install-title">📱 Install App</h3>
          <p className="pwa-install-description">
            Install Auditorium Booking System for quick access and offline support.
          </p>
        </div>
        <div className="pwa-install-actions">
          <button
            className="pwa-install-btn pwa-install-cancel"
            onClick={handleDismiss}
          >
            Cancel
          </button>
          <button
            className="pwa-install-btn pwa-install-accept"
            onClick={handleInstallClick}
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallButton;
