/* FinanceEN — Application Logic v3
   Fixes applied:
   1. Consolidated data.js (no more concat chains)
   2. URLSearchParams on study page — ?section= links work
   3. All save() calls wrapped in try/catch for private/incognito mode
   4. Quiz weighted by section so new sections get fair representation
   5. Hard Words Only shows clear message if empty — no silent fallback
   6. -webkit-backface-visibility fixed in CSS (Safari iOS)
   7. Grammar section gets fill-in-the-blank challenge mode
   8. initHome() reads all 9 section cards dynamically
   9. Daily streak gate — one session per day counts toward streak
   10. BADGE_DEFS array extended for 3 new sections
*/
(function () {
  'use strict';
  var KEY = 'financeEN_v3';

  /* ── State ── */
  function defaultState() {
    return {
      learned: {}, hardWords: {}, easyWords: {},
      quizAnswers: [],   // {sectionId, status:'correct'|'wrong'}
      streak: 0, lastStudyDate: null,
      totalSessions: 0, badges: {}
    };
  }

  function load() {
    try {
      // Try current key first
      var raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
      // Migration: check old keys from previous versions
      var oldKeys = ['financeEN_v2', 'financeEN_v1', 'financeEN'];
      for (var i=0; i<oldKeys.length; i++) {
        var oldRaw = localStorage.getItem(oldKeys[i]);
        if (oldRaw) {
          try {
            var oldState = JSON.parse(oldRaw);
            // Migrate: map old quizState array to new quizAnswers format
            if (oldState.quizState && !oldState.quizAnswers) {
              oldState.quizAnswers = oldState.quizState;
              delete oldState.quizState;
            }
            var migrated = Object.assign(defaultState(), oldState);
            // Save under new key immediately
            try { localStorage.setItem(KEY, JSON.stringify(migrated)); } catch(e){}
            console.log('[FinanceEN] Migrated progress from', oldKeys[i]);
            return migrated;
          } catch(e) {}
        }
      }
      return defaultState();
    } catch(e) { return defaultState(); }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch(e) { /* private/incognito — silently continue */ }
  }

  var S = load();

  /* ── DOM helpers ── */
  function qs(sel, root)  { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  /* ── Date / streak ── */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
  }

  function checkStreak() {
    var td = todayStr();
    if (S.lastStudyDate === td) return; // already counted today
    var prev = new Date(); prev.setDate(prev.getDate()-1);
    var yd = prev.getFullYear()+'-'+(prev.getMonth()+1)+'-'+prev.getDate();
    S.streak = (S.lastStudyDate === yd) ? (S.streak||0)+1 : 1;
    S.lastStudyDate = td;
    save();
  }

  /* ── Toast ── */
  function showToast(msg) {
    var t = qs('#toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show';
    clearTimeout(t._t);
    t._t = setTimeout(function(){ t.className = 'toast'; }, 2400);
  }

  /* ── Counters ── */
  function learnedCount() {
    return Object.keys(S.learned).filter(function(k){ return S.learned[k]; }).length;
  }
  function hardCount() {
    return Object.keys(S.hardWords||{}).length;
  }

  /* ── Escape HTML ── */
  function esc(s) {
    return String(s||'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Shuffle ── */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i=a.length-1; i>0; i--) {
      var j = Math.floor(Math.random()*(i+1));
      var t = a[i]; a[i]=a[j]; a[j]=t;
    }
    return a;
  }

  /* ── Badges ── */
  var BADGE_DEFS = [
    {id:'first5',    icon:'⭐', name:'First Steps',       desc:'Learn 5 terms',              check:function(){ return learnedCount()>=5; }},
    {id:'first20',   icon:'🌟', name:'Getting Started',   desc:'Learn 20 terms',             check:function(){ return learnedCount()>=20; }},
    {id:'first60',   icon:'🔵', name:'On a Roll',         desc:'Learn 60 terms',             check:function(){ return learnedCount()>=60; }},
    {id:'half',      icon:'🏅', name:'Halfway There',     desc:'Learn 210 terms',            check:function(){ return learnedCount()>=210; }},
    {id:'full',      icon:'🏆', name:'Finance Expert',    desc:'Learn all 420 terms',        check:function(){ return learnedCount()>=420; }},
    {id:'streak3',   icon:'🔥', name:'On Fire',           desc:'3-day streak',               check:function(){ return S.streak>=3; }},
    {id:'streak7',   icon:'💥', name:'Week Warrior',      desc:'7-day streak',               check:function(){ return S.streak>=7; }},
    {id:'streak30',  icon:'🌙', name:'Month Master',      desc:'30-day streak',              check:function(){ return S.streak>=30; }},
    {id:'banking',   icon:'🏦', name:'Banking Pro',       desc:'Learn all Banking terms',    check:function(){ return sectionDone('banking'); }},
    {id:'investing', icon:'📈', name:'Investor',          desc:'Learn all Investing terms',  check:function(){ return sectionDone('investing'); }},
    {id:'grammar',   icon:'💬', name:'Grammar Star',      desc:'Learn all Grammar patterns', check:function(){ return sectionDone('grammar'); }},
    {id:'insurer',   icon:'🛡️', name:'Insurance Savvy',  desc:'Learn all Insurance terms',  check:function(){ return sectionDone('insurance'); }},
    {id:'fintechie', icon:'📱', name:'Fintech Fluent',    desc:'Learn all Fintech terms',    check:function(){ return sectionDone('fintech'); }},
    {id:'taxpro',    icon:'🧾', name:'Tax Pro',           desc:'Learn all Tax terms',        check:function(){ return sectionDone('tax'); }},
    {id:'quiz10',    icon:'🧠', name:'Quiz Taker',        desc:'Answer 10 quiz questions',   check:function(){ return (S.quizAnswers||[]).length>=10; }},
    {id:'quizpro',   icon:'🎯', name:'Quiz Pro',          desc:'Get 20 quiz correct',        check:function(){ return (S.quizAnswers||[]).filter(function(q){ return q.status==='correct'; }).length>=20; }},
    {id:'hardclear', icon:'💪', name:'Hard Cleared',      desc:'Clear 10 hard words',        check:function(){ return Object.keys(S.easyWords||{}).length>=10; }}
  ];

  function sectionDone(sid) {
    var terms = VOCAB.filter(function(v){ return v.sectionId===sid; });
    return terms.length > 0 && terms.every(function(v){ return S.learned[v.id]; });
  }

  function evalBadges() {
    var got = [];
    BADGE_DEFS.forEach(function(b){
      if (!S.badges[b.id] && b.check()) { S.badges[b.id]=true; got.push(b); }
    });
    if (got.length) { save(); setTimeout(function(){ showToast('🎉 Badge: '+got[0].name+' '+got[0].icon); }, 700); }
  }

  /* ── Global UI update ── */
  function updateUI() {
    var lc = learnedCount(), total = VOCAB.length;
    var pct = total ? Math.min(100, lc/total*100) : 0;
    qsa('[data-progress-fill]').forEach(function(el){ el.style.width=pct+'%'; });
    qsa('[data-progress-text]').forEach(function(el){ el.textContent=lc+' / '+total+' learned'; });
    qsa('[data-learned-count]').forEach(function(el){ el.textContent=lc; });
    qsa('[data-streak]').forEach(function(el){ el.textContent=S.streak||0; });
    qsa('[data-hard-count]').forEach(function(el){ el.textContent=hardCount(); });
  }

  /* ════════════════════════════════════════
     HOME PAGE
  ════════════════════════════════════════ */
  function initHome() {
    if (!qs('.home-page')) return;
    checkStreak();
    updateUI();

    // Section cards — works for ALL sections dynamically
    qsa('.section-card[data-section-id]').forEach(function(card) {
      var sid = card.getAttribute('data-section-id');
      var terms = VOCAB.filter(function(v){ return v.sectionId===sid; });
      var done  = terms.filter(function(v){ return S.learned[v.id]; }).length;
      var pct   = terms.length ? (done/terms.length*100) : 0;
      var fill  = qs('.progress-fill', card);
      var cnt   = qs('.sc-progress-text', card);
      if (fill) fill.style.width = pct+'%';
      if (cnt)  cnt.textContent  = done+'/'+terms.length;
    });
  }

  /* ════════════════════════════════════════
     STUDY / FLASHCARD PAGE
  ════════════════════════════════════════ */
  function initStudy() {
    if (!qs('.study-page')) return;
    checkStreak();

    // Read ?section= URL param and pre-select dropdown + update page title
    var params = new URLSearchParams(location.search);
    var urlSection = params.get('section');
    var sectionFilter = qs('#sectionFilter');
    if (urlSection && sectionFilter) {
      var opt = sectionFilter.querySelector('option[value="'+urlSection+'"]');
      if (opt) {
        sectionFilter.value = urlSection;
        // Update page <title> and visible heading
        var secDef = SECTIONS.find(function(s){ return s.id===urlSection; });
        if (secDef) {
          document.title = secDef.label + ' · FinanceEN';
          var pageSubtitle = qs('#studyPageSubtitle');
          if (pageSubtitle) pageSubtitle.textContent = secDef.icon + ' ' + secDef.label;
        }
      }
    }

    var deck=[], idx=0;

    // DOM refs
    var fcWrap    = qs('#fcWrap');
    var fcEnglish = qs('#fcEnglish');
    var fcChinese = qs('#fcChinese');
    var fcPinyin  = qs('#fcPinyin');
    var fcBadge   = qs('#fcBadge');
    var fcExpl    = qs('#fcExpl');
    var fcExample = qs('#fcExample');
    var fcCounter = qs('#fcCounter');
    var fcProgFill= qs('#fcProgFill');
    var sessionEnd= qs('#sessionEnd');
    var sessionMain=qs('#sessionMain');
    var hwBadge   = qs('#hwBadge');
    var emptyMsg  = qs('#emptyDeckMsg');

    function buildDeck() {
      var filter = sectionFilter ? sectionFilter.value : 'all';

      // FIX: Hard Words Only — never silent fallback
      if (filter === 'hard') {
        var hardPool = VOCAB.filter(function(v){ return S.hardWords[v.id]; });
        if (!hardPool.length) {
          // show empty state — do NOT fall through to all cards
          if (sessionMain)  sessionMain.style.display = 'none';
          if (sessionEnd)   sessionEnd.classList.remove('show');
          if (emptyMsg)     emptyMsg.style.display = '';
          return [];
        }
        if (emptyMsg) emptyMsg.style.display = 'none';
        return shuffle(hardPool).slice(0, Math.min(10, hardPool.length));
      }

      if (emptyMsg) emptyMsg.style.display = 'none';

      var pool = (filter==='all')
        ? VOCAB.slice()
        : VOCAB.filter(function(v){ return v.sectionId===filter; });

      return shuffle(pool).slice(0, Math.min(10, pool.length));
    }

    function renderCard() {
      if (!deck.length) return;
      var c = deck[idx];
      if (fcWrap)    fcWrap.classList.remove('flipped');
      if (fcEnglish) fcEnglish.textContent = c.english;
      if (fcChinese) fcChinese.textContent = c.chinese;
      if (fcPinyin)  fcPinyin.textContent  = c.pinyin;
      if (fcBadge)   fcBadge.textContent   = c.section;
      if (fcExpl)    fcExpl.textContent    = c.explanation;
      if (fcExample) fcExample.textContent = c.example + '\n' + c.zh_example;
      if (fcCounter) fcCounter.textContent = (idx+1)+' / '+deck.length;
      if (fcProgFill) fcProgFill.style.width = ((idx+1)/deck.length*100)+'%';
      if (hwBadge)   hwBadge.style.display  = S.hardWords[c.id] ? '' : 'none';

      // Grammar section — challenge mode: see Chinese, recall English
      var grammarPrompt = qs('#fcGrammarPrompt');
      var grammarFill   = qs('#fcGrammarFill');
      var frontHint     = qs('#fcFrontHint');
      if (c.sectionId === 'grammar') {
        if (grammarPrompt) grammarPrompt.style.display = '';
        if (frontHint)     frontHint.style.display     = 'none';
        if (grammarFill)   grammarFill.textContent     = c.chinese;
        // Show pinyin as subtle sub-label, hide main English on front
        if (fcEnglish)     fcEnglish.style.display     = 'none';
        if (fcPinyin)      { fcPinyin.textContent = c.pinyin; }
        // On the back, show full English sentence prominently
        if (fcChinese)     fcChinese.textContent = c.english;
        if (fcPinyin)      fcPinyin.textContent  = c.chinese;
        if (fcExpl)        fcExpl.textContent    = c.explanation;
        if (fcExample)     fcExample.textContent = c.example + '\n' + c.zh_example;
      } else {
        if (grammarPrompt) grammarPrompt.style.display = 'none';
        if (frontHint)     frontHint.style.display     = '';
        if (fcEnglish)     { fcEnglish.style.display=''; fcEnglish.textContent=c.english; }
      }
    }

    function startSession() {
      deck = buildDeck();
      if (!deck.length) return;
      idx = 0;
      if (sessionEnd)  sessionEnd.classList.remove('show');
      if (sessionMain) sessionMain.style.display = '';
      renderCard();
    }

    function endSession() {
      S.totalSessions = (S.totalSessions||0)+1;
      save(); evalBadges();
      if (sessionEnd)  sessionEnd.classList.add('show');
      if (sessionMain) sessionMain.style.display = 'none';
      var hc = deck.filter(function(c){ return S.hardWords[c.id]; }).length;
      var em = qs('#endMsg');
      if (em) em.textContent = hc
        ? hc+' hard word'+(hc!==1?'s':'')+' saved for review. Go to Study → Hard Words Only.'
        : 'Great session — no hard words!';
    }

    function nextCard() {
      updateUI(); evalBadges();
      if (idx < deck.length-1) {
        idx++;
        renderCard();
        if (fcWrap) { fcWrap.classList.add('pop'); setTimeout(function(){ fcWrap.classList.remove('pop'); }, 260); }
      } else {
        endSession();
      }
    }

    // Card flip
    if (fcWrap) {
      fcWrap.addEventListener('click', function(){ fcWrap.classList.toggle('flipped'); });
    }

    // Rate buttons
    document.addEventListener('click', function(e) {
      var t = e.target;
      var card = deck[idx];
      if (!card) return;

      if (t.id==='btnHard') {
        S.hardWords[card.id] = (S.hardWords[card.id]||0)+1;
        delete S.learned[card.id];
        save(); showToast('📌 Added to hard words');
        nextCard();
      }
      if (t.id==='btnGood') {
        S.learned[card.id] = true;
        save(); nextCard();
      }
      if (t.id==='btnEasy') {
        S.learned[card.id] = true;
        S.easyWords[card.id] = true;
        delete S.hardWords[card.id];
        save(); showToast('⚡ Easy — nice!');
        nextCard();
      }
      if (t.id==='btnRestart' || t.id==='btnNextSession') {
        startSession();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      if (!qs('.study-page')) return;
      if (e.key===' '||e.key==='ArrowUp'||e.key==='ArrowDown') {
        e.preventDefault();
        if (fcWrap) fcWrap.click();
      }
      if (e.key==='1') { var b=qs('#btnHard'); if(b)b.click(); }
      if (e.key==='2') { var b=qs('#btnGood'); if(b)b.click(); }
      if (e.key==='3') { var b=qs('#btnEasy'); if(b)b.click(); }
    });

    // Swipe gestures
    var tx=0, ty=0;
    if (fcWrap) {
      fcWrap.addEventListener('touchstart', function(e){ tx=e.touches[0].clientX; ty=e.touches[0].clientY; }, {passive:true});
      fcWrap.addEventListener('touchend', function(e) {
        var dx = e.changedTouches[0].clientX - tx;
        var dy = Math.abs(e.changedTouches[0].clientY - ty);
        if (dy > 40) return; // ignore vertical scrolls
        if (Math.abs(dx) > 60) {
          if (dx < 0) { var h=qs('#btnHard'); if(h)h.click(); }
          else        { var g=qs('#btnGood'); if(g)g.click(); }
        }
      }, {passive:true});
    }

    if (sectionFilter) sectionFilter.addEventListener('change', startSession);

    startSession();
    updateUI();
  }

  /* ════════════════════════════════════════
     BROWSE PAGE
  ════════════════════════════════════════ */
  function initBrowse() {
    if (!qs('.browse-page')) return;

    var searchInput  = qs('#searchInput');
    var sectionFilter= qs('#sectionFilter');
    var termList     = qs('#termList');
    var noResults    = qs('#noResults');
    if (!termList) return;

    var SECTION_ICONS = {daily:'💴',banking:'🏦',work:'💼',business:'📊',investing:'📈',grammar:'💬',insurance:'🛡️',fintech:'📱',tax:'🧾'};

    function renderList() {
      var kw  = searchInput  ? searchInput.value.trim().toLowerCase() : '';
      var sec = sectionFilter? sectionFilter.value : 'all';

      var filtered = VOCAB.filter(function(v) {
        var secOk = (sec==='all' || v.sectionId===sec);
        if (!secOk) return false;
        if (!kw) return true;
        var txt = (v.english+' '+v.chinese+' '+v.pinyin+' '+v.explanation+' '+v.example).toLowerCase();
        return txt.indexOf(kw) > -1;
      });

      termList.innerHTML = '';
      if (noResults) noResults.classList.toggle('show', !filtered.length);

      filtered.forEach(function(v) {
        var isL = !!S.learned[v.id];
        var isH = !!S.hardWords[v.id];
        var card = document.createElement('div');
        card.className = 'term-card' + (isL?' is-learned':'');
        card.setAttribute('data-id', v.id);

        card.innerHTML =
          '<div class="term-front">' +
            '<span style="font-size:1rem;flex-shrink:0;">'+(SECTION_ICONS[v.sectionId]||'')+'</span>' +
            '<span class="tf-english">'+esc(v.english)+'</span>' +
            '<span class="tf-chinese">'+esc(v.chinese)+'</span>' +
            (isH?'<span class="badge badge-red" style="font-size:0.6rem;padding:2px 6px;">Hard</span>':'')+
            (isL?'<span class="badge badge-green" style="font-size:0.6rem;padding:2px 6px;">✓</span>':'')+
            '<span class="tf-arrow">▾</span>' +
          '</div>' +
          '<div class="term-back">' +
            '<div style="font-size:0.72rem;color:var(--text3);margin-bottom:6px;">'+esc(v.section)+'</div>' +
            '<div class="tb-explanation">'+esc(v.explanation)+'</div>' +
            '<div style="height:8px;"></div>' +
            '<div class="tb-example"><em>'+esc(v.example)+'</em></div>' +
            '<div class="tb-zh" style="margin-top:4px;">'+esc(v.zh_example)+'</div>' +
            '<div class="tb-pinyin">'+esc(v.zh_pinyin)+'</div>' +
            '<div class="term-back-actions">' +
              '<button class="btn btn-ghost btn-sm mark-learned" data-id="'+esc(v.id)+'">'+(isL?'✓ Learned':'Mark Learned')+'</button>' +
              (isH?'<button class="btn btn-red btn-sm clear-hard" data-id="'+esc(v.id)+'">Remove from Hard</button>':'')+
            '</div>' +
          '</div>';

        termList.appendChild(card);
      });
    }

    termList.addEventListener('click', function(e) {
      var ch = e.target.closest('.clear-hard');
      var ml = e.target.closest('.mark-learned');
      var fr = e.target.closest('.term-front');

      if (ch) {
        delete S.hardWords[ch.getAttribute('data-id')];
        save(); renderList(); updateUI();
        showToast('Removed from hard words');
        return;
      }
      if (ml) {
        var id = ml.getAttribute('data-id');
        S.learned[id] = !S.learned[id];
        if (!S.learned[id]) delete S.learned[id];
        save(); evalBadges(); renderList(); updateUI();
        showToast(S.learned[id] ? '✓ Marked as learned' : 'Unmarked');
        return;
      }
      if (fr) {
        var c = fr.closest('.term-card');
        if (c) c.classList.toggle('is-open');
      }
    });

    if (searchInput)   searchInput.addEventListener('input', renderList);
    if (sectionFilter) sectionFilter.addEventListener('change', renderList);

    // Scenario deep-link
    var params   = new URLSearchParams(location.search);
    var scenario = params.get('scenario');
    if (scenario && typeof SCENARIOS !== 'undefined') {
      var sc = SCENARIOS.find(function(s){ return s.id===scenario; });
      if (sc) {
        var block = qs('#scenarioBlock');
        var stitle= qs('#scenarioTitle');
        var sterms= qs('#scenarioTerms');
        if (block)  block.style.display = '';
        if (stitle) stitle.textContent  = sc.icon+' '+sc.label;
        if (sterms) {
          sterms.innerHTML = '';
          sc.terms.forEach(function(t) {
            var chip = document.createElement('span');
            chip.className = 'scenario-term';
            chip.textContent = t;
            chip.addEventListener('click', function() {
              if (searchInput) { searchInput.value=t; searchInput.dispatchEvent(new Event('input')); }
            });
            sterms.appendChild(chip);
          });
        }
      }
    }

    renderList();
    updateUI();
  }

  /* ════════════════════════════════════════
     QUIZ PAGE
     FIX: Weighted sampling — each section
     guaranteed at least 1 question per session
  ════════════════════════════════════════ */
  function initQuiz() {
    if (!qs('.quiz-page')) return;

    var deck=[], qIdx=0, score=0, answered=false, missed=[];

    var qNum      = qs('#qNum');
    var qText     = qs('#qText');
    var qOpts     = qs('#qOpts');
    var qFeedback = qs('#qFeedback');
    var qNext     = qs('#qNext');
    var qProgFill = qs('#qProgFill');
    var qProgText = qs('#qProgText');
    var qSession  = qs('#qSession');
    var qSummary  = qs('#qSummary');
    var qFinalScore=qs('#qFinalScore');
    var qFinalMsg = qs('#qFinalMsg');
    var qRestart  = qs('#qRestart');
    var qMissed   = qs('#qMissedList');

    // TRUE stratified sampling:
    // Pick 1 guaranteed question from each of 9 sections,
    // then fill remaining slot(s) randomly from leftover pool.
    function buildDeck() {
      var sections = Object.keys(QUIZ_BY_SECTION);
      var guaranteed = [];
      var leftovers  = [];

      sections.forEach(function(sec) {
        var pool = shuffle(QUIZ_BY_SECTION[sec]);
        if (pool.length > 0) {
          guaranteed.push(pool[0]);
          leftovers = leftovers.concat(pool.slice(1));
        }
      });

      // guaranteed = up to 9 (one per section); shuffle and take 9
      guaranteed = shuffle(guaranteed);
      // fill to 10 from leftovers
      var extra = shuffle(leftovers).slice(0, Math.max(0, 10 - guaranteed.length));
      deck   = shuffle(guaranteed.concat(extra)).slice(0, 10);
      qIdx   = 0; score = 0; missed = [];
      S.quizAnswers = S.quizAnswers || [];
    }

    function renderQ() {
      answered = false;
      if (qFeedback) { qFeedback.className='quiz-feedback-bar'; qFeedback.textContent=''; }
      if (qNext)     qNext.style.display = 'none';

      var q = deck[qIdx];
      if (qNum)  qNum.textContent  = 'Question '+(qIdx+1)+' of '+deck.length;
      if (qText) qText.textContent = q.q;
      if (qProgFill) qProgFill.style.width = (qIdx/deck.length*100)+'%';
      if (qProgText) qProgText.textContent = qIdx+'/'+deck.length+' answered';

      // Shuffle options, track which is correct
      var opts = shuffle(q.options.map(function(o,i){ return {text:o, correct:i===q.correct}; }));
      if (qOpts) {
        qOpts.innerHTML = '';
        opts.forEach(function(opt) {
          var btn = document.createElement('button');
          btn.className = 'quiz-opt';
          btn.textContent = opt.text;
          btn.setAttribute('data-correct', opt.correct ? '1' : '0');
          qOpts.appendChild(btn);
        });
      }
    }

    if (qOpts) {
      qOpts.addEventListener('click', function(e) {
        var btn = e.target.closest('.quiz-opt');
        if (!btn || answered) return;
        answered = true;

        var isCorrect = btn.getAttribute('data-correct') === '1';
        qsa('.quiz-opt', qOpts).forEach(function(b) {
          b.disabled = true;
          if (b.getAttribute('data-correct')==='1') b.classList.add('correct');
          else b.classList.add('dimmed');
        });

        if (isCorrect) {
          btn.classList.remove('dimmed');
          btn.classList.add('correct');
          score++;
          S.quizAnswers.push({status:'correct'});
          if (qFeedback) {
            qFeedback.textContent = '✓ Correct!';
            qFeedback.className = 'quiz-feedback-bar correct show';
          }
        } else {
          btn.classList.remove('dimmed');
          btn.classList.add('incorrect');
          missed.push(deck[qIdx]);
          S.quizAnswers.push({status:'wrong'});
          var correctText = '';
          qsa('.quiz-opt', qOpts).forEach(function(b){ if(b.getAttribute('data-correct')==='1') correctText=b.textContent; });
          if (qFeedback) {
            qFeedback.textContent = '✗ Answer: ' + correctText;
            qFeedback.className = 'quiz-feedback-bar incorrect show';
          }
        }
        save();
        if (qNext) qNext.style.display = '';
      });
    }

    if (qNext) {
      qNext.addEventListener('click', function() {
        if (qIdx < deck.length-1) { qIdx++; renderQ(); }
        else { showSummary(); }
      });
    }

    function showSummary() {
      if (qProgFill) qProgFill.style.width = '100%';
      if (qProgText) qProgText.textContent = deck.length+'/'+deck.length+' answered';
      if (qSession)  qSession.style.display = 'none';
      if (qSummary)  qSummary.classList.add('show');

      var pct = Math.round(score/deck.length*100);
      if (qFinalScore) qFinalScore.textContent = score+'/'+deck.length;
      var msg = pct>=90 ? '🎉 Outstanding!' : pct>=70 ? '👍 Good effort — keep going!' : '💪 Keep practicing!';
      if (qFinalMsg) qFinalMsg.textContent = msg;

      if (qMissed && missed.length) {
        qMissed.innerHTML = '<p class="label-sm" style="margin-bottom:8px;">Review these in Browse or Study:</p>';
        missed.forEach(function(m) {
          var d = document.createElement('div');
          d.className = 'learned-item';
          d.innerHTML = '<strong>'+esc(m.q)+'</strong>';
          qMissed.appendChild(d);
        });
      }
      evalBadges(); updateUI();
    }

    if (qRestart) {
      qRestart.addEventListener('click', function() {
        buildDeck();
        if (qSummary)  qSummary.classList.remove('show');
        if (qSession)  qSession.style.display = '';
        renderQ();
      });
    }

    buildDeck(); renderQ(); updateUI();
  }

  /* ════════════════════════════════════════
     PROGRESS PAGE
  ════════════════════════════════════════ */
  function initProgress() {
    if (!qs('.progress-page')) return;
    updateUI();
    // Dynamic total card count — never goes stale
    var tc = qs('#totalCards');
    if (tc) tc.textContent = VOCAB.length;
    // Dynamic total cards count — never stale if cards are added
    var totalStat = qs('#totalCardsStat');
    if (totalStat) totalStat.textContent = VOCAB.length;

    // Badges
    var badgeGrid = qs('#badgeGrid');
    if (badgeGrid) {
      badgeGrid.innerHTML = '';
      BADGE_DEFS.forEach(function(b) {
        var earned = !!S.badges[b.id];
        var div = document.createElement('div');
        div.className = 'badge-card ' + (earned?'earned':'locked');
        div.innerHTML =
          '<div class="bc-icon">'+b.icon+'</div>'+
          '<div class="bc-name">'+esc(b.name)+'</div>'+
          '<div class="bc-desc">'+esc(b.desc)+'</div>';
        badgeGrid.appendChild(div);
      });
    }

    // Per-section progress
    var secProg = qs('#sectionProgress');
    if (secProg) {
      secProg.innerHTML = '';
      SECTIONS.forEach(function(sec) {
        var terms = VOCAB.filter(function(v){ return v.sectionId===sec.id; });
        var done  = terms.filter(function(v){ return S.learned[v.id]; }).length;
        var pct   = terms.length ? Math.round(done/terms.length*100) : 0;
        var row = document.createElement('div');
        row.style.cssText = 'margin-bottom:16px;';
        row.innerHTML =
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'+
            '<span style="font-size:0.88rem;color:var(--text);">'+sec.icon+' '+esc(sec.label)+'</span>'+
            '<span style="font-size:0.82rem;color:var(--text3);">'+done+'/'+terms.length+'</span>'+
          '</div>'+
          '<div class="progress-track"><div class="progress-fill" style="width:'+pct+'%"></div></div>';
        secProg.appendChild(row);
      });
    }

    // Hard words
    var hardList = qs('#hardList');
    if (hardList) {
      var hids = Object.keys(S.hardWords||{}).filter(function(k){ return S.hardWords[k]; });
      hardList.innerHTML = '';
      if (!hids.length) {
        hardList.innerHTML = '<div class="learned-item muted">No hard words yet. Rate cards "Hard" during Study to track them here.</div>';
      } else {
        hids.sort().forEach(function(id) {
          var v = VOCAB.find(function(x){ return x.id===id; });
          if (!v) return;
          var div = document.createElement('div');
          div.className = 'learned-item hard-word';
          div.innerHTML =
            '<div><strong>'+esc(v.english)+'</strong> <span style="font-size:0.8rem;color:var(--text3);">'+esc(v.chinese)+'</span></div>'+
            '<small>rated hard '+S.hardWords[id]+'×</small>';
          hardList.appendChild(div);
        });
      }
    }

    // Learned list
    var learnedList = qs('#learnedList');
    if (learnedList) {
      var lids = Object.keys(S.learned).filter(function(k){ return S.learned[k]; }).sort();
      learnedList.innerHTML = '';
      if (!lids.length) {
        learnedList.innerHTML = '<div class="learned-item muted">No terms learned yet. Head to Study to get started.</div>';
      } else {
        lids.forEach(function(id) {
          var v = VOCAB.find(function(x){ return x.id===id; });
          if (!v) return;
          var div = document.createElement('div');
          div.className = 'learned-item';
          div.innerHTML =
            '<strong>'+esc(v.english)+'</strong>'+
            '<small>'+esc(v.chinese)+' · '+esc(v.section)+'</small>';
          learnedList.appendChild(div);
        });
      }
    }

    // Reset
    var resetBtn = qs('#resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        if (confirm('Reset all progress? This cannot be undone.')) {
          try { localStorage.removeItem(KEY); } catch(e){}
          location.reload();
        }
      });
    }
  }

  /* ── Boot ── */
  document.addEventListener('DOMContentLoaded', function() {
    initHome();
    initStudy();
    initBrowse();
    initQuiz();
    initProgress();
  });

})();
