
(function () {
  var STORAGE_KEY = 'financeBookState';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function getState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
        learned: {},
        quizAnswered: 0,
        wrongAnswers: 0,
        quizState: [],
        flashcardOn: false
      };
    } catch (e) {
      return { learned: {}, quizAnswered: 0, wrongAnswers: 0, quizState: [], flashcardOn: false };
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  var state = getState();

  function showToast(msg, icon) {
    var toast = qs('#toast');
    if (!toast) return;
    toast.innerHTML = '<span>' + (icon || '✓') + '</span> ' + msg;
    toast.className = 'toast show';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.className = 'toast'; }, 1800);
  }

  function totalTerms() {
    var forced = document.body.getAttribute('data-total-terms');
    if (forced) return parseInt(forced, 10) || 0;
    return qsa('.mark-learned').length;
  }
  function totalQuiz() {
    var forced = document.body.getAttribute('data-total-quiz');
    if (forced) return parseInt(forced, 10) || 0;
    return qsa('.mcq-card').length;
  }

  function countLearnedTerms() {
    var n = 0;
    Object.keys(state.learned || {}).forEach(function (k) {
      if (state.learned[k]) n++;
    });
    return n;
  }

  function totalProgressCount() {
    return countLearnedTerms() + (state.quizAnswered || 0);
  }

  function updateProgressUI() {
    var total = totalTerms() + totalQuiz();
    var learned = totalProgressCount();
    var pct = total ? Math.min(100, (learned / total) * 100) : 0;

    qsa('[data-progress-fill]').forEach(function (el) { el.style.width = pct + '%'; });
    qsa('[data-progress-text]').forEach(function (el) { el.textContent = learned + ' / ' + total + ' items learned'; });
    qsa('[data-learned-count]').forEach(function (el) { el.textContent = learned; });
    qsa('[data-wrong-count]').forEach(function (el) { el.textContent = state.wrongAnswers || 0; });

    var vis = qsa('.term-card.searchable:not(.hidden-card)').length;
    qsa('[data-visible-count]').forEach(function (el) { el.textContent = vis + ' / ' + totalTerms(); });
  }

  function applyLearnedStyles() {
    qsa('.mark-learned').forEach(function (btn) {
      var term = btn.getAttribute('data-term');
      var card = btn.closest('.term-card');
      if (state.learned && state.learned[term]) {
        btn.textContent = '✓ Learned';
        btn.classList.add('learned');
        if (card) card.classList.add('is-learned');
      } else {
        btn.textContent = 'Mark Learned';
        btn.classList.remove('learned');
        if (card) card.classList.remove('is-learned');
      }
    });
  }

  function applySearchAndFilter() {
    var input = qs('#searchInput');
    var filter = qs('#sectionFilter');
    if (!input && !filter) return;

    var keyword = input ? input.value.trim().toLowerCase() : '';
    var selected = filter ? filter.value : 'all';
    var cards = qsa('.term-card.searchable');
    var sections = qsa('.section');
    var visible = 0;

    cards.forEach(function (card) {
      var secName = card.getAttribute('data-section-name') || '';
      var text = card.innerText.toLowerCase();
      var keys = (card.getAttribute('data-keywords') || '').toLowerCase();
      var secOk = (selected === 'all' || secName === selected);
      var searchOk = (!keyword || text.indexOf(keyword) > -1 || keys.indexOf(keyword) > -1);

      if (secOk && searchOk) {
        card.classList.remove('hidden-card');
        visible++;
      } else {
        card.classList.add('hidden-card');
      }
    });

    sections.forEach(function (sec) {
      var secId = sec.getAttribute('data-section');
      var secOk = (selected === 'all' || secId === selected);
      var hasVisible = qsa('.term-card.searchable:not(.hidden-card)', sec).length > 0;
      if (!secOk || !hasVisible) sec.classList.add('hidden-section');
      else sec.classList.remove('hidden-section');
    });

    var noResults = qs('#noResults');
    if (noResults) noResults.classList.toggle('show', visible === 0 && keyword !== '');
    updateProgressUI();
  }

  function setAllDetails(expand) {
    qsa('.term-card').forEach(function (card) {
      if (document.body.classList.contains('flashcard-on')) card.classList.remove('is-flipped');
      else card.classList.toggle('is-flipped', expand);
    });
    qsa('.toggle-example').forEach(function (btn) {
      btn.textContent = expand ? 'Hide Details' : 'Show Details';
    });
    var expandToggle = qs('#expandToggle');
    if (expandToggle) expandToggle.textContent = expand ? '↕ Collapse All Details' : '↕ Expand All Details';
    document.body.dataset.allExpanded = expand ? '1' : '0';
  }

  function setFlashcardMode(on, silent) {
    state.flashcardOn = !!on;
    document.body.classList.toggle('flashcard-on', !!on);
    var btn = qs('#flashcardToggle');
    if (btn) {
      btn.classList.toggle('is-active', !!on);
      btn.textContent = on ? '⚡ Flashcard: ON' : '⚡ Flashcard';
    }
    if (on) {
      qsa('.term-card').forEach(function (card) { card.classList.remove('is-flipped'); });
      qsa('.toggle-example').forEach(function (b) { b.textContent = 'Show Details'; });
      if (!silent) showToast('Flashcard Mode ON', '⚡');
    } else if (!silent) {
      showToast('Flashcard Mode OFF', '👁');
    }
    saveState(state);
  }

  function bindCards() {
    document.addEventListener('click', function (e) {
      var t = e.target;

      if (t.classList.contains('toggle-example')) {
        var card = t.closest('.term-card');
        if (!card || document.body.classList.contains('flashcard-on')) return;
        var flipped = card.classList.contains('is-flipped');
        card.classList.toggle('is-flipped', !flipped);
        t.textContent = flipped ? 'Show Details' : 'Hide Details';
      }

      if (t.classList.contains('mark-learned')) {
        var term = t.getAttribute('data-term');
        state.learned[term] = !state.learned[term];
        applyLearnedStyles();
        updateProgressUI();
        saveState(state);
        showToast(state.learned[term] ? (term + ' marked as learned!') : (term + ' unmarked'), state.learned[term] ? '✓' : '↩');
      }

      if (t.id === 'flashcardToggle') setFlashcardMode(!document.body.classList.contains('flashcard-on'));
      if (t.id === 'expandToggle') setAllDetails(document.body.dataset.allExpanded !== '1');

      if (t.id === 'resetProgress') {
        localStorage.removeItem(STORAGE_KEY);
        state = getState();
        location.reload();
      }
    });

    var searchInput = qs('#searchInput');
    var sectionFilter = qs('#sectionFilter');
    if (searchInput) searchInput.addEventListener('input', applySearchAndFilter);
    if (sectionFilter) sectionFilter.addEventListener('change', applySearchAndFilter);
  }

  function bindQuiz() {
    qsa('.mcq-card').forEach(function (card, idx) {
      var saved = (state.quizState || [])[idx];
      var options = qsa('.quiz-option', card);
      var feedback = qs('.quiz-feedback', card);
      var correctIndex = parseInt(card.getAttribute('data-correct'), 10);

      function paintSaved() {
        if (!saved || !saved.status) return;
        var selectedIndex = parseInt(saved.selected, 10);
        options.forEach(function (opt, i) {
          opt.disabled = true;
          if (i === correctIndex) opt.classList.add('correct');
          else opt.classList.add('dimmed');
        });
        if (saved.status === 'wrong' && options[selectedIndex]) {
          options[selectedIndex].classList.remove('dimmed');
          options[selectedIndex].classList.add('incorrect');
        }
        if (feedback) {
          feedback.className = 'quiz-feedback ' + (saved.status === 'correct' ? 'correct' : 'incorrect') + ' show';
          feedback.textContent = saved.status === 'correct'
            ? 'Correct! Nice job.'
            : 'Incorrect. The correct answer is: ' + options[correctIndex].textContent + '.';
        }
      }

      paintSaved();

      options.forEach(function (opt, i) {
        opt.addEventListener('click', function () {
          if ((state.quizState[idx] || {}).status) return;
          options.forEach(function (o, j) {
            o.disabled = true;
            if (j !== correctIndex && j !== i) o.classList.add('dimmed');
          });

          if (i === correctIndex) {
            opt.classList.add('correct');
            state.quizAnswered = (state.quizAnswered || 0) + 1;
            state.quizState[idx] = { selected: i, status: 'correct' };
            if (feedback) {
              feedback.className = 'quiz-feedback correct show';
              feedback.textContent = 'Correct! Nice job.';
            }
            showToast('Correct answer', '✓');
          } else {
            opt.classList.add('incorrect');
            options[correctIndex].classList.add('correct');
            state.wrongAnswers = (state.wrongAnswers || 0) + 1;
            state.quizState[idx] = { selected: i, status: 'wrong' };
            if (feedback) {
              feedback.className = 'quiz-feedback incorrect show';
              feedback.textContent = 'Incorrect. The correct answer is: ' + options[correctIndex].textContent + '.';
            }
            showToast('Incorrect — tracked for review', '✗');
          }
          saveState(state);
          updateProgressUI();
        });
      });
    });
  }

  function bindStudyMode() {
    var overlay = qs('#studyOverlay');
    var toggle = qs('#studyModeToggle');
    if (!overlay || !toggle) return;

    var closeBtn = qs('#studyClose');
    var prevBtn = qs('#studyPrev');
    var nextBtn = qs('#studyNext');
    var revealBtn = qs('#studyReveal');
    var studyCard = qs('#studyCard');
    var scBadge = qs('#scBadge');
    var scEnglish = qs('#scEnglish');
    var scChinese = qs('#scChinese');
    var scPinyin = qs('#scPinyin');
    var scBack = qs('#scBack');
    var scTap = qs('#scTap');
    var progressText = qs('#studyProgressText');
    var cards = [];
    var index = 0;

    function buildCards() {
      cards = qsa('.term-card.searchable:not(.hidden-card)').map(function (card) {
        return {
          badge: (qs('.badge', card) || {}).textContent || '',
          english: (qs('.term-english', card) || {}).textContent || '',
          chinese: (qs('.term-chinese .term-value', card) || {}).textContent || '',
          pinyin: (qs('.term-pinyin .term-value', card) || {}).textContent || '',
          back: (qs('.card-back', card) || {}).innerHTML || ''
        };
      });
    }

    function render() {
      if (!cards.length) return;
      var c = cards[index];
      scBadge.textContent = c.badge;
      scEnglish.textContent = c.english;
      scChinese.textContent = c.chinese;
      scPinyin.textContent = c.pinyin;
      scBack.innerHTML = c.back;
      progressText.innerHTML = 'Card <strong>' + (index + 1) + '</strong> of <strong>' + cards.length + '</strong>';
      studyCard.classList.remove('revealed');
      scTap.style.display = '';
    }

    function open() {
      buildCards();
      index = 0;
      render();
      overlay.classList.add('active');
      toggle.classList.add('is-active');
      toggle.textContent = '✕ Exit Study';
    }

    function close() {
      overlay.classList.remove('active');
      toggle.classList.remove('is-active');
      toggle.textContent = '📖 Study Mode';
    }

    toggle.addEventListener('click', function () {
      if (overlay.classList.contains('active')) close();
      else open();
    });
    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function () {
      if (!cards.length) return;
      index = (index - 1 + cards.length) % cards.length;
      render();
    });
    nextBtn.addEventListener('click', function () {
      if (!cards.length) return;
      index = (index + 1) % cards.length;
      render();
    });
    revealBtn.addEventListener('click', function () {
      studyCard.classList.add('revealed');
      scTap.style.display = 'none';
    });
    studyCard.addEventListener('click', function () {
      studyCard.classList.add('revealed');
      scTap.style.display = 'none';
    });
  }

  function renderProgressPage() {
    var wrap = qs('#learnedList');
    if (!wrap) return;
    var allTerms = qsa('.mark-learned').map(function (btn) {
      return btn.getAttribute('data-term');
    });
    wrap.innerHTML = '';
    var learnedNames = Object.keys(state.learned || {}).filter(function (k) { return state.learned[k]; });

    if (!learnedNames.length) {
      wrap.innerHTML = '<div class="learned-item">No learned terms yet.<small>Start from Study or Browse and mark some terms.</small></div>';
      updateProgressUI();
      return;
    }

    learnedNames.sort().forEach(function (name) {
      var item = document.createElement('div');
      item.className = 'learned-item';
      item.innerHTML = '<strong>' + name + '</strong><small>Saved in localStorage</small>';
      wrap.appendChild(item);
    });

    var pct = allTerms.length ? Math.round((learnedNames.length / allTerms.length) * 100) : 0;
    var percentEl = qs('#termPercent');
    if (percentEl) percentEl.textContent = pct + '%';
    updateProgressUI();
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyLearnedStyles();
    bindCards();
    bindQuiz();
    bindStudyMode();
    if (state.flashcardOn) setFlashcardMode(true, true);
    applySearchAndFilter();
    updateProgressUI();
    renderProgressPage();
  });
})();
