/**
 * ============================================================
 * js/core/state.js ― ゲーム進行状態と画面遷移の管理
 * ============================================================
 * 進行状態は sessionStorage に保存し、ページ間で受け渡す(すべてのページでこの方法に統一)。
 * ストップウォッチは「開始時刻」を保存して、表示のたびに差分を計算する。
 * そのため、ページ遷移やリロードをしても計測が途切れない。
 *
 * 【進行ステップ(step)と画面の対応】
 *   intro          → intro.html     導入の独白
 *   map            → map.html       ステージ移動画面
 *   talk-before    → talk.html      戦闘前の会話
 *   battle         → battle.html    戦闘画面
 *   talk-after     → talk.html      戦闘後の会話(告白成功/失敗の両方)
 *   talk-epilogue  → talk.html      ラスボス成功後の会話
 *   gameover       → gameover.html  敗北画面
 *   clear          → clear.html     クリア画面
 *
 * 【遷移の流れ】
 *   [タイトル] --スタート--> intro --> map --> talk-before --> battle --> talk-after
 *   talk-after: 告白失敗 → gameover → タイトル
 *               告白成功 かつ 通常ステージ → stageIndex+1 して map へ
 *               告白成功 かつ ラスボス     → talk-epilogue → clear → タイトル
 *   battle 中の「降参」 → タイトル(進行状態を破棄)
 *
 * 不正な遷移(戻る操作・URL直打ち・二重実行)は、現在のステップと一致しない場合に無視/リダイレクトされる。
 */
