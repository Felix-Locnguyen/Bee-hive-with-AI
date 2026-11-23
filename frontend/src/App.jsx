import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Sheet } from './components/Sheet';
import { Toast } from './components/Toast';
import { Icon } from './components/Icons';
import { Home } from './pages/Home';
import { Hives } from './pages/Hives';
import { HiveDetail } from './pages/HiveDetail';
import { Finance } from './pages/Finance';
import { Inventory } from './pages/Inventory';
import { Account } from './pages/Account';
import { HIVES_FALLBACK } from './services/mockData';

function AppLayout() {
  const { openSheet, closeSheet, showToast, items } = useApp();
  const navigate = useNavigate();

  const handleOpenCam = () => {
    openSheet(
      <div>
        <h3>Máy ảnh</h3>
        <div className="hint" style={{ marginTop: 6 }}>
          Quét mã QR định danh hoặc chụp ảnh tình trạng thùng.
        </div>
        <button
          className="btn"
          style={{ marginTop: 14 }}
          onClick={() => {
            handleStartQrScan();
          }}
        >
          <Icon name="hex" size={16} /> Quét mã QR thùng ong
        </button>
        <button
          className="btn ghost"
          style={{ marginTop: 8 }}
          onClick={() => {
            closeSheet();
            showToast('Bản demo — chưa bật camera thật');
          }}
        >
          <Icon name="cam" size={16} /> Chụp ảnh thùng
        </button>
      </div>
    );
  };

  const handleStartQrScan = () => {
    openSheet(
      <div>
        <div className="hd">
          <h3>Quét mã QR Thùng</h3>
          <button className="ibtn" onClick={closeSheet} aria-label="Đóng">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <div id="app-qr-reader" style={{ width: '100%', borderRadius: 12 }} />
        </div>
        <div className="hint" style={{ marginTop: 8 }}>
          Đưa camera quét mã QR dán trên thùng ong để mở chi tiết ngay.
        </div>
      </div>
    );

    setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          'app-qr-reader',
          { fps: 10, qrbox: { width: 220, height: 220 } },
          false
        );
        scanner.render(
          (decodedText) => {
            showToast(`Đã nhận diện QR: ${decodedText}`);
            scanner.clear();
            closeSheet();
            const match = decodedText.match(/(?:VB-|V)?(\d+)/i);
            if (match && match[1]) {
              navigate(`/hives/${parseInt(match[1], 10)}`);
            }
          },
          () => {}
        );
      } catch {
        showToast('Bản xem trước — không thể kích hoạt camera');
      }
    }, 150);
  };

  const handleOpenAlerts = () => {
    const issueHives = HIVES_FALLBACK.filter((h) => h.issue)
      .sort((a, b) => a.mins - b.mins)
      .slice(0, 4);

    const lowItems = items.filter((i) => i.qty <= 0 || i.qty <= i.min);

    openSheet(
      <div>
        <h3>Thông báo</h3>
        <div style={{ marginTop: 6 }}>
          {issueHives.map((h) => (
            <div
              key={h.n}
              className="nrow"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                closeSheet();
                navigate(`/hives/${h.n}`);
              }}
            >
              <span className={`st ${h.status}`}>
                <i />
              </span>
              <div>
                <b>
                  {h.id} · {h.issue}
                </b>
                <span className="m">
                  {h.mins} phút trước · Khu {h.zone}
                </span>
              </div>
            </div>
          ))}
          {lowItems.map((i) => (
            <div
              key={i.code}
              className="nrow"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                closeSheet();
                navigate('/inventory');
              }}
            >
              <span className="st bad">
                <i />
              </span>
              <div>
                <b>{i.name} sắp hết</b>
                <span className="m">
                  Còn {i.qty.toLocaleString('en-US')} {i.unit} · Kho hàng
                </span>
              </div>
            </div>
          ))}
        </div>
        <button
          className="btn ghost"
          style={{ marginTop: 14 }}
          onClick={() => {
            closeSheet();
            navigate('/hives');
          }}
        >
          Xem tất cả thùng có vấn đề
        </button>
      </div>
    );
  };

  return (
    <div className="app">
      <Header onOpenAlerts={handleOpenAlerts} />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/hives" element={<Hives />} />
          <Route path="/hives/:id" element={<HiveDetail />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/account" element={<Account />} />
        </Routes>
      </main>
      <BottomNav onOpenCam={handleOpenCam} />
      <Sheet />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}
