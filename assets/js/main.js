(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header: solid background once the page scrolls */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile navigation */
  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll(".nav-links a").forEach(function (link) {
      link.addEventListener("click", function () {
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("nav-open")) {
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* Scroll reveal */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }
  document.querySelectorAll(".reveal-stagger").forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.style.setProperty("--i", i);
    });
  });

  /* Hero tagline rotator */
  var rotator = document.querySelector("[data-rotate]");
  if (rotator && !reduceMotion) {
    var words = rotator.getAttribute("data-rotate").split("|");
    var label = rotator.querySelector("span");
    var index = 0;
    setInterval(function () {
      rotator.classList.add("is-out");
      setTimeout(function () {
        index = (index + 1) % words.length;
        label.textContent = words[index];
        rotator.classList.remove("is-out");
        rotator.classList.add("is-in");
        // force reflow so the "in" state paints before transitioning back
        void rotator.offsetWidth;
        rotator.classList.remove("is-in");
      }, 600);
    }, 2800);
  }

  /* Hero drift: real project photos float across the water on a slow current.
     Positions are stored as fractions of the field width so resizing just works. */
  var drift = document.querySelector("[data-drift]");
  if (drift) {
    var field = drift.querySelector(".drift-prints");
    var queue = Array.prototype.slice.call(field.querySelectorAll(".print"));
    var lanes = [
      { y: 0.21, speed: 0.036, size: 0.31, items: [], opening: [0.05, 0.6] },
      { y: 0.54, speed: 0.05, size: 0.37, items: [], opening: [-0.21, 0.3, 0.8] },
      { y: 0.84, speed: 0.03, size: 0.3, items: [], opening: [0.1, 0.63] }
    ];
    var PRINT_H = 1.135; // card height relative to its width (photo + label strip)
    var W = drift.clientWidth;
    var running = !reduceMotion;
    var last = 0;
    // intro: the first photos are tossed onto the water one by one, then the current picks up
    var intro = !reduceMotion;
    var introAt = 0, introEnd = 0, flow = intro ? 0 : 1;
    var TOSS_DELAY = 900, TOSS_GAP = 170, TOSS_DUR = 950, SETTLE = 600;
    // before the toss, a short story plays: a few moments are shot, posted and measured,
    // then the last one lands as the first print (the "hero") for the rest to join
    var story = drift.querySelector("[data-story]");
    if (story && !intro) { story.remove(); story = null; }
    var storyDone = !story, hero = null;
    if (story) TOSS_DELAY = 120;

    function rand(a, b) { return a + Math.random() * (b - a); }

    // stagger the tosses in a sweep from the top left, so they land like a hand of cards
    function planIntro() {
      var shown = [];
      lanes.forEach(function (lane) {
        lane.items.forEach(function (it) {
          if (it === hero) it.toss = null; // already on the water
          else if (it.x + it.size > 0.02 && it.x < 0.98) shown.push(it);
          else it.toss = null;
        });
      });
      shown.sort(function (a, b) { return (a.x + a.lane.y * 0.5) - (b.x + b.lane.y * 0.5); });
      shown.forEach(function (it, i) {
        it.toss = { at: introAt + TOSS_DELAY + i * TOSS_GAP, spin: rand(14, 26) * (Math.random() < 0.5 ? -1 : 1), landed: false };
      });
      introEnd = introAt + TOSS_DELAY + Math.max(0, shown.length - 1) * TOSS_GAP + TOSS_DUR;
    }

    // layered on top of the drift: the print falls from above, spinning, and lands with a small squash
    function toss(it, now) {
      var tz = it.toss;
      if (!tz) return;
      var p = (now - tz.at) / TOSS_DUR;
      if (p < 0) { it.alpha = 0; return; }
      if (p < 1) {
        var drop = Math.pow(1 - p, 3); // ease-out: fast throw, gentle touchdown
        it.alpha = Math.min(1, p * 5);
        it.el.style.setProperty("--lift", drop.toFixed(3));
        it.top -= drop * 0.1 * W;
        it.rot += drop * tz.spin;
        it.scale += drop * 0.5;
        return;
      }
      if (!tz.landed) {
        tz.landed = true;
        it.el.style.setProperty("--lift", "0");
      }
      var q = (now - tz.at - TOSS_DUR) / SETTLE;
      if (q >= 1) { it.toss = null; it.el.style.removeProperty("--lift"); return; }
      it.scale -= Math.sin(q * Math.PI) * 0.045 * (1 - q);
    }

    function smooth(a, b, v) {
      var k = Math.max(0, Math.min(1, (v - a) / (b - a)));
      return k * k * (3 - 2 * k);
    }

    function place(it) {
      var w = it.size * W;
      // there's no frame around the prints, so they fade in and out at the sides
      var edge = smooth(-0.12, 0.06, it.x) * smooth(1.12, 0.94, it.x + it.size);
      it.el.style.opacity = (edge * it.alpha).toFixed(3);
      it.el.style.setProperty("--w", w + "px");
      it.el.style.transform = "translate3d(" + it.x * W + "px," + it.top + "px,0) rotate(" + it.rot + "deg) scale(" + it.scale + ")";
    }

    function spawn(lane, x) {
      var el = queue.shift();
      if (!el) return null;
      var it = {
        el: el,
        lane: lane,
        size: lane.size * rand(0.92, 1.06),
        x: x,
        phase: rand(0, Math.PI * 2),
        rot0: rand(-11, 11),
        rotRate: rand(-0.35, 0.35),
        hold: 0,
        held: false,
        gap: rand(0.32, 0.8),
        top: 0, rot: 0, scale: 1, alpha: 1
      };
      el._drift = it;
      el.classList.add("is-on");
      lane.items.push(it);
      return it;
    }

    function step(it, t, dt) {
      var lane = it.lane;
      var target = it.held ? 1 : 0;
      it.hold += (target - it.hold) * Math.min(1, dt * 6);
      var free = 1 - it.hold;
      it.x += lane.speed * free * flow * dt;
      it.rot0 = Math.max(-12, Math.min(12, it.rot0 + it.rotRate * dt * free * flow));
      var bob = Math.sin(t * 1.15 + it.phase);
      var h = it.size * W * PRINT_H;
      it.top = lane.y * W - h / 2 + Math.sin(it.x * 2.6 + it.phase) * 0.028 * W + bob * 0.006 * W - it.hold * 0.012 * W;
      it.rot = (it.rot0 + Math.sin(t * 0.47 + it.phase) * 2.4) * free;
      it.scale = 1 + bob * 0.012 + it.hold * 0.08;
      it.alpha = 1;
    }

    function populate() {
      lanes.forEach(function (lane) {
        // the intro lays the first prints out evenly so the toss fills the water
        if (intro) {
          lane.opening.forEach(function (x) { spawn(lane, x + rand(-0.03, 0.03)); });
          return;
        }
        var x = rand(-0.25, 0.05);
        while (x < 1.05) {
          var it = spawn(lane, x);
          if (!it) break;
          x += it.size + it.gap;
        }
      });
    }

    function frame(now) {
      if (!running) { last = 0; return; }
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      var t = now / 1000;
      if (intro) {
        if (!introAt && storyDone) { introAt = now; planIntro(); drift.classList.remove("is-intro"); }
        if (introAt) {
          // the current eases in once the last print has landed
          var f = Math.max(0, Math.min(1, (now - introEnd) / 1800));
          flow = f * f * (3 - 2 * f);
          if (f >= 1) intro = false;
        }
      }
      lanes.forEach(function (lane) {
        // a new print joins once the previous one has floated clear of the edge
        var tail = lane.items[lane.items.length - 1];
        if (!tail || tail.x > tail.gap) spawn(lane, -lane.size * 1.12);
        for (var i = lane.items.length - 1; i >= 0; i--) {
          var it = lane.items[i];
          step(it, t, dt);
          toss(it, now);
          if (it.x > 1.04) {
            lane.items.splice(i, 1);
            it.el.classList.remove("is-on", "is-held");
            it.el._drift = null;
            queue.push(it.el);
            continue;
          }
          place(it);
        }
      });
      requestAnimationFrame(frame);
    }

    function setRunning(on) {
      on = on && !reduceMotion;
      drift.classList.toggle("is-paused", !on);
      if (on === running) return;
      running = on;
      if (on) requestAnimationFrame(frame);
    }

    field.addEventListener("pointerover", function (e) {
      var el = e.target.closest(".print");
      if (!el || !el._drift) return;
      el._drift.held = true;
      el.classList.add("is-held");
    });
    field.addEventListener("pointerout", function (e) {
      var el = e.target.closest(".print");
      if (!el || !el._drift || el.contains(e.relatedTarget)) return;
      el._drift.held = false;
      el.classList.remove("is-held");
    });

    // Ava's real results, keyed by the print label of the project they belong to
    var stats = [
      { key: "1440", value: 94.5, prefix: "+", suffix: "%", digits: 1, what: "engagement rate", from: "1440 Multiversity, year over year" },
      { key: "Guiding", value: 10, prefix: "+", suffix: "%", digits: 0, what: "application rate", from: "Guiding Leaders, year over year" },
      { key: "Glidewell", value: 180, prefix: "$", suffix: "K+", digits: 0, what: "revenue from organic social", from: "Glidewell.io, Oct 2024 to Aug 2025", total: true }
    ];
    function statFor(el) {
      var name = el.textContent;
      return stats.filter(function (st) { return name.indexOf(st.key) > -1; })[0];
    }
    function shuffle(list) {
      for (var i = list.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), tmp = list[i];
        list[i] = list[j];
        list[j] = tmp;
      }
      return list;
    }

    // the story shoots three random moments, each from a different project; the last one
    // (the one that gets posted and measured) is always from a project with a result to show
    var shots = [];
    if (story) {
      var pool = shuffle(queue.slice());
      var finalShot = pool.filter(statFor)[0];
      var used = {};
      used[finalShot.textContent.trim()] = true;
      pool.forEach(function (el) {
        var name = el.textContent.trim();
        if (shots.length < 2 && !used[name]) {
          used[name] = true;
          shots.push(el);
        }
      });
      shots.push(finalShot);
      var lead = shots[shots.length - 1];
      queue.splice(queue.indexOf(lead), 1);
      queue.splice(lanes[0].opening.length + 1, 0, lead);
    }
    populate();
    if (story) hero = lanes[1].items[1];
    if (intro) drift.classList.add("is-intro");
    lanes.forEach(function (lane) {
      lane.items.forEach(function (it) { step(it, 0, 0); place(it); });
    });
    drift.classList.add("is-ready");
    // wait until the tab is actually in view, so the story isn't spent in a background tab
    if (story) {
      if (document.visibilityState === "visible") playStory();
      else document.addEventListener("visibilitychange", function wake() {
        if (document.visibilityState !== "visible") return;
        document.removeEventListener("visibilitychange", wake);
        playStory();
      });
    }

    function playStory() {
      var card = story.querySelector(".story-card");
      var photo = story.querySelector(".story-photo");
      var shot = story.querySelector(".story-shot");
      var count = story.querySelector(".story-count");
      var roll = story.querySelectorAll(".story-roll i");
      var num = story.querySelector(".story-num");
      // the headline is always the posted project's own result
      var leadName = shots[shots.length - 1].textContent.trim();
      var head = statFor(shots[shots.length - 1]);
      // revenue is a running total, not a comparison: one line, no "last year"
      story.classList.toggle("is-total", !!head.total);
      var fmt = function (st, v) { return st.prefix + v.toFixed(st.digits) + st.suffix; };
      var what = story.querySelector(".story-what");
      what.firstChild.textContent = head.what;
      what.querySelector("em").textContent = head.from;
      num.textContent = fmt(head, 0);
      var srcs = shots.map(function (el) { return el.querySelector("img").src; });
      var timers = [];
      function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
      function step(name) { return function () { story.classList.add(name); }; }

      story.querySelector(".story-avatar img").src = srcs[srcs.length - 1];
      // the viewfinder opens on the first moment already, so it never shows an empty frame
      shot.src = srcs[0];
      story.querySelector(".story-name").textContent = leadName;

      // start once the first moment has loaded, so the viewfinder never opens on a blank frame
      var ready = shot.decode ? shot.decode() : Promise.resolve();
      ready.catch(function () {}).then(function () {
        if (storyDone) return;
        at(300, step("s-finder"));
        // each moment: frame it soft, focus, flash, and it drops into the camera roll
        srcs.forEach(function (src, i) {
          var t = 550 + i * 560;
          at(t, function () {
            photo.classList.remove("is-sharp", "is-focusing");
            void photo.offsetWidth; // restart the focus and flash animations
            shot.src = src;
            count.textContent = i + 1 + "/" + srcs.length;
            photo.classList.add("is-focusing");
          });
          at(t + 300, function () { photo.classList.add("is-sharp"); });
          at(t + 420, function () {
            roll[i].style.backgroundImage = "url(" + src + ")";
            roll[i].classList.add("is-in");
          });
        });
        at(2350, step("s-post"));
        at(4900, function () { story.classList.add("s-insights"); countUp(); });
        // the insights hold for a few seconds once everything is in, so they can be read
        at(9100, function () { story.classList.remove("s-insights"); });
        at(9900, land);
      });
      story.classList.add("is-playing");
      story.addEventListener("click", finish);
      window.addEventListener("scroll", finish, { passive: true });
      window.addEventListener("keydown", finish);

      // the headline number climbs from zero as the card turns over
      function countUp() {
        var start = performance.now() + 650, dur = 1300;
        (function tick(now) {
          if (storyDone) return;
          var k = Math.max(0, Math.min(1, (now - start) / dur));
          num.textContent = fmt(head, head.value * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(tick);
        })(performance.now());
      }

      // the post sheds its chrome and flies to the hero print's spot, lining its photo up with the print's
      function land() {
        story.classList.add("s-land");
        var w = hero.size * W;
        var sr = story.getBoundingClientRect(), cr = card.getBoundingClientRect(), pr = photo.getBoundingClientRect();
        var dx = hero.x * W + w / 2 - (pr.left - sr.left + pr.width / 2);
        var dy = hero.top + w * 0.5 - (pr.top - sr.top + pr.height / 2);
        var sc = (w * 0.87 * hero.scale) / pr.width;
        card.style.transformOrigin = (pr.left - cr.left + pr.width / 2) + "px " + (pr.top - cr.top + pr.height / 2) + "px";
        card.animate([
          { transform: "none" },
          { transform: "translate(" + dx + "px," + dy + "px) rotate(" + hero.rot + "deg) scale(" + sc + ")" }
        ], { duration: 750, easing: "cubic-bezier(0.5, 0, 0.2, 1)", fill: "forwards" }).onfinish = finish;
      }

      // also the skip: a click, scroll or key press ends the story and the prints arrive straight away
      function finish() {
        if (storyDone) return;
        storyDone = true;
        timers.forEach(clearTimeout);
        story.removeEventListener("click", finish);
        window.removeEventListener("scroll", finish);
        window.removeEventListener("keydown", finish);
        story.classList.remove("is-playing");
        story.classList.add("s-gone");
        setTimeout(function () { story.remove(); }, 300);
      }
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        W = drift.clientWidth;
        if (!running) lanes.forEach(function (lane) { lane.items.forEach(function (it) { step(it, 0, 0); place(it); }); });
      }).observe(drift);
    }
    if (!reduceMotion) {
      running = false;
      setRunning(true);
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          setRunning(entries[0].isIntersecting);
        }, { threshold: 0.1 }).observe(drift);
      }
    }
  }

  /* Bubbles rising in the deep-water footer */
  document.querySelectorAll(".bubbles").forEach(function (layer) {
    if (reduceMotion) return;
    for (var b = 0; b < 16; b++) {
      var bubble = document.createElement("i");
      var size = 4 + Math.random() * 16;
      bubble.style.width = size + "px";
      bubble.style.height = size + "px";
      bubble.style.left = Math.random() * 100 + "%";
      bubble.style.animationDuration = (9 + Math.random() * 12).toFixed(1) + "s";
      bubble.style.animationDelay = (-Math.random() * 18).toFixed(1) + "s";
      layer.appendChild(bubble);
    }
  });

  /* Footer year */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
