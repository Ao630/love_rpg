/**
 * js/core/timer.js ― RTA用ストップウォッチの表示
 * 計測の本体は Game(state.js)が持つ「開始時刻・停止時刻」。ここは整形と画面更新だけを担当する。
 * 表示形式は「分:秒:1/100秒」(例 00:12:34)。Figmaの表記に合わせた仮仕様。
 */
(function (global) {
  'use strict';

  var C = global.GAME_CONFIG;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /** ミリ秒を "MM:SS:CC" に整形する(分は99を超えても桁が増えるだけで止まらない) */
  function format(ms) {
    var total = Math.max(0, Math.floor(ms));
    var minutes = Math.floor(total / 60000);
    var seconds = Math.floor((total % 60000) / 1000);
    var centis = Math.floor((total % 1000) / 10);
    return pad2(minutes) + ':' + pad2(seconds) + ':' + pad2(centis);
  }

  /**
   * 要素にストップウォッチを表示する。
   * 動作中は定期的に更新し、停止済み(finishedAtあり)なら一度だけ描画して固定する。
   * ページを離れるときに更新タイマーを自動で解除する。戻り値の関数でも手動で止められる。
   */
  function mount(el) {
    if (!el) { return function () {}; }
    var intervalId = null;

    function render() {
      var s = global.Game.current();
      el.textContent = format(global.Game.elapsedMs(s));
      if (s && typeof s.finishedAt === 'number') { stop(); } // 停止済みなら更新をやめる
    }
    function stop() {
      if (intervalId !== null) { global.clearInterval(intervalId); intervalId = null; }
    }

    render();
    var s0 = global.Game.current();
    if (s0 && typeof s0.finishedAt !== 'number') {
      intervalId = global.setInterval(render, C.timer.updateMs);
    }
    global.addEventListener('pagehide', stop);
    return stop;
  }

  global.GameTimer = { format: format, mount: mount };
  if (typeof module !== 'undefined' && module.exports) { module.exports = global.GameTimer; }
})(typeof window !== 'undefined' ? window : globalThis);
