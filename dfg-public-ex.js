// dfg-public-ex.js
// 公募企画展早見表 - Firestoreから動的生成

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, getDocs }
  from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyAFdBPTqPUwHALpFYxy1L-XgxaFcHJpKrI",
  authDomain: "dfg-message-board.firebaseapp.com",
  projectId: "dfg-message-board",
  storageBucket: "dfg-message-board.firebasestorage.app",
  messagingSenderId: "257856032842",
  appId: "1:257856032842:web:07ff7a53077326845f96b3"
});
const db = getFirestore(app);

const statusMap = {
  '終　了': 'highlight-ended',
  '募集中': 'highlight-recruiting',
  '開催中': 'highlight-ongoing',
  '企画中': 'highlight-planning'
};

const iconMap = {
  '終　了': '<i class="fas fa-check-circle"></i>',
  '募集中': '<i class="fas fa-users"></i>',
  '開催中': '<i class="fas fa-camera"></i>',
  '企画中': '<i class="fas fa-hourglass-half"></i>'
};

const stampTemplate = `
  <div class="stamp-container">
    <div class="stamp remaining">
      <i class="fas fa-exclamation-triangle"></i>
      <span>残り\nわずか</span>
    </div>
    <div class="stamp full">
      <i class="fas fa-heart"></i>
      <span>満員\n御礼</span>
    </div>
  </div>`;

// ── ステータス自動判定 ────────────────────────
function autoStatus(ex) {
  const now = new Date();
  if (ex.startDate && ex.endDate) {
    const start = new Date(ex.startDate + 'T00:00:00+09:00');
    const end   = new Date(ex.endDate   + 'T23:59:59+09:00');
    if (end < now)   return '終　了';
    if (start <= now) return '開催中';
  }
  return ex.status || '企画中';
}

// ── 日付フォーマット ──────────────────────────
function fmtDate(d) {
  if (!d) return '';
  return d.replace(/-/g, '/');
}

function getMonth(d) {
  if (!d) return '';
  return parseInt(d.split('-')[1]) + '月';
}

// ── 行HTML生成 ────────────────────────────────
function buildRow(ex) {
  const st    = autoStatus(ex);
  const cls   = statusMap[st]   || 'highlight-planning';
  const icon  = iconMap[st]     || iconMap['企画中'];
  const month = getMonth(ex.startDate);
  // 会期：初日を1行目、最終日を2行目に(横幅をコンパクトにするため)
  const period = ex.startDate && ex.endDate
    ? fmtDate(ex.startDate) + '<br>〜' + fmtDate(ex.endDate)
    : '—';
  const detail = 'スペース: ' + (ex.space || '—') + '<br>'
    + 'ブース数: ' + (ex.booths || '—') + '<br>'
    + '出展料金: ' + (ex.price || '—');
  const linkBtn = ex.recruitUrl
    ? '<button class="link-button" data-url="' + ex.recruitUrl + '">リンク</button>'
    : '<button class="link-button" disabled>リンク</button>';
  // スタンプ(残りわずか/満員御礼)は募集中の演出なので、
  // 開催中・終了になったら自動で非表示にする
  const stampVal = (st === '開催中' || st === '終　了') ? '' : (ex.stamp || '');

  return '<tr class="collapsible-row ' + cls + '" data-stamp="' + stampVal + '">'
    + '<td class="has-text-align-center" data-align="center">'
    +   '<div class="icon-title">' + icon + '<span class="status-title">' + st + '</span></div>'
    + '</td>'
    + '<td class="has-text-align-center" data-align="center">' + month + '</td>'
    + '<td class="has-text-align-center" data-align="center">' + (ex.title || '—') + '</td>'
    + '<td class="has-text-align-center" data-align="center">' + period + '</td>'
    + '<td class="has-text-align-center" data-align="center">' + detail + '</td>'
    + '<td class="has-text-align-center" data-align="center">' + linkBtn + '</td>'
    + '</tr>';
}

// ── テーブル生成 ──────────────────────────────
function buildTable(year, rows) {
  const sorted = rows.sort((a, b) => {
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return new Date(a.startDate) - new Date(b.startDate);
  });

  return '<figure class="wp-block-table aligncenter custom-stripe-table is-style-stripes custom-table">'
    + '<table style="border-style:none;border-width:0px"><thead><tr>'
    + '<th class="has-text-align-center">ステータス</th>'
    + '<th class="has-text-align-center">開催月</th>'
    + '<th class="has-text-align-center">タイトル・テーマ</th>'
    + '<th class="has-text-align-center">会期</th>'
    + '<th class="has-text-align-center">詳細</th>'
    + '<th class="has-text-align-center">募集要項</th>'
    + '</tr></thead><tbody>'
    + sorted.map(buildRow).join('')
    + '</tbody></table></figure>';
}

