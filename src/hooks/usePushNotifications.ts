import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// VAPID public key (publishable - safe in client code)
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

export function usePushNotifications(soldierId?: string) {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'unsupported',
    loading: true,
  });

  useEffect(() => {
    checkSupport();
  }, [soldierId]);

  const checkSupport = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState(prev => ({ ...prev, isSupported: false, loading: false }));
      return;
    }

    const permission = Notification.permission;
    
    let isSubscribed = false;
    if (soldierId && permission === 'granted') {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('soldier_id', soldierId)
        .limit(1);
      
      isSubscribed = (data?.length ?? 0) > 0;
    }

    setState({
      isSupported: true,
      isSubscribed,
      permission,
      loading: false,
    });
  };

  const subscribe = useCallback(async () => {
    if (!state.isSupported || !soldierId) {
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

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw-push.js');
      await navigator.serviceWorker.ready;

      // Subscribe to Web Push with VAPID key
      let pushSubscription = await registration.pushManager.getSubscription();
      
      if (!pushSubscription) {
        const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey as BufferSource,
        });
      }

      const subscriptionJson = pushSubscription.toJSON();
      const keys = subscriptionJson.keys || {};

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const subscriptionData = {
        soldier_id: soldierId,
        user_id: user.id,
        endpoint: pushSubscription.endpoint,
        p256dh: keys.p256dh || '',
        auth: keys.auth || '',
      };

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(subscriptionData, {
          onConflict: 'soldier_id,endpoint'
        });

      if (error) throw error;

      // Show confirmation notification
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

      setState(prev => ({ 
        ...prev, 
        isSubscribed: true, 
        permission: 'granted',
        loading: false 
      }));

      toast.success('התראות הופעלו בהצלחה!');
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('שגיאה בהפעלת התראות');
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [soldierId, state.isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!soldierId) return false;

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Unsubscribe from browser push
      const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('soldier_id', soldierId);

      if (error) throw error;

      setState(prev => ({ ...prev, isSubscribed: false, loading: false }));
      toast.success('התראות בוטלו');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('שגיאה בביטול התראות');
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [soldierId]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    refresh: checkSupport,
  };
}