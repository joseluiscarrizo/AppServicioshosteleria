import { useEffect } from 'react';

export function useBackgroundServices({ showPushNotifications } = {}) {
  useEffect(() => {
    // Background services placeholder
    // Push notifications are handled by WebPushService
  }, [showPushNotifications]);
}