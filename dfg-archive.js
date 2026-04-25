import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, getDocs, orderBy, query }
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

function formatPeriod(startDate, endDate) {
  if (!startDate) return '';
  const s = new Date(startDate), e = endDate ? new Date(endDate) : null;
  const sd = s.getFullYear() + '/' + (s.getMonth()+1) + '/' + s.getDate();
  const ed = e ? (' - ' + (e.getMonth()+1) + '/' + e.getDate()) : '';
  return sd + ed;
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

const NEWLINE = String.fromCharCode(10);

async function loadAndRender() {
  const snap = await getDocs(collection(db, 'open_exhibitions'));
  const exhibitions = snap.docs.map(d => d.data());

  // 年別グループ化・ソート
  const byYear = {};
  exhibitions.forEach(ex => {
    if (!ex.startDate) return;
    const year = new Date(ex.startDate).getFullYear();
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(ex);
  });

  const years = Object.keys(byYear).map(Number).sort((a,b) => b-a);

  // 統計更新
  const total = exhibitions.length;
  const totalParticipants = exhibitions.reduce((sum, ex) => sum + (ex.participants || 0), 0);
  const statNums = document.querySelectorAll('.stat-number');
  if (statNums[0]) statNums[0].textContent = total + '+';
  if (statNums[1]) statNums[1].textContent = totalParticipants + '+';

    // 年リンク生成
  const yearLinksEl = document.getElementById('year-links-container');
  yearLinksEl.innerHTML = years.map(function(y, i) {
    return '<a class="year-link' + (i===0 ? ' active' : '') + '" data-year="' + y + '">' + y + '</a>';
  }).join('');

  // タイムライン生成
  const timeline = document.getElementById('timeline');
  timeline.innerHTML = years.map(function(year) {
    const exs = byYear[year].sort(function(a,b) { return new Date(b.startDate) - new Date(a.startDate); });
    const cards = exs.map(function(ex) {
      const period = formatPeriod(ex.startDate, ex.endDate);
      const recruitBadge = ex.recruitUrl
        ? '<a href="' + escHtml(ex.recruitUrl) + '" class="report-badge recruit" target="_blank" rel="noopener noreferrer">📝 募集要項</a>'
        : '';
      const reportBadges = (ex.reportUrls || []).map(function(url, ri) {
        const label = ex.reportUrls.length > 1 ? ('レポート' + (ri+1)) : 'レポート';
        return '<a href="' + escHtml(url) + '" class="report-badge report" target="_blank" rel="noopener noreferrer">📄 ' + label + '</a>';
      }).join('');
      const imgHtml = ex.imageUrl
        ? '<img decoding="async" src="' + escHtml(ex.imageUrl) + '" alt="' + escHtml(ex.title) + '">'
        : '';
      const desc = escHtml(ex.description||'').split(NEWLINE).join('<br>');
      return '<div class="exhibition">'
        + '<div class="exhibition-content" data-title="' + escHtml(ex.title) + '" data-period="' + escHtml(period) + '" data-artists="' + (ex.participants||0) + '">'
        + '<div class="exhibition-image">'
        + imgHtml
        + '<div class="report-badges-overlay">'
        + recruitBadge
        + reportBadges
        + '</div>'
        + '</div>'
        + '<div class="speech-bubble">'
        + escHtml(ex.title) + '<br>'
        + escHtml(period) + '<br>'
        + (ex.participants||0) + '名参加<br><br>'
        + desc
        + '</div>'
        + '</div>'
        + '</div>';
    }).join('');
    return '<section class="year-section" id="year-' + year + '">'
      + '<h2 class="year-title" data-count="' + exs.length + '展示を開催">' + year + '</h2>'
      + cards
      + '</section>';
  }).join('');

    return '<section class="year-section" id="year-' + year + '">'
      + '<h2 class="year-title" data-count="' + exs.length + '展示を開催">' + year + '</h2>'
      + cards
      + '</section>';
  }).join('');

  // 年タブクリック
  document.querySelectorAll('.year-link').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.year-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const year = link.dataset.year;
      document.querySelectorAll('.year-section').forEach(s => {
        s.style.display = s.id === 'year-' + year ? '' : 'none';
      });
    });
  });

  // 最初は最新年のみ表示
  document.querySelectorAll('.year-section').forEach((s, i) => {
    if (i > 0) s.style.display = 'none';
  });
}

