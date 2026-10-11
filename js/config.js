/**
 * ============================================================
 * js/config.js  ―  ゲーム設定ファイル(数値・パス・仕様値の一元管理)
 * ============================================================
 * ゲームバランスや素材の参照先は、基本的にこのファイルだけを編集すれば変更できます。
 * ほかのファイルはここの値を読むだけで、数値をベタ書きしていません。
 *
 * 【重要】confession(告白成功率)・affection(好感度)の数値は、
 *   原案で値が確定していないため「仮の初期値」です。
 *   仕様が決まったら、ここだけを書き換えてください。
 */
(function (global) {
  'use strict';

  var GAME_CONFIG = {
    // ---------- 表示用テキスト ----------
    title: '恋愛RPG',
    subtitle: '-恋愛マスターに俺はなる！-',

    // ---------- ステージ構成 ----------
    // 告白バトルの総数(通常ステージ2 + ラスボス1 = 3)。変更するとマップ表示や進行が追従します。
    totalStages: 3,
    // 通常ステージの人数(ランダムに選ばれる女の子の数)。ラスボスは含まない。
    normalStageCount: 2,

    // ---------- 好感度ゲージ(【仮の値】) ----------
    affection: {
      max: 100,                // ゲージの最大値。ここに達すると告白成功率フェーズへ移行する
      gainPerAttack: 5,        // 「アタックする」1回あたりの増加量(100/5 = 20回でMAX)
      highThresholdRatio: 0.5  // 最大値のこの割合を「上回る」と、画像・セリフ・音声が「後半用」に切り替わる
    },

    // ---------- 告白成功率フェーズ(【仮の値】) ----------
    confession: {
      min: 0,               // 成功率の下限(%)
      max: 100,             // 成功率の上限(%)
      initialRate: 10,      // 好感度MAXになった瞬間の成功率(%)
      gainPerAttack: 4,     // 「アタックする」1回あたりの成功率の増加量(%)
      decayPerSecond: 8,    // 時間経過による成功率の減少量(%/秒)
      tickMs: 100,          // 減少処理を実行する間隔(ミリ秒)
      judgeDelayMs: 800     // 告白ボタンを押してから次の画面へ進むまでの待ち時間(ミリ秒)
    },

    // ---------- ストップウォッチ ----------
    timer: {
      updateMs: 50          // 画面表示を更新する間隔(ミリ秒)。計測自体は時刻の差分なので誤差は溜まらない
    },

    // 会話画面で表示するキャラクター画像。'normal' = 通常時の画像 / 'high' = 好感度が半分を超えた後の画像
    // (原案では未確定のため、まず通常時の画像にしています)
    talkImageAfterBattle: 'normal',

    // ---------- 内部設定 ----------
    // 進行状態の保存キー(sessionStorage)。変更すると、保存中のゲームは引き継がれません。
    storageKey: 'koiRpg.gameState.v1',

    // 各ページのファイル名(すべて相対パス。GitHub Pagesのサブパスでも動作する)
    pages: {
      title: 'index.html',
      help: 'help.html',
      intro: 'intro.html',
      map: 'map.html',
      talk: 'talk.html',
      battle: 'battle.html',
      gameover: 'gameover.html',
      clear: 'clear.html'
    },

    // ---------- 素材の参照先(未提供のため空欄) ----------
    // 背景画像のパスを入れる場所です。空欄のままでも動作します(単色の背景になります)。
    // 例) classroom: 'assets/images/bg-classroom.png'
    assets: {
      backgrounds: {
        classroom: '', // 戦闘画面・会話画面の背景(教室)
        intro: '',     // 導入の独白画面の背景
        map: ''        // ステージ移動画面の背景
      }
    }
  };

  global.GAME_CONFIG = GAME_CONFIG;
  if (typeof module !== 'undefined' && module.exports) { module.exports = GAME_CONFIG; }
})(typeof window !== 'undefined' ? window : globalThis);
