(function () {
  if (window.HYMotion) return;
  var E = { DEC: 'cubic-bezier(0.05,0.7,0.1,1)', ACC: 'cubic-bezier(0.3,0,0.8,0.15)', EMP: 'cubic-bezier(0.2,0,0,1)' };
  var NONE = { finished: Promise.resolve(), cancel: function () {} };
  var M = {
    E: E, reduce: false, scroller: null, overlay: null, hero: null, progress: 0,
    vnd: function (v) { return Math.round(v).toLocaleString('vi-VN') + ' ₫'; },
    play: function (el, frames, dur, ease, o) {
      o = o || {};
      if (!el || !el.animate) return NONE;
      if (M.reduce && o.decor) return NONE;
      if (!o.keep) el.getAnimations().forEach(function (a) { a.cancel(); });
      var delay = o.delay || 0;
      if (M.reduce) {
        var f0 = frames[0].opacity, f1 = frames[frames.length - 1].opacity;
        frames = (f0 !== undefined && f0 !== f1) ? [{ opacity: f0 }, { opacity: f1 }] : (o.exit ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }]);
        dur = Math.min(dur, 150); ease = 'linear'; delay = 0;
      }
      return el.animate(frames, { duration: dur, easing: ease, delay: delay, fill: o.fill || 'backwards' });
    },
    fin: function (a) { return a.finished.then(function () {}, function () {}); },
    flip: function (el, a, dur) {
      if (!el || !a) return NONE;
      var b = el.getBoundingClientRect(), k = (b.width / (el.offsetWidth || b.width)) || 1;
      el.style.transformOrigin = '0 0';
      return M.play(el, [{ transform: 'translate(' + (a.left - b.left) / k + 'px,' + (a.top - b.top) / k + 'px) scale(' + a.width / b.width + ',' + a.height / b.height + ')' }, { transform: 'none' }], dur || 400, E.EMP);
    },
    stagger: function (root) {
      if (!root) return;
      root.querySelectorAll('[data-stagger]').forEach(function (list) {
        Array.prototype.slice.call(list.children, 0, 8).forEach(function (c, i) {
          M.play(c, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], 250, E.DEC, { delay: i * 50 });
        });
      });
    },
    countUp: function (el, from, to, dur) {
      if (!el) return;
      cancelAnimationFrame(el._raf);
      if (M.reduce || from === to) { el.textContent = M.vnd(to); return; }
      var t0 = performance.now(), D = dur || 800;
      var step = function (now) {
        var t = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - t, 4);
        el.textContent = M.vnd(t < 1 ? Math.round((from + (to - from) * e) / 1000) * 1000 : to);
        if (t < 1) el._raf = requestAnimationFrame(step);
      };
      el._raf = requestAnimationFrame(step);
    },
    tick: function (circle, path) {
      M.play(circle, [{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], 150, E.EMP);
      M.play(path, [{ strokeDashoffset: 24 }, { strokeDashoffset: 0 }], 300, E.DEC, { delay: 120 });
    },
    celebrate: function () {
      var box = M.overlay; if (M.reduce || !box) return;
      var W = box.clientWidth, H = box.clientHeight, cols = ['#F4B9A7', '#C9A46A', '#7A1F3D', '#F4B9A7', '#E9D3B0'];
      for (var i = 0; i < 34; i++) {
        var p = document.createElement('span'), w = 7 + Math.random() * 7;
        var x0 = W * (0.3 + Math.random() * 0.4), y0 = H * 0.28;
        p.style.cssText = 'position:absolute;left:' + x0 + 'px;top:' + y0 + 'px;width:' + w + 'px;height:' + (w * 1.4) + 'px;background:' + cols[i % 5] + ';border-radius:60% 0 60% 0;opacity:0';
        box.appendChild(p);
        var ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 160, dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * 0.6 - 40;
        var rot = (Math.random() * 2 - 1) * 320, delay = Math.random() * 120, dur = 850 + Math.random() * (1200 - 850 - delay);
        var a = p.animate([
          { transform: 'translate(0,0) scale(0.4) rotate(0deg)', opacity: 1 },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1) rotate(' + rot / 2 + 'deg)', opacity: 1, offset: 0.35 },
          { transform: 'translate(' + dx * 1.15 + 'px,' + (dy + 140) + 'px) scale(0.9) rotate(' + rot + 'deg)', opacity: 0 }
        ], { duration: dur, delay: delay, easing: E.DEC, fill: 'both' });
        a.onfinish = (function (n) { return function () { n.remove(); }; })(p);
      }
    }
  };
  window.HYMotion = M;
})();
