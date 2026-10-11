/**
 * js/core/audio.js ― 音声の再生(未設定・再生失敗でもエラーにしない)
 */
(function (global) {
  'use strict';

  var current = null; // 再生中の音声。新しい音声を鳴らすときに止めて、重なりを防ぐ

  function stop() {
    if (current) {
      try { current.pause(); } catch (e) { /* 何もしない */ }
      current = null;
    }
  }

  /** パスが空欄なら何もしない。ブラウザの自動再生制限などで失敗しても握りつぶす */
  function play(path) {
    if (typeof path !== 'string' || path === '') { return; }
    try {
      stop();
      var audio = new global.Audio(path);
      current = audio;
      var promise = audio.play();
      if (promise && typeof promise.catch === 'function') { promise.catch(function () { /* 再生不可は無視 */ }); }
    } catch (e) { /* 何もしない */ }
  }

  /** 音声パスの配列からランダムに1つ再生する。空配列なら何もしない */
  function playRandom(list) {
    play(global.Util.pickRandom(list));
  }

  global.Voice = { play: play, playRandom: playRandom, stop: stop };
})(typeof window !== 'undefined' ? window : globalThis);
