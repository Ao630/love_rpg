/**
 * js/core/characters.js ― キャラクターデータの読み取り・抽選
 * データ本体は js/data/characters.js。ここは「安全に読む」「ランダムに選ぶ」だけを担当する。
 * 項目が欠けていても、空欄(空文字・空配列)として扱いエラーにしない。
 */
(function (global) {
  'use strict';

  var C = global.GAME_CONFIG;

  /** 文字列の配列だけを取り出す(空文字・文字列以外は捨てる) */
  function onlyStrings(list) {
    if (!Array.isArray(list)) { return []; }
    return list.filter(function (x) { return typeof x === 'string' && x.trim() !== ''; });
  }

  function str(v) { return typeof v === 'string' ? v : ''; }

  /** 登録データ1件を、必ず全項目がそろった形に整える */
  function normalize(raw, isBoss) {
    raw = raw || {};
    var img = raw.images || {}, vo = raw.voices || {}, li = raw.lines || {}, ta = raw.talk || {};
    return {
      id: str(raw.id),
      name: str(raw.name),
      isBoss: !!isBoss,
      images: { normal: str(img.normal), high: str(img.high) },
      voices: { normal: onlyStrings(vo.normal), high: onlyStrings(vo.high) },
      lines: { normal: onlyStrings(li.normal), high: onlyStrings(li.high) },
      talk: {
        before: onlyStrings(ta.before),
        afterSuccess: onlyStrings(ta.afterSuccess),
        afterFail: onlyStrings(ta.afterFail),
        epilogue: onlyStrings(ta.epilogue)
      }
    };
  }

  function data() {
    return global.CHARACTER_DATA || { normal: [], boss: {} };
  }

  function bossId() {
    return normalize(data().boss, true).id || 'boss';
  }

  /**
   * ゲーム開始時の登場順を決める。
   * 戻り値: [通常1人目のID, 通常2人目のID, ラスボスのID]
   * - 通常ステージは登録データから重複なくランダムに選ぶ。
   * - 登録が足りない場合は、空欄のキャラ('empty-1' など)で埋める(重複はしない)。
   * - ラスボスは常に固定。
   */
  function pickStageOrder(rng) {
    var seen = {};
    var pool = [];
    (data().normal || []).forEach(function (raw) {
      var c = normalize(raw, false);
      if (c.id && !seen[c.id]) { seen[c.id] = true; pool.push(c.id); }
    });
    var picked = global.Util.shuffle(pool, rng).slice(0, C.normalStageCount);
    while (picked.length < C.normalStageCount) { picked.push('empty-' + (picked.length + 1)); }
    picked.push(bossId());
    return picked;
  }

  /** IDからキャラクターを取得する。見つからない場合は空欄のキャラを返す */
  function getById(id) {
    var d = data();
    var found = null;
    (d.normal || []).forEach(function (raw) { if (!found && raw && raw.id === id) { found = normalize(raw, false); } });
    if (!found && d.boss && d.boss.id === id) { found = normalize(d.boss, true); }
    return found || normalize({ id: id }, false);
  }

  /** 会話ページの配列を返す。文章が未設定のときは「空白の1ページ」(1回タップで先へ進む) */
  function textPages(list) {
    var pages = onlyStrings(list);
    return pages.length > 0 ? pages : [''];
  }

  global.Characters = {
    normalize: normalize,
    pickStageOrder: pickStageOrder,
    getById: getById,
    textPages: textPages
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = global.Characters; }
})(typeof window !== 'undefined' ? window : globalThis);
