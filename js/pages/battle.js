/**
 * ============================================================
 * js/pages/battle.js ― 戦闘画面(画面の更新とボタン操作)
 * ============================================================
 * ルール(好感度・成功率・判定)は BattleLogic が担当し、ここは「画面に反映する」だけ。
 *
 * 【流れ】
 *   アタック → 好感度が増える(セリフ・音声がランダムで出る)
 *   好感度MAX → 成功率の数字と「告白しろ！！！」ボタンが現れ、成功率が時間で下がり始める
 *   告白 → 一度だけ判定 → 入力ロック → 少し待って Game.finishBattle(成否) → 戦闘後の会話へ
 *   降参 → タイトルへ(進行状態を破棄)
 *
 * ※ このページを再読み込みすると、このステージの戦闘は好感度0からやり直しになる(ストップウォッチは継続)。
 */
(function () {
  'use strict';

  var state = Game.guard([Game.STEP.BATTLE]);
  if (!state) { return; }

  var config = GAME_CONFIG;
  var character = Characters.getById(state.order[state.stageIndex]);
  var battle = BattleLogic.create(config, Math.random);

  // ---------- 画面の部品 ----------
  var stageEl = document.getElementById('stage');
  var gaugeEl = document.getElementById('gauge');
  var gaugeFillEl = document.getElementById('gauge-fill');
  var ratePanelEl = document.getElementById('rate-panel');
  var rateValueEl = document.getElementById('rate-value');
  var msgEl = document.getElementById('msg-text');
  var attackBtn = document.getElementById('btn-attack');
  var confessBtn = document.getElementById('btn-confess');
  var surrenderBtn = document.getElementById('btn-surrender');
  var imgEl = document.getElementById('character-image');
  var placeholderEl = document.getElementById('character-placeholder');

  var tickIntervalId = null; // 成功率の減少タイマー(不要になったら必ず止める)
  var lastTickAt = 0;

  // ---------- 初期表示 ----------
  Ui.applyBackground(stageEl, config.assets.backgrounds.classroom);
  GameTimer.mount(document.getElementById('timer'));
  document.getElementById('stage-label').textContent = Game.stageLabel(state.stageIndex);
  showCharacter();
  render();

  /** いまのモード('normal' = 好感度が半分以下 / 'high' = 半分を上回った後) */
  function mode() { return battle.isHigh() ? 'high' : 'normal'; }

  /** キャラクター画像をモードに合わせて表示する(後半用の画像が未設定なら通常画像のまま) */
  function showCharacter() {
    var path = character.images[mode()] || character.images.normal;
    Ui.showCharacterImage(imgEl, placeholderEl, path);
  }

  /** 好感度ゲージ・成功率を、内部の値に合わせて画面に反映する(表示と内部値を常に一致させる) */
  function render() {
    var percent = battle.getAffectionPercent();
    gaugeFillEl.style.height = percent + '%';
    gaugeEl.setAttribute('aria-valuenow', String(Math.round(percent)));

    var rate = battle.displayRate();
    rateValueEl.textContent = String(rate);
    ratePanelEl.classList.toggle('rate--low', rate < 20);
  }

  /** アタックのたびに、ランダムなセリフを表示し、ランダムな音声を再生する(未設定ならスキップ) */
  function speak() {
    var line = Util.pickRandom(character.lines[mode()]);
    if (line !== null) { msgEl.textContent = line; }
    Voice.playRandom(character.voices[mode()]);
  }

  /** 好感度MAX: 成功率の表示と告白ボタンを出し、成功率の自然減少を始める */
  function enterConfessionPhase() {
    ratePanelEl.hidden = false;
    confessBtn.hidden = false;
    lastTickAt = performance.now();
    tickIntervalId = window.setInterval(function () {
      var now = performance.now();
      battle.tick(now - lastTickAt);
      lastTickAt = now;
      render();
    }, config.confession.tickMs);
  }

  function stopTick() {
    if (tickIntervalId !== null) { window.clearInterval(tickIntervalId); tickIntervalId = null; }
  }

  // ---------- 操作 ----------
  attackBtn.addEventListener('click', function () {
    var result = battle.attack();
    if (result.type === 'none') { return; } // 判定後などの無効な入力は無視
    if (result.crossedHigh) { showCharacter(); }
    speak();
    render();
    if (result.reachedMax) { enterConfessionPhase(); }
  });

  confessBtn.addEventListener('click', function () {
    var result = battle.confess(); // 一度だけ判定(2回目以降は null)
    if (!result) { return; }
    stopTick();
    attackBtn.disabled = true;     // 判定後は入力をロック
    confessBtn.disabled = true;
    surrenderBtn.disabled = true;
    render();                      // 判定に使った成功率で表示を固定する
    window.setTimeout(function () { Game.finishBattle(result.success); }, config.confession.judgeDelayMs);
  });

  surrenderBtn.addEventListener('click', function () {
    stopTick();
    Game.surrender();
  });

  window.addEventListener('pagehide', stopTick);
})();
