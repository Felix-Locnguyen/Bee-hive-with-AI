import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './Icons';

export function BottomNav({ onOpenCam }) {
  const location = useLocation();
  const navigate = useNavigate();

  const pathname = location.pathname;
  const isHome = pathname === '/';
  const isHives = pathname.startsWith('/hives');
  const isFinance = pathname === '/finance';
  const isInventory = pathname === '/inventory';

  return (
    <nav className="bnav" id="bnav" aria-label="Điều hướng chính">
      <ul>
        <li>
          <button
            className="bnav-item"
            data-go="home"
            aria-label="Tổng quát"
            aria-current={isHome ? 'page' : undefined}
            onClick={() => navigate('/')}
          >
            <Icon name="home" size={24} />
            <span className="bnav-lb">Tổng quát</span>
          </button>
        </li>
        <li>
          <button
            className="bnav-item"
            data-go="hives"
            aria-label="Quản lý trại"
            aria-current={isHives ? 'page' : undefined}
            onClick={() => navigate('/hives')}
          >
            <Icon name="farm" size={24} />
            <span className="bnav-lb">Quản lý trại</span>
          </button>
        </li>
        <li>
          <button
            className="bnav-item"
            data-act="cam"
            aria-label="Mở camera"
            onClick={onOpenCam}
          >
            <Icon name="cam" size={24} />
            <span className="bnav-lb">Camera</span>
          </button>
        </li>
        <li>
          <button
            className="bnav-item"
            data-go="finance"
            aria-label="Tài chính"
            aria-current={isFinance ? 'page' : undefined}
            onClick={() => navigate('/finance')}
          >
            <Icon name="wallet" size={24} />
            <span className="bnav-lb">Tài chính</span>
          </button>
        </li>
        <li>
          <button
            className="bnav-item"
            data-go="inventory"
            aria-label="Kho hàng"
            aria-current={isInventory ? 'page' : undefined}
            onClick={() => navigate('/inventory')}
          >
            <Icon name="box" size={24} />
            <span className="bnav-lb">Kho hàng</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
