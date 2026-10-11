/**
 * ============================================================
 * js/data/characters.js  ―  キャラクターセット登録ファイル
 * ============================================================
 * 女の子のデータはここだけに書きます(ゲームのロジックとは分離しています)。
 * 現在は素材が未提供のため、すべて「空欄のテンプレート」です。
 * 空欄のままでもゲームはエラーにならず、基本動作とレイアウトを確認できます。
 *
 * 【登録のしかた】
 *   1. 画像は assets/images/、音声は assets/audio/ に置く。
 *   2. 下の項目に、そのファイルのパスを書く(例: 'assets/images/girl01-normal.png')。
 *   3. 通常ステージの女の子を増やすときは、normal 配列に同じ形のブロックを追加する。
 *      ゲーム開始のたびに、normal の中から2人が重複なくランダムに選ばれます。
 *
 * 【各項目の意味】
 *   id        : キャラクターごとに重ならない英数字のID(必須。空にすると無視されます)
 *   name      : 名前(未提供なら空欄)
 *   images    : normal = 通常時の画像 / high = 好感度が半分を超えた後の画像
 *   voices    : normal / high それぞれの音声ファイルのパスの配列(ボタンを押すたびにランダムに1つ再生)
 *   lines     : normal / high それぞれのセリフの配列(ボタンを押すたびにランダムに1つ表示)
 *   talk      : 会話画面のセリフ。配列の1要素 = 1回のタップで表示される1ページ
 *                 before       = 戦闘前の会話
 *                 afterSuccess = 戦闘後の会話(告白成功時)
 *                 afterFail    = 戦闘後の会話(告白失敗時)
 *                 epilogue     = (ラスボスのみ)告白成功後、クリア画面の前の会話
 *
 * 【原案に記載されているセリフ例】(どのキャラのセリフかは未確定のため、ここでは登録していません)
 *   「だれ？あんた」 / 「ふーん意外といいとこあんじゃん」 / 「ありがと..」 / 「べ、別にあんたのことなんて！」
 *   使うときは、該当キャラの lines.normal または lines.high に文字列として追加してください。
 */
(function (global) {
  'use strict';

  global.CHARACTER_DATA = {
    // ---------- 通常ステージの女の子(ここから2人がランダムに選ばれる) ----------
    normal: [
      {
        id: 'girl01',
        name: '',                                   // ← 名前
        images: { normal: '', high: '' },           // ← 画像1(通常) / 画像2(好感度が半分超え)
        voices: { normal: [], high: [] },           // ← 音声のパス(例: ['assets/audio/girl01-v1.mp3'])
        lines:  { normal: [], high: [] },           // ← セリフ(例: ['セリフ1', 'セリフ2'])
        talk:   { before: [
      '01のセリフ',
      '2ページ目のセリフ',
      '3ページ目のセリフ'
    ],
    afterSuccess: [
      '01勝ちのセリフ',
      '2ページ目のセリフ'
    ],
    afterFail: [
      '01負けのセリフ',
      '2ページ目のセリフ'
    ] } // ← 会話画面のセリフ
      },
      {
        id: 'girl02',
        name: '',
        images: { normal: '', high: '' },
        voices: { normal: [], high: [] },
        lines:  { normal: [], high: [] },
        talk:   { before: [
      '02のセリフ',
      '2ページ目のセリフ',
      '3ページ目のセリフ'
    ],
    afterSuccess: [
      '02勝ちのセリフ',
      '2ページ目のセリフ'
    ],
    afterFail: [
      '02負けのセリフ',
      '2ページ目のセリフ'
    ] }
      },
      {
        id: 'girl03',
        name: '',
        images: { normal: '', high: '' },
        voices: { normal: [], high: [] },
        lines:  { normal: [], high: [] },
        talk:   { before: [
      '03のセリフ',
      '2ページ目のセリフ',
      '3ページ目のセリフ'
    ],
    afterSuccess: [
      '03勝ちのセリフ',
      '2ページ目のセリフ'
    ],
    afterFail: [
      '03負けのセリフ',
      '2ページ目のセリフ'
    ] }
      }
    ],

    // ---------- ラスボス(固定。毎回この1人が最終ステージの相手) ----------
    boss: {
      id: 'boss',
      name: '',
      images: { normal: '', high: '' },
      voices: { normal: [], high: [] },
      lines:  { normal: [], high: [] },
      talk:   { before: [
      'bossのセリフ',
      '2ページ目のセリフ',
      '3ページ目のセリフ'
    ],
    afterSuccess: [
      'boss勝ちのセリフ',
      '2ページ目のセリフ'
    ],
    afterFail: [
      'boss負けのセリフ',
      '2ページ目のセリフ'
    ], epilogue: [] }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