// ── スタンプ初期化 ────────────────────────────
function initStamps(container) {
  container.querySelectorAll('tr.collapsible-row').forEach(row => {
    const lastCell = row.querySelector('td:last-child');
    if (!lastCell) return;
    if (!lastCell.querySelector('.stamp-container')) {
      lastCell.insertAdjacentHTML('beforeend', stampTemplate);
    }
    const stamp = row.dataset.stamp || '';
    lastCell.querySelectorAll('.stamp').forEach(s => s.style.display = 'none');
    if (stamp === 'remaining') {
      const el = lastCell.querySelector('.stamp.remaining');
      if (el) el.style.display = 'flex';
    } else if (stamp === 'full') {
      const el = lastCell.querySelector('.stamp.full');
      if (el) el.style.display = 'flex';
    }
  });
}

// ── リンクボタン初期化 ────────────────────────
function initLinkButtons(container) {
  container.querySelectorAll('.link-button').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const url = this.dataset.url;
      if (url && !this.disabled) window.open(url, '_blank');
    });
  });
}

// ── メイン ────────────────────────────────────
async function main() {
  // Firestoreからデータ取得
  const snap = await getDocs(collection(db, 'open_exhibitions_table'));
  const exhibitions = snap.docs.map(d => d.data());

  // 年別グループ化
  const byYear = {};
  exhibitions.forEach(ex => {
    if (!ex.startDate) return;
    const year = parseInt(ex.startDate.split('-')[0]);
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(ex);
  });

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
  const minYear = Math.min(...years);
  // 初期表示は実際の「今年」を優先。今年の予定がまだ無ければ、
  // 従来通りデータがある最新年にフォールバックする
  const thisCalendarYear = new Date().getFullYear();
  const currentYear = years.includes(thisCalendarYear) ? thisCalendarYear : Math.max(...years);

  // table-wrapperを取得
  const wrapper = document.querySelector('.table-wrapper');
  if (!wrapper) { console.error('table-wrapper not found'); return; }

  // 既存の静的テーブルを削除
  wrapper.innerHTML = '';

  // 年ごとのテーブルを生成
  years.forEach((year, idx) => {
    const div = document.createElement('div');
    div.id = 'table-' + year;
    div.className = year === currentYear ? 'quick-active' : 'hidden';
    div.innerHTML = buildTable(year, byYear[year]);
    wrapper.appendChild(div);
    initStamps(div);
    initLinkButtons(div);
    if (year !== currentYear) {
      div.style.opacity = '0';
      div.style.visibility = 'hidden';
      div.style.position = 'absolute';
      div.style.top = '0';
      div.style.left = '0';
      div.style.width = '100%';
    }
  });

  // 年ナビのyears配列とtablesオブジェクトを更新
  window._pubExYears = years;
  window._pubExCurrentYear = currentYear;

  // tableラッパーの高さ設定
  setWrapperHeight();

  // jQuery部分の初期化（既存JSと接続）
  if (typeof jQuery !== 'undefined') {
    initJQuery(jQuery, years, currentYear, minYear, byYear);
  }

  console.log('dfg-public-ex: loaded ' + exhibitions.length + ' exhibitions for ' + years.join(', '));
}

function setWrapperHeight() {
  const wrapper = document.querySelector('.table-wrapper');
  if (!wrapper) return;
  let max = 300;
  wrapper.querySelectorAll('[id^="table-"]').forEach(t => {
    const h = t.offsetHeight || 0;
    if (h > max) max = h;
  });
  wrapper.style.minHeight = max + 'px';
}

