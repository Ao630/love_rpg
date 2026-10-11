/**
 * js/core/ui.js ― 画面表示の共通処理(素材が未設定でも安全に動く)
 */
(function (global) {
  'use strict';

  var Ui = {
    /** 背景画像を設定する。パスが空欄なら何もしない(CSSの単色背景のまま) */
    applyBackground: function (el, path) {
      if (!el || typeof path !== 'string' || path === '') { return; }
      el.style.backgroundImage = 'url("' + path.replace(/"/g, '%22') + '")';
      el.classList.add('has-bg-image');
    },

    /**
     * キャラクター画像を表示する。
     * - パスが空欄、または読み込みに失敗したとき: 画像を隠して「未設定」の枠を出す。
     * - 同じパスを再指定しても、画像を読み直さない。
     */
    showCharacterImage: function (imgEl, placeholderEl, path) {
      if (!imgEl) { return; }
      var hasPath = typeof path === 'string' && path !== '';
      if (!hasPath) {
        imgEl.hidden = true;
        imgEl.removeAttribute('src');
        if (placeholderEl) { placeholderEl.hidden = false; }
        return;
      }
      if (placeholderEl) { placeholderEl.hidden = true; }
      if (imgEl.getAttribute('src') === path) { return; }
      imgEl.onload = function () { imgEl.hidden = false; };
      imgEl.onerror = function () {
        imgEl.hidden = true;
        if (placeholderEl) { placeholderEl.hidden = false; }
      };
      imgEl.src = path;
    }
  };

  global.Ui = Ui;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Ui; }
})(typeof window !== 'undefined' ? window : globalThis);
