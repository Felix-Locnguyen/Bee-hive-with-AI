import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  INITIAL_ITEMS,
  INITIAL_TXNS,
  INITIAL_INV_LOG,
  INITIAL_ACCOUNT,
} from '../services/mockData';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Global Sheet & Toast
  const [sheet, setSheet] = useState({ isOpen: false, content: null });
  const [toastMsg, setToastMsg] = useState('');
  const [toastTimer, setToastTimer] = useState(null);

  // Alerts badge
  const [alertStats, setAlertStats] = useState({ unread: 5, bad_unread: 5 });

  // Navigation tracking
  const [fromRoute, setFromRoute] = useState(null);

  // Mock State for Inventory & Finance & Account
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('vietbee_items');
    return saved ? JSON.parse(saved) : INITIAL_ITEMS;
  });

  const [txns, setTxns] = useState(() => {
    const saved = localStorage.getItem('vietbee_txns');
    return saved ? JSON.parse(saved) : INITIAL_TXNS;
  });

  const [invLogs, setInvLogs] = useState(() => {
    const saved = localStorage.getItem('vietbee_inv_logs');
    return saved ? JSON.parse(saved) : INITIAL_INV_LOG;
  });

  const [account, setAccount] = useState(() => {
    const saved = localStorage.getItem('vietbee_account');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNT;
  });

  // Persist local store changes
  useEffect(() => {
    localStorage.setItem('vietbee_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('vietbee_txns', JSON.stringify(txns));
  }, [txns]);

  useEffect(() => {
    localStorage.setItem('vietbee_inv_logs', JSON.stringify(invLogs));
  }, [invLogs]);

  useEffect(() => {
    localStorage.setItem('vietbee_account', JSON.stringify(account));
  }, [account]);

  // Fetch alert count from backend if available
  const refreshAlertCount = async () => {
    try {
      const data = await api.getAlertCount();
      if (data && typeof data.unread === 'number') {
        setAlertStats(data);
      }
    } catch {
      // Keep existing count on failure
    }
  };

  useEffect(() => {
    refreshAlertCount();
    const interval = setInterval(refreshAlertCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const openSheet = (content) => {
    setSheet({ isOpen: true, content });
  };

  const closeSheet = () => {
    setSheet({ isOpen: false, content: null });
  };

  const showToast = (msg) => {
    if (toastTimer) clearTimeout(toastTimer);
    setToastMsg(msg);
    const timer = setTimeout(() => {
      setToastMsg('');
    }, 2200);
    setToastTimer(timer);
  };

  return (
    <AppContext.Provider
      value={{
        sheet,
        openSheet,
        closeSheet,
        toastMsg,
        showToast,
        alertStats,
        refreshAlertCount,
        items,
        setItems,
        txns,
        setTxns,
        invLogs,
        setInvLogs,
        account,
        setAccount,
        fromRoute,
        setFromRoute,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