loadAndRender().then(() => {
  initArchivePage();
}).catch(console.error);

// Archive Page JavaScript
function initArchivePage() {
    console.log('Archive page initialization started...');
    var links = document.querySelectorAll('.year-link');
    for (var i = 0; i < links.length; i++) {
        (function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                var year = link.getAttribute('data-year');
                var target = document.getElementById('year-' + year);
                if (target) {
                    var top = target.offsetTop - 100;
                    window.scrollTo({ top: top, behavior: 'smooth' });
                    updateActiveYear(year);
                }
            });
        })(links[i]);
    }
    function updateActiveYear(year) {
        var allLinks = document.querySelectorAll('.year-link');
        for (var j = 0; j < allLinks.length; j++) {
            allLinks[j].classList.remove('active');
            if (allLinks[j].getAttribute('data-year') === year) {
                allLinks[j].classList.add('active');
            }
        }
    }
    function checkYearInView() {
        var yearSections = document.querySelectorAll('.year-section');
        var scrollPosition = window.scrollY + 200;
        for (var i = yearSections.length - 1; i >= 0; i--) {
            var section = yearSections[i];
            if (scrollPosition >= section.offsetTop) {
                var year = section.id.replace('year-', '');
                updateActiveYear(year);
                break;
            }
        }
    }
    function getNthChildPosition(element) {
        var parent = element.parentElement;
        var children = parent.children;
        for (var i = 0; i < children.length; i++) {
            if (children[i] === element) return i + 1;
        }
        return 1;
    }
    function updateCardVisibility() {
        var exhibitions = document.querySelectorAll('.exhibition');
        for (var i = 0; i < exhibitions.length; i++) {
            var exhibition = exhibitions[i];
            var card = exhibition.querySelector('.exhibition-content');
            if (!card) continue;
            var rect = card.getBoundingClientRect();
            var windowHeight = window.innerHeight;
            var isVisible = rect.top < windowHeight * 0.85 && rect.bottom > windowHeight * 0.15;
            var nthChild = getNthChildPosition(exhibition);
            var isOdd = nthChild % 2 === 1;
            if (isVisible) {
                card.style.animation = isOdd
                    ? 'fadein-left 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    : 'fadein-right 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards';
                card.style.opacity = '1';
            } else {
                if (rect.top < 0) {
                    card.style.animation = 'fadeOutUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                } else {
                    card.style.animation = isOdd
                        ? 'fadeout-left 0.5s ease-in forwards'
                        : 'fadeout-right 0.5s ease-in forwards';
                }
            }
        }
    }
    updateCardVisibility();
    checkYearInView();
    var scrollTimer;
    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function() {
            updateCardVisibility();
            checkYearInView();
        }, 50);
    });
    var exhibitionContents = document.querySelectorAll('.exhibition-content');
    for (var i = 0; i < exhibitionContents.length; i++) {
        exhibitionContents[i].removeAttribute('onclick');
    }
    function initMobileFlip() {
        var exhibitions = document.querySelectorAll('.exhibition');
        for (var i = 0; i < exhibitions.length; i++) {
            var exhibition = exhibitions[i];
            var newExhibition = exhibition.cloneNode(true);
            exhibition.parentNode.replaceChild(newExhibition, exhibition);
        }
        exhibitions = document.querySelectorAll('.exhibition');
        if (window.innerWidth <= 1200) {
            for (var i = 0; i < exhibitions.length; i++) {
                (function(exhibition) {
                    exhibition.addEventListener('click', function(e) {
                        if (!e.target.closest('a') && !e.target.closest('button') && !e.target.closest('.report-badge')) {
                            exhibition.classList.toggle('flipped');
                        }
                    });
                })(exhibitions[i]);
            }
        }
    }
    initMobileFlip();
    var resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() { initMobileFlip(); }, 250);
    });
}