import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { HIVES_FALLBACK, STAGE } from '../services/mockData';

const initials = (n) => {
  const p = String(n || '').trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

const maskPhone = (p) => {
  const s = String(p || '').replace(/\D/g, '');
  return s.length >= 6 ? s.slice(0, 3) + '• ••• ' + s.slice(-3) : s;
};

function ProfileSheetContent({ account, onSave, onCancel }) {
  const [name, setName] = useState(account.name || '');
  const [phone, setPhone] = useState(account.phone || '');
  const [email, setEmail] = useState(account.email || '');
  const [err, setErr] = useState('');

  const handleSave = () => {
    const trimmedName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '');
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      setErr('Nhập họ tên (từ 2 ký tự).');
      return;
    }
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      setErr('Số điện thoại cần 10–11 chữ số.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setErr('Email không hợp lệ.');
      return;
    }

    onSave({ name: trimmedName, phone: cleanPhone, email: trimmedEmail });
  };

  return (
    <div>
      <div className="hd">
        <h3>Chỉnh sửa hồ sơ</h3>
        <button className="ibtn" onClick={onCancel} aria-label="Đóng">
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="fld" style={{ marginTop: 10 }}>
        <label htmlFor="pName">Họ và tên</label>
        <input
          id="pName"
          type="text"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="fld">
        <label htmlFor="pPhone">Số điện thoại</label>
        <input
          id="pPhone"
          type="tel"
          inputMode="numeric"
          maxLength={11}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
      </div>
      <div className="fld">
        <label htmlFor="pMail">Email</label>
        <input
          id="pMail"
          type="email"
          maxLength={60}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn" style={{ marginTop: 14 }} onClick={handleSave}>
        Lưu thay đổi
      </button>
      <button className="btn ghost" style={{ marginTop: 8 }} onClick={onCancel}>
        Hủy
      </button>
    </div>
  );
}

