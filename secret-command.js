/**
 * js/core/secret-command.js ― 隠しコマンドの判定
 * ・createMatcher : キー入力の列が、決められた並びと一致したかを判定する(画面に依存しない。テスト可能)
 * ・watch         : クリア画面に取り付ける。次の2つのどちらかで onMatch を一度だけ呼ぶ
 *      ① キーボードで command の並びを入力(間違えたら最初からやり直し)
 *      ② 指定の要素を、tapCount 回、tapIntervalMs 以内の間隔で連続タップ(スマホ向け)
 */
(function (global) {
  'use strict';

  function normalizeKey(k) { return typeof k === 'string' ? k.toLowerCase() : ''; }

  /** 並び sequence を順に入力したとき push が true を返すマッチャーを作る */
  function createMatcher(sequence) {
    var seq = (sequence || []).map(normalizeKey);
    var pos = 0;
    return {
      push: function (key) {
        if (seq.length === 0) { return false; }
        var k = normalizeKey(key);
        if (k === seq[pos]) {
          pos += 1;
          if (pos === seq.length) { pos = 0; return true; }
          return false;
        }
        // 間違えたら最初から。ただし今の入力が先頭キーなら、そこから数え直す(↑↑↑↓↓… の救済)
        pos = (k === seq[0]) ? 1 : 0;
        return false;
      },
      reset: function () { pos = 0; }
    };
  }

  /** 連続タップの判定。間隔が空いたら数え直す。now は時刻(ms)を返す関数(テスト用に差し替え可能) */
  function createTapCounter(count, intervalMs, now) {
    var clock = now || function () { return Date.now(); };
    var n = 0, last = 0;
    return {
      tap: function () {
        var t = clock();
        n = (n > 0 && t - last <= intervalMs) ? n + 1 : 1;
        last = t;
        if (n >= count) { n = 0; return true; }
        return false;
      }
    };
  }

  /**
   * options: { command: [...], tapEl: 要素, tapCount, tapIntervalMs, onMatch: 関数 }
   * 戻り値: 解除用の関数
   */
  function watch(options) {
    var matcher = createMatcher(options.command);
    var counter = createTapCounter(options.tapCount || 7, options.tapIntervalMs || 1500);
    var fired = false;

    function fire() {
      if (fired) { return; }
      fired = true;
      stop();
      options.onMatch();
    }
    function onKey(e) { if (!e.repeat && matcher.push(e.key)) { fire(); } }
    function onTap() { if (counter.tap()) { fire(); } }
    function stop() {
      global.document.removeEventListener('keydown', onKey);
      if (options.tapEl) { options.tapEl.removeEventListener('click', onTap); }
    }

    global.document.addEventListener('keydown', onKey);
    if (options.tapEl) { options.tapEl.addEventListener('click', onTap); }
    return stop;
  }

  global.SecretCommand = { createMatcher: createMatcher, createTapCounter: createTapCounter, watch: watch };
  if (typeof module !== 'undefined' && module.exports) { module.exports = global.SecretCommand; }
})(typeof window !== 'undefined' ? window : globalThis);
