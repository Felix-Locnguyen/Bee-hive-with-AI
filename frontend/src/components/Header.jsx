import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon, LogoMark } from './Icons';
import { useApp } from '../context/AppContext';

export function Header({ onOpenAlerts }) {
  const { alertStats, setFromRoute } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const handleUserClick = () => {
    if (location.pathname !== '/account') {
      setFromRoute(location.pathname);
    }
    navigate('/account');
  };

  return (
    <header className="top">
      <div className="grp" aria-hidden="true" />
      <Link to="/" className="logo" id="logo">
        <LogoMark size={26} />
        <span>VietBee</span>
      </Link>
      <div className="grp">
        <button
          className="ibtn"
          data-act="bell"
          aria-label="Thông báo"
          id="bellBtn"
          onClick={onOpenAlerts}
        >
          <Icon name="bell" size={22} />
          {alertStats.unread > 0 && (
            <span className="badge" id="badge">
              {alertStats.unread}
            </span>
          )}
        </button>
        <button
          className="ibtn"
          data-act="user"
          aria-label="Tài khoản"
          id="userBtn"
          onClick={handleUserClick}
        >
          <Icon name="user" size={22} />
        </button>
      </div>
    </header>
  );
}
