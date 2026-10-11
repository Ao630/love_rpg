/**
 * js/core/dialogue.js ― ノベルゲーム風の会話送り(導入の独白・会話画面で共通利用)
 * 画面タップ/クリック、または Enter・Space キーで次のページへ進み、最後のページの次で onDone を一度だけ呼ぶ。
 */
(function (global) {
  'use strict';

  var Dialogue = {
    /**
     * options:
     *   pages   : 表示するページ(文字列)の配列。1要素以上
     *   textEl  : 文章を入れる要素
     *   stageEl : タップを受け付ける要素(画面全体)
     *   onDone  : 最後のページを送り終えたときに呼ぶ関数
     */
    start: function (options) {
      var pages = options.pages && options.pages.length ? options.pages : [''];
      var index = 0;
      var finished = false;

      function show() { options.textEl.textContent = pages[index]; }

      function cleanup() {
        options.stageEl.removeEventListener('click', next);
        global.document.removeEventListener('keydown', onKey);
      }

      function next() {
        if (finished) { return; } // 連打で onDone が二重に呼ばれないようにする
        index += 1;
        if (index >= pages.length) {
          finished = true;
          cleanup();
          options.onDone();
          return;
        }
        show();
      }

      function onKey(e) {
        if (e.repeat) { return; }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
      }

      show();
      options.stageEl.addEventListener('click', next);
      global.document.addEventListener('keydown', onKey);
    }
  };

  global.Dialogue = Dialogue;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Dialogue; }
})(typeof window !== 'undefined' ? window : globalThis);