(function (global) {
  'use strict';

  var C = global.GAME_CONFIG;
  var STATE_VERSION = 1;

  var STEP = {
    INTRO: 'intro',
    MAP: 'map',
    TALK_BEFORE: 'talk-before',
    BATTLE: 'battle',
    TALK_AFTER: 'talk-after',
    TALK_EPILOGUE: 'talk-epilogue',
    GAME_OVER: 'gameover',
    CLEAR: 'clear'
  };

  /** ステップごとの表示ページ */
  var STEP_PAGE = {};
  STEP_PAGE[STEP.INTRO] = C.pages.intro;
  STEP_PAGE[STEP.MAP] = C.pages.map;
  STEP_PAGE[STEP.TALK_BEFORE] = C.pages.talk;
  STEP_PAGE[STEP.BATTLE] = C.pages.battle;
  STEP_PAGE[STEP.TALK_AFTER] = C.pages.talk;
  STEP_PAGE[STEP.TALK_EPILOGUE] = C.pages.talk;
  STEP_PAGE[STEP.GAME_OVER] = C.pages.gameover;
  STEP_PAGE[STEP.CLEAR] = C.pages.clear;

  /** ページ遷移を開始したら true。連打で遷移処理が二重に走るのを防ぐ */
  var navigating = false;

  function getStorage() {
    try { return global.sessionStorage; } catch (e) { return null; }
  }

  /** 保存データが正しい形かを確認する(壊れたデータでクラッシュしないため) */
  function isValid(s) {
    return !!s && s.version === STATE_VERSION &&
      Array.isArray(s.order) && s.order.length === C.totalStages &&
      typeof STEP_PAGE[s.step] === 'string' &&
      typeof s.stageIndex === 'number' && s.stageIndex >= 0 && s.stageIndex < C.totalStages &&
      typeof s.startedAt === 'number';
  }

  /** 現在の進行状態を読む。なければ null */
  function load() {
    var st = getStorage();
    if (!st) { return null; }
    try {
      var raw = st.getItem(C.storageKey);
      if (!raw) { return null; }
      var s = JSON.parse(raw);
      return isValid(s) ? s : null;
    } catch (e) { return null; }
  }

  function save(s) {
    var st = getStorage();
    if (!st) { return false; }
    try { st.setItem(C.storageKey, JSON.stringify(s)); return true; } catch (e) { return false; }
  }

  /** 進行状態とタイマーを破棄する(タイトル画面に戻るとき・タイトル画面表示時に呼ぶ) */
  function reset() {
    var st = getStorage();
    if (!st) { return; }
    try { st.removeItem(C.storageKey); } catch (e) { /* 何もしない */ }
  }

  function navigate(page) {
    navigating = true;
    global.location.assign(page);
  }

  /**
   * ステップ from から to へ進む。現在のステップが from でなければ何もしない(二重実行・不正遷移の防止)。
   * mutate が渡された場合は、ステップ変更と同時に状態を書き換える。
   */
  function transition(from, to, mutate) {
    if (navigating) { return false; }
    var s = load();
    if (!s || s.step !== from) { return false; }
    if (mutate) { mutate(s); }
    s.step = to;
    if (!save(s)) { return false; }
    navigate(STEP_PAGE[to]);
    return true;
  }

  var Game = {
    STEP: STEP,

    /** 現在の進行状態を返す(なければ null) */
    current: load,

    /** ステップ→ページ名 */
    pageFor: function (step) { return STEP_PAGE[step]; },

    /**
     * 各ページの先頭で呼ぶ。現在のステップが allowedSteps に含まれていれば状態を返す。
     * 含まれない場合は、正しいページ(または状態がなければタイトル)へ移動して null を返す。
     * 呼び出し側は null が返ったら処理を中断すること。
     */
    guard: function (allowedSteps) {
      var s = load();
      if (s && allowedSteps.indexOf(s.step) !== -1) {
        // ブラウザの「戻る/進む」キャッシュで古い表示が復活したら、読み込み直して状態と一致させる
        global.addEventListener('pageshow', function (e) { if (e.persisted) { global.location.reload(); } });
        return s;
      }
      navigating = true;
      global.location.replace(s ? STEP_PAGE[s.step] : C.pages.title);
      return null;
    },

    /**
     * 新しいゲームを開始する(タイトルの「スタート」)。
     * キャラクター抽選・ストップウォッチ開始をここで一度だけ行う。
     * 保存できなかった場合は false を返す。
     */
    newGame: function () {
      if (navigating) { return false; }
      var s = {
        version: STATE_VERSION,
        step: STEP.INTRO,
        stageIndex: 0,                                   // 0=第1ステージ, 1=第2ステージ, 2=ラスボス
        order: global.Characters.pickStageOrder(Math.random), // [通常1, 通常2, ラスボス]のID
        lastResult: null,                                // 直前の告白結果 'success' | 'fail'
        startedAt: Date.now(),                           // ストップウォッチの開始時刻(ms)
        finishedAt: null                                 // ストップウォッチの停止時刻(ms)。動作中は null
      };
      if (!save(s)) { return false; }
      navigate(C.pages.intro);
      return true;
    },

    reset: reset,

    /** 導入の独白 → ステージ移動画面 */
    advanceFromIntro: function () { return transition(STEP.INTRO, STEP.MAP); },

    /** ステージ移動画面 → 戦闘前の会話 */
    advanceFromMap: function () { return transition(STEP.MAP, STEP.TALK_BEFORE); },

    /** 会話画面(戦闘前/戦闘後/エピローグ)から次へ進む。現在のステップで行き先が変わる */
    advanceFromTalk: function () {
      var s = load();
      if (!s) { return false; }
      if (s.step === STEP.TALK_BEFORE) {
        return transition(STEP.TALK_BEFORE, STEP.BATTLE);
      }
      if (s.step === STEP.TALK_AFTER) {
        if (s.lastResult !== 'success') {
          return transition(STEP.TALK_AFTER, STEP.GAME_OVER);          // 失敗 → 敗北画面
        }
        if (s.stageIndex < C.totalStages - 1) {
          return transition(STEP.TALK_AFTER, STEP.MAP, function (x) { x.stageIndex += 1; }); // 次のステージへ
        }
        return transition(STEP.TALK_AFTER, STEP.TALK_EPILOGUE);        // ラスボス成功 → エピローグ
      }
      if (s.step === STEP.TALK_EPILOGUE) {
        return transition(STEP.TALK_EPILOGUE, STEP.CLEAR);             // → クリア画面
      }
      return false;
    },

    /**
     * 告白の判定が終わったとき、戦闘画面から一度だけ呼ぶ。
     * 告白失敗、またはラスボスに成功した時点で、ストップウォッチを停止して最終タイムを確定する。
     */
    finishBattle: function (success) {
      return transition(STEP.BATTLE, STEP.TALK_AFTER, function (s) {
        s.lastResult = success ? 'success' : 'fail';
        var isLastStage = s.stageIndex === C.totalStages - 1;
        if (!success || isLastStage) { s.finishedAt = Date.now(); }
      });
    },

    /** 降参 / タイトルに戻る: 進行状態(タイマー含む)を破棄してタイトルへ */
    surrender: function () {
      if (navigating) { return false; }
      reset();
      navigate(C.pages.title);
      return true;
    },
    backToTitle: function () { return Game.surrender(); },

    /** 経過時間(ミリ秒)。停止済みなら停止時点の値で固定される */
    elapsedMs: function (s) {
      if (!s) { return 0; }
      var end = typeof s.finishedAt === 'number' ? s.finishedAt : Date.now();
      return Math.max(0, end - s.startedAt);
    },

    /** 「ステージ 1-3」形式の表示文字列(Figmaの表記に合わせた仮仕様) */
    stageLabel: function (stageIndex) {
      return 'ステージ ' + (stageIndex + 1) + '-' + C.totalStages;
    }
  };

  global.Game = Game;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Game; }
})(typeof window !== 'undefined' ? window : globalThis);
