// @ts-nocheck
// biome-ignore-all lint: old graphdlc
import { LangSettings } from '@logic-arrows/lang/lang-settings';
import type { LangType } from '@logic-arrows/lang/lang-type';
import { LangUtils } from '@logic-arrows/lang/lang-utils';
import { UpdateManager } from './core/credentials/UpdateManager';
import { GraphDLC } from './core/GraphDLC';
import { PatchLoader } from './core/PatchLoader';

const selectedBundle = localStorage.getItem('arrows:selectedBundleId');
const selectedVersion = selectedBundle ?? '1_4';
if (selectedBundle === null)
    localStorage.setItem('arrows:selectedBundleId', '1_4');

if (selectedVersion === '1_2_1') {
    const style = `
    :root {
        --light-blue: rgb(55, 95, 187) !important;
        --light-green: rgb(40, 220, 70) !important;
        --light-red: rgb(216, 34, 34) !important;
    }

    .ui-panel {
        z-index: 3 !important;
    }

    .custom-tps-container {
        position: inherit;
        left: 0;
        z-index: 2;
    }

    .ui-range-thumb {
        z-index: 3 !important;
    }

    .custom-tps-input {
        height: 1.5vw;
        border-radius: 0.5vw;
        background: #ccc;
        border: none;
        margin: 0;
        position: absolute;
        top: 0;
        width: 11.5vw;
        font-size: 1.25vw;
        padding: 0.25vw;
        font-family: 'Nunito', 'Trebuchet MS', 'Lucida Sans', Arial, serif;
    }

    .custom-tps-input:focus-visible {
        outline: 2px solid var(--light-blue);
    }

    .cuicomponent {
        font-size: 2.0vmin;
        font-family: 'Nunito', 'Trebuchet MS', 'Lucida Sans', Arial, serif;
    }

    .graphdlc-info {
        position: absolute;
        top: 1vmin;
        left: 1vmin;
    }

    .setting-value select {
        border-radius: 0.6vh !important;
        padding: 0.2rem !important;
    }

    .setting-value input[type='checkbox'] {
        width: 1.1rem !important;
        height: 1.1rem !important;
    }

    .ui-inventory-items {
        background-color: var(--light-blue) !important;
        border-radius: 1.2vw !important;
    }

    .ui-inventory-line {
        background-color: transparent !important;
    }

    .inventory-item {
        background-color: var(--background) !important;
        border-radius: 1.2vw !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }

    .inventory-item img {
        width: 2.8vw !important;
        height: 2.8vw !important;
    }

    * {
        -moz-user-select: -moz-none;
        -khtml-user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }
    `;
    const el = document.createElement('style');
    el.textContent = style;
    const appendToHead = () => {
        if (document.head) {
            document.head.appendChild(el);
            return true;
        }

        const observer = new MutationObserver(() => {
            if (document.head) {
                document.head.appendChild(el);
                observer.disconnect();
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
        return false;
    };
    appendToHead();
    (() => {
        class A {
            isEntryPoint;
            isAdditionalUpdate;
            isLogic;
            notAllowedToChange;
            index;
            static _values = [];
            constructor(t, e, g, s) {
                (this.isEntryPoint = t),
                    (this.isAdditionalUpdate = e),
                    (this.isLogic = g),
                    (this.notAllowedToChange = s),
                    (this.index = A._values.length),
                    A._values.push(this);
            }
            static PATH = new A(!1, !1, !1, !1);
            static SOURCE = new A(!0, !1, !1, !0);
            static BLOCKER = new A(!1, !1, !1, !1);
            static DELAY = new A(!1, !0, !1, !1);
            static DETECTOR = new A(!1, !1, !1, !0);
            static IMPULSE = new A(!0, !0, !1, !0);
            static LOGIC_NOT = new A(!0, !1, !0, !1);
            static LOGIC_AND = new A(!1, !1, !0, !1);
            static LOGIC_XOR = new A(!1, !1, !0, !1);
            static LATCH = new A(!1, !1, !0, !1);
            static FLIP_FLOP = new A(!1, !0, !0, !1);
            static RANDOM = new A(!1, !0, !1, !1);
            static BUTTON = new A(!0, !1, !1, !0);
            static DIRECTIONAL_BUTTON = new A(!0, !1, !1, !1);
            static WRITE_CYCLE_HEAD = new A(!1, !1, !1, !1);
            static READ_CYCLE_HEAD = new A(!1, !1, !1, !1);
            static EMPTY = new A(!1, !1, !1, !0);
            static UNKNOWN = new A(!1, !1, !1, !0);
            static values() {
                return [...A._values];
            }
            static fromIndex(t) {
                return A._values[t];
            }
        }
        A.PATH.index,
            A.SOURCE.index,
            A.BLOCKER.index,
            A.DELAY.index,
            A.DETECTOR.index,
            A.IMPULSE.index,
            A.LOGIC_NOT.index,
            A.LOGIC_AND.index,
            A.LOGIC_XOR.index,
            A.LATCH.index,
            A.FLIP_FLOP.index,
            A.RANDOM.index,
            A.BUTTON.index,
            A.DIRECTIONAL_BUTTON.index,
            A.WRITE_CYCLE_HEAD.index,
            A.READ_CYCLE_HEAD.index;
        function t(t) {
            switch (t) {
                case 0:
                    return A.EMPTY;
                case 1:
                case 6:
                case 7:
                case 8:
                case 10:
                case 11:
                case 12:
                case 13:
                case 14:
                case 22:
                case 23:
                    return A.PATH;
                case 2:
                    return A.SOURCE;
                case 3:
                    return A.BLOCKER;
                case 4:
                    return A.DELAY;
                case 5:
                    return A.DETECTOR;
                case 9:
                    return A.IMPULSE;
                case 15:
                    return A.LOGIC_NOT;
                case 16:
                    return A.LOGIC_AND;
                case 17:
                    return A.LOGIC_XOR;
                case 18:
                    return A.LATCH;
                case 19:
                    return A.FLIP_FLOP;
                case 20:
                    return A.RANDOM;
                case 21:
                    return A.BUTTON;
                case 24:
                    return A.DIRECTIONAL_BUTTON;
                default:
                    return A.UNKNOWN;
            }
        }
        function e(A, t) {
            const e = A.indexOf(t);
            return (
                -1 !== e &&
                (e !== A.length - 1 && (A[e] = A[A.length - 1]), A.pop(), !0)
            );
        }
        function g(A, t, e) {
            const g = A.indexOf(t);
            return -1 !== g && ((A[g] = e), !0);
        }
        class s {
            arrows = [];
            backEdges = [];
            allEdges = [];
            edges = [];
            detectors = [];
            type = A.PATH;
            isBranch = !1;
            specialNode = void 0;
            makeFromArrow(A) {
                return this.arrows.push(A), (this.type = t(A.type)), this;
            }
            filterDuplicates() {
                return (
                    (this.arrows = [...new Set(this.arrows)]),
                    (this.backEdges = [...new Set(this.backEdges)]),
                    (this.allEdges = [...new Set(this.allEdges)]),
                    (this.edges = [...new Set(this.edges)]),
                    (this.detectors = [...new Set(this.detectors)]),
                    this
                );
            }
            combine(A, t) {
                for (let A = 0; A < t.length; A++) {
                    t[A].replaceBy(this);
                }
                this.filterDuplicates();
                for (let e = 0; e < t.length; e++) t[e].remove(A);
                return this;
            }
            remove(t) {
                for (let A = 0; A < this.backEdges.length; A++) {
                    const t = this.backEdges[A];
                    e(t.allEdges, this),
                        e(t.edges, this),
                        e(t.detectors, this),
                        t.specialNode === this && (t.specialNode = void 0);
                }
                for (let A = 0; A < this.allEdges.length; A++) {
                    e(this.allEdges[A].backEdges, this);
                }
                for (let A = 0; A < this.arrows.length; A++) {
                    const e = this.arrows[A];
                    t.astNodes.delete(e);
                }
                e(t.allEdges, this),
                    (this.arrows.length = 0),
                    (this.backEdges.length = 0),
                    (this.allEdges.length = 0),
                    (this.edges.length = 0),
                    (this.detectors.length = 0),
                    (this.type = A.UNKNOWN),
                    (this.specialNode = void 0);
            }
            replaceBy(A) {
                A.type = this.type;
                for (let t = 0; t < this.backEdges.length; t++) {
                    const e = this.backEdges[t];
                    g(e.allEdges, this, A),
                        g(e.edges, this, A),
                        g(e.detectors, this, A),
                        A.backEdges.push(e);
                }
                for (let t = 0; t < this.edges.length; t++) {
                    const e = this.edges[t];
                    g(e.backEdges, this, A),
                        A.allEdges.push(e),
                        A.edges.push(e);
                }
                for (let t = 0; t < this.detectors.length; t++) {
                    const e = this.detectors[t];
                    g(e.backEdges, this, A),
                        A.allEdges.push(e),
                        A.detectors.push(e);
                }
                for (let t = 0; t < this.arrows.length; t++) {
                    const e = this.arrows[t];
                    A.arrows.push(e);
                }
            }
        }
        class i extends s {
            cycles = [];
            astNodes = new Map();
        }
        class I {
            patchLoader;
            ChunkSizePtr;
            constructor(A) {
                (this.patchLoader = A),
                    (this.ChunkSizePtr = A.getDefinitionPtr('CHUNK_SIZE'));
            }
            compileFrom(e) {
                const g = this.ChunkSizePtr.definition,
                    I = [];
                e.chunks.forEach((A) => {
                    for (let e = 0; e < g; e++)
                        for (let s = 0; s < g; s++) {
                            const i = A.arrows[s + e * g];
                            (i.x = s + A.x * g), (i.y = e + A.y * g);
                            t(i.type).isEntryPoint &&
                                I.push({ chunk: A, arrow: i, x: s, y: e });
                        }
                });
                const o = new Set(),
                    a = new i();
                for (; I.length > 0; ) {
                    const { chunk: e, arrow: i, x: B, y: E } = I.pop();
                    if (t(i.type) === A.UNKNOWN) {
                        console.warn(
                            'Founded arrow with uncommon type: ' + i.type,
                        );
                        continue;
                    }
                    if (o.has(i)) continue;
                    a.astNodes.has(i) ||
                        a.astNodes.set(i, new s().makeFromArrow(i));
                    const c = a.astNodes.get(i);
                    o.add(i), c.type.isEntryPoint && a.allEdges.push(c);
                    const Q = n(i.type);
                    for (let n = 0; n < Q.length; n++) {
                        const [h, r] = Q[n],
                            l = C(g, e, B, E, i.rotation, i.flipped, h, r);
                        if (!l) continue;
                        const [d, w, D, f] = l,
                            p = t(d.type);
                        if (
                            (p.notAllowedToChange && 3 !== i.type) ||
                            p === A.EMPTY
                        )
                            continue;
                        if (p === A.UNKNOWN) {
                            console.warn(
                                'Founded arrow with uncommon type: ' + d.type,
                            );
                            continue;
                        }
                        a.astNodes.has(d) ||
                            a.astNodes.set(d, new s().makeFromArrow(d));
                        const y = a.astNodes.get(d);
                        y.backEdges.push(c),
                            c.allEdges.push(y),
                            c.edges.push(y),
                            c.type === A.BLOCKER && (c.specialNode = y),
                            o.has(d) ||
                                I.push({ chunk: f, arrow: d, x: w, y: D });
                    }
                    const h = n(2);
                    for (let A = 0; A < h.length; A++) {
                        const [t, n] = h[A],
                            Q = C(g, e, B, E, i.rotation, i.flipped, t, n);
                        if (!Q) continue;
                        const [r, l, d, w] = Q;
                        if (5 !== r.type) continue;
                        const D = C(g, w, l, d, r.rotation, r.flipped, 1, 0);
                        if (!D) continue;
                        const [f, p, y, u] = D;
                        if (p === B && y === E && u === e) {
                            a.astNodes.has(r) ||
                                a.astNodes.set(r, new s().makeFromArrow(r));
                            const A = a.astNodes.get(r);
                            (A.specialNode = c),
                                A.backEdges.push(c),
                                c.allEdges.push(A),
                                c.detectors.push(A),
                                o.has(r) ||
                                    I.push({ chunk: w, arrow: r, x: l, y: d });
                        }
                    }
                }
                return a;
            }
        }
        function C(A, t, e, g, s, i, I = -1, C = 0) {
            i && (C = -C);
            let n = e,
                o = g;
            switch (s) {
                case 0:
                    (o += I), (n += C);
                    break;
                case 1:
                    (n -= I), (o += C);
                    break;
                case 2:
                    (o -= I), (n -= C);
                    break;
                case 3:
                    (n += I), (o -= C);
            }
            let a = t;
            const B = Math.floor(n / A),
                E = Math.floor(o / A);
            if (0 !== B || 0 !== E) {
                const e = [7, 0, 1, 6, -1, 2, 5, 4, 3][3 * (E + 1) + (B + 1)];
                if (-1 === e || !t.adjacentChunks[e]) return;
                (a = t.adjacentChunks[e]),
                    (n %= A),
                    (o %= A),
                    n < 0 && (n += A),
                    o < 0 && (o += A);
            }
            if (a) return [a.getArrow(n, o), n, o, a];
        }
        function n(A) {
            switch (A) {
                case 1:
                case 3:
                case 4:
                case 5:
                case 15:
                case 16:
                case 17:
                case 18:
                case 19:
                case 20:
                case 22:
                case 24:
                    return [[-1, 0]];
                case 2:
                case 9:
                case 21:
                    return [
                        [-1, 0],
                        [1, 0],
                        [0, -1],
                        [0, 1],
                    ];
                case 6:
                    return [
                        [-1, 0],
                        [1, 0],
                    ];
                case 7:
                    return [
                        [-1, 0],
                        [0, 1],
                    ];
                case 8:
                    return [
                        [0, -1],
                        [-1, 0],
                        [0, 1],
                    ];
                case 10:
                    return [[-2, 0]];
                case 11:
                    return [[-1, 1]];
                case 12:
                    return [
                        [-1, 0],
                        [-2, 0],
                    ];
                case 13:
                    return [
                        [0, 1],
                        [-2, 0],
                    ];
                case 14:
                    return [
                        [-1, 0],
                        [-1, 1],
                    ];
                default:
                    return [];
            }
        }
        class o {
            parent;
            element;
            isRemoved;
            constructor(A) {
                (this.parent = A),
                    (this.element = document.createElement('div')),
                    this.element.classList.add('cuicomponent'),
                    this.parent.appendChild(this.element),
                    (this.isRemoved = !1);
            }
            setVisibility(A) {
                this.element.hidden = !A;
            }
            remove() {
                (this.isRemoved = !0), this.element.remove();
            }
        }
        class a extends o {
            settings;
            tpsLocale;
            fpsLocale;
            lastUpdate;
            ticks;
            frames;
            tps;
            fps;
            constructor(A, t) {
                super(t), (this.settings = A.settings);
                const e = A.patchLoader.getDefinitionPtr('GameText').definition;
                (this.tpsLocale = e.TPS_LOCALE.get()),
                    (this.fpsLocale = e.FPS_LOCALE.get()),
                    (this.lastUpdate = 0),
                    (this.ticks = 0),
                    (this.frames = 0),
                    (this.tps = 0),
                    (this.fps = 0),
                    this.element.classList.add('tps-info'),
                    this.updateInfo();
            }
            updateInfo() {
                this.isRemoved ||
                    (this.element.innerText = `${this.fpsLocale}: ${Math.round(this.fps)} | ${this.tpsLocale}: ${Math.round(this.tps)}`);
            }
            updateTicks(A) {
                (this.ticks += A), (this.frames += 1);
                const t = Date.now(),
                    e = t - this.lastUpdate;
                e < this.settings.data.tpsUpdateFrequencyMs ||
                    ((this.tps = (this.ticks / e) * 1e3),
                    (this.fps = (this.frames / e) * 1e3),
                    (this.ticks = 0),
                    (this.frames = 0),
                    (this.lastUpdate = t),
                    this.updateInfo());
            }
        }
        class B extends o {
            tpsInfo;
            constructor(A) {
                super(document.body),
                    this.element.classList.add('graphdlc-info'),
                    (this.tpsInfo = new a(A, this.element)),
                    (A.customUI.tpsInfo = this.tpsInfo);
            }
        }
        class E extends o {
            field;
            tps;
            constructor(A) {
                super(A),
                    (this.tps = 0),
                    this.element.classList.add('custom-tps-container'),
                    (this.field = document.createElement('input')),
                    (this.field.type = 'number'),
                    (this.field.min = '1'),
                    (this.field.max = '1000000'),
                    (this.field.value = '1'),
                    this.field.classList.add('custom-tps-input'),
                    this.field.addEventListener('change', () => {
                        const A = parseInt(this.field.value),
                            t = Number.isNaN(A) ? 1 : A;
                        (this.tps = Math.max(1, Math.min(t, 1e6))),
                            (this.field.value = this.tps.toString(10));
                    }),
                    this.element.appendChild(this.field),
                    this.setVisibility(!1);
            }
            getTicksPerFrame() {
                return Math.max(1, Math.round(this.tps / 60));
            }
            isFocused() {
                return !this.isRemoved && this.field === document.activeElement;
            }
            focus() {
                this.field.focus();
            }
            blur() {
                this.field.blur();
            }
            setVisibility(A) {
                if (this.isRemoved) return;
                const t = this.element.hidden;
                super.setVisibility(A), t && A && this.focus();
            }
        }
        class c {
            static STORAGE_KEY = 'graphdlc';
            data;
            constructor() {
                (this.data = {
                    tpsUpdateFrequencyMs: 500,
                    fullRendering: !0,
                    targetFPS: 60,
                    showTPSInfo: !0,
                    showDebugInfo: !0,
                    showArrowConnections: !1,
                    showArrowTarget: !1,
                    optimizeRings: !0,
                    optimizeButtons: !1,
                    optimizePixels: !0,
                    optimizeBranches: !0,
                    optimizeSimple: !0,
                    optimizePaths: !0,
                    debugMode: 0,
                }),
                    this.load();
            }
            load() {
                this.hasData(c.STORAGE_KEY) || this.save();
                const A = this.getData(c.STORAGE_KEY, {});
                this.data = { ...this.data, ...A };
            }
            save() {
                this.setData(c.STORAGE_KEY, this.data);
            }
            hasData(A) {
                return null !== localStorage.getItem(A);
            }
            getData(A, t) {
                const e = localStorage.getItem(A);
                return null !== e ? JSON.parse(e) : t;
            }
            setData(A, t) {
                localStorage.setItem(A, JSON.stringify(t));
            }
        }
        function Q(t, e) {
            if (t === A.BLOCKER) return e === A.PATH ? 3 : void 0;
            switch (e) {
                case A.LOGIC_XOR:
                    return 1;
                case A.LOGIC_AND:
                    return 2;
                case A.PATH:
                    return 0;
                default:
                    return;
            }
        }
        class h extends s {
            cycleHeadType = 0;
            index = -1;
            cycleData;
            constructor(A) {
                super(), (this.cycleData = A);
            }
        }
        class r {
            cycle;
            length;
            constructor(A) {
                (this.cycle = A), (this.length = 0);
            }
        }
        const l = new Set([A.PATH, A.DELAY, A.LOGIC_XOR]);
        class d {
            optimizeCycles(A) {
                const t = this.findCycles(A);
                this.makeCycleNodes(A, t);
            }
            findCycles(A) {
                const t = [A],
                    e = new Map([[A, 0]]),
                    g = [A];
                for (let A = 0; A < g.length; A++) {
                    const s = g[A].allEdges;
                    for (let A = 0; A < s.length; A++) {
                        const i = s[A];
                        e.has(i) || (e.set(i, t.length), t.push(i), g.push(i));
                    }
                }
                const i = t.length;
                if (1 === i) return [];
                const I = new Uint8Array(i);
                for (let A = 0; A < i; A++) {
                    const e = t[A];
                    e.constructor === s &&
                        1 === e.arrows.length &&
                        l.has(e.type) &&
                        (I[A] = 1);
                }
                const C = new Int32Array(i + 1);
                let n = 0;
                for (let A = 0; A < i; A++)
                    (n += t[A].allEdges.length), (C[A + 1] = n);
                const o = new Int32Array(n);
                {
                    let A = 0;
                    for (let g = 0; g < i; g++) {
                        const s = t[g].allEdges;
                        for (let t = 0; t < s.length; t++) o[A++] = e.get(s[t]);
                    }
                }
                const a = new Uint8Array(n),
                    B = new Int32Array(i).fill(-1),
                    E = new Int32Array(i),
                    c = new Uint32Array(i);
                let Q = 1;
                const h = new Int32Array(i),
                    r = new Int32Array(i),
                    d = new Set(),
                    w = [],
                    D = (A) => {
                        let t = (A + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
                        return (
                            (t =
                                (0xbf58476d1ce4e5b9n * (t ^ (t >> 30n))) &
                                0xffffffffffffffffn),
                            (t =
                                (0x94d049bb133111ebn * (t ^ (t >> 27n))) &
                                0xffffffffffffffffn),
                            t ^ (t >> 31n)
                        );
                    };
                for (let A = 0; A < i; A++) {
                    if (!I[A]) continue;
                    Q++;
                    let e = 0;
                    for (
                        h[e] = A, r[e] = C[A], E[A] = 0, c[A] = Q, e++;
                        e > 0;
                    ) {
                        const A = e - 1,
                            g = h[A];
                        const s = r[A];
                        if (s >= C[g + 1]) {
                            e--, (c[g] = 0);
                            continue;
                        }
                        r[A] = s + 1;
                        const i = o[s],
                            n = B[i];
                        if (
                            !(-1 !== n && e >= n) &&
                            !a[s] &&
                            ((a[s] = 1), I[i])
                        )
                            if (c[i] !== Q)
                                (h[e] = i),
                                    (r[e] = C[i]),
                                    (E[i] = e),
                                    (c[i] = Q),
                                    e++;
                            else {
                                const A = E[i],
                                    g = e - A;
                                if (g >= 8) {
                                    let s = 1;
                                    h[A] === i && (s = 0);
                                    let I = 0n,
                                        C = 0n;
                                    for (let t = A; t < e; t++) {
                                        const A = D(BigInt(h[t] + 1));
                                        (I = (I + A) & 0xffffffffffffffffn),
                                            (C ^= A);
                                    }
                                    if (s) {
                                        const A = D(BigInt(i + 1));
                                        (I = (I + A) & 0xffffffffffffffffn),
                                            (C ^= A);
                                    }
                                    const n = `${I.toString(16)}:${C.toString(16)}:${s ? e - A + 1 : e - A}`;
                                    if (!d.has(n)) {
                                        d.add(n);
                                        const s = Array(g);
                                        let I = 0;
                                        for (let g = e - 1; g >= A; g--)
                                            s[I++] = t[h[g]];
                                        w.push(s);
                                        for (let t = A; t < e; t++) {
                                            const A = h[t],
                                                e = B[A];
                                            (-1 === e || g < e) && (B[A] = g);
                                        }
                                        const C = B[i];
                                        (-1 === C || g < C) && (B[i] = g);
                                    }
                                }
                            }
                    }
                }
                return w;
            }
            filterNestedCycles(A) {
                const t = [],
                    e = A.map((A) => ({ cycle: A, set: new Set(A) }));
                for (let A = 0; A < e.length; A++) {
                    const g = e[A];
                    let s = !0;
                    for (let t = 0; t < e.length; t++) {
                        if (t === A) continue;
                        const i = e[t];
                        if (g.cycle.length < i.cycle.length) continue;
                        if (i.cycle.some((A) => g.set.has(A))) {
                            s = !1;
                            break;
                        }
                    }
                    s ? t.push(g.cycle) : (e.splice(A, 1), (A -= 1));
                }
                return t;
            }
            makeCycleNodes(t, e) {
                for (let g = 0; g < e.length; g++) {
                    const s = e[g],
                        i = [];
                    let I = !0,
                        C = !1;
                    for (let t = 0; t < s.length; t++) {
                        const e = s[t];
                        if (e.type === A.DELAY) {
                            I = !1;
                            break;
                        }
                        const g = s[t + 1 < s.length ? t + 1 : 0],
                            n = s[(t - 1 > 0 ? t : s.length) - 1];
                        if (e.allEdges.length > 1)
                            for (let g = 0; g < e.allEdges.length; g++) {
                                const s = e.allEdges[g];
                                if (s !== n) {
                                    if (s.type !== A.LOGIC_AND) {
                                        I = !1;
                                        break;
                                    }
                                    i.push([e, s, t]), (C = !0);
                                }
                            }
                        if (e.backEdges.length > 1)
                            for (let A = 0; A < e.backEdges.length; A++) {
                                const s = e.backEdges[A];
                                s !== g && i.push([s, e, t]);
                            }
                    }
                    if (!I || !C) continue;
                    const n = new Set(),
                        o = new Set(),
                        a = new Set();
                    for (let A = 0; A < i.length; A++) {
                        const [t, e, g] = i[A];
                        if (n.has(g) || o.has(e) || a.has(t)) {
                            I = !1;
                            break;
                        }
                        n.add(g), o.add(e), a.add(t);
                    }
                    if (!I) continue;
                    const B = [],
                        E = new r([]);
                    E.length = s.length;
                    for (let A = 0; A < i.length; A++) {
                        const [t, e, g] = i[A],
                            C = Q(t.type, e.type);
                        if (void 0 === C) {
                            I = !1;
                            break;
                        }
                        if (3 === C && t.specialNode !== e) {
                            I = !1;
                            break;
                        }
                        const n = 2 === C ? e : t,
                            o = new h(E);
                        (o.cycleHeadType = C),
                            (o.index =
                                2 === C ? (s.length + g - 1) % s.length : g),
                            B.push([n, o]);
                    }
                    if (I) {
                        for (let A = 0; A < s.length; A++) {
                            const e = s[A];
                            E.cycle.push(...e.arrows), e.remove(t);
                        }
                        for (let t = 0; t < B.length; t++) {
                            const [e, g] = B[t];
                            e.replaceBy(g),
                                2 === g.cycleHeadType &&
                                    (g.type = A.READ_CYCLE_HEAD);
                        }
                        t.cycles.push(E);
                    }
                }
            }
        }
        class w {
            buffer;
            head;
            tail;
            _size;
            capacity;
            constructor(A = 16) {
                (this.buffer = Array(A)),
                    (this.head = 0),
                    (this.tail = 0),
                    (this._size = 0),
                    (this.capacity = A);
            }
            get size() {
                return this._size;
            }
            expand(A = this.capacity + 1) {
                const t = (e = A) <= 0 ? 1 : 2 ** Math.ceil(Math.log2(e));
                var e;
                const g = Array(t);
                for (let A = 0; A < this._size; A++)
                    g[A] = this.buffer[(this.head + A) % this.capacity];
                (this.buffer = g),
                    (this.capacity = t),
                    (this.head = 0),
                    (this.tail = this._size);
            }
            push(A) {
                this._size === this.capacity && this.expand(),
                    (this.buffer[this.tail] = A),
                    (this.tail = (this.tail + 1) % this.capacity),
                    this._size++;
            }
            multiPush(A) {
                this._size + A.length - 1 >= this.capacity &&
                    this.expand(this._size + A.length);
                for (let t = 0; t < A.length; t++)
                    (this.buffer[this.tail] = A[t]),
                        (this.tail = (this.tail + 1) % this.capacity);
                this._size += A.length;
            }
            pop() {
                if (0 === this._size) return;
                const A = this.buffer[this.head];
                return (
                    (this.buffer[this.head] = void 0),
                    (this.head = (this.head + 1) % this.capacity),
                    this._size--,
                    A
                );
            }
            popTail() {
                if (0 === this._size) return;
                this.tail = (this.tail - 1 + this.capacity) % this.capacity;
                const A = this.buffer[this.tail];
                return (this.buffer[this.tail] = void 0), this._size--, A;
            }
            toArray() {
                const A = [];
                for (let t = 0; t < this._size; t++)
                    A.push(this.buffer[(this.head + t) % this.capacity]);
                return A;
            }
        }
        class D {
            optimizeBranches(t) {
                const e = new Set(),
                    g = new w(t.allEdges.length);
                for (g.multiPush(t.allEdges); g.size > 0; ) {
                    const i = g.pop();
                    if (!e.has(i)) {
                        if (
                            (e.add(i),
                            i.type != A.WRITE_CYCLE_HEAD &&
                                i.type != A.READ_CYCLE_HEAD &&
                                0 !== i.arrows.length)
                        ) {
                            const e = [],
                                g = new Set();
                            for (let t = 0; t < i.allEdges.length; t++) {
                                const s = i.allEdges[t];
                                if (
                                    s.backEdges.some(
                                        (t) => t.type === A.BLOCKER,
                                    )
                                )
                                    continue;
                                const I = s.allEdges.filter(
                                    (A) => A.type.isLogic,
                                );
                                I.some((A) => g.has(A)) ||
                                    (I.forEach((A) => g.add(A)),
                                    s.type === A.PATH && e.push(s));
                            }
                            if (e.length >= 2) {
                                const A = new Set(e[0].backEdges);
                                let g = !0;
                                for (let t = 0; t < e.length && g; t++) {
                                    const s = e[t];
                                    if (s.backEdges.length !== A.size) {
                                        g = !1;
                                        break;
                                    }
                                    for (
                                        let t = 0;
                                        t < s.backEdges.length;
                                        t++
                                    ) {
                                        const e = s.backEdges[t];
                                        A.has(e) || (g = !1);
                                    }
                                }
                                if (g) {
                                    const A = new s().combine(t, e);
                                    (A.isBranch = !0),
                                        i.allEdges.push(A),
                                        i.edges.push(A),
                                        i.filterDuplicates();
                                    for (
                                        let t = 0;
                                        t < A.allEdges.length;
                                        t++
                                    ) {
                                        A.allEdges[t].filterDuplicates();
                                    }
                                }
                            }
                        }
                        g.multiPush(i.allEdges);
                    }
                }
            }
        }
        class f {
            optimizeSimple(t) {
                const g = new Set(),
                    s = [...t.allEdges];
                for (; s.length > 0; ) {
                    const i = s.shift();
                    if (!g.has(i))
                        if (
                            (g.add(i),
                            s.push(...i.allEdges),
                            ((i.type === A.LOGIC_AND || i.type === A.LATCH) &&
                                i.backEdges.length < 2) ||
                                (!i.type.isEntryPoint &&
                                    0 === i.backEdges.length) ||
                                (i.type === A.DETECTOR &&
                                    void 0 === i.specialNode))
                        ) {
                            for (let A = 0; A < i.allEdges.length; A++) {
                                const t = i.allEdges[A];
                                g.delete(t);
                            }
                            for (let A = 0; A < i.backEdges.length; A++) {
                                const t = i.backEdges[A];
                                g.delete(t);
                            }
                            i.remove(t);
                        } else if (
                            (i.type === A.LOGIC_XOR &&
                                i.backEdges.length < 2) ||
                            (i.type === A.BLOCKER && void 0 === i.specialNode)
                        )
                            i.type = A.PATH;
                        else if (
                            i.type === A.DETECTOR &&
                            i.specialNode.type !== A.IMPULSE &&
                            i.specialNode.type !== A.DELAY
                        ) {
                            const t = i.specialNode;
                            e(t.detectors, i),
                                (i.specialNode = void 0),
                                (i.type = A.PATH),
                                t.edges.push(i);
                        }
                }
            }
        }
        class p {
            settings;
            cycleOptimizer;
            branchOptimizer;
            simpleOptimizer;
            constructor(A) {
                (this.settings = A),
                    (this.cycleOptimizer = new d()),
                    (this.branchOptimizer = new D()),
                    (this.simpleOptimizer = new f());
            }
            applyOptimizations(A) {
                this.settings.data.optimizeSimple &&
                    this.simpleOptimizer.optimizeSimple(A),
                    this.settings.data.optimizeRings &&
                        this.cycleOptimizer.optimizeCycles(A),
                    this.settings.data.optimizeBranches &&
                        this.branchOptimizer.optimizeBranches(A);
            }
        }
        class y {
            showDebugSignals(A, t, e) {
                switch (A) {
                    case 1:
                        this.showDebugNodeTypes(t);
                        break;
                    case 2:
                        this.showDebugPropagation(t);
                        break;
                    case 3:
                        this.showDebugDeadNodes(t, e);
                }
            }
            showDebugNodeTypes(A) {
                for (let t = 0; t < A.cycles.length; t++) {
                    const e = A.cycles[t];
                    for (let A = 0; A < e.cycle.length; A++) {
                        e.cycle[A].signal = 7;
                    }
                }
                const t = new Set(),
                    e = [A];
                for (; e.length > 0; ) {
                    const A = e.shift();
                    if (t.has(A)) continue;
                    if (
                        (t.add(A), e.push(...A.allEdges), 0 === A.arrows.length)
                    )
                        continue;
                    let g = 0;
                    if (A instanceof h) g = 6;
                    else if (A.isBranch) g = 2;
                    else {
                        if (!A.allEdges.some((A) => A.isBranch)) continue;
                        g = 1;
                    }
                    for (let t = 0; t < A.arrows.length; t++)
                        A.arrows[t].signal = g;
                }
            }
            showDebugDeadNodes(t, e) {
                for (const A of e.chunks.values())
                    for (let e = 0; e < A.arrows.length; e++) {
                        const g = A.arrows[e];
                        t.astNodes.has(g) ? (g.signal = 0) : (g.signal = 7);
                    }
                const g = new Set(),
                    s = new Set(),
                    i = [t];
                for (; i.length > 0; ) {
                    const t = i.shift();
                    if (s.has(t)) continue;
                    s.add(t);
                    const e = t.allEdges.filter((A) => !g.has(A));
                    if ((i.push(...e), 0 === t.arrows.length)) continue;
                    let I = null;
                    const C = t.backEdges.filter((A) => !g.has(A));
                    (((t.type === A.LOGIC_AND || t.type === A.LATCH) &&
                        C.length < 2) ||
                        (!t.type.isEntryPoint && 0 === C.length) ||
                        (t.type === A.DETECTOR && void 0 === t.specialNode) ||
                        (t.type === A.BLOCKER && 0 === e.length)) &&
                        (I = 6);
                    let o = null;
                    if (null !== I) {
                        const A = t.backEdges.filter((A) => g.has(A));
                        let n = I;
                        for (const t of A)
                            for (const A of t.arrows)
                                +A.signal > 0 && (n = Math.min(n, +A.signal));
                        (o = n), g.add(t);
                        for (let A = 0; A < e.length; A++) {
                            const t = e[A];
                            s.delete(t);
                        }
                        for (let A = 0; A < C.length; A++) {
                            const t = C[A];
                            s.delete(t);
                        }
                        i.push(...C);
                    } else
                        t.type.isEntryPoint || 0 !== e.length
                            ? ((t.type === A.LOGIC_XOR && C.length < 2) ||
                                  (t.type === A.BLOCKER &&
                                      void 0 === t.specialNode) ||
                                  (t.type === A.DETECTOR &&
                                      (t.specialNode.type === A.IMPULSE ||
                                          t.specialNode.type === A.DELAY ||
                                          t.specialNode.type === A.PATH)) ||
                                  (t.type === A.PATH &&
                                      e.length < n(t.arrows[0].type).length)) &&
                              (o = 4)
                            : (o = 2);
                    if (null !== o)
                        for (let A = 0; A < t.arrows.length; A++)
                            t.arrows[A].signal = o;
                }
            }
            showDebugPropagation(A) {
                const t = new Set(),
                    e = [A];
                for (; e.length > 0; ) {
                    const A = e.shift();
                    if (t.has(A)) continue;
                    if (
                        (t.add(A), e.push(...A.allEdges), 0 === A.arrows.length)
                    )
                        continue;
                    let g = 0;
                    for (let t = 0; t < A.backEdges.length; t++) {
                        g += A.backEdges[t].type.index + 1;
                    }
                    g = (g % 6) + 1;
                    for (let t = 0; t < A.arrows.length; t++)
                        A.arrows[t].signal = g;
                }
            }
        }
        class u {
            arr;
            count;
            capacity;
            constructor(A) {
                (this.arr = new Uint32Array(A)),
                    (this.count = 0),
                    (this.capacity = A);
            }
            reserve(A) {
                if (this.arr.length > A) return;
                const t = new Uint32Array(A);
                t.set(this.arr), (this.arr = t), (this.capacity = A);
            }
            add(A) {
                if (this.count >= this.arr.length) {
                    const A = new Uint32Array(2 * this.arr.length);
                    A.set(this.arr), (this.arr = A), (this.capacity = A.length);
                }
                this.arr[this.count++] = A;
            }
            remove(A) {
                (this.arr[A] = this.arr[this.count - 1]), this.count--;
            }
        }
        class N {
            entryPoints;
            changedNodes;
            tempChangedNodes;
            delayedChangedNodes;
            flags;
            types;
            lastSignals;
            signalsCount;
            blockedCount;
            signals;
            edgesPosition;
            edgesCount;
            detectorsCount;
            edges;
            cycleHeadTypes;
            nodeToCycleID;
            cycleOffsets;
            nodeCycleOffsets;
            cycleLengths;
            cycleStates;
            constructor(A, t, e, g, s) {
                (this.entryPoints = new Uint32Array(A)),
                    (this.changedNodes = new u(t)),
                    (this.tempChangedNodes = new u(t)),
                    (this.delayedChangedNodes = new u(64)),
                    (this.flags = new Uint8Array(t)),
                    (this.lastSignals = new Uint8Array(t)),
                    (this.signalsCount = new Uint8Array(t)),
                    (this.blockedCount = new Uint8Array(t)),
                    (this.signals = new Uint8Array(t)),
                    (this.types = new Uint8Array(t)),
                    (this.edgesPosition = new Uint32Array(t)),
                    (this.edgesCount = new Uint8Array(t)),
                    (this.detectorsCount = new Uint8Array(t)),
                    (this.edges = new Uint32Array(e)),
                    (this.cycleHeadTypes = new Uint8Array(t)),
                    (this.nodeToCycleID = new Uint32Array(t).fill(-1)),
                    (this.nodeCycleOffsets = new Uint32Array(t)),
                    (this.cycleOffsets = new Uint32Array(g)),
                    (this.cycleLengths = new Uint16Array(g)),
                    (this.cycleStates = new Uint32Array(s));
            }
        }
        class S extends Number {
            astIndex;
            cycleID;
            cycleIndex;
            constructor(A, t = 0, e = 0) {
                super(),
                    (this.astIndex = A),
                    (this.cycleID = t),
                    (this.cycleIndex = e);
            }
        }
        class m {
            compile(A) {
                const t = new Map(),
                    e = [];
                let g = 0,
                    s = 0;
                const i = new w(A.allEdges.length);
                for (i.multiPush(A.allEdges); i.size > 0; ) {
                    const A = i.popTail();
                    if (!t.has(A)) {
                        t.set(A, e.length);
                        for (let t = 0; t < A.arrows.length; t++) {
                            A.arrows[t].astIndex = e.length;
                        }
                        e.push(A),
                            i.multiPush(A.allEdges),
                            (g += A.allEdges.length),
                            A.type.isEntryPoint && (s += 1);
                    }
                }
                const I = A.cycles.length,
                    C = A.cycles
                        .map((A) => Math.ceil(A.length / 32))
                        .reduce((A, t) => A + t, 0),
                    n = new N(s, e.length, g, I, C),
                    o = new Map();
                let a = 0;
                for (let t = 0; t < A.cycles.length; t++) {
                    const e = A.cycles[t];
                    o.set(e, t),
                        (n.cycleLengths[t] = e.length),
                        (n.cycleOffsets[t] = a);
                    for (let A = 0; A < e.length; A++) {
                        const g = e.cycle[A];
                        (g.cycleID = t),
                            (g.cycleIndex = (e.length + A - 1) % e.length),
                            (g.signal = new S(void 0, g.cycleID, g.cycleIndex));
                    }
                    a += Math.ceil(e.length / 32);
                }
                let B = 0,
                    E = 0;
                for (let A = 0; A < e.length; A++) {
                    const g = e[A],
                        s = new S(
                            g.arrows[0].astIndex,
                            g.arrows[0].cycleID,
                            g.arrows[0].cycleIndex,
                        );
                    for (let A = 0; A < g.arrows.length; A++) {
                        g.arrows[A].signal = s;
                    }
                    g.type.isEntryPoint && (n.entryPoints[B++] = A);
                    let i = 0;
                    g.type.isEntryPoint && (i |= 1),
                        g.type.isAdditionalUpdate && (i |= 2),
                        g instanceof h && 2 !== g.cycleHeadType && (i |= 4),
                        (n.flags[A] = i),
                        (n.types[A] = g.type.index),
                        (n.edgesPosition[A] = E),
                        (n.edgesCount[A] = g.edges.length),
                        (n.detectorsCount[A] = g.detectors.length);
                    for (let A = 0; A < g.edges.length; A++)
                        n.edges[E++] = t.get(g.edges[A]);
                    for (let A = 0; A < g.detectors.length; A++)
                        n.edges[E++] = t.get(g.detectors[A]);
                    g instanceof h &&
                        ((n.nodeToCycleID[A] = o.get(g.cycleData)),
                        (n.cycleHeadTypes[A] = g.cycleHeadType),
                        (n.nodeCycleOffsets[A] = g.index));
                }
                return n;
            }
        }
        let F = null;
        function k() {
            return (
                F ||
                    (F = ((A) => {
                        const t = atob(A),
                            e = new Uint8Array(t.length);
                        for (let A = 0; A < t.length; A++)
                            e[A] = t.charCodeAt(A);
                        const g = new WebAssembly.Module(e);
                        return new WebAssembly.Instance(g, {
                            env: { now: () => performance.now() },
                        }).exports;
                    })(
                        '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AEGIiMCAADYCkIjAgABBAEGQiMCAADYCnIjAgABBAEGYiMCAADYCpIjAgABBAEGQiMCAADYCmIjAgABBAEGgiMCAADYCrIjAgABBAEGYiMCAADYCoIjAgABBAEGoiMCAADYCtIjAgABBAEGgiMCAADYCqIjAgABBAEGwiMCAADYCvIjAgABBAEGoiMCAADYCsIjAgABBAEG4iMCAADYCxIjAgABBAEGwiMCAADYCuIjAgABBAEHAiMCAADYCzIjAgABBAEG4iMCAADYCwIjAgABBAEHIiMCAADYC1IjAgABBAEHAiMCAADYCyIjAgABBAEHQiMCAADYC3IjAgABBAEHIiMCAADYC0IjAgABBAEHYiMCAADYC5IjAgABBAEHQiMCAADYC2IjAgABBAEHgiMCAADYC7IjAgABBAEHYiMCAADYC4IjAgABBAEHoiMCAADYC9IjAgABBAEHgiMCAADYC6IjAgABBAEHwiMCAADYC/IjAgABBAEHoiMCAADYC8IjAgABBAEH4iMCAADYChInAgABBAEHwiMCAADYC+IjAgABBAEGAicCAADYCjInAgABBAEH4iMCAADYCgInAgABBAEGIicCAADYClInAgABBAEGAicCAADYCiInAgABBACABNgKsicCAAEEAQYiJwIAANgKQicCAAEEAIAdBWGoiADYCpInAgAAgASAAQQFyNgIEIAEgAGpBKDYCBEEAQYCAgAE2AriJwIAADAgLIAMgAU8NACAEIANLDQAgACgCDEUNAwtBAEEAKAK8icCAACIAIAEgACABSRs2AryJwIAAIAEgB2ohBEGAh8CAACEAAkACQAJAA0AgACgCACIGIARGDQEgACgCCCIADQAMAgsLIAAoAgxFDQELQYCHwIAAIQACQANAAkAgACgCACIEIANLDQAgAyAEIAAoAgRqIgRJDQILIAAoAgghAAwACwtBACABNgKsicCAAEEAIAdBWGoiADYCpInAgAAgASAAQQFyNgIEIAEgAGpBKDYCBEEAQYCAgAE2AriJwIAAIAMgBEFgakF4cUF4aiIAIAAgA0EQakkbIgZBGzYCBEEAKQKAh8CAACEJIAZBEGpBACkCiIfAgAA3AgAgBkEIaiIAIAk3AgBBACAHNgKEh8CAAEEAIAE2AoCHwIAAQQAgADYCiIfAgABBAEEANgKMh8CAACAGQRxq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AGoiACEDDAELIABB+AFxIgBBkIfAgABqIQMgAEGYh8CAAGooAgAhAAsgAyABNgIIIAAgATYCDCABIAM2AgwgASAANgIIDwsgAEEmIABBCHZnIgNrdkEBcSADQQF0ckE+cyEDDAELAkACQEEAKAKIh8CAACIADQBB/x8hAQwBC0EAIQEDQCABQQFqIQEgACgCCCIADQALIAFB/x8gAUH/H0sbIQELQQAgATYCwInAgAAgBCACTQ0BQQBBfzYCuInAgAAMAQsgAUIANwIQIAEgAzYCHCADQQJ0QYCGwIAAaiECAkACQEEAKAKcicCAAEEBIAN0IgRxDQAgAiABNgIAIAEgAjYCGCABIAE2AgwgASABNgIIQQBBACgCnInAgAAgBHI2ApyJwIAADAELAkACQAJAIAIoAgAiBCgCBEF4cSAARw0AIAQhAwwBCyAAQQBBGSADQQF2ayADQR9GG3QhAgNAIAQgAkEddkEEcWoiBSgCECIDRQ0CIAJBAXQhAiADIQQgAygCBEF4cSAARw0ACwsgAygCCCIAIAE2AgwgAyABNgIIIAFBADYCGCABIAM2AgwgASAANgIIDAELIAVBEGogATYCACABIAQ2AhggASABNgIMIAEgATYCCAtBAEEAKALAicCAAEF/aiIBNgLAicCAACABDQACQAJAQQAoAoiHwIAAIgANAEH/HyEBDAELQQAhAQNAIAFBAWohASAAKAIIIgANAAsgAUH/HyABQf8fSxshAQtBACABNgLAicCAAA8LC1gAAkAgACgCAEGAgICAeEYNACABKAIAIAAoAgQgACgCCCABKAIEKAIMEYCAgIAAgICAgAAPCyABKAIAIAEoAgQgACgCDCgCACIAKAIAIAAoAgQQm4CAgAALgQICAn8BfiOAgICAAEEwayICJICAgIAAAkAgASgCAEGAgICAeEcNACABKAIMIQMgAkEANgIsIAJCgICAgBA3AiQgAkEkakHkgsCAACADKAIAIgMoAgAgAygCBBCbgICAABogAiACKAIsIgM2AiAgAiACKQIkIgQ3AxggASADNgIIIAEgBDcCAAsgASgCCCEDIAFBADYCCCABKQIAIQQgAUKAgICAEDcCACACIAM2AhAgAiAENwMIAkBBDBCFgICAACIBDQBBBEEMEIiAgIAAAAsgASACKAIQNgIIIAEgAikDCDcCACAA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gAALkgMBBH8gACgCDCECAkACQAJAAkAgAUGAAkkNACAAKAIYIQMCQAJAAkAgAiAARw0AIABBFEEQIAAoAhQiAhtqKAIAIgENAUEAIQIMAgsgACgCCCIBIAI2AgwgAiABNgIIDAELIABBFGogAEEQaiACGyEEA0AgBCEFIAEiAkEUaiACQRBqIAIoAhQiARshBCACQRRBECABG2ooAgAiAQ0ACyAFQQA2AgALIANFDQICQAJAIAAgACgCHEECdEGAhsCAAGoiASgCAEYNACADKAIQIABGDQEgAyACNgIUIAINAwwECyABIAI2AgAgAkUNBAwCCyADIAI2AhAgAg0BDAILAkAgAiAAKAIIIgRGDQAgBCACNgIMIAIgBDYCCA8LQQBBACgCmInAgABBfiABQQN2d3E2ApiJwIAADwsgAiADNgIYAkAgACgCECIBRQ0AIAIgATYCECABIAI2AhgLIAAoAhQiAUUNACACIAE2AhQgASACNgIYDwsPC0EAQQAoApyJwIAAQX4gACgCHHdxNgKcicCAAAvwBgEEfyAAIAFqIQICQAJAIAAoAgQiA0EBcQ0AIANBAnFFDQEgACgCACIDIAFqIQECQCAAIANrIgBBACgCqInAgABHDQAgAigCBEEDcUEDRw0BQQAgATYCoInAgAAgAiACKAIEQX5xNgIEIAAgAUEBcjYCBCACIAE2AgAMAgsgACADELGAgIAACwJAAkACQAJAAkACQCACKAIEIgNBAnENACACQQAoAqyJwIAARg0CIAJBACgCqInAgABGDQMgAiADQXhxIgMQsYCAgAAgACADIAFqIgFBAXI2AgQgACABaiABNgIAIABBACgCqInAgABHDQFBACABNgKgicCAAA8LIAIgA0F+cTYCBCAAIAFBAXI2AgQgACABaiABNgIACwJAIAFBgAJJDQBBHyECIAFBgICACEkNAwwECwJAAkBBACgCmInAgAAiAkEBIAFBA3Z0IgNxDQBBACACIANyNgKYicCAACABQfgBcUGQh8CAAGoiASECDAELIAFB+AFxIgFBkIfAgABqIQIgAUGYh8CAAGooAgAhAQsgAiAANgIIIAEgADYCDCAAIAI2AgwgACABNgIIDwtBACAANgKsicCAAEEAQQAoAqSJwIAAIAFqIgE2AqSJwIAAIAAgAUEBcjYCBCAAQQAoAqiJwIAARw0DQQBBADYCoInAgABBAEEANgKoicCAAA8LQQAgADYCqInAgABBAEEAKAKgicCAACABaiIBNgKgicCAACAAIAFBAXI2AgQgACABaiABNgIADwsgAUEmIAFBCHZnIgJrdkEBcSACQQF0ckE+cyECCyAAQgA3AhAgACACNgIcIAJBAnRBgIbAgABqIQMCQEEAKAKcicCAAEEBIAJ0IgRxDQAgAyAANgIAIAAgAzYCGCAAIAA2AgwgACAANgIIQQBBACgCnInAgAAgBHI2ApyJwIAADwsCQAJAAkAgAygCACIEKAIEQXhxIAFHDQAgBCECDAELIAFBAEEZIAJBAXZrIAJBH0YbdCEDA0AgBCADQR12QQRxaiIFKAIQIgJFDQIgA0EBdCEDIAIhBCACKAIEQXhxIAFHDQALCyACKAIIIgEgADYCDCACIAA2AgggAEEANgIYIAAgAjYCDCAAIAE2AggPCyAFQRBqIAA2AgAgACAENgIYIAAgADYCDCAAIAA2AggPCwskACABKAIAIAAoAgAgACgCBCABKAIEKAIMEYCAgIAAgICAgAALTAECfyABKAIEIQIgASgCACEDAkBBCBCFgICAACIBDQBBBEEIEIiAgIAAAAsgASACNgIEIAEgAzYCACAAQYCFwIAANgIEIAAgATYCAAsUACAAQYCFwIAANgIEIAAgATYCAAsMACAAIAEpAgA3AwALwwIBBH9BHyECAkAgAUGAgIAITw0AIAFBJiABQQh2ZyICa3ZBAXEgAkEBdHJBPnMhAgsgAEIANwIQIAAgAjYCHCACQQJ0QYCGwIAAaiEDAkBBACgCnInAgABBASACdCIEcQ0AIAMgADYCACAAIAM2AhggACAANgIMIAAgADYCCEEAQQAoApyJwIAAIARyNgKcicCAAA8LAkACQAJAIAMoAgAiBCgCBEF4cSABRw0AIAQhAgwBCyABQQBBGSACQQF2ayACQR9GG3QhAwNAIAQgA0EddkEEcWoiBSgCECICRQ0CIANBAXQhAyACIQQgAigCBEF4cSABRw0ACwsgAigCCCIDIAA2AgwgAiAANgIIIABBADYCGCAAIAI2AgwgACADNgIIDwsgBUEQaiAANgIAIAAgBDYCGCAAIAA2AgwgACAANgIICw0AIAAgARCigICAAAALC/oFAgBBgIDAAAvYBcAAL3J1c3RjL2FjNjhmYWEyMGM1OGNiY2NkMDFlZTcyMDhiZjNiNmU5M2E3ZDdmOTYvbGlicmFyeS9zdGQvc3JjL3N5cy9zeW5jL3J3bG9jay9ub190aHJlYWRzLnJzAC9ydXN0Yy9hYzY4ZmFhMjBjNThjYmNjZDAxZWU3MjA4YmYzYjZlOTNhN2Q3Zjk2L2xpYnJhcnkvYWxsb2Mvc3JjL3Jhd192ZWMvbW9kLnJzAC9ydXN0L2RlcHMvZGxtYWxsb2MtMC4yLjExL3NyYy9kbG1hbGxvYy5ycwBsaWIucnMAANwAEAAGAAAA2wAAACQAAADcABAABgAAAB4BAAAkAAAAY2FwYWNpdHkgb3ZlcmZsb3cAAABgABAAUAAAABwAAAAFAAAAYXR0ZW1wdCB0byBjYWxjdWxhdGUgdGhlIHJlbWFpbmRlciB3aXRoIGEgZGl2aXNvciBvZiB6ZXJvAAAAAgAAAAwAAAAEAAAAAwAAAAQAAAAFAAAAAAAAAAgAAAAEAAAABgAAAAcAAAAIAAAACQAAAAoAAAAQAAAABAAAAAsAAAAMAAAADQAAAA4AAABtXcvWLFDrY3hBpldxG4u5K4FbAb2GUewMtMKc5MnHBGFzc2VydGlvbiBmYWlsZWQ6IHBzaXplID49IHNpemUgKyBtaW5fb3ZlcmhlYWQAALEAEAAqAAAAsQQAAAkAAABhc3NlcnRpb24gZmFpbGVkOiBwc2l6ZSA8PSBzaXplICsgbWF4X292ZXJoZWFkAACxABAAKgAAALcEAAANAAAAcndsb2NrIG92ZXJmbG93ZWQgcmVhZCBsb2NrcwIAEABdAAAAFQAAACwAAAAAAAAACAAAAAQAAAAPAAAAAgAAAAwAAAAEAAAAEAAAAHJ3bG9jayBoYXMgbm90IGJlZW4gbG9ja2VkIGZvciByZWFkaW5nAAACABAAXQAAAD4AAAAJAAAAAEHYhcAACxABAAAAQAAAABXNWwcAAAAA',
                    )),
                F
            );
        }
        class G {
            wasmStatePtr = null;
            graphState = null;
            wasmModule;
            constructor() {
                this.wasmModule = k();
            }
            syncGraphStateToWasm(A) {
                this.wasmStatePtr ||
                    (this.wasmStatePtr = this.wasmModule.alloc_graph_state(
                        A.flags.length,
                        A.edges.length,
                        A.cycleLengths.length,
                        A.cycleStates.length,
                        A.entryPoints.length,
                    ));
                const t = this.wasmModule.memory.buffer;
                new Uint32Array(
                    t,
                    this.wasmModule.get_entry_points_ptr(this.wasmStatePtr),
                    A.entryPoints.length,
                ).set(A.entryPoints);
                const e = this.wasmModule.get_nodes_ptr(this.wasmStatePtr),
                    g = new DataView(t, e, 16 * A.flags.length);
                for (let t = 0; t < A.flags.length; t++) {
                    const e = 16 * t;
                    g.setUint8(e + 0, A.types[t]),
                        g.setUint8(e + 1, A.flags[t]),
                        g.setUint8(e + 2, A.signals[t]),
                        g.setUint8(e + 3, A.lastSignals[t]),
                        g.setUint8(e + 4, A.signalsCount[t]),
                        g.setUint8(e + 5, A.blockedCount[t]),
                        g.setUint8(e + 6, A.edgesCount[t]),
                        g.setUint8(e + 7, A.detectorsCount[t]),
                        g.setUint32(e + 8, A.edgesPosition[t], !0),
                        g.setUint8(e + 12, A.cycleHeadTypes[t]);
                }
                new Uint32Array(
                    t,
                    this.wasmModule.get_edges_ptr(this.wasmStatePtr),
                    A.edges.length,
                ).set(A.edges),
                    new Uint32Array(
                        t,
                        this.wasmModule.get_node_to_cycle_id_ptr(
                            this.wasmStatePtr,
                        ),
                        A.nodeToCycleID.length,
                    ).set(A.nodeToCycleID),
                    new Uint32Array(
                        t,
                        this.wasmModule.get_cycle_offsets_ptr(
                            this.wasmStatePtr,
                        ),
                        A.cycleLengths.length,
                    ).set(A.cycleOffsets.subarray(0, A.cycleLengths.length)),
                    new Uint32Array(
                        t,
                        this.wasmModule.get_node_cycle_offsets_ptr(
                            this.wasmStatePtr,
                        ),
                        A.nodeCycleOffsets.length,
                    ).set(A.nodeCycleOffsets),
                    new Uint16Array(
                        t,
                        this.wasmModule.get_cycle_lengths_ptr(
                            this.wasmStatePtr,
                        ),
                        A.cycleLengths.length,
                    ).set(A.cycleLengths),
                    new Uint32Array(
                        t,
                        this.wasmModule.get_cycle_states_ptr(this.wasmStatePtr),
                        A.cycleStates.length,
                    ).set(A.cycleStates);
            }
            syncWasmToGraphState(A) {
                if (!this.wasmStatePtr) return;
                const t = this.wasmModule.memory.buffer,
                    e = this.wasmModule.get_nodes_ptr(this.wasmStatePtr),
                    g = new DataView(t, e, 16 * A.flags.length);
                for (let t = 0; t < A.flags.length; t++) {
                    const e = 16 * t;
                    (A.flags[t] = g.getUint8(e + 1)),
                        (A.signals[t] = g.getUint8(e + 2)),
                        (A.lastSignals[t] = g.getUint8(e + 3)),
                        (A.signalsCount[t] = g.getUint8(e + 4)),
                        (A.blockedCount[t] = g.getUint8(e + 5));
                }
                A.cycleStates.set(
                    new Uint32Array(
                        t,
                        this.wasmModule.get_cycle_states_ptr(this.wasmStatePtr),
                        A.cycleStates.length,
                    ),
                );
                const s = new Uint32Array(
                    t,
                    this.wasmModule.get_changed_nodes_count_ptr(
                        this.wasmStatePtr,
                    ),
                    1,
                )[0];
                (A.changedNodes.count = s),
                    s > 0 &&
                        A.changedNodes.arr.set(
                            new Uint32Array(
                                t,
                                this.wasmModule.get_changed_nodes_ptr(
                                    this.wasmStatePtr,
                                ),
                                s,
                            ),
                        );
            }
            syncInputToWasm(A) {
                if (!this.wasmStatePtr) return;
                const t = this.wasmModule.memory.buffer,
                    e = this.wasmModule.get_nodes_ptr(this.wasmStatePtr),
                    g = new DataView(t, e, 16 * A.flags.length);
                for (let t = 0; t < A.flags.length; t++) {
                    const e = 16 * t;
                    g.setUint8(e + 1, A.flags[t]),
                        g.setUint8(e + 2, A.signals[t]);
                }
                if (
                    ((new Uint32Array(
                        t,
                        this.wasmModule.get_changed_nodes_count_ptr(
                            this.wasmStatePtr,
                        ),
                        1,
                    )[0] = A.changedNodes.count),
                    A.changedNodes.count > 0)
                ) {
                    new Uint32Array(
                        t,
                        this.wasmModule.get_changed_nodes_ptr(
                            this.wasmStatePtr,
                        ),
                        A.changedNodes.count,
                    ).set(A.changedNodes.arr.subarray(0, A.changedNodes.count));
                }
            }
            updateState(A, t, e = 10, g = !1) {
                this.graphState !== A
                    ? (this.syncGraphStateToWasm(A), (this.graphState = A))
                    : this.syncInputToWasm(A);
                const s = this.wasmModule.update_state(
                    this.wasmStatePtr,
                    t,
                    e,
                    g,
                );
                return this.syncWasmToGraphState(A), s;
            }
            resetGraph(A) {
                this.wasmStatePtr ||
                    (this.syncGraphStateToWasm(A), (this.graphState = A)),
                    this.wasmModule.reset_graph(this.wasmStatePtr),
                    this.syncWasmToGraphState(A);
            }
        }
        class Y {
            infoContainer;
            tpsInfo;
            customTPSField;
            constructor(A, t, e) {
                (this.infoContainer = A),
                    (this.tpsInfo = t),
                    (this.customTPSField = e);
            }
        }
        const U = Array(25);
        (U[0] = 0),
            (U[1] = 1),
            (U[2] = 1),
            (U[3] = 1),
            (U[4] = 1),
            (U[5] = 1),
            (U[6] = 1),
            (U[7] = 1),
            (U[8] = 1),
            (U[9] = 1),
            (U[10] = 2),
            (U[11] = 2),
            (U[12] = 2),
            (U[13] = 2),
            (U[14] = 2),
            (U[15] = 3),
            (U[16] = 3),
            (U[17] = 3),
            (U[18] = 3),
            (U[19] = 3),
            (U[20] = 5),
            (U[21] = 5),
            (U[22] = 1),
            (U[23] = 1),
            (U[24] = 5);
        const L = new (class {
            definitionPtrs;
            instances;
            patches;
            originalCall;
            constructor() {
                (this.definitionPtrs = new Map()),
                    (this.instances = new Map()),
                    (this.patches = []);
            }
            hook() {
                if (this.originalCall) return;
                this.originalCall = Function.prototype.call;
                const A = this;
                Function.prototype.call = function (t, ...e) {
                    return A.patchedCall(this, t, ...e);
                };
            }
            patchedCall(A, t, ...e) {
                if (!this.originalCall)
                    throw Error('PatchLoader is not hooked');
                const g = Reflect.apply(A, t, e),
                    s = e[1];
                if (!s || !0 !== s.__esModule) return g;
                for (const A of Object.keys(s)) {
                    if ('__esModule' === A) continue;
                    let t = s[A];
                    if (
                        'function' == typeof t &&
                        /^class\s/.test(Function.prototype.toString.call(t))
                    ) {
                        const e = this,
                            g = t;
                        t = class extends g {
                            constructor(...t) {
                                super(...t), e.setInstance(A, this);
                            }
                        };
                    }
                    this.setDefinition(A, t),
                        (s[A] = this.getDefinitionPtr(A).definition);
                }
                return g;
            }
            getDefinitionPtr(A) {
                return (
                    this.definitionPtrs.has(A) ||
                        this.definitionPtrs.set(A, { definition: void 0 }),
                    this.definitionPtrs.get(A)
                );
            }
            setDefinition(A, t) {
                this.definitionPtrs.has(A) ||
                    this.definitionPtrs.set(A, { definition: void 0 }),
                    (this.definitionPtrs.get(A).definition = t);
                const e = this.patches,
                    g = [];
                this.patches = [];
                for (const t of e) {
                    t(A, this.definitionPtrs.get(A).definition) || g.push(t);
                }
                this.patches = g;
            }
            getInstance(A) {
                return this.instances.get(A);
            }
            setInstance(A, t) {
                this.instances.set(A, t);
            }
            addManualPatch(A) {
                this.patches.push(A);
            }
            addDefinitionPatch(A, t) {
                this.addManualPatch((e, g) => e === A && (t(g), !0));
            }
        })();
        L.hook();
        const R = new (class {
            patchLoader;
            settings;
            customUI;
            astParser;
            astOptimizer;
            astDebugger;
            graphCompiler;
            graphUpdater;
            gameMap;
            game;
            rootNode;
            graphState;
            constructor(A) {
                (this.patchLoader = A),
                    (this.settings = new c()),
                    (this.customUI = new Y()),
                    (this.astParser = new I(A)),
                    (this.astOptimizer = new p(this.settings)),
                    (this.astDebugger = new y()),
                    (this.graphCompiler = new m()),
                    (this.graphUpdater = new G()),
                    (this.gameMap = void 0),
                    (this.game = void 0),
                    (this.rootNode = void 0),
                    (this.graphState = void 0);
            }
            inject() {
                !((A) => {
                    const t = A.patchLoader,
                        e = A.settings,
                        g = t.getDefinitionPtr('CELL_SIZE'),
                        s = t.getDefinitionPtr('ChunkUpdates');
                    let i = 0,
                        I = -1,
                        C = 0,
                        o = 0;
                    t.addDefinitionPatch('Game', (a) => {
                        t.setDefinition(
                            'Game',
                            class extends a {
                                constructor(A, t, e) {
                                    super(A, t, e), (this.render.game = this);
                                }
                                draw() {
                                    const t = performance.now(),
                                        s = g.definition;
                                    super.draw(),
                                        this.render.prepareSolidColor();
                                    const I =
                                            (this.offset[0] * this.scale) / s +
                                            0.025 * this.scale,
                                        C =
                                            (this.offset[1] * this.scale) / s +
                                            0.025 * this.scale,
                                        o = this.gameMap.getArrow(
                                            this.mousePosition[0],
                                            this.mousePosition[1],
                                        ),
                                        a = this.scale;
                                    let B = !1;
                                    if (
                                        e.data.showArrowTarget &&
                                        this.drawPastedArrows
                                    ) {
                                        const A = [
                                            ...this.selectedMap
                                                .getCopiedArrows()
                                                .values(),
                                        ];
                                        if (1 === A.length) {
                                            this.render.setSolidColor(
                                                0,
                                                1,
                                                0,
                                                0.25,
                                            );
                                            const t = A[0];
                                            n(t.type).forEach(([A, e]) => {
                                                t.flipped && (e = -e);
                                                let g = this.mousePosition[0],
                                                    s = this.mousePosition[1];
                                                switch (t.rotation) {
                                                    case 0:
                                                        (s += A), (g += e);
                                                        break;
                                                    case 1:
                                                        (g -= A), (s += e);
                                                        break;
                                                    case 2:
                                                        (s -= A), (g -= e);
                                                        break;
                                                    case 3:
                                                        (g += A), (s -= e);
                                                }
                                                this.render.drawSolidColor(
                                                    g * this.scale + I,
                                                    s * this.scale + C,
                                                    a,
                                                    a,
                                                );
                                            }),
                                                (B = !0);
                                        }
                                    }
                                    if (
                                        !B &&
                                        e.data.showArrowConnections &&
                                        A.rootNode &&
                                        o
                                    ) {
                                        const t = A.rootNode.astNodes.get(o);
                                        if (t)
                                            this.render.setSolidColor(
                                                0,
                                                1,
                                                0,
                                                0.25,
                                            ),
                                                t.allEdges.forEach((A) => {
                                                    A.arrows.forEach((A) => {
                                                        void 0 !== A.x &&
                                                            void 0 !== A.y &&
                                                            this.render.drawSolidColor(
                                                                A.x * a + I,
                                                                A.y * a + C,
                                                                a,
                                                                a,
                                                            );
                                                    });
                                                }),
                                                this.render.setSolidColor(
                                                    1,
                                                    0,
                                                    0,
                                                    0.25,
                                                ),
                                                t.backEdges.forEach((A) => {
                                                    A.arrows.forEach((A) => {
                                                        void 0 !== A.x &&
                                                            void 0 !== A.y &&
                                                            this.render.drawSolidColor(
                                                                A.x * a + I,
                                                                A.y * a + C,
                                                                a,
                                                                a,
                                                            );
                                                    });
                                                }),
                                                this.render.setSolidColor(
                                                    0,
                                                    0,
                                                    1,
                                                    0.25,
                                                ),
                                                t.arrows.forEach((A) => {
                                                    void 0 !== A.x &&
                                                        void 0 !== A.y &&
                                                        this.render.drawSolidColor(
                                                            A.x * a + I,
                                                            A.y * a + C,
                                                            a,
                                                            a,
                                                        );
                                                });
                                        else if (0 !== o.type) {
                                            const t = o.cycleID;
                                            if (void 0 !== t) {
                                                const e = A.rootNode.cycles[t];
                                                if (void 0 !== e) {
                                                    this.render.setSolidColor(
                                                        0,
                                                        0.5,
                                                        0.5,
                                                        0.25,
                                                    );
                                                    for (
                                                        let A = 0;
                                                        A < e.length;
                                                        A++
                                                    ) {
                                                        const t = e.cycle[A];
                                                        this.render.drawSolidColor(
                                                            t.x * a + I,
                                                            t.y * a + C,
                                                            a,
                                                            a,
                                                        );
                                                    }
                                                }
                                            } else {
                                                if (
                                                    (this.render.setSolidColor(
                                                        0,
                                                        0,
                                                        0,
                                                        0.25,
                                                    ),
                                                    void 0 === o.x ||
                                                        void 0 === o.y)
                                                )
                                                    return;
                                                this.render.drawSolidColor(
                                                    o.x * a + I,
                                                    o.y * a + C,
                                                    a,
                                                    a,
                                                );
                                            }
                                        }
                                        this.screenUpdated = !0;
                                    }
                                    this.render.disableSolidColor();
                                    const E = performance.now();
                                    i = E - t;
                                }
                                updateFrame(t = () => {}) {
                                    if (
                                        ((A.gameMap = this.gameMap),
                                        (A.game = this),
                                        !this.playing ||
                                            (0 !== e.data.debugMode &&
                                                A.rootNode))
                                    )
                                        return void (I = -1);
                                    -1 === I && (I = performance.now());
                                    const g = this.tick,
                                        s = performance.now(),
                                        n = s - I;
                                    (I = s), (C += n);
                                    const a = 8 === this.updateSpeedLevel,
                                        B = 9 === this.updateSpeedLevel,
                                        E =
                                            a || B || A.graphState
                                                ? this.updateSpeedLevel
                                                : Math.min(
                                                      this.updateSpeedLevel,
                                                      6,
                                                  );
                                    o !== E && ((C = 0), (o = E));
                                    const c = [
                                            1e3 / 3,
                                            1e3 / 12,
                                            1e3 / 60,
                                            1e3 / 60,
                                            1e3 / 60,
                                            1e3 / 60,
                                            1e3 / 60,
                                            1e3 / 60,
                                            1e3 / 60,
                                            1e3 / 60,
                                        ][E],
                                        Q = B
                                            ? A.customUI.customTPSField.getTicksPerFrame()
                                            : [
                                                  1, 1, 1, 5, 20, 100, 500, 2e3,
                                                  0, 1,
                                              ][E];
                                    if ((C > 3 * c && (C = c), a)) {
                                        const A = performance.now(),
                                            g =
                                                A +
                                                1e3 / e.data.targetFPS -
                                                Math.min(
                                                    i,
                                                    1e3 / e.data.targetFPS / 2,
                                                );
                                        this.updateTick(t, g - A, !0), (C = 0);
                                    } else
                                        for (; C >= c; ) {
                                            for (let A = 0; A < Q; A++)
                                                this.updateTick(t);
                                            C -= c;
                                        }
                                    performance.now() - this.updateTime > 1e3 &&
                                        ((this.updateTime = performance.now()),
                                        (this.updatesPerSecond = 0)),
                                        this.updatesPerSecond++,
                                        A.customUI.tpsInfo?.updateTicks(
                                            this.tick - g,
                                        ),
                                        (this.screenUpdated = !0);
                                }
                                updateTick(A = () => {}, t, e) {
                                    A(),
                                        (this.tick += s.definition.update(
                                            this.gameMap,
                                            this.tick,
                                            t,
                                            e,
                                        ));
                                }
                            },
                        );
                    });
                })(this),
                    ((A) => {
                        const t = A.patchLoader,
                            e = A.settings;
                        t.addDefinitionPatch('Render', (g) => {
                            t.setDefinition(
                                'Render',
                                class extends g {
                                    drawArrow(t, g, s, i, I, C) {
                                        if ('number' != typeof i) {
                                            const t = A.graphState,
                                                g = this.game,
                                                I = i;
                                            if (((i = 0), t && void 0 !== g)) {
                                                const A = I.astIndex;
                                                if (void 0 !== A)
                                                    i = t.signals[A];
                                                else if (
                                                    !g.playing ||
                                                    e.data.fullRendering
                                                ) {
                                                    const A = I.cycleID,
                                                        e = I.cycleIndex;
                                                    if (
                                                        void 0 !== A &&
                                                        void 0 !== e
                                                    ) {
                                                        const s =
                                                                t.cycleLengths[
                                                                    A
                                                                ],
                                                            I =
                                                                t.cycleOffsets[
                                                                    A
                                                                ],
                                                            C =
                                                                (g.tick + e) %
                                                                s,
                                                            n = I + (C >>> 5),
                                                            o = 1 << (31 & C);
                                                        i =
                                                            t.cycleStates[n] & o
                                                                ? 1
                                                                : 0;
                                                    }
                                                }
                                                1 === i && (i = U[s]);
                                            }
                                        }
                                        super.drawArrow(t, g, s, i, I, C);
                                    }
                                },
                            );
                        });
                    })(this),
                    ((A) => {
                        const t = A.patchLoader;
                        t.addDefinitionPatch('GameMap', (e) => {
                            t.setDefinition(
                                'GameMap',
                                class extends e {
                                    setArrowType(t, e, g) {
                                        super.setArrowType(t, e, g),
                                            A.invalidateGraph();
                                    }
                                    setArrowSignal(t, e, g) {
                                        super.setArrowSignal(t, e, g),
                                            A.invalidateGraph();
                                    }
                                    setArrowRotation(t, e, g) {
                                        super.setArrowRotation(t, e, g),
                                            A.invalidateGraph();
                                    }
                                    setArrowFlipped(t, e, g) {
                                        super.setArrowFlipped(t, e, g),
                                            A.invalidateGraph();
                                    }
                                    resetArrow(t, e, g) {
                                        super.resetArrow(t, e, g),
                                            A.invalidateGraph();
                                    }
                                    removeArrow(t, e) {
                                        super.removeArrow(t, e),
                                            A.invalidateGraph();
                                    }
                                },
                            );
                        });
                    })(this),
                    ((A) => {
                        const t = A.patchLoader;
                        t.addDefinitionPatch('PlayerControls', (e) => {
                            t.setDefinition(
                                'PlayerControls',
                                class extends e {
                                    constructor(t, e, g, s) {
                                        super(t, e, g, s),
                                            document.addEventListener(
                                                'mousedown',
                                                () => {
                                                    A.customUI.customTPSField?.blur();
                                                },
                                            ),
                                            (this.mouseHandler.leftClickCallback =
                                                () => {
                                                    const t =
                                                            this.getArrowByMousePosition(),
                                                        e =
                                                            this.keyboardHandler.getShiftPressed();
                                                    if (
                                                        !t ||
                                                        !this.freeCursor ||
                                                        e
                                                    )
                                                        return;
                                                    if (
                                                        21 !== t.type &&
                                                        24 !== t.type
                                                    )
                                                        return;
                                                    const g = A.graphState,
                                                        s = t.astIndex,
                                                        i =
                                                            void 0 !== g &&
                                                            void 0 !== s;
                                                    (i
                                                        ? 0 === g.signals[s]
                                                        : 0 === t.signal) ||
                                                    this.game.playing
                                                        ? (t.type,
                                                          i
                                                              ? ((g.signals[s] =
                                                                    1),
                                                                g.changedNodes.add(
                                                                    s,
                                                                ))
                                                              : (t.signal = 5))
                                                        : i
                                                          ? ((g.signals[s] = 0),
                                                            g.changedNodes.add(
                                                                s,
                                                            ),
                                                            g.tempChangedNodes.add(
                                                                s,
                                                            ))
                                                          : (t.signal = 0),
                                                        (this.game.screenUpdated =
                                                            !0);
                                                });
                                        const i =
                                            this.keyboardHandler
                                                .keyDownCallback;
                                        this.keyboardHandler.keyDownCallback = (
                                            t,
                                            e,
                                        ) => {
                                            if (
                                                A.customUI.customTPSField &&
                                                A.customUI.customTPSField.isFocused()
                                            ) {
                                                if (
                                                    t.startsWith('Digit') ||
                                                    t.startsWith('Arrow') ||
                                                    'Backspace' === t ||
                                                    'Delete' === t
                                                )
                                                    return;
                                                A.customUI.customTPSField.blur();
                                            }
                                            i(t, e),
                                                'KeyP' === t &&
                                                    A.compileGraph();
                                        };
                                    }
                                },
                            );
                        });
                    })(this),
                    ((A) => {
                        const t = A.patchLoader,
                            e = t.getDefinitionPtr('UIRange');
                        t.addDefinitionPatch('PlayerUI', (g) => {
                            t.setDefinition(
                                'PlayerUI',
                                class extends g {
                                    addSpeedController() {
                                        const t = e.definition;
                                        (this.speedController = new t(
                                            document.body,
                                            10,
                                            (t) => (
                                                A.customUI.customTPSField?.setVisibility(
                                                    9 === t,
                                                ),
                                                [
                                                    '3',
                                                    '12',
                                                    '60',
                                                    '300',
                                                    '1200',
                                                    '6000',
                                                    '30000',
                                                    '120000',
                                                    'MAX',
                                                    'CUSTOM',
                                                ][t] + ' TPS'
                                            ),
                                        )),
                                            (A.customUI.customTPSField = new E(
                                                this.speedController.element,
                                            )),
                                            (A.customUI.infoContainer = new B(
                                                A,
                                            ));
                                    }
                                    removeSpeedController() {
                                        A.customUI.customTPSField?.remove(),
                                            A.customUI.infoContainer?.remove(),
                                            super.removeSpeedController();
                                    }
                                    dispose() {
                                        A.customUI.customTPSField?.remove(),
                                            A.customUI.infoContainer?.remove(),
                                            super.dispose();
                                    }
                                },
                            );
                        });
                    })(this),
                    ((A) => {
                        const t = A.patchLoader,
                            e = A.graphUpdater;
                        t.addDefinitionPatch('ChunkUpdates', (t) => {
                            const g = t.update,
                                s = t.clearSignals;
                            (t.update = (t, s, i, I) =>
                                void 0 !== A.graphState
                                    ? e.updateState(A.graphState, s, i, I) - s
                                    : (g(t, s), 1)),
                                (t.clearSignals = (t) => {
                                    void 0 !== A.graphState
                                        ? (e.resetGraph(A.graphState),
                                          (A.game.tick = 0))
                                        : s(t);
                                });
                        });
                    })(this),
                    ((A) => {
                        const t = A.patchLoader,
                            e = t.getDefinitionPtr('I18nText');
                        t.addDefinitionPatch('GameText', (A) => {
                            const t = e.definition;
                            (A.TPS_UPDATE_FREQUENCY_MS = new t(
                                'TPS counter update speed (ms)',
                                'Скорость обновления счётчика ТПС (мс)',
                                'Швидкість оновлення лічильника ТПС (мс)',
                                'Хуткасць абнаўлення лічыльніка ТПС (мс)',
                                'Vitesse de mise à jour du compteur TPS (ms)',
                            )),
                                (A.TARGET_FPS = new t(
                                    'Target FPS',
                                    'Целевой ФПС',
                                    'Цільовий FPS',
                                    'Мэтавы FPS',
                                    'FPS cible',
                                )),
                                (A.TARGET_FPS_DESC = new t(
                                    'Target FPS for MAX TPS mode',
                                    'Целевой FPS для режима MAX TPS',
                                    'Цільовий FPS для режиму MAX TPS',
                                    'Мэтавы FPS для рэжыму MAX TPS',
                                    'FPS cible pour le mode MAX TPS',
                                )),
                                (A.TPS_COUNTER = new t(
                                    'TPS and FPS counter',
                                    'Счётчик ТПС и ФПС',
                                    'Лічильник ТПС і ФПС',
                                    'Лічыльнік ТПС і ФПС',
                                    'Compteur TPS et FPS',
                                )),
                                (A.TPS_COUNTER_DESC = new t(
                                    'Now you can brag about your arrow speed!',
                                    'Теперь можно хвастаться скоростью стрелочек!',
                                    'Тепер можна хизуватися швидкістю стрілочок!',
                                    'Цяпер можна хваліцца хуткасцю стрэлачак!',
                                    'Vous pouvez désormais vous vanter de la vitesse des flèches !',
                                )),
                                (A.DEBUG_INFO = new t(
                                    'Debug information',
                                    'Дебаг информация',
                                    'Інформація для налагодження',
                                    'Дэбаг інфармацыя',
                                    'Informations de débogage',
                                )),
                                (A.SHOW_ARROW_CONNECTIONS = new t(
                                    'Show arrow connections',
                                    'Показывать связи стрелочек',
                                    'Показувати зв’язки стрілочок',
                                    'Паказваць сувязі стрэлачак',
                                    'Afficher les connexions des flèches',
                                )),
                                (A.SHOW_ARROW_CONNECTIONS_DESC = new t(
                                    'Show arrow connections on hover',
                                    'Показывать связи стрелки при наведении',
                                    "Показувати зв'язки стрілки при наведенні",
                                    'Паказваць сувязі стрэлкі пры навядзенні',
                                    'Afficher les connexions des flèches au survol',
                                )),
                                (A.SHOW_ARROW_TARGET = new t(
                                    'Show selected arrow output',
                                    'Показывать выход выбранной стрелочки',
                                    'Показувати вихід вибраної стрілочки',
                                    'Паказваць выхад выбранай стрэлачкі',
                                    'Afficher la sortie de la flèche sélectionnée',
                                )),
                                (A.SHOW_ARROW_TARGET_DESC = new t(
                                    'Show arrow target on selection',
                                    'Показывать, куда идёт сигнал от стрелки',
                                    'Показувати, куди йде сигнал від стрілки',
                                    'Паказваць, куды ідзе сігнал ад стрэлкі',
                                    'Afficher la cible de la flèche lors de la sélection',
                                )),
                                (A.FULL_RENDERING = new t(
                                    'Detailed view',
                                    'Подробный вид',
                                    'Детальний вигляд',
                                    'Падрабязны выгляд',
                                    'Vue détaillée',
                                )),
                                (A.FULL_RENDERING_DESC = new t(
                                    'Detailed view even during runtime',
                                    'Подробная визуализация без паузы',
                                    'Детальна візуалізація без паузи',
                                    'Падрабязная візуалізацыя без прыпынку',
                                    "Rendu détaillé même en cours d'exécution",
                                )),
                                (A.OPTIMIZE_RINGS = new t(
                                    'Optimize rings',
                                    'Оптимизация колец',
                                    'Оптимізація кілець',
                                    'Аптымізацыя кольцаў',
                                    'Optimiser les anneaux',
                                )),
                                (A.OPTIMIZE_RINGS_DESC = new t(
                                    'Optimizes ring memory',
                                    'Оптимизирует кольцевое ОЗУ',
                                    "Оптимізує кільцеву пам'ять",
                                    'Аптымізуе кольцавае АЗП',
                                    'Optimise la mémoire circulaire',
                                )),
                                (A.OPTIMIZE_BUTTONS = new t(
                                    'Improve button response',
                                    'Улучшение отклика кнопок',
                                    'Поліпшення відгуку кнопок',
                                    'Паляпшэнне водгуку кнопак',
                                    'Améliorer la réactivité des boutons',
                                )),
                                (A.OPTIMIZE_PIXELS = new t(
                                    'Optimize pixels',
                                    'Оптимизация пикселей',
                                    'Оптимізація пікселів',
                                    'Аптымізацыя пікселяў',
                                    'Optimiser les pixels',
                                )),
                                (A.OPTIMIZE_BRANCHES = new t(
                                    'Optimize branches',
                                    'Оптимизация ветвлений',
                                    'Оптимізація розгалужень',
                                    'Аптымізацыя галінаванняў',
                                    'Optimiser les branches',
                                )),
                                (A.OPTIMIZE_BRANCHES_DESC = new t(
                                    'Combines shared paths after branching',
                                    'Комбинирует общий путь после ветвлений',
                                    'Комбінує спільні шляхи після розгалужень',
                                    'Камбіруе агульны шлях пасля разгалужэнняў',
                                    'Combine les chemins partagés après les branches',
                                )),
                                (A.OPTIMIZE_PATHS = new t(
                                    'Optimize paths',
                                    'Оптимизация путей',
                                    'Оптимізація шляхів',
                                    'Аптымізацыя шляхоў',
                                    'Optimisation des chemins',
                                )),
                                (A.OPTIMIZE_SIMPLE = new t(
                                    'Simple optimization',
                                    'Простая оптимизация',
                                    'Проста оптимізація',
                                    'Простая аптымізацыя',
                                    'Optimisation simple',
                                )),
                                (A.OPTIMIZE_SIMPLE_DESC = new t(
                                    'Optimizes detectors, blockers, and XOR',
                                    'Оптимизирует детекторы, блокеры и XOR',
                                    'Оптимізує детектори, блокери та XOR',
                                    'Оптымізуе дэтэктары, блакеры і XOR',
                                    'Optimise détecteurs, bloqueurs et XOR',
                                )),
                                (A.OPTIMIZE_TIMERS = new t(
                                    'Optimize timers',
                                    'Оптимизация таймеров',
                                    'Оптимізація таймерів',
                                    'Аптымізацыя таймераў',
                                    'Optimiser les minuteurs',
                                )),
                                (A.DEBUG_MODE = new t(
                                    'Debug mode',
                                    'Режим дебага',
                                    'Режим дебагу',
                                    'Рэжым дэбагу',
                                    'Mode débogage',
                                )),
                                (A.DEBUG_MODE_DESC = new t(
                                    'Select debug mode to find bugs and optimization opportunities',
                                    'Выбор режима отладки для поиска багов и мест оптимизации',
                                    'Вибір режиму відладки для пошуку багів і місць оптимізації',
                                    'Выбар рэжыму адладкі для пошуку памылак і месцаў аптымізацыі',
                                    "Sélection du mode de débogage pour trouver des bugs et des possibilités d'optimisation",
                                )),
                                (A.DEBUG_MODE_1 = new t(
                                    'Off',
                                    'Отключен',
                                    'Вимкнено',
                                    'Адключаны',
                                    'Désactivé',
                                )),
                                (A.DEBUG_MODE_2 = new t(
                                    'Show optimizations',
                                    'Показывать оптимизации',
                                    'Показувати оптимізації',
                                    'Паказваць аптымізацыі',
                                    'Afficher les optimisations',
                                )),
                                (A.DEBUG_MODE_3 = new t(
                                    'Show signal propagation',
                                    'Показывать распространение сигнала',
                                    'Показувати поширення сигналу',
                                    'Паказваць распаўсюджанне сігналу',
                                    'Afficher la propagation du signal',
                                )),
                                (A.DEBUG_MODE_4 = new t(
                                    'Show unused arrows',
                                    'Показывать неиспользуемые стрелочки',
                                    'Показувати невикористані стрілочки',
                                    'Паказваць нявыкарыстаныя стрэлкі',
                                    'Afficher les flèches inutilisées',
                                )),
                                (A.DEBUG_MODE_5 = new t(
                                    'Disable updates',
                                    'Отключить обновление',
                                    'Вимкнути оновлення',
                                    'Адключыць абнаўленне',
                                    'Désactiver les mises à jour',
                                )),
                                (A.DEBUG_MODE_5 = new t(
                                    'Disable updates',
                                    'Отключить обновление',
                                    'Вимкнути оновлення',
                                    'Адключыць абнаўленне',
                                    'Désactiver les mises à jour',
                                )),
                                (A.TPS_LOCALE = new t(
                                    'TPS',
                                    'ТПС',
                                    'ТПС',
                                    'ТПС',
                                    'TPS',
                                )),
                                (A.FPS_LOCALE = new t(
                                    'FPS',
                                    'ФПС',
                                    'ФПС',
                                    'ФПС',
                                    'FPS',
                                )),
                                (A.OPTIMIZATIONS_UNAVAILABLE_LOCALE = new t(
                                    'Some optimizations are unavailable',
                                    'Некоторые оптимизации недоступны',
                                    'Деякі оптимізації недоступні',
                                    'Некаторыя аптымізацыі недаступныя',
                                    'Certaines optimisations sont indisponibles',
                                ));
                        });
                    })(this),
                    ((A) => {
                        const t = A.patchLoader,
                            e = A.settings,
                            g = t.getDefinitionPtr('GameText');
                        t.addDefinitionPatch('SettingsPage', (A) => {
                            const s = t.getDefinitionPtr('Page'),
                                i = t.getDefinitionPtr('LangSettings'),
                                I = t.getDefinitionPtr('LangUtils'),
                                C = s.definition;
                            t.setDefinition(
                                'SettingsPage',
                                class extends C {
                                    table;
                                    constructor(A) {
                                        super(A),
                                            (this.table = this.createTable()),
                                            this.mainDiv.appendChild(
                                                this.table,
                                            );
                                        const t = g.definition;
                                        this.addSetting(t.LANGUAGE.get(), () =>
                                            this.createLanguageSelect(),
                                        ),
                                            this.addSetting(
                                                t.SHOW_CONTROLS_HINTS.get(),
                                                () =>
                                                    this.createControlsHintsCheckbox(),
                                            ),
                                            this.addSetting(
                                                t.MAX_ZOOM_OUT.get(),
                                                () =>
                                                    this.createMaxZoomSlider(),
                                            ),
                                            this.addSpace(),
                                            this.addSetting(
                                                t.TARGET_FPS.get(),
                                                () =>
                                                    this.addRangeSetting(
                                                        'targetFPS',
                                                        20,
                                                        240,
                                                        5,
                                                        (A) =>
                                                            `${A} ${t.FPS_LOCALE.get()}`,
                                                    ),
                                                t.TARGET_FPS_DESC.get(),
                                            ),
                                            this.addSpace(0.5),
                                            this.addSetting(
                                                t.TPS_COUNTER.get(),
                                                () =>
                                                    this.addBoolSetting(
                                                        'showTPSInfo',
                                                    ),
                                                t.TPS_COUNTER_DESC.get(),
                                            ),
                                            this.addSpace(0.5),
                                            this.addSpace(1.5),
                                            this.addSetting(
                                                t.SHOW_ARROW_CONNECTIONS.get(),
                                                () =>
                                                    this.addBoolSetting(
                                                        'showArrowConnections',
                                                    ),
                                                t.SHOW_ARROW_CONNECTIONS_DESC.get(),
                                            ),
                                            this.addSpace(0.5),
                                            this.addSetting(
                                                t.SHOW_ARROW_TARGET.get(),
                                                () =>
                                                    this.addBoolSetting(
                                                        'showArrowTarget',
                                                    ),
                                                t.SHOW_ARROW_TARGET_DESC.get(),
                                            ),
                                            this.addSpace(0.5),
                                            this.addSetting(
                                                t.FULL_RENDERING.get(),
                                                () =>
                                                    this.addBoolSetting(
                                                        'fullRendering',
                                                    ),
                                                t.FULL_RENDERING_DESC.get(),
                                            ),
                                            this.addSpace(0.5),
                                            this.addSpace(1.5),
                                            this.addSetting(
                                                t.OPTIMIZE_RINGS.get(),
                                                () =>
                                                    this.addBoolSetting(
                                                        'optimizeRings',
                                                    ),
                                                t.OPTIMIZE_RINGS_DESC.get(),
                                            ),
                                            this.addSpace(0.5),
                                            this.addSetting(
                                                t.OPTIMIZE_BRANCHES.get(),
                                                () =>
                                                    this.addBoolSetting(
                                                        'optimizeBranches',
                                                    ),
                                                t.OPTIMIZE_BRANCHES_DESC.get(),
                                            ),
                                            this.addSpace(0.5),
                                            this.addSetting(
                                                t.OPTIMIZE_SIMPLE.get(),
                                                () =>
                                                    this.addBoolSetting(
                                                        'optimizeSimple',
                                                    ),
                                                t.OPTIMIZE_SIMPLE_DESC.get(),
                                            ),
                                            this.addSpace(0.5),
                                            this.addSpace(1.5),
                                            this.addSetting(
                                                t.DEBUG_MODE.get(),
                                                () =>
                                                    this.createDebugModeOptions(),
                                                t.DEBUG_MODE_DESC.get(),
                                            );
                                    }
                                    getClass() {
                                        return 'settings-page';
                                    }
                                    addText(A, t) {
                                        const e = document.createElement('div');
                                        (e.style.color = t),
                                            (e.innerHTML = A.get()),
                                            this.table.appendChild(e);
                                    }
                                    createDebugModeOptions() {
                                        const A = g.definition;
                                        return this.createOptionsSetting(
                                            e.data.debugMode,
                                            [
                                                A.DEBUG_MODE_1,
                                                A.DEBUG_MODE_2,
                                                A.DEBUG_MODE_3,
                                                A.DEBUG_MODE_4,
                                                A.DEBUG_MODE_5,
                                            ],
                                            (A, t) => {
                                                (e.data.debugMode = A),
                                                    e.save();
                                            },
                                        );
                                    }
                                    addRangeSetting(A, t, g, s, i) {
                                        const I = document.createElement('div'),
                                            C = document.createElement('input'),
                                            n = document.createElement('span');
                                        return (
                                            (C.type = 'range'),
                                            (C.min = t.toString()),
                                            (C.max = g.toString()),
                                            (C.step = s.toString()),
                                            (C.value = e.data[A].toString()),
                                            C.addEventListener('input', () => {
                                                const t = parseInt(
                                                    C.value.toString(),
                                                    10,
                                                );
                                                (n.innerText = i(t)),
                                                    (e.data[A] = t),
                                                    e.save();
                                            }),
                                            (C.style.display = 'inline'),
                                            (n.innerText = i(e.data[A])),
                                            I.appendChild(C),
                                            I.appendChild(n),
                                            I
                                        );
                                    }
                                    addBoolSetting(A, t = !1) {
                                        const g =
                                            document.createElement('input');
                                        return (
                                            (g.type = 'checkbox'),
                                            (g.checked = e.data[A] || t),
                                            (g.disabled = t),
                                            g.addEventListener('change', () => {
                                                (e.data[A] = g.checked),
                                                    e.save();
                                            }),
                                            g
                                        );
                                    }
                                    createOptionsSetting(A, t, e) {
                                        const g =
                                            document.createElement('select');
                                        for (let A = 0; A < t.length; A++) {
                                            const e = t[A],
                                                s =
                                                    document.createElement(
                                                        'option',
                                                    );
                                            (s.value = '' + A),
                                                (s.innerText = e.get()),
                                                g.appendChild(s);
                                        }
                                        return (
                                            (g.value = '' + A),
                                            g.addEventListener('change', () => {
                                                const A = parseInt(g.value, 10);
                                                e(A, t[A]);
                                            }),
                                            g
                                        );
                                    }
                                    createTable() {
                                        const A =
                                            document.createElement('table');
                                        return (
                                            A.classList.add('settings-table'), A
                                        );
                                    }
                                    addSpace(A = 1) {
                                        const t = document.createElement('div');
                                        (t.style.height = A + 'vh'),
                                            this.table.appendChild(t);
                                    }
                                    addSetting(
                                        A,
                                        t,
                                        e = null,
                                        g = 'rgb(0, 0, 0)',
                                        s = 'rgb(80, 80, 80)',
                                    ) {
                                        const i = document.createElement('tr');
                                        this.table.appendChild(i);
                                        const I = document.createElement('td');
                                        I.classList.add('setting-name');
                                        const C = document.createElement('div');
                                        if (
                                            ((C.innerText = A + ':'),
                                            (C.style.color = g),
                                            I.appendChild(C),
                                            e)
                                        ) {
                                            const A =
                                                document.createElement('div');
                                            A.classList.add(
                                                'setting-description',
                                            ),
                                                (A.innerText = e),
                                                (A.style.color = s),
                                                I.appendChild(A);
                                        }
                                        i.appendChild(I);
                                        const n = document.createElement('td');
                                        n.classList.add('setting-value'),
                                            n.appendChild(t()),
                                            i.appendChild(n);
                                    }
                                    createLanguageSelect() {
                                        const A = i.definition,
                                            t = I.definition,
                                            e =
                                                document.createElement(
                                                    'select',
                                                );
                                        return (
                                            e.classList.add('lang-select'),
                                            A.languages.forEach((t, g) => {
                                                const s =
                                                    document.createElement(
                                                        'option',
                                                    );
                                                (s.value = t),
                                                    (s.innerText =
                                                        A.languageNames[g]),
                                                    e.appendChild(s);
                                            }),
                                            (e.value = A.getLanguage()),
                                            e.addEventListener('change', () => {
                                                const g =
                                                    t.getLanguageFromString(
                                                        e.value,
                                                    );
                                                A.setLanguage(g),
                                                    localStorage.setItem(
                                                        'lang',
                                                        g,
                                                    ),
                                                    window.location.reload();
                                            }),
                                            e
                                        );
                                    }
                                    createControlsHintsCheckbox() {
                                        const A =
                                            document.createElement('input');
                                        return (
                                            (A.type = 'checkbox'),
                                            (A.checked =
                                                'false' !==
                                                localStorage.getItem(
                                                    'show-controls-hints',
                                                )),
                                            A.addEventListener('change', () => {
                                                localStorage.setItem(
                                                    'show-controls-hints',
                                                    A.checked.toString(),
                                                );
                                            }),
                                            A
                                        );
                                    }
                                    createMaxZoomSlider() {
                                        const A = document.createElement('div'),
                                            t = document.createElement('input'),
                                            e = document.createElement('span');
                                        return (
                                            (t.type = 'range'),
                                            (t.min = '1'),
                                            (t.max = '4'),
                                            (t.step = '1'),
                                            (t.value =
                                                localStorage.getItem(
                                                    'max-zoom-out',
                                                ) || '1'),
                                            (t.style.display = 'inline'),
                                            (e.innerText = t.value + 'x'),
                                            (e.className =
                                                'setting-max-zoom-out-text'),
                                            t.addEventListener('change', () => {
                                                localStorage.setItem(
                                                    'max-zoom-out',
                                                    t.value,
                                                ),
                                                    (e.innerText =
                                                        t.value + 'x');
                                            }),
                                            A.appendChild(t),
                                            A.appendChild(e),
                                            A
                                        );
                                    }
                                },
                            );
                        });
                    })(this);
            }
            invalidateGraph() {
                this.graphState &&
                    this.gameMap &&
                    (this.gameMap.chunks.forEach((A) => {
                        A.arrows.forEach((A) => {
                            (A.astIndex = void 0), (A.signal = 0);
                        });
                    }),
                    (this.graphState = void 0));
            }
            compileGraph() {
                if (this.gameMap) {
                    this.graphState;
                    try {
                        const A = this.settings.data.debugMode,
                            t = this.astParser.compileFrom(this.gameMap);
                        if (
                            (3 !== A && this.astOptimizer.applyOptimizations(t),
                            (this.rootNode = t),
                            0 !== A)
                        )
                            return void this.astDebugger.showDebugSignals(
                                A,
                                t,
                                this.gameMap,
                            );
                        const e = this.graphCompiler.compile(t);
                        this.graphUpdater.resetGraph(e),
                            (this.game.tick = 0),
                            (this.graphState = e);
                    } catch (A) {
                        alert('ERROR ' + A.message), console.error(A);
                    }
                } else
                    alert(
                        'ERROR GraphDLC.gameMap is undefined ( try restart page ).',
                    );
            }
        })(L);
        R.inject(), (window.graphdlc = R);
    })();
    localStorage.removeItem('graphdlc:unsupported');
} else if (selectedVersion === '1_4') {
    const lang: string | null = localStorage.getItem('lang');
    if (lang !== null) {
        LangSettings.setLanguage(LangUtils.getLanguageFromString(lang));
    }
    localStorage.removeItem('graphdlc:unsupported');

    const patchLoader = new PatchLoader();
    patchLoader.hook();
    const graphDLC = new GraphDLC(patchLoader);
    graphDLC.setup();

    window.graphdlc = graphDLC;
} else if (localStorage.getItem('graphdlc:unsupported') !== '1') {
    localStorage.setItem('graphdlc:unsupported', '1');
    const updateManager = new UpdateManager();
    updateManager.setup();
    alert(
        'GraphDLC: Неподдерживаемая версия игры. Мод временно отключен. Ожидайте обновление!',
    );
}
