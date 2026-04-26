/* FinanceEN — Main Application Logic */
(function () {
  var KEY = 'financeEN_v2';

  function defaultState() {
    return { learned:{}, hardWords:{}, easyWords:{}, quizState:[], streak:0, lastStudyDate:null, totalSessions:0, badges:{} };
  }
  function load() {
    try { return Object.assign(defaultState(), JSON.parse(localStorage.getItem(KEY)) || {}); }
    catch(e) { return defaultState(); }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(S)); }
  var S = load();

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
  }

  function showToast(msg, icon) {
    var t = qs('#toast');
    if (!t) return;
    t.innerHTML = (icon||'') + ' ' + msg;
    t.className = 'toast show';
    clearTimeout(t._timer);
    t._timer = setTimeout(function(){ t.className = 'toast'; }, 2200);
  }

  function checkStreak() {
    var td = today();
    if (S.lastStudyDate === td) return;
    var yd = new Date(); yd.setDate(yd.getDate()-1);
    var yds = yd.getFullYear()+'-'+(yd.getMonth()+1)+'-'+yd.getDate();
    if (S.lastStudyDate === yds) { S.streak = (S.streak||0)+1; }
    else { S.streak = 1; }
    S.lastStudyDate = td;
    save();
  }

  function learnedCount() {
    return Object.keys(S.learned).filter(function(k){ return S.learned[k]; }).length;
  }

  function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  var BADGE_DEFS = [
    {id:'first5',   icon:'⭐', name:'First Steps',     desc:'Learn 5 terms',            check:function(){ return learnedCount()>=5; }},
    {id:'first20',  icon:'🌟', name:'Getting Started',  desc:'Learn 20 terms',           check:function(){ return learnedCount()>=20; }},
    {id:'half',     icon:'🏅', name:'Halfway There',    desc:'Learn 60 terms',           check:function(){ return learnedCount()>=60; }},
    {id:'full',     icon:'🏆', name:'Finance Expert',   desc:'Learn all 420 terms',      check:function(){ return learnedCount()>=420; }},
    {id:'streak3',  icon:'🔥', name:'On Fire',          desc:'3-day streak',             check:function(){ return S.streak>=3; }},
    {id:'streak7',  icon:'💥', name:'Week Warrior',     desc:'7-day streak',             check:function(){ return S.streak>=7; }},
    {id:'banking',  icon:'🏦', name:'Banking Pro',      desc:'Learn all Banking terms',  check:function(){ return VOCAB.filter(function(v){ return v.sectionId==='banking'; }).every(function(v){ return S.learned[v.id]; }); }},
    {id:'grammar',  icon:'💬', name:'Grammar Star',     desc:'Learn all Grammar patterns',check:function(){ return VOCAB.filter(function(v){ return v.sectionId==='grammar'; }).every(function(v){ return S.learned[v.id]; }); }},
    {id:'quiz10',   icon:'🧠', name:'Quiz Taker',       desc:'Answer 10 quiz questions', check:function(){ return (S.quizState||[]).filter(function(q){ return q&&q.status; }).length>=10; }},
    {id:'quizpro',  icon:'🎯', name:'Quiz Pro',         desc:'Get 20 quiz correct',      check:function(){ return (S.quizState||[]).filter(function(q){ return q&&q.status==='correct'; }).length>=20; }},
    {id:'insurer',  icon:'🛡️', name:'Insurance Savvy',  desc:'Learn all Insurance terms', check:function(){ return VOCAB.filter(function(v){ return v.sectionId==='insurance'; }).every(function(v){ return S.learned[v.id]; }); }},
    {id:'fintechie',icon:'📱', name:'Fintech Fluent',   desc:'Learn all Fintech terms',   check:function(){ return VOCAB.filter(function(v){ return v.sectionId==='fintech'; }).every(function(v){ return S.learned[v.id]; }); }},
    {id:'taxpro',   icon:'🧾', name:'Tax Pro',           desc:'Learn all Tax terms',       check:function(){ return VOCAB.filter(function(v){ return v.sectionId==='tax'; }).every(function(v){ return S.learned[v.id]; }); }}
  ];

  function evalBadges() {
    var got=[];
    BADGE_DEFS.forEach(function(b){ if(!S.badges[b.id]&&b.check()){ S.badges[b.id]=true; got.push(b); } });
    if(got.length){ save(); setTimeout(function(){ showToast('Badge unlocked: '+got[0].name+' '+got[0].icon,'🎉'); },700); }
  }

  function updateAllProgressUI() {
    var learned=learnedCount(), total=VOCAB.length, pct=total?Math.min(100,learned/total*100):0;
    qsa('[data-progress-fill]').forEach(function(el){ el.style.width=pct+'%'; });
    qsa('[data-progress-text]').forEach(function(el){ el.textContent=learned+' / '+total+' learned'; });
    qsa('[data-learned-count]').forEach(function(el){ el.textContent=learned; });
    qsa('[data-streak]').forEach(function(el){ el.textContent=S.streak||0; });
    qsa('[data-hard-count]').forEach(function(el){ el.textContent=Object.keys(S.hardWords||{}).length; });
  }

  /* HOME */
  function initHome() {
    if (!qs('.home-page')) return;
    checkStreak();
    updateAllProgressUI();
    qsa('.section-card[data-section-id]').forEach(function(card) {
      var sid=card.getAttribute('data-section-id');
      var terms=VOCAB.filter(function(v){ return v.sectionId===sid; });
      var done=terms.filter(function(v){ return S.learned[v.id]; }).length;
      var pct=terms.length?(done/terms.length*100):0;
      var fill=qs('.progress-fill',card); var cnt=qs('.sc-progress-text',card);
      if(fill) fill.style.width=pct+'%';
      if(cnt)  cnt.textContent=done+'/'+terms.length;
    });
  }

  /* STUDY */
  function initStudy() {
    if (!qs('.study-page')) return;
    checkStreak();
    var sectionFilter=qs('#sectionFilter');
    var sessionDeck=[],sessionIndex=0;
    var fcWrap=qs('#fcWrap'), fcEnglish=qs('#fcEnglish'), fcChinese=qs('#fcChinese'),
        fcPinyin=qs('#fcPinyin'), fcBadge=qs('#fcBadge'), fcExpl=qs('#fcExpl'),
        fcExample=qs('#fcExample'), fcCounter=qs('#fcCounter'), fcProgFill=qs('#fcProgFill'),
        sessionEndEl=qs('#sessionEnd'), sessionMain=qs('#sessionMain');

    function shuffle(a){ var b=a.slice(); for(var i=b.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=b[i];b[i]=b[j];b[j]=t;} return b; }

    function buildDeck() {
      var filter=sectionFilter?sectionFilter.value:'all';
      var pool;
      if(filter==='hard'){ pool=VOCAB.filter(function(v){ return S.hardWords[v.id]; }); if(!pool.length) pool=VOCAB.slice(); }
      else if(filter==='all'){ pool=VOCAB.slice(); }
      else { pool=VOCAB.filter(function(v){ return v.sectionId===filter; }); }
      sessionDeck=shuffle(pool).slice(0,Math.min(10,pool.length));
      sessionIndex=0;
    }

    function renderCard() {
      if(!sessionDeck.length) return;
      var c=sessionDeck[sessionIndex];
      if(fcWrap) fcWrap.classList.remove('flipped');
      if(fcEnglish) fcEnglish.textContent=c.english;
      if(fcChinese) fcChinese.textContent=c.chinese;
      if(fcPinyin)  fcPinyin.textContent=c.pinyin;
      if(fcBadge)   fcBadge.textContent=c.section;
      if(fcExpl)    fcExpl.textContent=c.explanation;
      if(fcExample) fcExample.textContent=c.example+' / '+c.zh_example;
      if(fcCounter) fcCounter.textContent=(sessionIndex+1)+' / '+sessionDeck.length;
      if(fcProgFill) fcProgFill.style.width=((sessionIndex+1)/sessionDeck.length*100)+'%';
      var hw=qs('#hwBadge'); if(hw) hw.style.display=S.hardWords[c.id]?'':'none';
    }

    function nextCard() {
      updateAllProgressUI(); evalBadges();
      if(sessionIndex<sessionDeck.length-1){
        sessionIndex++;
        renderCard();
        if(fcWrap){ fcWrap.classList.add('pop'); setTimeout(function(){ fcWrap.classList.remove('pop'); },260); }
      } else {
        S.totalSessions=(S.totalSessions||0)+1; save(); evalBadges();
        if(sessionEndEl) sessionEndEl.classList.add('show');
        if(sessionMain) sessionMain.style.display='none';
        var hc=sessionDeck.filter(function(c){ return S.hardWords[c.id]; }).length;
        var em=qs('#endMsg'); if(em) em.textContent=hc+' hard word'+(hc!==1?'s':'')+' saved for review.';
      }
    }

    function startSession() {
      buildDeck();
      if(sessionEndEl) sessionEndEl.classList.remove('show');
      if(sessionMain) sessionMain.style.display='';
      renderCard();
    }

    if(fcWrap) fcWrap.addEventListener('click', function(){ fcWrap.classList.toggle('flipped'); });

    document.addEventListener('click', function(e) {
      var t=e.target;
      if(t.id==='btnHard'){ var c=sessionDeck[sessionIndex]; S.hardWords[c.id]=(S.hardWords[c.id]||0)+1; delete S.learned[c.id]; save(); showToast('Added to hard words 📌',''); nextCard(); }
      if(t.id==='btnGood'){ S.learned[sessionDeck[sessionIndex].id]=true; save(); nextCard(); }
      if(t.id==='btnEasy'){ var c2=sessionDeck[sessionIndex]; S.learned[c2.id]=true; S.easyWords[c2.id]=true; delete S.hardWords[c2.id]; save(); showToast('Easy — nice! ✓',''); nextCard(); }
      if(t.id==='btnRestart'||t.id==='btnNextSession'){ startSession(); }
    });

    document.addEventListener('keydown', function(e) {
      if(!qs('.study-page')) return;
      if(e.key===' '||e.key==='ArrowUp'||e.key==='ArrowDown'){ e.preventDefault(); if(fcWrap) fcWrap.click(); }
      if(e.key==='1'){ var b=qs('#btnHard'); if(b) b.click(); }
      if(e.key==='2'){ var b=qs('#btnGood'); if(b) b.click(); }
      if(e.key==='3'){ var b=qs('#btnEasy'); if(b) b.click(); }
    });

    var tx=0;
    if(fcWrap){
      fcWrap.addEventListener('touchstart',function(e){ tx=e.touches[0].clientX; },{passive:true});
      fcWrap.addEventListener('touchend',function(e){
        var dx=e.changedTouches[0].clientX-tx;
        if(Math.abs(dx)>60){ if(dx<0){ var h=qs('#btnHard'); if(h) h.click(); } else { var g=qs('#btnGood'); if(g) g.click(); } }
      },{passive:true});
    }

    if(sectionFilter) sectionFilter.addEventListener('change', startSession);
    startSession();
    updateAllProgressUI();
  }

  /* BROWSE */
  function initBrowse() {
    if (!qs('.browse-page')) return;
    var searchInput=qs('#searchInput'), sectionFilter=qs('#sectionFilter'), termList=qs('#termList');
    if(!termList) return;

    function renderList() {
      var kw=searchInput?searchInput.value.trim().toLowerCase():'';
      var sec=sectionFilter?sectionFilter.value:'all';
      var filtered=VOCAB.filter(function(v){
        var secOk=(sec==='all'||v.sectionId===sec);
        var txt=(v.english+' '+v.chinese+' '+v.pinyin+' '+v.explanation+' '+v.example).toLowerCase();
        return secOk&&(!kw||txt.indexOf(kw)>-1);
      });
      termList.innerHTML='';
      var nr=qs('#noResults'); if(nr) nr.classList.toggle('show',!filtered.length);
      filtered.forEach(function(v){
        var isL=!!S.learned[v.id], isH=!!S.hardWords[v.id];
        var card=document.createElement('div');
        card.className='term-card'+(isL?' is-learned':'');
        card.setAttribute('data-id',v.id);
        var secMeta={daily:'💴',banking:'🏦',work:'💼',business:'📊',investing:'📈',grammar:'💬'};
        card.innerHTML=
          '<div class="term-front">'+
            '<span style="font-size:1rem;flex-shrink:0;">'+(secMeta[v.sectionId]||'')+'</span>'+
            '<span class="tf-english">'+escHtml(v.english)+'</span>'+
            '<span class="tf-chinese">'+escHtml(v.chinese)+'</span>'+
            (isH?'<span class="badge badge-red" style="font-size:0.6rem;padding:2px 6px;">Hard</span>':'')+
            (isL?'<span class="badge badge-green" style="font-size:0.6rem;padding:2px 6px;">✓</span>':'')+
            '<span class="tf-arrow">▾</span>'+
          '</div>'+
          '<div class="term-back">'+
            '<div style="font-size:0.72rem;color:var(--text3);margin-bottom:6px;">'+escHtml(v.section)+'</div>'+
            '<div class="tb-explanation">'+escHtml(v.explanation)+'</div>'+
            '<div style="height:8px;"></div>'+
            '<div class="tb-example"><em>'+escHtml(v.example)+'</em></div>'+
            '<div class="tb-zh" style="margin-top:4px;">'+escHtml(v.zh_example)+'</div>'+
            '<div class="tb-pinyin">'+escHtml(v.zh_pinyin)+'</div>'+
            '<div class="term-back-actions">'+
              '<button class="btn btn-ghost btn-sm mark-learned" data-id="'+v.id+'">'+(isL?'✓ Learned':'Mark Learned')+'</button>'+
              (isH?'<button class="btn btn-red btn-sm clear-hard" data-id="'+v.id+'">Remove from Hard</button>':'')+
            '</div>'+
          '</div>';
        termList.appendChild(card);
      });
    }

    termList.addEventListener('click',function(e){
      var ch=e.target.closest('.clear-hard'), ml=e.target.closest('.mark-learned'), fr=e.target.closest('.term-front');
      if(ch){ delete S.hardWords[ch.getAttribute('data-id')]; save(); renderList(); updateAllProgressUI(); showToast('Removed from hard words',''); return; }
      if(ml){ var id=ml.getAttribute('data-id'); S.learned[id]=!S.learned[id]; if(!S.learned[id]) delete S.learned[id]; save(); evalBadges(); renderList(); updateAllProgressUI(); showToast(S.learned[id]?'Marked as learned ✓':'Unmarked',''); return; }
      if(fr){ var c=fr.closest('.term-card'); if(c) c.classList.toggle('is-open'); }
    });

    if(searchInput) searchInput.addEventListener('input',renderList);
    if(sectionFilter) sectionFilter.addEventListener('change',renderList);
    renderList();
    updateAllProgressUI();
  }

  /* QUIZ */
  function initQuiz() {
    if (!qs('.quiz-page')) return;
    var quizDeck=[],qIndex=0,score=0,answered=false,missed=[];
    var qNum=qs('#qNum'),qText=qs('#qText'),qOpts=qs('#qOpts'),qFeedback=qs('#qFeedback'),
        qNext=qs('#qNext'),qProgFill=qs('#qProgFill'),qProgText=qs('#qProgText'),
        qSummary=qs('#qSummary'),qSession=qs('#qSession'),
        qScore=qs('#qFinalScore'),qMsg=qs('#qFinalMsg'),qRestart=qs('#qRestart'),qMissed=qs('#qMissedList');

    function shuffle(a){ var b=a.slice(); for(var i=b.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=b[i];b[i]=b[j];b[j]=t;} return b; }

    function buildDeck(){ quizDeck=shuffle(QUIZ_DATA).slice(0,10); qIndex=0; score=0; missed=[]; S.quizState=[]; }

    function renderQ() {
      answered=false;
      if(qFeedback){ qFeedback.className='quiz-feedback-bar'; qFeedback.textContent=''; }
      if(qNext) qNext.style.display='none';
      var q=quizDeck[qIndex];
      if(qNum)  qNum.textContent='Question '+(qIndex+1)+' of '+quizDeck.length;
      if(qText) qText.textContent=q.q;
      if(qProgFill) qProgFill.style.width=(qIndex/quizDeck.length*100)+'%';
      if(qProgText) qProgText.textContent=qIndex+'/'+quizDeck.length+' answered';
      var opts=shuffle(q.options.map(function(o,i){ return {text:o,isCorrect:i===q.correct}; }));
      if(qOpts){
        qOpts.innerHTML='';
        opts.forEach(function(opt){
          var btn=document.createElement('button');
          btn.className='quiz-opt';
          btn.textContent=opt.text;
          btn.setAttribute('data-correct',opt.isCorrect?'1':'0');
          qOpts.appendChild(btn);
        });
      }
    }

    if(qOpts) qOpts.addEventListener('click',function(e){
      var btn=e.target.closest('.quiz-opt');
      if(!btn||answered) return;
      answered=true;
      var isCorrect=btn.getAttribute('data-correct')==='1';
      qsa('.quiz-opt',qOpts).forEach(function(b){ b.disabled=true; if(b.getAttribute('data-correct')==='1') b.classList.add('correct'); else b.classList.add('dimmed'); });
      if(isCorrect){ btn.classList.remove('dimmed'); btn.classList.add('correct'); score++; (S.quizState=S.quizState||[]).push({status:'correct'}); if(qFeedback){ qFeedback.textContent='✓ Correct!'; qFeedback.className='quiz-feedback-bar correct show'; } }
      else { btn.classList.remove('dimmed'); btn.classList.add('incorrect'); (S.quizState=S.quizState||[]).push({status:'wrong'}); missed.push(quizDeck[qIndex]); var ct=''; qsa('.quiz-opt',qOpts).forEach(function(b){ if(b.getAttribute('data-correct')==='1') ct=b.textContent; }); if(qFeedback){ qFeedback.textContent='✗ Answer: '+ct; qFeedback.className='quiz-feedback-bar incorrect show'; } }
      save();
      if(qNext) qNext.style.display='';
    });

    if(qNext) qNext.addEventListener('click',function(){ if(qIndex<quizDeck.length-1){ qIndex++; renderQ(); } else { showSummary(); } });

    function showSummary(){
      if(qProgFill) qProgFill.style.width='100%';
      if(qProgText) qProgText.textContent=quizDeck.length+'/'+quizDeck.length+' answered';
      if(qSession) qSession.style.display='none';
      if(qSummary) qSummary.classList.add('show');
      var pct=Math.round(score/quizDeck.length*100);
      if(qScore) qScore.textContent=score+'/'+quizDeck.length;
      if(qMsg) qMsg.textContent=pct>=80?'🎉 Excellent work!':pct>=60?'👍 Good effort — keep going!':'💪 Keep practicing — you\'ll get there!';
      if(qMissed&&missed.length){ qMissed.innerHTML='<p class="label-sm" style="margin-bottom:8px;">Review these:</p>'; missed.forEach(function(m){ var d=document.createElement('div'); d.className='learned-item'; d.innerHTML='<strong>'+escHtml(m.q)+'</strong><small>Study in Browse or Flashcards</small>'; qMissed.appendChild(d); }); }
      evalBadges(); updateAllProgressUI();
    }

    if(qRestart) qRestart.addEventListener('click',function(){ buildDeck(); if(qSummary) qSummary.classList.remove('show'); if(qSession) qSession.style.display=''; renderQ(); });
    buildDeck(); renderQ(); updateAllProgressUI();
  }

  /* PROGRESS */
  function initProgress() {
    if (!qs('.progress-page')) return;
    updateAllProgressUI();

    var badgeGrid=qs('#badgeGrid');
    if(badgeGrid){ badgeGrid.innerHTML=''; BADGE_DEFS.forEach(function(b){ var e=!!S.badges[b.id]; var d=document.createElement('div'); d.className='badge-card '+(e?'earned':'locked'); d.innerHTML='<div class="bc-icon">'+b.icon+'</div><div class="bc-name">'+escHtml(b.name)+'</div><div class="bc-desc">'+escHtml(b.desc)+'</div>'; badgeGrid.appendChild(d); }); }

    var secProg=qs('#sectionProgress');
    if(secProg){ secProg.innerHTML=''; SECTIONS.forEach(function(sec){ var terms=VOCAB.filter(function(v){ return v.sectionId===sec.id; }); var done=terms.filter(function(v){ return S.learned[v.id]; }).length; var pct=terms.length?Math.round(done/terms.length*100):0; var row=document.createElement('div'); row.style.cssText='margin-bottom:16px;'; row.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><span style="font-size:0.88rem;color:var(--text);">'+sec.icon+' '+escHtml(sec.label)+'</span><span style="font-size:0.82rem;color:var(--text3);">'+done+'/'+terms.length+'</span></div><div class="progress-track"><div class="progress-fill" style="width:'+pct+'%"></div></div>'; secProg.appendChild(row); }); }

    var learnedList=qs('#learnedList');
    if(learnedList){ var lids=Object.keys(S.learned).filter(function(k){ return S.learned[k]; }); learnedList.innerHTML=''; if(!lids.length){ learnedList.innerHTML='<div class="learned-item muted">No terms learned yet. Head to Study to get started.</div>'; } else { lids.sort().forEach(function(id){ var v=VOCAB.find(function(x){ return x.id===id; }); if(!v) return; var div=document.createElement('div'); div.className='learned-item'; div.innerHTML='<strong>'+escHtml(v.english)+'</strong><small>'+escHtml(v.chinese)+' · '+escHtml(v.section)+'</small>'; learnedList.appendChild(div); }); } }

    var hardList=qs('#hardList');
    if(hardList){ var hids=Object.keys(S.hardWords||{}); hardList.innerHTML=''; if(!hids.length){ hardList.innerHTML='<div class="learned-item muted">No hard words yet. Rate cards "Hard" during Study to track them.</div>'; } else { hids.sort().forEach(function(id){ var v=VOCAB.find(function(x){ return x.id===id; }); if(!v) return; var cnt=S.hardWords[id]; var div=document.createElement('div'); div.className='learned-item hard-word'; div.innerHTML='<strong>'+escHtml(v.english)+'</strong><small>'+escHtml(v.chinese)+' · rated hard '+cnt+'×</small>'; hardList.appendChild(div); }); } }

    var resetBtn=qs('#resetBtn');
    if(resetBtn) resetBtn.addEventListener('click',function(){ if(confirm('Reset all progress? This cannot be undone.')){ localStorage.removeItem(KEY); location.reload(); } });
  }

  document.addEventListener('DOMContentLoaded', function() {
    initHome(); initStudy(); initBrowse(); initQuiz(); initProgress();
  });
})();
