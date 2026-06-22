import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = 'BB-ERTopQnMocIHOoi3infXShHMGKYTQyHVn3lZD14CrDB6Psc6mJM4o5QBKhT7YcQEJpq5F7I_KCGGhKqpLD7U';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'unsupported';
  loading: boolean;
}

// soldierId is optional — admins subscribe without a linked soldier
export function usePushNotifications(soldierId?: string) {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'unsupported',
    loading: true,
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (userId !== null) checkSupport();
  }, [soldierId, userId]);

  const checkSupport = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState(prev => ({ ...prev, isSupported: false, loading: false }));
      return;
    }

    const permission = Notification.permission;

    let isSubscribed = false;
    if (permission === 'granted') {
      if (soldierId) {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('soldier_id', soldierId)
          .limit(1);
        isSubscribed = (data?.length ?? 0) > 0;
      } else if (userId) {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', userId)
          .is('soldier_id', null)
          .limit(1);
        isSubscribed = (data?.length ?? 0) > 0;
      }
    }

    setState({ isSupported: true, isSubscribed, permission, loading: false });
  };

  const subscribe = useCallback(async () => {
    if (!state.isSupported) {
      toast.error('התראות לא נתמכות במכשיר זה');
      return false;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('נדחתה בקשת ההרשאה להתראות');
        setState(prev => ({ ...prev, permission, loading: false }));
        return false;
      }

      const registration = await navigator.serviceWorker.register('/sw-push.js');
      await navigator.serviceWorker.ready;

      let pushSubscription = await registration.pushManager.getSubscription();
      if (!pushSubscription) {
        pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });
      }

      const subscriptionJson = pushSubscription.toJSON();
      const keys = subscriptionJson.keys || {};

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (soldierId) {
        // Soldier-linked subscription
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            soldier_id: soldierId,
            user_id: user.id,
            endpoint: pushSubscription.endpoint,
            p256dh: keys.p256dh || '',
            auth: keys.auth || '',
          }, { onConflict: 'soldier_id,endpoint' });
        if (error) throw error;
      } else {
        // Admin / user without soldier
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            soldier_id: null,
            user_id: user.id,
            endpoint: pushSubscription.endpoint,
            p256dh: keys.p256dh || '',
            auth: keys.auth || '',
          }, { onConflict: 'user_id,endpoint' });
        if (error) throw error;
      }

      if (registration.showNotification) {
        await registration.showNotification('התראות הופעלו! 🎉', {
          body: 'תקבל התראות חכמות על משמרות, רישיונות ועוד',
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          dir: 'rtl',
          lang: 'he',
          tag: 'subscription-success',
        });
      }

      setState(prev => ({ ...prev, isSubscribed: true, permission: 'granted', loading: false }));
      toast.success('התראות הופעלו בהצלחה!');
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('שגיאה בהפעלת התראות');
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [soldierId, userId, state.isSupported]);

  const unsubscribe = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) await subscription.unsubscribe();
      }

      if (soldierId) {
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('soldier_id', soldierId);
        if (error) throw error;
      } else if (userId) {
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .is('soldier_id', null);
        if (error) throw error;
      }

      setState(prev => ({ ...prev, isSubscribed: false, loading: false }));
      toast.success('התראות בוטלו');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('שגיאה בביטול התראות');
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [soldierId, userId]);

  return { ...state, subscribe, unsubscribe, refresh: checkSupport };
}
