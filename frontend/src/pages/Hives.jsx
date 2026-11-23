import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Honeycomb } from '../components/Honeycomb';
import { Icon } from '../components/Icons';
import { useApp } from '../context/AppContext';
import { HIVES_FALLBACK, ZONES, BREEDS, STAGE } from '../services/mockData';
import { api } from '../services/api';

const ST = { ok: 'Khỏe mạnh', warn: 'Cần theo dõi', bad: 'Có vấn đề' };
const ago = (m) =>
  m < 60
    ? m + ' phút'
    : m < 1440
    ? Math.floor(m / 60) + ' giờ'
    : Math.floor(m / 1440) + ' ngày';

export function Hives() {
  const navigate = useNavigate();
  const { openSheet, closeSheet } = useApp();

  const [hives, setHives] = useState(HIVES_FALLBACK);
  const [filter, setFilter] = useState({
    q: '',
    status: 'all',
    zone: 'all',
    breed: 'all',
    age: 'all',
    sort: 'id',
    view: 'matrix', // 'matrix' | 'list'
  });

  // Tải danh sách từ backend nếu kết nối được
  useEffect(() => {
    api.getHives()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const merged = HIVES_FALLBACK.map((fh) => {
            const dbHive = data.find((d) => d.id === fh.n || d.code === fh.code);
            if (!dbHive) return fh;
            const normStatus = dbHive.status === 'watch' ? 'warn' : dbHive.status || fh.status;
            return {
              ...fh,
              status: normStatus,
              issue: dbHive.issue || fh.issue,
              zone: dbHive.zone || fh.zone,
            };
          });
          setHives(merged);
        }
      })
      .catch(() => {});
  }, []);

  const counts = { ok: 0, warn: 0, bad: 0 };
  hives.forEach((h) => {
    const s = h.status === 'watch' ? 'warn' : h.status;
    if (counts[s] !== undefined) counts[s]++;
  });

  const matchesFilter = (h) => {
    const q = filter.q.trim().toLowerCase();
    if (q) {
      const idMatch = (h.id || h.code || '').toLowerCase().includes(q);
      const numMatch = String(h.n) === q.replace(/\D/g, '') && /\d/.test(q);
      if (!idMatch && !numMatch) return false;
    }
    if (filter.status !== 'all') {
      const hStatus = h.status === 'watch' ? 'warn' : h.status;
      if (hStatus !== filter.status) return false;
    }
    if (filter.zone !== 'all' && h.zone !== filter.zone) return false;
    if (filter.breed !== 'all' && h.breed !== filter.breed) return false;
    if (filter.age === 'lt3' && !(h.age < 3)) return false;
    if (filter.age === '3-12' && !(h.age >= 3 && h.age <= 12)) return false;
    if (filter.age === 'gt12' && !(h.age > 12)) return false;
    return true;
  };

  const filteredHives = hives.filter(matchesFilter);

  // Sắp xếp dạng list
  const sortedList = [...filteredHives].sort((a, b) => {
    const o = { bad: 0, warn: 1, ok: 2 };
    if (filter.sort === 'created') return b.created - a.created;
    if (filter.sort === 'yield') return b.yield - a.yield;
    if (filter.sort === 'alert') {
      return (o[a.status] - o[b.status]) || ((a.mins || 1e9) - (b.mins || 1e9));
    }
    return a.n - b.n;
  });

  // Mở sheet xem nhanh khi bấm vào ô lục giác
  const handleSelectHive = (h) => {
    openSheet(
      <div>
        <div className="hd">
          <h3>{h.id || h.code}</h3>
          <span className={`st ${h.status}`}>
            <i />
            {ST[h.status]}
          </span>
        </div>
        <div className="hint" style={{ marginTop: 4 }}>
          Khu {h.zone} · {h.breed}
          {h.issue ? ` · ${h.issue}` : ''}
        </div>
        <div className="cur" style={{ marginTop: 12 }}>
          <div>
            <div className="l">Nhiệt độ</div>
            <div className="v">
              {h.t}
              <small>°C</small>
            </div>
          </div>
          <div>
            <div className="l">Độ ẩm</div>
            <div className="v">
              {h.h}
              <small>%</small>
            </div>
          </div>
          <div>
            <div className="l">Hoạt động</div>
            <div className="v">
              {h.act}
              <small>/phút</small>
            </div>
          </div>
        </div>
        <button
          className="btn"
          style={{ marginTop: 14 }}
          onClick={() => {
            closeSheet();
            navigate(`/hives/${h.n}`);
          }}
        >
          Xem chi tiết
        </button>
      </div>
    );
  };

  // Mở sheet xem tất cả các thùng có vấn đề
  const handleOpenIssuesSheet = () => {
    const iss = hives.filter((h) => h.issue).sort((a, b) => a.mins - b.mins);
    const nb = iss.filter((x) => x.status === 'bad').length;

    openSheet(
      <div>
        <div className="hd">
          <h3>Các thùng có vấn đề</h3>
          <button className="ibtn" onClick={closeSheet} aria-label="Đóng">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="hint" style={{ marginTop: 4 }}>
          {iss.length} thùng: {nb} có vấn đề · {iss.length - nb} cần theo dõi
        </div>
        <div style={{ marginTop: 8 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Thùng</th>
                <th>Vấn đề</th>
                <th>Mức độ</th>
                <th className="r">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {iss.map((h) => (
                <tr
                  key={h.n}
                  className="clk"
                  onClick={() => {
                    closeSheet();
                    navigate(`/hives/${h.n}`);
                  }}
                >
                  <td className="code">{h.id || h.code}</td>
                  <td>{h.issue}</td>
                  <td>
                    <span className={`st ${h.status}`}>
                      <i />
                      {h.status === 'bad' ? 'Cao' : 'Trung bình'}
                    </span>
                  </td>
                  <td className="num">{ago(h.mins)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const problemHives = hives.filter((h) => h.issue).sort((a, b) => (a.mins || 0) - (b.mins || 0));

  // Thống kê giai đoạn
  const stages = { new: 0, grow: 0, soon: 0, done: 0 };
  hives.forEach((h) => {
    if (stages[h.stage] !== undefined) stages[h.stage]++;
  });
  const avgAge = hives.reduce((s, h) => s + (h.age || 0), 0) / (hives.length || 1);

  return (
    <>
      <div className="pagehead">
        <h1>Quản lý đàn ong</h1>
        <div className="sub">Theo dõi từng thùng theo thời gian thực</div>
      </div>

      <section className="kpis" aria-label="Tổng quan nhanh">
        <div className="kpi">
          <div className="v">{hives.length}</div>
          <div className="l">Tổng thùng</div>
        </div>
        <div className="kpi">
          <div className="v">{counts.ok}</div>
          <div className="l">
            <span className="st ok">
              <i /> Hoạt động tốt
            </span>
          </div>
        </div>
        <div className="kpi">
          <div className="v">{counts.warn}</div>
          <div className="l">
            <span className="st warn">
              <i /> Cảnh báo
            </span>
          </div>
        </div>
        <div className="kpi">
          <div className="v">{counts.bad}</div>
          <div className="l">
            <span className="st bad">
              <i /> Có vấn đề
            </span>
          </div>
        </div>
      </section>

      <section className="card" aria-label="Bộ lọc và tìm kiếm">
        <div className="search">
          <Icon name="search" size={18} />
          <input
            type="search"
            placeholder="Tìm mã thùng, ví dụ VB-023"
            value={filter.q}
            onChange={(e) => setFilter({ ...filter, q: e.target.value })}
            aria-label="Tìm theo mã thùng"
            autoComplete="off"
          />
        </div>

        <div className="chips" role="group" aria-label="Lọc theo trạng thái">
          {['all', 'ok', 'warn', 'bad'].map((stKey) => (
            <button
              key={stKey}
              className={`chip ${stKey === 'warn' ? 'chip-warn' : ''}`}
              data-v={stKey}
              aria-pressed={filter.status === stKey}
              onClick={() => setFilter({ ...filter, status: stKey })}
            >
              {stKey !== 'all' && (
                <span className={`st ${stKey}`}>
                  <i />
                </span>
              )}
              {stKey === 'all'
                ? 'Tất cả'
                : stKey === 'ok'
                ? 'Bình thường'
                : stKey === 'warn'
                ? 'Cảnh báo'
                : 'Có vấn đề'}
            </button>
          ))}
        </div>

        <div className="two" style={{ marginTop: 10 }}>
          <div className="fld">
            <label htmlFor="fz">Khu vực</label>
            <select
              id="fz"
              value={filter.zone}
              onChange={(e) => setFilter({ ...filter, zone: e.target.value })}
            >
              <option value="all">Tất cả khu</option>
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  Khu {z}
                </option>
              ))}
            </select>
          </div>
          <div className="fld">
            <label htmlFor="fb">Giống ong</label>
            <select
              id="fb"
              value={filter.breed}
              onChange={(e) => setFilter({ ...filter, breed: e.target.value })}
            >
              <option value="all">Tất cả giống</option>
              {BREEDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="fld">
            <label htmlFor="fa">Tuổi đàn</label>
            <select
              id="fa"
              value={filter.age}
              onChange={(e) => setFilter({ ...filter, age: e.target.value })}
            >
              <option value="all">Mọi tuổi</option>
              <option value="lt3">Dưới 3 tháng</option>
              <option value="3-12">3–12 tháng</option>
              <option value="gt12">Trên 12 tháng</option>
            </select>
          </div>
          <div className="fld">
            <label htmlFor="fs">Sắp xếp (dạng danh sách)</label>
            <select
              id="fs"
              value={filter.sort}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  sort: e.target.value,
                  view: e.target.value !== 'id' ? 'list' : filter.view,
                })
              }
            >
              <option value="id">ID thùng</option>
              <option value="created">Ngày tạo</option>
              <option value="yield">Sản lượng</option>
              <option value="alert">Mức độ cảnh báo</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="hd">
          <h2>Ma trận thùng ong</h2>
          <div className="seg" role="group" aria-label="Kiểu hiển thị">
            <button
              aria-pressed={filter.view === 'matrix'}
              onClick={() => setFilter({ ...filter, view: 'matrix' })}
            >
              Ma trận
            </button>
            <button
              aria-pressed={filter.view === 'list'}
              onClick={() => setFilter({ ...filter, view: 'list' })}
            >
              Danh sách
            </button>
          </div>
        </div>

        <div className="hint" style={{ marginTop: 4 }}>
          {filteredHives.length === hives.length
            ? 'Chạm vào thùng để xem nhanh'
            : `Khớp ${filteredHives.length}/${hives.length} thùng`}
        </div>

        {filter.view === 'matrix' ? (
          <Honeycomb
            hives={hives}
            filterZone={filter.zone}
            matchesFilter={matchesFilter}
            onSelectHive={handleSelectHive}
          />
        ) : (
          <div className="rows" style={{ marginTop: 8 }}>
            {sortedList.length === 0 ? (
              <div className="empty">Không có thùng nào khớp bộ lọc.</div>
            ) : (
              sortedList.slice(0, 40).map((h) => (
                <button
                  key={h.n}
                  className="rowb"
                  onClick={() => navigate(`/hives/${h.n}`)}
                >
                  <span className="id">{h.id || h.code}</span>
                  <span>
                    <span className="m">
                      Khu {h.zone} · {h.breed} · {h.t}°C · {h.h}%
                    </span>
                  </span>
                  <span className={`st ${h.status}`}>
                    <i />
                    {ST[h.status]}
                  </span>
                </button>
              ))
            )}
            {sortedList.length > 40 && (
              <div className="hint" style={{ marginTop: 8 }}>
                Hiển thị 40/{sortedList.length} thùng. Dùng bộ lọc để thu hẹp.
              </div>
            )}
          </div>
        )}

        <div className="legend">
          <span className="st ok">
            <i /> Bình thường
          </span>
          <span className="st warn">
            <i /> Cần theo dõi
          </span>
          <span className="st bad">
            <i /> Có vấn đề
          </span>
        </div>
      </section>

      <section className="card">
        <div className="hd">
          <h2>Các thùng có vấn đề</h2>
          <button
            className="ibtn"
            aria-label="Xem toàn bộ thùng có vấn đề"
            onClick={handleOpenIssuesSheet}
          >
            <Icon name="menu" size={22} />
          </button>
        </div>
        <div style={{ marginTop: 4 }}>
          {problemHives.length === 0 ? (
            <div className="empty">Không có thùng nào gặp vấn đề.</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Thùng</th>
                  <th>Vấn đề</th>
                  <th>Mức độ</th>
                  <th className="r">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {problemHives.slice(0, 4).map((h) => (
                  <tr
                    key={h.n}
                    className="clk"
                    onClick={() => navigate(`/hives/${h.n}`)}
                  >
                    <td className="code">{h.id || h.code}</td>
                    <td>{h.issue}</td>
                    <td>
                      <span className={`st ${h.status}`}>
                        <i />
                        {h.status === 'bad' ? 'Cao' : 'Trung bình'}
                      </span>
                    </td>
                    <td className="num">{ago(h.mins)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Thống kê nhanh</h2>
        <div className="tiles">
          <div className="tile">
            <div className="v">{stages.new}</div>
            <div className="l">Đàn mới</div>
          </div>
          <div className="tile">
            <div className="v">{stages.grow}</div>
            <div className="l">Đang phát triển</div>
          </div>
          <div className="tile">
            <div className="v">{stages.soon}</div>
            <div className="l">Sắp thu hoạch</div>
          </div>
          <div className="tile">
            <div className="v">{stages.done}</div>
            <div className="l">Đã thu hoạch</div>
          </div>
        </div>
        <div className="hint" style={{ marginTop: 10 }}>
          Tuổi đàn trung bình: {avgAge.toFixed(1)} tháng
        </div>
      </section>
    </>
  );
}
