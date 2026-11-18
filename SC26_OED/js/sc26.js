/*
 * SC26 deck helpers
 *  1. footer on every slide (layer glyph, authors, logo, slide number)
 *  2. looping diagrams:   <div data-loop="ms,ms,...">   (FFTMatvec, K -> K_S)
 *  3. the double-buffered pipeline animation:   <div data-pipeline>
 *  4. the live demo:   <div class="reveal" data-demo-url="...">  +  <span class="fragment" data-demo>
 *  5. the Earth -> Cascadia zoom:   <canvas data-globe>   (needs js/vendor/d3-*.js and data/land-*.json)
 *
 * Nothing here is needed for the content to be readable: without this script
 * (and in the ?print-pdf view) every diagram shows a static state.
 */
(function () {
    'use strict';

    var FOOTER_WHO = 'Sreeram Venkat, Stefan Henneking, & Omar Ghattas — Oden Institute, The University of Texas at Austin';
    var LOGO = 'SC26_OED/images/logos/oden-block-white.svg';
    var PRINT = /print-pdf/i.test(window.location.search);

    /* ---------------------------------------------------------------- footer */
    function leafSlides() {
        return Array.prototype.filter.call(
            document.querySelectorAll('.reveal .slides section'),
            function (s) { return !s.querySelector(':scope > section') && !s.hasAttribute('data-external-replace'); }
        );
    }

    function addFooters() {
        leafSlides().forEach(function (slide, i) {
            if (slide.classList.contains('title') || slide.querySelector(':scope > .ft')) return;
            var ft = document.createElement('div');
            ft.className = 'ft';
            ft.innerHTML =
                '<span class="glyph"><i></i><i></i><i></i></span>' +
                '<span class="ft-tag">SC26</span>' +
                '<span class="ft-who"></span>' +
                '<img class="ft-logo" alt="Oden Institute" src="' + LOGO + '">' +
                '<span class="ft-num">' + (i + 1) + '</span>';
            ft.querySelector('.ft-who').textContent = FOOTER_WHO;
            slide.appendChild(ft);
        });
    }

    /* ------------------------------------------------------- looping diagrams
     * data-loop="d0,d1,...,dN": phase k lasts dk milliseconds. While phase k is
     * showing, the element carries the classes p1 ... pk; the CSS does the rest.
     * The element keeps the class "anim" all the time so that it rests in its
     * cleared state (phase 0) while its slide is off screen.                    */
    function Loop(el) {
        var durations = el.getAttribute('data-loop').split(',').map(Number);
        var phase = 0, timer = null;
        function show(n) {
            for (var k = 1; k < durations.length; k++) el.classList.toggle('p' + k, k <= n);
        }
        function tick() {
            show(phase);
            timer = setTimeout(function () { phase = (phase + 1) % durations.length; tick(); }, durations[phase]);
        }
        el.classList.add('anim');
        show(0);
        return {
            start: function () { clearTimeout(timer); phase = 0; tick(); },
            stop: function () { clearTimeout(timer); timer = null; phase = 0; show(0); }
        };
    }

    /* ------------------------------------------------- double-buffered pipeline
     * Two buffer/stream pairs. Pair b handles candidates b, b+2, b+4, ...:
     *     read candidate into buffer b   (R)
     *     async H2D copy + evaluate on stream b   (the rest of the pair's cycle)
     * The pairs run half a cycle (P) apart, so reading candidate s+1 overlaps
     * with evaluating candidate s, as in the execution timeline trace.
     *
     * The four boxes of the greedy iteration light up in step with it:
     * Partition, then Evaluate while this rank works through its candidates
     * (s ... s+3 here), then Reduce, then Update, and the next iteration starts. */
    function Pipeline(el) {
        var P = 2200;                 // ms between successive candidates
        var R = 0.4 * P;              // read time
        var H = 0.22 * P;             // how long the H2D arrow stays lit
        var COUNT = 4;                // candidates this rank evaluates per greedy iteration (s ... s+3)
        var PARTITION = 800, REDUCE = 900, UPDATE = 900;      // ms spent on the other three stages
        var EVALUATE = (COUNT + 1) * P;                       // until the last candidate has been evaluated
        var ITERATION = PARTITION + EVALUATE + REDUCE + UPDATE;

        var buf = [0, 1].map(function (b) { return el.querySelector('[data-buf="' + b + '"]'); });
        var str = [0, 1].map(function (b) { return el.querySelector('[data-str="' + b + '"]'); });
        var rd  = [0, 1].map(function (b) { return el.querySelector('[data-read="' + b + '"]'); });
        var h2d = [0, 1].map(function (b) { return el.querySelector('[data-h2d="' + b + '"]'); });
        var stages = Array.prototype.slice.call(el.querySelectorAll('.box.stage'));   // Partition, Evaluate, Reduce, Update
        var nodes = buf.concat(str, rd, h2d, stages);
        var saved = null;             // the static snapshot (classes + labels), taken the first time the animation starts
        function snapshot() {
            return nodes.map(function (n) { var w = n.querySelector('.what'); return { cls: n.getAttribute('class'), label: w ? w.innerHTML : null }; });
        }
        var raf = null, t0 = 0;

        function name(c) {
            return '<span class="mv">s</span>' + (c ? '<span class="mn"> + ' + c + '</span>' : '');
        }
        function label(box, text) {
            var w = box.querySelector('.what');
            if (w.getAttribute('data-t') !== text) { w.setAttribute('data-t', text); w.innerHTML = text; }
        }
        function bar(box, x) { box.querySelector('.bar').style.transform = 'scaleX(' + Math.max(0, Math.min(1, x)).toFixed(4) + ')'; }
        function state(node, on, off) { node.classList.toggle('on', !!on); node.classList.toggle('off', !!off); }

        function frame(now) {
            var u = (now - t0) % ITERATION;               // time within the current greedy iteration
            var stage = u < PARTITION ? 0 : u < PARTITION + EVALUATE ? 1 : u < PARTITION + EVALUATE + REDUCE ? 2 : 3;
            stages.forEach(function (s, i) { s.classList.toggle('on', i === stage); });

            var t = u - PARTITION;                        // the pipeline runs during "Evaluate"
            for (var b = 0; b < 2; b++) {
                var tb = t - b * P;                       // this pair's own clock
                var cycle = tb >= 0 ? Math.floor(tb / (2 * P)) : 0;
                var started = tb >= 0 && cycle < COUNT / 2;       // idle before its first and after its last candidate
                if (!started) cycle = 0;
                var tau = started ? tb - cycle * 2 * P : -1;
                var c = b + 2 * cycle;                    // candidate this pair is working on
                var reading = started && tau < R;
                var evaluating = started && tau >= R;

                state(buf[b], reading, !started);
                label(buf[b], 'candidate ' + name(c));
                bar(buf[b], reading ? tau / R : 0);
                rd[b].classList.toggle('act', reading);

                state(str[b], evaluating, !evaluating);
                label(str[b], (evaluating ? 'evaluating ' : 'next, ') + name(c));
                bar(str[b], evaluating ? (tau - R) / (2 * P - R) : 0);
                h2d[b].classList.toggle('act', evaluating && tau < R + H);
                h2d[b].classList.remove('next');
            }
            raf = requestAnimationFrame(frame);
        }

        return {
            start: function () {
                cancelAnimationFrame(raf);
                if (!saved) saved = snapshot();
                t0 = performance.now();
                raf = requestAnimationFrame(frame);
            },
            stop: function () {
                cancelAnimationFrame(raf); raf = null;
                if (!saved) return;
                nodes.forEach(function (n, i) {
                    n.setAttribute('class', saved[i].cls);
                    var w = n.querySelector('.what');
                    if (w) { w.innerHTML = saved[i].label; w.removeAttribute('data-t'); }
                    var bar = n.querySelector('.bar'); if (bar) bar.style.transform = '';
                });
            }
        };
    }

    /* ------------------------------------------------- Earth -> Cascadia zoom
     * A globe drawn on a <canvas> that sits on top of the bathymetry figure.
     * It turns towards the Pacific Northwest and zooms in. During the second
     * half of the flight the globe (orthographic) view is blended into the
     * plain longitude/latitude projection of the figure, so that when the
     * canvas dissolves, the coastline and the amber frame sit exactly on the
     * figure's own coastline and plot frame. Then the locked zone fades in.
     *
     * The Earth itself is satellite imagery (NASA Blue Marble) drawn with WebGL
     * on a second canvas underneath; towards the end of the flight the figure's
     * own bathymetry is painted onto the globe inside the frame. The 2D canvas
     * on top only draws the atmosphere and the amber frame.
     *
     * Fallback without WebGL: a drawn globe (coastlines from data/land-110m.json,
     * then data/land-pnw.json for the close-up). Without d3 or the land data the
     * figure is simply shown as it is. */
    function Globe(canvas) {
        var card = canvas.parentNode;                  // the .mapfade card holding the figure
        var slide = card.closest('section');
        slide.appendChild(canvas);                     // the globe covers the whole slide, then shrinks onto the card
        var W = 1280, H = 720;                         // slide size
        var CARD = { x: 72, y: 118, w: 548, h: 524 };  // where the card sits on the slide (re-measured in size())
        var RAD = Math.PI / 180, DEG = 180 / Math.PI;

        // Where the figure's plot area sits inside the card (measured from the image):
        // plain lon/lat map, 31.15 slide px per degree, centred on (-126, 45.965), at (318.67, 262.65) in the card.
        var MAP = { lon: -126, lat: 45.965, x: CARD.x + 318.67, y: CARD.y + 262.65, scale: 31.15 * DEG,
                    west: -132, east: -120, south: 38.46, north: 53.47,
                    crop: [388.5 / 1648, 88.5 / 1604, 1533 / 1648, 1519.5 / 1604] };   // the plot area inside csz_map.jpg (u0, v0, u1, v1)
        var FROM = { lon: -68, lat: 6, x: W / 2, y: H / 2, scale: 300 };   // whole Earth, centred on the slide
        var TIME = { hold: 900, fly: 3800, fade: 1000, locked: 500, video: 100 };   // ms
        // The clip next to the map starts TIME.video ms after the locked zone begins to appear,
        // so that it is not missed while everyone is still looking at the zoom.
        var video = slide.querySelector('video[data-after-globe]');
        var holding = false, videoTimer = null;
        if (video) {
            video.removeAttribute('data-autoplay');     // this script starts it instead of reveal.js
            video.addEventListener('play', function () { if (holding) video.pause(); });
        }
        function holdVideo() { if (!video) return; clearTimeout(videoTimer); holding = true; video.pause(); try { video.currentTime = 0; } catch (e) {} }
        function playVideo() { if (!video) return; holding = false; var p = video.play(); if (p && p.catch) p.catch(function () {}); }
        var SWITCH = 0.62;                             // progress at which the close-up takes over (the limb is off screen by then)

        var ctx = canvas.getContext('2d');
        var earth = Earth();                           // satellite-imagery layer, or null without WebGL
        var world = null, near = null;                 // coarse world (GeoJSON) / detailed rings [lon, lat, lon, lat, ...]
        var raf = null, timer = null, t0 = 0, ratio = 0;

        function get(attr, done) {
            fetch(canvas.getAttribute(attr)).then(function (r) { return r.json(); }).then(done).catch(function () {});
        }
        get('data-land', function (w) { world = topojson.feature(w, w.objects.land); rest(); });
        get('data-land-near', function (d) { near = d.rings; });

        function ease(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
        function smooth(a, b, u) { u = Math.max(0, Math.min(1, (u - a) / (b - a))); return u * u * (3 - 2 * u); }
        function mix(a, b, u) { return a + (b - a) * u; }

        // the frame of the figure, as a densely sampled outline [lon, lat, lon, lat, ...]
        var frame = (function () {
            var c = [], i;
            for (i = 0; i <= 48; i++) c.push(mix(MAP.west, MAP.east, i / 48), MAP.north);
            for (i = 1; i <= 60; i++) c.push(MAP.east, mix(MAP.north, MAP.south, i / 60));
            for (i = 1; i <= 48; i++) c.push(mix(MAP.east, MAP.west, i / 48), MAP.south);
            for (i = 1; i <= 60; i++) c.push(MAP.west, mix(MAP.south, MAP.north, i / 60));
            return c;
        })();
        var frameLine = { type: 'LineString', coordinates: frame.reduce(function (a, v, i) { if (i % 2) a[a.length - 1].push(v); else a.push([v]); return a; }, []) };

        // graticule every 15 degrees: d3's for the globe, and the same lines cut to the region for the close-up
        var graticule = d3.geoGraticule().step([15, 15])();
        var grid = (function () {
            var lines = [], cur, lon, lat;
            function add(lo, la) {
                if (d3.geoDistance([lo, la], [MAP.lon, MAP.lat]) < 62 * RAD) { if (!cur) lines.push(cur = []); cur.push(lo, la); } else cur = null;
            }
            for (lon = -180; lon < 180; lon += 15) { cur = null; for (lat = -80; lat <= 80; lat += 2) add(lon, lat); }
            for (lat = -75; lat <= 75; lat += 15) { cur = null; for (lon = -180; lon <= 180; lon += 2) add(lon, lat); }
            return lines.filter(function (l) { return l.length >= 4; });
        })();

        /* The satellite-imagery layer: a lon/lat mesh of the sphere, placed by the vertex
           shader with exactly the same globe -> flat-map blend as the 2D drawing below.  */
        function Earth() {
            var glc = document.createElement('canvas');
            glc.className = 'globe';
            var gl = null;
            try { gl = glc.getContext('webgl', { antialias: true, alpha: false }); } catch (e) {}
            if (!gl) return null;
            slide.insertBefore(glc, canvas);

            function shader(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
            var prog = gl.createProgram();
            gl.attachShader(prog, shader(gl.VERTEX_SHADER, [
                'precision highp float;',
                'attribute vec2 ll;',                           // longitude, latitude in degrees
                'uniform vec2 centre, shift, size; uniform float scale, blend;',
                'varying vec2 vll; varying float vz;',
                'void main() {',
                '  float r = 0.017453292519943295;',
                '  float dl = (mod(ll.x - centre.x + 540.0, 360.0) - 180.0) * r, phi = ll.y * r, phi0 = centre.y * r;',
                '  float cp = cos(phi), sp = sin(phi), c0 = cos(phi0), s0 = sin(phi0);',
                '  vec2 globe = vec2(cp * sin(dl), c0 * sp - s0 * cp * cos(dl));',
                '  vec2 plane = vec2(dl, phi - phi0);',
                '  vec2 p = shift + scale * mix(globe, plane, blend) * vec2(1.0, -1.0);',
                '  vz = s0 * sp + c0 * cp * cos(dl);',          // > 0 on the side facing us
                '  vll = ll;',
                '  gl_Position = vec4(p.x / size.x * 2.0 - 1.0, 1.0 - p.y / size.y * 2.0, 0.0, 1.0);',
                '}'].join('\n')));
            gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, [
                'precision highp float;',
                'uniform sampler2D earthTex, mapTex; uniform float blend, mapAlpha; uniform vec4 box, crop;',
                'varying vec2 vll; varying float vz;',
                'void main() {',
                '  if (vz < (blend > 0.0 ? 0.3 : 0.0)) discard;',
                '  vec3 col = texture2D(earthTex, vec2((vll.x + 180.0) / 360.0, (90.0 - vll.y) / 180.0)).rgb;',
                '  col = min(pow(col, vec3(0.78)) * 1.18, 1.0);',                               // lift the dark oceans for a projector
                '  col *= mix(0.72 + 0.28 * sqrt(max(vz, 0.0)), 1.0, blend);',                  // a little darker towards the limb
                '  vec2 m = vec2((vll.x - box.x) / (box.z - box.x), (box.w - vll.y) / (box.w - box.y));',   // inside the figure frame
                '  if (mapAlpha > 0.0 && m.x >= 0.0 && m.x <= 1.0 && m.y >= 0.0 && m.y <= 1.0)',
                '    col = mix(col, texture2D(mapTex, crop.xy + m * (crop.zw - crop.xy)).rgb, mapAlpha);',
                '  gl_FragColor = vec4(col, 1.0);',
                '}'].join('\n')));
            gl.linkProgram(prog);
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('globe shader: ' + gl.getProgramInfoLog(prog) + ' | ' + gl.getAttachedShaders(prog).map(function (s) { return gl.getShaderInfoLog(s); }).join(' | ')); card.removeChild(glc); return null; }
            gl.useProgram(prog);

            // the sphere as a 1.5-degree lon/lat grid
            var STEP = 1.5, nx = 360 / STEP + 1, ny = 180 / STEP + 1, verts = new Float32Array(nx * ny * 2), idx = new Uint16Array((nx - 1) * (ny - 1) * 6), i, j, k = 0;
            for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) { verts[k++] = -180 + i * STEP; verts[k++] = -90 + j * STEP; }
            for (k = 0, j = 0; j < ny - 1; j++) for (i = 0; i < nx - 1; i++) {
                var a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
                idx[k++] = a; idx[k++] = b; idx[k++] = c; idx[k++] = b; idx[k++] = d; idx[k++] = c;
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
            var loc = gl.getAttribLocation(prog, 'll'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
            function U(name) { return gl.getUniformLocation(prog, name); }

            var loaded = 0;
            function texture(unit, attr, mipmaps) {
                var tex = gl.createTexture(), img = new Image();
                img.onload = function () {
                    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    if (mipmaps) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
                    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    loaded++; rest();
                };
                img.src = canvas.getAttribute(attr);
            }
            texture(0, 'data-earth', true);             // 4096 x 2048, power of two
            texture(1, 'data-map', false);              // the figure itself
            gl.uniform1i(U('earthTex'), 0); gl.uniform1i(U('mapTex'), 1);
            gl.uniform4f(U('box'), MAP.west, MAP.south, MAP.east, MAP.north);
            gl.uniform4f(U('crop'), MAP.crop[0], MAP.crop[1], MAP.crop[2], MAP.crop[3]);
            gl.uniform2f(U('size'), W, H);

            return {
                canvas: glc,
                ready: function () { return loaded === 2; },
                resize: function (r) { glc.width = Math.round(W * r); glc.height = Math.round(H * r); gl.viewport(0, 0, glc.width, glc.height); },
                draw: function (lon, lat, scale, x, y, blend, mapAlpha) {
                    gl.clearColor(0.02, 0.047, 0.063, 1); gl.clear(gl.COLOR_BUFFER_BIT);
                    gl.uniform2f(U('centre'), lon, lat); gl.uniform2f(U('shift'), x, y);
                    gl.uniform1f(U('scale'), scale); gl.uniform1f(U('blend'), blend); gl.uniform1f(U('mapAlpha'), mapAlpha);
                    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
                }
            };
        }

        function draw(q) {                              // q in [0, 1]: progress of the flight
            var turn = ease(Math.min(1, q / 0.72)), zoom = ease(q);
            var photo = earth && earth.ready();
            var closeUp = q >= SWITCH && (near || photo);
            var blend = closeUp ? smooth(SWITCH, 0.96, q) : 0;      // 0 = globe ... 1 = flat lon/lat map
            var k = smooth(0.76, 1, q);                             // 0 = full slide ... 1 = shrunk onto the card
            var clip = 'inset(' + (CARD.y * k).toFixed(1) + 'px ' + ((W - CARD.x - CARD.w) * k).toFixed(1) + 'px ' +
                       ((H - CARD.y - CARD.h) * k).toFixed(1) + 'px ' + (CARD.x * k).toFixed(1) + 'px round ' + (5 * k).toFixed(1) + 'px)';
            canvas.style.clipPath = clip; if (earth) earth.canvas.style.clipPath = clip;
            var lon = mix(FROM.lon, MAP.lon, turn), lat = mix(FROM.lat, MAP.lat, turn);
            var x = mix(FROM.x, MAP.x, turn), y = mix(FROM.y, MAP.y, turn);
            var scale = FROM.scale * Math.pow(MAP.scale / FROM.scale, zoom);

            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            if (photo) {                                // imagery underneath; this canvas only adds atmosphere + frame
                earth.draw(lon, lat, scale, x, y, blend, smooth(0.72, 0.95, q));
                ctx.clearRect(0, 0, W, H);
            } else {
                ctx.fillStyle = '#050c10';
                ctx.fillRect(0, 0, W, H);
            }
            var sea = ctx.createRadialGradient(x - scale * 0.3, y - scale * 0.35, scale * 0.1, x, y, scale * 1.02);
            sea.addColorStop(0, '#2f7fb0'); sea.addColorStop(0.6, '#1c5d8a'); sea.addColorStop(1, '#0c3554');
            ctx.lineJoin = 'round';

            if (!closeUp) {
                // ---- the globe, with d3-geo (clips to the visible hemisphere)
                var path = d3.geoPath(d3.geoOrthographic().rotate([-lon, -lat]).scale(scale).translate([x, y]).clipAngle(90).precision(0.8), ctx);
                var halo = ctx.createRadialGradient(x, y, scale * 0.955, x, y, scale * 1.09);
                halo.addColorStop(0, 'rgba(120, 190, 235, 0)'); halo.addColorStop(0.3, 'rgba(120, 190, 235, .5)'); halo.addColorStop(1, 'rgba(120, 190, 235, 0)');
                ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, scale * 1.09, 0, 2 * Math.PI); ctx.fill();
                if (!photo) {
                    ctx.fillStyle = sea; ctx.beginPath(); path({ type: 'Sphere' }); ctx.fill();
                    ctx.strokeStyle = 'rgba(255, 255, 255, .13)'; ctx.lineWidth = 0.7;
                    ctx.beginPath(); path(graticule); ctx.stroke();
                    ctx.fillStyle = '#c9b188'; ctx.strokeStyle = 'rgba(70, 55, 30, .55)'; ctx.lineWidth = 0.6;
                    ctx.beginPath(); path(world); ctx.fill(); ctx.stroke();
                }
                ctx.strokeStyle = '#f6b93b'; ctx.lineWidth = 2.2;
                ctx.beginPath(); path(frameLine); ctx.stroke();
                return;
            }

            // ---- the close-up: every point is on the near side, so project directly
            var sin0 = Math.sin(lat * RAD), cos0 = Math.cos(lat * RAD);
            function trace(line, close) {
                for (var i = 0; i < line.length; i += 2) {
                    var dl = line[i] - lon; if (dl > 180) dl -= 360; else if (dl < -180) dl += 360;
                    dl *= RAD;
                    var phi = line[i + 1] * RAD, cp = Math.cos(phi), sp = Math.sin(phi);
                    var gx = cp * Math.sin(dl), gy = cos0 * sp - sin0 * cp * Math.cos(dl);      // on the globe
                    var fy = phi - lat * RAD;                                                    // on the flat map: (dl, fy)
                    var px = x + scale * (gx + (dl - gx) * blend), py = y - scale * (gy + (fy - gy) * blend);
                    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
                }
                if (close) ctx.closePath();
            }
            if (!photo) {
                ctx.fillStyle = sea; ctx.fillRect(0, 0, W, H);
                ctx.strokeStyle = 'rgba(255, 255, 255, .13)'; ctx.lineWidth = 0.7;
                ctx.beginPath(); grid.forEach(function (l) { trace(l, false); }); ctx.stroke();
                ctx.fillStyle = '#c9b188';              // fill only: the data is tiled, outlines would show the seams
                ctx.beginPath(); near.forEach(function (r) { trace(r, true); }); ctx.fill();
            }
            ctx.strokeStyle = '#f6b93b'; ctx.lineWidth = 2.2;
            ctx.beginPath(); trace(frame, true); ctx.stroke();
        }

        function size() {                               // crisp at the current slide scale
            var a = slide.getBoundingClientRect(), b = card.getBoundingClientRect();
            if (a.width && b.width) {                   // where the card is on the slide, in slide pixels
                var f = W / a.width;
                CARD = { x: (b.left - a.left) * f, y: (b.top - a.top) * f, w: b.width * f, h: b.height * f };
                MAP.x = CARD.x + 318.67; MAP.y = CARD.y + 262.65;
            }
            var r = Math.min(2, (window.devicePixelRatio || 1) * Math.max(1, Reveal.getScale()));
            if (r !== ratio) { ratio = r; canvas.width = Math.round(W * r); canvas.height = Math.round(H * r); if (earth) earth.resize(r); }
        }
        function show(on) { canvas.classList.toggle('on', on); if (earth) earth.canvas.classList.toggle('on', on); }
        function rest() {                               // waiting off screen: the whole Earth
            if (!world || raf) return;
            size(); draw(0);
            card.classList.add('js'); card.classList.remove('locked');
            show(true);
        }
        function tick(now) {
            var q = Math.max(0, Math.min(1, (now - t0 - TIME.hold) / TIME.fly));
            draw(q);
            if (q < 1) { raf = requestAnimationFrame(tick); return; }
            raf = null;
            show(false);                                // dissolve into the figure (CSS transition)
            timer = setTimeout(function () { card.classList.add('locked'); }, TIME.fade + TIME.locked);
            videoTimer = setTimeout(playVideo, TIME.fade + TIME.locked + TIME.video);
        }

        // for tuning in the browser console:  document.querySelector('canvas[data-globe]').seek(0.8)
        canvas.seek = function (q) { cancelAnimationFrame(raf); raf = null; clearTimeout(timer); size(); draw(q); show(true); };

        return {
            start: function () {
                if (!world) { playVideo(); return; }    // no data (yet): leave the figure alone, just play the clip
                cancelAnimationFrame(raf); clearTimeout(timer);
                holdVideo();
                size(); draw(0);
                card.classList.add('js'); card.classList.remove('locked');
                show(true);
                t0 = performance.now();
                raf = requestAnimationFrame(tick);
            },
            stop: function () { cancelAnimationFrame(raf); raf = null; clearTimeout(timer); clearTimeout(videoTimer); holding = false; rest(); }
        };
    }

    /* ------------------------------------------------------------- live demo
     * One <iframe> for the whole talk, created when the deck loads and never
     * removed, so the demo keeps its state and keeps running between the two
     * times it is shown. It is visible while a <span class="fragment" data-demo>
     * is the current fragment, and the D key toggles it at any time.
     *
     * Once you click inside the demo, key presses (and the clicker) go to the
     * demo, not to the deck. Moving the mouse onto the bar at the top gives the
     * keyboard back to the deck; "Back to slides" does that and hides the demo. */
    function Demo() {
        var url = document.querySelector('.reveal').getAttribute('data-demo-url');
        var inSpeakerView = /receiver/i.test(window.location.search) || window.self !== window.top;
        if (!url || inSpeakerView) return;

        var layer = document.createElement('div');
        layer.className = 'demo-layer';
        layer.innerHTML =
            '<div class="demo-bar">' +
                '<span class="demo-dot"></span><span class="demo-title">Live demo</span><span class="demo-url"></span>' +
                '<button type="button" class="demo-reload">Reload</button>' +
                '<button type="button" class="demo-back">Back to slides</button>' +
            '</div>' +
            '<div class="demo-body">' +
                '<iframe title="Live demo" allow="fullscreen; clipboard-read; clipboard-write"></iframe>' +
                '<div class="demo-wait"><div>Waiting for the demo at <code></code></div>' +
                '<small>It will appear here as soon as the port answers.</small>' +
                '<button type="button" class="demo-force">Load it anyway</button></div>' +
            '</div>';
        layer.querySelector('.demo-url').textContent = url;
        layer.querySelector('.demo-wait code').textContent = url;
        Reveal.getViewportElement().appendChild(layer);

        var frame = layer.querySelector('iframe');
        var shown = false, timer = null;

        function load() { clearTimeout(timer); frame.src = url; layer.classList.add('ready'); }
        function probe() {                       // start the iframe once the port answers
            if (layer.classList.contains('ready')) return;
            fetch(url, { mode: 'no-cors', cache: 'no-store' }).then(load, function () { timer = setTimeout(probe, 2500); });
        }
        function deckFocus() {
            if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
            window.focus();
        }
        function show(on) {
            shown = on;
            layer.classList.toggle('show', on);
            if (!on) deckFocus();
        }
        function wanted() {
            var slide = Reveal.getCurrentSlide();
            return !!(slide && slide.querySelector('.fragment[data-demo].current-fragment'));
        }
        function sync() { show(wanted()); }

        layer.querySelector('.demo-bar').addEventListener('mouseenter', deckFocus);
        layer.querySelector('.demo-force').addEventListener('click', load);
        layer.querySelector('.demo-reload').addEventListener('click', function () { layer.classList.remove('ready'); frame.removeAttribute('src'); probe(); });
        layer.querySelector('.demo-back').addEventListener('click', function () {
            if (wanted()) Reveal.next(); else show(false);
        });
        Reveal.on('fragmentshown', sync);
        Reveal.on('fragmenthidden', sync);
        Reveal.on('slidechanged', sync);
        Reveal.addKeyBinding({ keyCode: 68, key: 'D', description: 'Show / hide the live demo' }, function () { show(!shown); });

        probe();
        sync();
    }

    /* --------------------------------------------------------------- wiring */
    function init() {
        addFooters();
        if (PRINT) return;                                // static diagrams in the PDF
        Demo();

        var players = [];
        document.querySelectorAll('.reveal .slides [data-loop]').forEach(function (el) {
            players.push({ slide: el.closest('section'), player: Loop(el) });
        });
        document.querySelectorAll('.reveal .slides [data-pipeline]').forEach(function (el) {
            players.push({ slide: el.closest('section'), player: Pipeline(el) });
        });
        if (window.d3 && d3.geoOrthographic && window.topojson) {
            document.querySelectorAll('.reveal .slides canvas[data-globe]').forEach(function (el) {
                players.push({ slide: el.closest('section'), player: Globe(el) });
            });
        }

        function sync() {
            var current = Reveal.getCurrentSlide();
            players.forEach(function (p) {
                var active = p.slide === current;
                if (active && !p.running) { p.running = true; p.player.start(); }
                if (!active && p.running) { p.running = false; p.player.stop(); }
            });
        }
        Reveal.on('slidechanged', sync);
        sync();
    }

    if (Reveal.isReady && Reveal.isReady()) init();
    else Reveal.on('ready', init);
})();