function PassSheetContent({ onSave, onCancel }) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [repPw, setRepPw] = useState('');
  const [err, setErr] = useState('');

  const handleSave = () => {
    if (!oldPw) {
      setErr('Nhập mật khẩu hiện tại.');
      return;
    }
    if (newPw.length < 6) {
      setErr('Mật khẩu mới cần ít nhất 6 ký tự.');
      return;
    }
    if (newPw !== repPw) {
      setErr('Mật khẩu nhập lại không khớp.');
      return;
    }
    onSave();
  };

  return (
    <div>
      <div className="hd">
        <h3>Đổi mật khẩu</h3>
        <button className="ibtn" onClick={onCancel} aria-label="Đóng">
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="hint" style={{ marginTop: 6 }}>
        Bản demo — mật khẩu không được lưu.
      </div>
      <div className="fld" style={{ marginTop: 10 }}>
        <label htmlFor="pOld">Mật khẩu hiện tại</label>
        <input
          id="pOld"
          type="password"
          value={oldPw}
          onChange={(e) => setOldPw(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div className="fld">
        <label htmlFor="pNew">Mật khẩu mới</label>
        <input
          id="pNew"
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className="fld">
        <label htmlFor="pRep">Nhập lại mật khẩu mới</label>
        <input
          id="pRep"
          type="password"
          value={repPw}
          onChange={(e) => setRepPw(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn" style={{ marginTop: 14 }} onClick={handleSave}>
        Cập nhật mật khẩu
      </button>
    </div>
  );
}

function SessSheetContent({ onCancel }) {
  return (
    <div>
      <div className="hd">
        <h3>Thiết bị đăng nhập</h3>
        <button className="ibtn" onClick={onCancel} aria-label="Đóng">
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="prow" style={{ marginTop: 10 }}>
        <Icon name="user" size={18} />
        <span className="grow">
          Chrome · Android
          <span className="m">Thiết bị này · đang hoạt động</span>
        </span>
      </div>
      <div className="prow">
        <Icon name="phone" size={18} />
        <span className="grow">
          Safari · iPhone
          <span className="m">Đăng nhập 02/10/2026</span>
        </span>
      </div>
      <div className="hint" style={{ marginTop: 12 }}>
        Bản demo chưa có phiên đăng nhập thật.
      </div>
    </div>
  );
}

function MemberSheetContent({ onAdd, onCancel }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Quản lý');
  const [err, setErr] = useState('');

  const handleSave = () => {
    const trimmedName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '');

    if (trimmedName.length < 2) {
      setErr('Nhập họ tên thành viên.');
      return;
    }
    if (cleanPhone && (cleanPhone.length < 10 || cleanPhone.length > 11)) {
      setErr('Số điện thoại cần 10–11 chữ số.');
      return;
    }

    const scope =
      role === 'Quản lý'
        ? 'Thùng + Kho'
        : role === 'Kế toán'
        ? 'Tài chính'
        : 'Thùng';

    onAdd({
      name: trimmedName,
      phone: cleanPhone,
      role,
      scope,
      zones: '—',
    });
  };

  return (
    <div>
      <div className="hd">
        <h3>Thêm thành viên</h3>
        <button className="ibtn" onClick={onCancel} aria-label="Đóng">
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="fld" style={{ marginTop: 10 }}>
        <label htmlFor="mName">Họ và tên</label>
        <input
          id="mName"
          type="text"
          maxLength={40}
          placeholder="Ví dụ: Võ Thị Bích"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="fld">
        <label htmlFor="mPhone">Số điện thoại</label>
        <input
          id="mPhone"
          type="tel"
          inputMode="numeric"
          maxLength={11}
          placeholder="0900000000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div className="fld">
        <label htmlFor="mRole">Vai trò</label>
        <select
          id="mRole"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option>Quản lý</option>
          <option>Nhân viên</option>
          <option>Kế toán</option>
        </select>
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn" style={{ marginTop: 14 }} onClick={handleSave}>
        Thêm thành viên
      </button>
    </div>
  );
}

function ConfirmSheetContent({ title, text, okText, onOk, onCancel }) {
  return (
    <div>
      <h3>{title}</h3>
      <div className="hint" style={{ marginTop: 8 }}>
        {text}
      </div>
      <button className="btn" style={{ marginTop: 14 }} onClick={onOk}>
        {okText}
      </button>
      <button className="btn ghost" style={{ marginTop: 8 }} onClick={onCancel}>
        Hủy
      </button>
    </div>
  );
}

export function Account() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const {
    account,
    setAccount,
    items,
    txns,
    fromRoute,
    showToast,
    openSheet,
    closeSheet,
  } = useApp();

  const handleToggle = (key) => {
    if (key.startsWith('noti.')) {
      const notiKey = key.split('.')[1];
      const nextNoti = { ...account.noti, [notiKey]: !account.noti[notiKey] };
      setAccount({ ...account, noti: nextNoti });
    } else {
      setAccount({ ...account, [key]: !account[key] });
    }
  };

  const handleProfileSheet = () => {
    openSheet(
      <ProfileSheetContent
        account={account}
        onSave={(data) => {
          setAccount({ ...account, ...data });
          closeSheet();
          showToast('Đã lưu hồ sơ');
        }}
        onCancel={closeSheet}
      />
    );
  };

  const handlePassSheet = () => {
    openSheet(
      <PassSheetContent
        onSave={() => {
          closeSheet();
          showToast('Đã cập nhật (bản demo, không lưu)');
        }}
        onCancel={closeSheet}
      />
    );
  };

  const handleSessSheet = () => {
    openSheet(<SessSheetContent onCancel={closeSheet} />);
  };

  const handleMemberSheet = () => {
    openSheet(
      <MemberSheetContent
        onAdd={(newMember) => {
          const nextMembers = [...(account.members || []), newMember];
          setAccount({ ...account, members: nextMembers });
          closeSheet();
          showToast('Đã thêm thành viên');
        }}
        onCancel={closeSheet}
      />
    );
  };

  const handleReset = () => {
    openSheet(
      <ConfirmSheetContent
        title="Khôi phục dữ liệu mẫu?"
        text="Mọi thay đổi bạn đã thêm (ghi nhận, giao dịch, tồn kho, nhân sự) sẽ mất và trang sẽ tải lại."
        okText="Khôi phục"
        onOk={() => {
          localStorage.clear();
          window.location.reload();
        }}
        onCancel={closeSheet}
      />
    );
  };

  const handleLogout = () => {
    openSheet(
      <ConfirmSheetContent
        title="Đăng xuất?"
        text="Đây là bản xem trước, chưa có đăng nhập thật — bạn vẫn sẽ ở lại trang."
        okText="Đăng xuất"
        onOk={() => {
          closeSheet();
          showToast('Bản demo — không có phiên đăng nhập thật');
        }}
        onCancel={closeSheet}
      />
    );
  };

  const handleExportCSV = () => {
    const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const STAGE_LABEL = {
      bro: 'Ấu trùng / Nhộng',
      hon: 'Thu mật',
      dev: 'Phát triển đàn',
      div: 'Chuẩn bị chia đàn',
      new: 'Đàn mới',
      grow: 'Đang phát triển',
      soon: 'Sắp thu hoạch',
      done: 'Đã thu hoạch',
    };
    const ST_LABEL = { ok: 'Bình thường', warn: 'Cần theo dõi', bad: 'Có vấn đề' };
    const STOCK_LABEL = { ok: 'Đủ hàng', warn: 'Sắp hết', bad: 'Hết hàng' };
    const stockSt = (i) => (i.qty <= 0 ? 'bad' : i.qty <= i.min ? 'warn' : 'ok');
    const isoDay = (d) => new Date(d).toISOString().split('T')[0];

    const rows = [];
    rows.push(['VietBee – Xuất dữ liệu', 'Ngày xuất: ' + isoDay(Date.now())]);
    rows.push([]);
    rows.push(['PHAN 1: DANH SACH THUNG ONG']);
    rows.push([
      'Mã',
      'Khu',
      'Giống',
      'Giai đoạn',
      'Tuổi (tháng)',
      'Nhiệt độ (°C)',
      'Độ ẩm (%)',
      'Hoạt động (/phút)',
      'Trạng thái',
      'Vấn đề',
      'Sản lượng (kg)',
    ]);
    HIVES_FALLBACK.forEach((h) =>
      rows.push([
        h.id,
        h.zone,
        h.breed,
        STAGE_LABEL[h.stage] || STAGE[h.stage] || h.stage,
        h.age,
        h.t,
        h.h,
        h.act,
        ST_LABEL[h.status] || h.status,
        h.issue || '',
        h.yield || 0,
      ])
    );
    rows.push([]);
    rows.push(['PHAN 2: TON KHO']);
    rows.push([
      'Mã',
      'Tên hàng',
      'Loại',
      'Số lượng',
      'Đơn vị',
      'Ngưỡng nhắc',
      'Đơn giá (VNĐ)',
      'Giá trị (VNĐ)',
      'Trạng thái',
    ]);
    items.forEach((i) =>
      rows.push([
        i.code,
        i.name,
        i.cat,
        i.qty,
        i.unit,
        i.min,
        i.price,
        i.qty * i.price,
        STOCK_LABEL[stockSt(i)],
      ])
    );
    rows.push([]);
    rows.push(['PHAN 3: GIAO DICH']);
    rows.push(['Ngày', 'Loại', 'Danh mục', 'Mô tả', 'Số tiền (triệu VNĐ)']);
    txns
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach((t) =>
        rows.push([
          t.date,
          t.type === 'in' ? 'Thu' : 'Chi',
          t.cat,
          t.desc,
          t.amt,
        ])
      );

    const csv = '\uFEFF' + rows.map((r) => r.map(q).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vietbee_${isoDay(Date.now())}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
    showToast('Đã xuất tệp CSV');
  };

  const notiActiveCount = Object.values(account.noti || {}).filter(Boolean).length;
  const backTarget = fromRoute && fromRoute !== '/account' ? fromRoute : '/';

  return (
    <>
      <button className="back" onClick={() => navigate(backTarget)}>
        <Icon name="left" size={18} />
        Quay lại
      </button>

      <div className="pagehead">
        <h1>Tài khoản</h1>
        <div className="sub">Hồ sơ và cài đặt của bạn</div>
      </div>

      <section className="card" style={{ marginTop: 0 }}>
        <div className="prof">
          <div className="avatar" aria-hidden="true">
            {initials(account.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="nm">{account.name}</div>
            <div className="rl">
              {account.role}{' '}
              <span className="st ok">
                <i /> Đang hoạt động
              </span>
            </div>
          </div>
          <button
            className="btn ghost sm"
            style={{ margin: '0 0 0 auto', flex: 'none' }}
            onClick={handleProfileSheet}
          >
            Chỉnh sửa
          </button>
        </div>
        <div className="prow">
          <Icon name="phone" size={18} />
          <span className="grow">
            {maskPhone(account.phone)}
            <span className="m">Số điện thoại</span>
          </span>
        </div>
        <div className="prow">
          <Icon name="mail" size={18} />
          <span className="grow">
            {account.email}
            <span className="m">Email</span>
          </span>
        </div>
      </section>

      <section className="card">
        <h2>Thông tin trang trại</h2>
        <button
          className="prow"
          style={{
            width: '100%',
            borderTop: 0,
            background: 'none',
            textAlign: 'left',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          <Icon name="pin" size={18} />
          <span className="grow">
            <b style={{ fontWeight: 600 }}>{account.farm}</b>
            <span className="m">
              Long Khánh, Đồng Nai · {HIVES_FALLBACK.length} thùng · 4 khu · thành lập 03/2019
            </span>
          </span>
          <span className="ch" style={{ marginLeft: 'auto', color: 'var(--muted)' }}>
            <Icon name="chev" size={16} />
          </span>
        </button>
      </section>

      <section className="card">
        <h2>Giao diện</h2>
        <div
          className="seg full"
          role="group"
          aria-label="Giao diện"
          style={{ marginTop: 10 }}
        >
          <button
            aria-pressed={theme === 'auto'}
            onClick={() => setTheme('auto')}
          >
            Tự động
          </button>
          <button
            aria-pressed={theme === 'light'}
            onClick={() => setTheme('light')}
          >
            Sáng
          </button>
          <button
            aria-pressed={theme === 'dark'}
            onClick={() => setTheme('dark')}
          >
            Tối
          </button>
        </div>
        <div className="hint" style={{ marginTop: 8 }}>
          "Tự động" theo cài đặt hệ thống của bạn.
        </div>
      </section>

      <section className="card">
        <div className="hd">
          <h2>Thông báo</h2>
          <span className="hint">{notiActiveCount}/4 đang bật</span>
        </div>
        <div style={{ marginTop: 4 }}>
          <button
            className="actrow"
            role="switch"
            aria-checked={Boolean(account.noti?.hive)}
            onClick={() => handleToggle('noti.hive')}
          >
            <span>
              <b>Cảnh báo thùng ong</b>
              <span className="m">Nhiệt độ, độ ẩm, thiên địch</span>
            </span>
            <span className={`swt ${account.noti?.hive ? 'on' : ''}`}>
              <span className="swk" />
            </span>
          </button>

          <button
            className="actrow"
            role="switch"
            aria-checked={Boolean(account.noti?.stock)}
            onClick={() => handleToggle('noti.stock')}
          >
            <span>
              <b>Tồn kho sắp hết</b>
              <span className="m">Nhắc khi hàng dưới ngưỡng</span>
            </span>
            <span className={`swt ${account.noti?.stock ? 'on' : ''}`}>
              <span className="swk" />
            </span>
          </button>

          <button
            className="actrow"
            role="switch"
            aria-checked={Boolean(account.noti?.report)}
            onClick={() => handleToggle('noti.report')}
          >
            <span>
              <b>Báo cáo doanh thu tuần</b>
              <span className="m">Gửi mỗi Thứ Hai</span>
            </span>
            <span className={`swt ${account.noti?.report ? 'on' : ''}`}>
              <span className="swk" />
            </span>
          </button>

          <button
            className="actrow"
            role="switch"
            aria-checked={Boolean(account.noti?.quiet)}
            onClick={() => handleToggle('noti.quiet')}
          >
            <span>
              <b>Giờ yên lặng 22h–6h</b>
              <span className="m">Tạm ngưng thông báo đêm</span>
            </span>
            <span className={`swt ${account.noti?.quiet ? 'on' : ''}`}>
              <span className="swk" />
            </span>
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Bảo mật</h2>
        <button className="actrow" onClick={handlePassSheet}>
          <span>
            <b>Đổi mật khẩu</b>
            <span className="m">Cập nhật định kỳ để bảo vệ tài khoản</span>
          </span>
          <span className="ch">
            <Icon name="chev" size={16} />
          </span>
        </button>

        <button
          className="actrow"
          role="switch"
          aria-checked={Boolean(account.twofa)}
          onClick={() => handleToggle('twofa')}
        >
          <span>
            <b>Xác thực 2 lớp (2FA)</b>
            <span className="m">Yêu cầu mã khi đăng nhập thiết bị mới</span>
          </span>
          <span className={`swt ${account.twofa ? 'on' : ''}`}>
            <span className="swk" />
          </span>
        </button>

        <button className="actrow" onClick={handleSessSheet}>
          <span>
            <b>Thiết bị đăng nhập</b>
            <span className="m">2 phiên đang hoạt động</span>
          </span>
          <span className="ch">
            <Icon name="chev" size={16} />
          </span>
        </button>
      </section>

      <section className="card">
        <div className="hd">
          <h2>Nhân sự &amp; phân quyền</h2>
          <span className="hint">{(account.members || []).length} người</span>
        </div>
        <div className="rows">
          {(account.members || []).map((m, idx) => (
            <div key={idx} className="rowb" style={{ cursor: 'default' }}>
              <span className="memav">{initials(m.name)}</span>
              <span>
                <b style={{ fontWeight: 600 }}>{m.name}</b>
                <br />
                <span className="m">
                  {m.scope} · {m.zones}
                </span>
              </span>
              <span className="rolechip">{m.role}</span>
            </div>
          ))}
        </div>
        <button
          className="btn ghost"
          style={{ marginTop: 12 }}
          onClick={handleMemberSheet}
        >
          <Icon name="users" size={16} /> Thêm thành viên
        </button>
      </section>

      <section className="card">
        <h2>Dữ liệu</h2>
        <button className="actrow" onClick={handleExportCSV}>
          <span>
            <b>Xuất dữ liệu (.csv)</b>
            <span className="m">Thùng ong · tồn kho · giao dịch</span>
          </span>
          <span className="ch">
            <Icon name="chev" size={16} />
          </span>
        </button>
        <button className="actrow" onClick={handleReset}>
          <span>
            <b>Khôi phục dữ liệu mẫu</b>
            <span className="m">Đưa mọi thay đổi về trạng thái ban đầu</span>
          </span>
          <span className="ch">
            <Icon name="chev" size={16} />
          </span>
        </button>
      </section>

      <button
        className="btn ghost"
        style={{ marginTop: 14 }}
        onClick={handleLogout}
      >
        <Icon name="out" size={16} /> Đăng xuất
      </button>

      <div className="ver">VietBee v1.0 · Dữ liệu mẫu</div>
    </>
  );
}
