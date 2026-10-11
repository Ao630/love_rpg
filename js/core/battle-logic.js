/**
 * ============================================================
 * js/core/battle-logic.js ― 戦闘のルール(画面に依存しない純粋なロジック)
 * ============================================================
 * 好感度ゲージ・告白成功率・告白判定だけを扱う。DOM(画面)には一切触れない。
 * 数値はすべて引数の config(GAME_CONFIG)から読む。乱数は rng で差し替え可能(テスト用)。
 *
 * 【フェーズ】
 *   'affection'  : 好感度を上げるフェーズ。アタックで好感度が増える
 *   'confession' : 告白成功率フェーズ。アタックで成功率が増え、時間で減る
 *   'judged'     : 告白判定済み。以降の入力はすべて無効(二重判定の防止)
 */
(function (global) {
  'use strict';

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function create(config, rng) {
    var a = config.affection;
    var c = config.confession;
    var random = rng || Math.random;

    var state = {
      phase: 'affection',
      affection: 0, // 現在の好感度(0〜a.max)
      rate: 0       // 内部の成功率(小数を含む。表示・判定には displayRate() を使う)
    };

    /** 表示と判定で共通して使う成功率(整数%)。表示と判定値のずれを防ぐために一本化している */
    function displayRate() { return Math.floor(state.rate); }

    /** 好感度が「半分を上回った」か(上回る=ちょうど半分は含まない) */
    function isHigh() { return state.affection > a.max * a.highThresholdRatio; }

    /**
     * 「アタックする」を1回押したときの処理。
     * 戻り値: { type, reachedMax, crossedHigh }
     *   type        : 'affection'(好感度が増えた) / 'rate'(成功率が増えた) / 'none'(無効な入力)
     *   reachedMax  : この1回で好感度がMAXになった(告白フェーズへ移行した)
     *   crossedHigh : この1回で好感度が半分を上回った
     */
    function attack() {
      var result = { type: 'none', reachedMax: false, crossedHigh: false };
      if (state.phase === 'affection') {
        var wasHigh = isHigh();
        state.affection = clamp(state.affection + a.gainPerAttack, 0, a.max); // 上限を超えない
        result.type = 'affection';
        result.crossedHigh = !wasHigh && isHigh();
        if (state.affection >= a.max) {
          // 好感度MAX: 以降は好感度を増やさず、告白成功率フェーズへ切り替える
          state.phase = 'confession';
          state.rate = clamp(c.initialRate, c.min, c.max);
          result.reachedMax = true;
        }
      } else if (state.phase === 'confession') {
        state.rate = clamp(state.rate + c.gainPerAttack, c.min, c.max);
        result.type = 'rate';
      }
      return result;
    }

    /** 時間経過による成功率の減少。dtMs = 前回からの経過ミリ秒 */
    function tick(dtMs) {
      if (state.phase !== 'confession') { return; }
      state.rate = clamp(state.rate - c.decayPerSecond * (Math.max(0, dtMs) / 1000), c.min, c.max);
    }

    /**
     * 「告白しろ！！！」を押したときの判定。一度だけ実行され、2回目以降は null を返す。
     * 戻り値: { rate: 判定に使った成功率(整数%), success: 成否 }
     * 成功率 r% のとき、0以上1未満の乱数 x に対して x*100 < r なら成功(0%は必ず失敗、100%は必ず成功)。
     */
    function confess() {
      if (state.phase !== 'confession') { return null; }
      state.phase = 'judged';
      var r = displayRate();
      return { rate: r, success: random() * 100 < r };
    }

    return {
      attack: attack,
      tick: tick,
      confess: confess,
      displayRate: displayRate,
      isHigh: isHigh,
      getPhase: function () { return state.phase; },
      getAffection: function () { return state.affection; },
      getAffectionPercent: function () { return (state.affection / a.max) * 100; }
    };
  }

  var BattleLogic = { create: create };
  global.BattleLogic = BattleLogic;
  if (typeof module !== 'undefined' && module.exports) { module.exports = BattleLogic; }
})(typeof window !== 'undefined' ? window : globalThis);
