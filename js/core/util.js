/**
 * js/core/util.js ― 小さな共通関数(乱数・範囲制限)
 * rng には Math.random 互換の関数(0以上1未満を返す)を渡す。テスト時に差し替えられる。
 */
(function (global) {
  'use strict';

  var Util = {
    /** 値を min〜max の範囲に収める(上限・下限を超えさせないための共通関数) */
    clamp: function (value, min, max) {
      return Math.min(max, Math.max(min, value));
    },

    /** 配列からランダムに1つ選ぶ。空配列なら null を返す(素材未設定でも安全に動く) */
    pickRandom: function (list, rng) {
      if (!Array.isArray(list) || list.length === 0) { return null; }
      var r = (rng || Math.random)();
      return list[Math.min(list.length - 1, Math.floor(r * list.length))];
    },

    /** 配列をシャッフルした「コピー」を返す(Fisher-Yates)。元の配列は変更しない */
    shuffle: function (list, rng) {
      var random = rng || Math.random;
      var copy = list.slice();
      for (var i = copy.length - 1; i > 0; i--) {
        var j = Math.floor(random() * (i + 1));
        var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
      }
      return copy;
    }
  };

  global.Util = Util;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Util; }
})(typeof window !== 'undefined' ? window : globalThis);
