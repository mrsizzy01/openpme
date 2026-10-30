import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ApiClient } from '../api/client';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: any | null;
  organization: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateExchangeRate: (newRate: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Générateur d'identifiant d'instance unique pour éviter les boucles d'écho broadcast
const CLIENT_INSTANCE_ID = 'client_' + Math.random().toString(36).substring(2, 9);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(() => ApiClient.getSavedUser());
  const [organization, setOrganization] = useState<any | null>(() => ApiClient.getSavedOrg());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { success } = useToast();
  const currentRateRef = useRef<number | null>(null);

  // Maintien à jour de la référence du taux actuel
  useEffect(() => {
    const rate = Number(organization?.settings?.exchangeRateUsdToCdf) || 2850;
    currentRateRef.current = rate;
  }, [organization]);

  // Initialisation session
  useEffect(() => {
    ApiClient.restoreSession()
        .then((res) => {
          setUser(res.user);
          setOrganization(res.organization);
        })
        .catch(() => {
          ApiClient.clearAuth();
          setUser(null);
          setOrganization(null);
        })
        .finally(() => setIsLoading(false));
  }, []);

  // Détection & synchronisation temps réel inter-onglets et Desktop via BroadcastChannel
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel('smart_pme_sync_channel');
    channel.onmessage = (event) => {
      const { type, rate, senderId } = event.data || {};
      if (senderId === CLIENT_INSTANCE_ID) return;

      if (type === 'EXCHANGE_RATE_UPDATED' && rate) {
        const numRate = Number(rate);
        if (numRate > 0 && numRate !== currentRateRef.current) {
          currentRateRef.current = numRate;
          setOrganization((prev: any) => {
            if (!prev) return prev;
            const updated = {
              ...prev,
              settings: {
                ...(prev.settings || {}),
                exchangeRateUsdToCdf: numRate,
              },
            };
            const token = ApiClient.getAccessToken() || '';
            ApiClient.setAuth(token, ApiClient.getSavedUser(), updated);
            return updated;
          });
          success(`Taux de change synchronisé en direct : 1 USD = ${numRate.toLocaleString('fr-FR')} CDF`);
        }
      }
    };

    return () => {
      channel.close();
    };
  }, [success]);

  // Heartbeat actif : détection automatique de toute modification en ligne / distant toutes les 6 secondes
  useEffect(() => {
    if (!user) return;

    const checkServerRate = async () => {
      if (!navigator.onLine) return;
      try {
        const res = await ApiClient.getMe();
        const serverRate = Number(res?.organization?.settings?.exchangeRateUsdToCdf);
        if (serverRate && serverRate > 0 && currentRateRef.current && serverRate !== currentRateRef.current) {
          currentRateRef.current = serverRate;
          setUser(res.user);
          setOrganization(res.organization);
          const token = ApiClient.getAccessToken() || '';
          ApiClient.setAuth(token, res.user, res.organization);

          // Propagation immédiate aux autres fenêtres/desktop
          if (typeof BroadcastChannel !== 'undefined') {
            const ch = new BroadcastChannel('smart_pme_sync_channel');
            ch.postMessage({
              type: 'EXCHANGE_RATE_UPDATED',
              rate: serverRate,
              senderId: CLIENT_INSTANCE_ID,
            });
            ch.close();
          }

          success(`Taux actualisé depuis le serveur : 1 USD = ${serverRate.toLocaleString('fr-FR')} CDF`);
        }
      } catch {
        // Ignorer silencieusement si coupure temporaire
      }
    };

    // Rafraîchir immédiatement lors du retour sur la fenêtre
    const handleFocus = () => {
      checkServerRate();
    };
    window.addEventListener('focus', handleFocus);

    // Polling régulier à 6 secondes
    const interval = setInterval(checkServerRate, 6000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [user, success]);

  const login = async (email: string, pass: string) => {
    const res = await ApiClient.login(email, pass);
    ApiClient.setAuth(res.accessToken, res.user, res.organization);
    setUser(res.user);
    setOrganization(res.organization);
  };

  const logout = async () => {
    try {
      await ApiClient.logout();
    } catch (err) {
      console.error('Unable to revoke the server session:', err);
    } finally {
      ApiClient.clearAuth();
      setUser(null);
      setOrganization(null);
      window.location.href = '/login';
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await ApiClient.getMe();
      setUser(res.user);
      setOrganization(res.organization);
      const token = ApiClient.getAccessToken() || '';
      ApiClient.setAuth(token, res.user, res.organization);
    } catch (e) {
      console.error(e);
    }
  };

  // Mise à jour instantanée du taux avec synchronisation globale
  const updateExchangeRate = useCallback(async (newRate: number) => {
    if (!newRate || newRate <= 0) return;
    
    // Sauvegarde vers l'API
    await ApiClient.updateOrgSettings({
      exchangeRateUsdToCdf: newRate,
    });

    currentRateRef.current = newRate;
    setOrganization((prev: any) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        settings: {
          ...(prev.settings || {}),
          exchangeRateUsdToCdf: newRate,
        },
      };
      const token = ApiClient.getAccessToken() || '';
      ApiClient.setAuth(token, ApiClient.getSavedUser(), updated);
      return updated;
    });

    // Diffusion instantanée vers l'application desktop et les autres sessions ouvertes
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel('smart_pme_sync_channel');
      ch.postMessage({
        type: 'EXCHANGE_RATE_UPDATED',
        rate: newRate,
        senderId: CLIENT_INSTANCE_ID,
      });
      ch.close();
    }

    success(`Nouveau taux de change appliqué et synchronisé : 1 USD = ${newRate.toLocaleString('fr-FR')} CDF`);
  }, [success]);

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshProfile,
        updateExchangeRate,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