// ── jQuery既存JSとの接続 ─────────────────────
function initJQuery($, years, currentYear, minYear, byYear) {
  let cur = currentYear;

  const tables = {};
  years.forEach(y => {
    tables[y] = {
      container: jQuery('#table-' + y),
      rows: jQuery('#table-' + y + ' .custom-table tbody tr.collapsible-row')
    };
  });

  const statusMap2 = {
    '終　了': 'highlight-ended',
    '募集中': 'highlight-recruiting',
    '開催中': 'highlight-ongoing',
    '企画中': 'highlight-planning'
  };

  const yearNav = jQuery('#year-navigation');
  const statusFilter = jQuery('#status-filter');
  const monthFilter = jQuery('#month-filter');
  const resetBtn = jQuery('#reset-filter');
  const showEndedBtn = jQuery('#show-ended');
  let showEnded = false;

  // その年に募集中/企画中の展示があるかを見て、付箋バッジの文言を決める
  function computeBadge(year) {
    const items = byYear[year] || [];
    const hasRecruiting = items.some(ex => autoStatus(ex) === '募集中');
    if (hasRecruiting) return '募集中あり';
    const hasPlanning = items.some(ex => autoStatus(ex) === '企画中');
    if (hasPlanning) return '企画中あり';
    return null;
  }

  // 前年度/今年度/来年度の候補のうち、データがある年だけカードを生成する(最大3枚)
  // 常に3スロット(左=前年度候補/中央=選択中/右=来年度候補)を生成する。
  // データが無いスロットは中身を作らず空白のまま。選択中の年度は常に中央。
  function renderYearCards() {
    yearNav.empty();
    const slots = [cur - 1, cur, cur + 1];
    slots.forEach(y => {
      const slot = jQuery('<div class="year-slot"></div>');
      if (years.includes(y)) {
        const isActive = y === cur;
        const badge = computeBadge(y);

        const card = jQuery('<div class="year-card"></div>')
          .toggleClass('is-active', isActive);

        card.append('<span class="year-card-num">' + y + '年</span>');
        if (badge) {
          // バッジはパネルの外側・右上に絶対配置(パネル本体のサイズには影響しない)
          card.append('<span class="year-card-badge">' + badge + '</span>');
        }

        if (!isActive) {
          card.on('click', function() {
            switchYear(y, y > cur ? 'next' : 'prev');
          });
        }

        slot.append(card);
      }
      yearNav.append(slot);
    });
  }

  // direction指定時は、フェードせずtransformのスライドのみで切り替える
  // (表本体と違い、年度カードは常に2〜3枚同時に見えているので、
  //  1枚をフェードイン/アウトさせる表本体の演出は不要)
  function updateNav(direction) {
    if (!direction) {
      renderYearCards();
      return;
    }
    const outOffset  = direction === 'next' ? '-20px' : '20px';
    const inOffset   = direction === 'next' ? '20px'  : '-20px';
    yearNav.css({ transition: 'transform .18s ease', transform: 'translateX(' + outOffset + ')' });
    setTimeout(() => {
      renderYearCards();
      yearNav.css({ transition: 'none', transform: 'translateX(' + inOffset + ')' });
      void yearNav[0].offsetWidth; // リフローを挟んでtransitionを確実に発火させる
      yearNav.css({ transition: 'transform .18s ease', transform: 'translateX(0)' });
    }, 180);
  }

  function applyFilter(year) {
    const t = tables[year];
    if (!t) return;
    const selStatus = statusFilter.val();
    const selMonth  = monthFilter.val();
    t.rows = jQuery('#table-' + year + ' .custom-table tbody tr.collapsible-row');
    t.rows.each(function() {
      const row = jQuery(this);
      const status = row.find('.status-title').text().trim();
      const month  = row.find('td:nth-child(2)').text().trim();
      const matchStatus = !selStatus || status === selStatus;
      const matchMonth  = !selMonth  || month  === selMonth;
      const show = matchStatus && matchMonth && (status !== '終　了' || showEnded);
      row.css('display', show ? 'table-row' : 'none');
    });
    setWrapperHeight();
  }

  function switchYear(newYear, direction) {
    if (!years.includes(newYear)) return;
    const oldYear = cur;
    cur = newYear;
    updateNav(direction);

    const oldTable = tables[oldYear]?.container;
    const newTable = tables[newYear]?.container;
    if (!oldTable || !newTable) return;

    jQuery('[id^="table-"]').not(newTable).css({ opacity: 0, visibility: 'hidden', 'z-index': 1 })
      .removeClass('active slide-in-right slide-in-left slide-out-left slide-out-right quick-active');

    newTable.css({ opacity: 0, transform: direction === 'next' ? 'translateX(100%)' : 'translateX(-100%)', visibility: 'visible', 'z-index': 2 })
      .removeClass('hidden');

    if (direction === 'next') {
      oldTable.css({ opacity: 1, transform: 'translateX(0)' }).addClass('slide-out-left');
      newTable.addClass('active slide-in-right');
    } else {
      oldTable.css({ opacity: 1, transform: 'translateX(0)' }).addClass('slide-out-right');
      newTable.addClass('active slide-in-left');
    }

    setTimeout(() => {
      oldTable.removeClass('slide-out-left slide-in-right slide-out-right slide-in-left active')
        .css({ opacity: 0, visibility: 'hidden', 'z-index': 1 });
      newTable.removeClass('slide-in-right slide-out-left slide-out-right slide-in-left')
        .css({ opacity: 1, transform: 'translateX(0)', visibility: 'visible', 'z-index': 2 })
        .addClass('active');
      setWrapperHeight();
    }, 500);

    applyFilter(cur);
  }

  // イベント
  statusFilter.off('change').on('change', function() {
    showEnded = jQuery(this).val() === '終　了';
    showEndedBtn.text(showEnded ? '終了を非表示' : '終了を表示');
    applyFilter(cur);
  });

  monthFilter.off('change').on('change', function() { applyFilter(cur); });

  resetBtn.off('click').on('click', function() {
    statusFilter.val(''); monthFilter.val('');
    showEnded = false;
    showEndedBtn.text('終了を表示');
    applyFilter(cur);
  });

  showEndedBtn.off('click').on('click', function() {
    showEnded = !showEnded;
    jQuery(this).text(showEnded ? '終了を非表示' : '終了を表示');
    applyFilter(cur);
  });

  // 初期化
  updateNav();
  applyFilter(cur);
}

// ── DOM Ready後に実行 ─────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}