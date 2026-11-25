'use client';

import React, { useEffect, useState, useCallback } from 'react';
import AlertBanner from './AlertBanner.jsx';
import Button from './Button.jsx';
import AppIcon from './AppIcon.jsx';
import { useToast } from './ToastProvider.jsx';
import { getClientToken } from '../../lib/client-auth.js';

export const OFFLINE_QUEUE_KEY = 'fnpss_offline_queue_v1';

function readQueue() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function PwaManager() {
  const toast = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshQueue = useCallback(() => {
    setPendingQueue(readQueue());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    refreshQueue();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const handleOnline = () => {
      setIsOnline(true);
      refreshQueue();
      toast.info('Connexion réseau rétablie.', 'Réseau FNPSS');
    };
    const handleOffline = () => {
      setIsOnline(false);
      refreshQueue();
    };
    const handleQueueUpdated = () => refreshQueue();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('fnpss-offline-queue-updated', handleQueueUpdated);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('fnpss-offline-queue-updated', handleQueueUpdated);
    };
  }, [refreshQueue, toast]);

  const handleSyncNow = async () => {
    const token = getClientToken();
    if (!token) {
      toast.warning('Veuillez vous connecter pour synchroniser les dossiers en file locale.', 'Session requise');
      window.location.href = '/auth/login';
      return;
    }

    const items = readQueue();
    if (items.length === 0) return;

    setIsSyncing(true);
    const remaining = [];
    let syncedCount = 0;

    try {
      for (const item of items) {
        try {
          const enqRes = await fetch('/api/pwa/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              action: 'enqueue',
              idempotencyKey: item.idempotencyKey,
              payload: item.payload
            })
          });
          if (!enqRes.ok) {
            remaining.push(item);
            continue;
          }
          syncedCount += 1;
        } catch {
          remaining.push(item);
        }
      }

      if (syncedCount > 0) {
        const syncRes = await fetch('/api/pwa/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ action: 'sync', isOnline: true })
        });
        if (!syncRes.ok) {
          toast.warning('Dossiers mis en file serveur, relancez la synchronisation dans un instant.');
        } else {
          toast.success(`${syncedCount} dossier(s) synchronisé(s) sans doublon vers le FNPSS.`, 'Synchronisation PWA réussie');
          window.dispatchEvent(new Event('fnpss-notif-refresh'));
        }
      }

      window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
      setPendingQueue(remaining);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && pendingQueue.length === 0) return null;

  return (
    <div style={{ marginBottom: '14px' }}>
      {!isOnline ? (
        <AlertBanner
          variant="warning"
          title="Mode hors-ligne actif"
          message={`Vos brouillons restent sauvegardés localement${pendingQueue.length > 0 ? ` (${pendingQueue.length} dossier(s) en file d'attente de synchronisation)` : ''}.`}
        />
      ) : (
        <AlertBanner
          variant="info"
          title={`${pendingQueue.length} dossier(s) en attente de synchronisation PWA`}
          message="Votre connexion est revenue. Synchronisez vos soumissions enregistrées hors-ligne sans risque de doublon."
          action={
            <Button size="sm" variant="brand" isLoading={isSyncing} loadingText="Synchronisation..." onClick={handleSyncNow}>
              <AppIcon name="sync" size="sm" />
              <span>Synchroniser {pendingQueue.length} dossier(s)</span>
            </Button>
          }
        />
      )}
    </div>
  );
}
