( () => {
    "use strict";
    var e = {
        7403: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.KeyboardHandler = void 0,
            t.KeyboardHandler = class {
                constructor(e, t) {
                    this.keyDown = e => {
                        "Tab" === e.code && e.preventDefault(),
                        this.keys.has(e.code) || this.keyDownCallback(e.code, e.key),
                        this.keys.add(e.code),
                        this.chars.add(e.key)
                    }
                    ,
                    this.keyUp = e => {
                        if ("MetaLeft" === e.code || "MetaRight" === e.code || "ControlLeft" === e.code || "ControlRight" === e.code)
                            return this.keys.clear(),
                            void this.chars.clear();
                        this.keys.has(e.code) && this.keyUpCallback(e.code),
                        this.keys.delete(e.code),
                        this.chars.delete(e.key)
                    }
                    ,
                    this.keys = new Set,
                    this.chars = new Set,
                    this.keyDownCallback = e,
                    this.keyUpCallback = t,
                    document.addEventListener("keydown", this.keyDown),
                    document.addEventListener("keyup", this.keyUp)
                }
                dispose() {
                    document.removeEventListener("keydown", this.keyDown),
                    document.removeEventListener("keyup", this.keyUp)
                }
                getKeyPressed(e) {
                    return this.keys.has(e)
                }
                getShiftPressed() {
                    return this.getKeyPressed("ShiftLeft") || this.getKeyPressed("ShiftRight")
                }
                getCtrlPressed() {
                    const e = this.getKeyPressed("ControlLeft") || this.getKeyPressed("ControlRight")
                      , t = this.getKeyPressed("MetaLeft") || this.getKeyPressed("MetaRight");
                    return e || t
                }
                getCharPressed(e) {
                    return this.chars.has(e)
                }
            }
        }
        ,
        8463: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.MouseHandler = void 0,
            t.MouseHandler = class {
                constructor(e, t, s, i) {
                    this.mouseMove = e => {
                        this.mouseX = e.clientX - this.rect.x,
                        this.mouseY = e.clientY - this.rect.y
                    }
                    ,
                    this.mouseDown = e => {
                        0 === e.button && (this.mousePressed = !0),
                        1 === e.button && (e.preventDefault(),
                        this.wheelPressed = !0)
                    }
                    ,
                    this.mouseUp = e => {
                        0 === e.button && (this.mousePressed = !1),
                        1 === e.button && (e.preventDefault(),
                        this.wheelPressed = !1)
                    }
                    ,
                    this.wheel = e => {
                        this.wheelAction(e.deltaY),
                        this.mouseX = e.clientX - this.rect.x,
                        this.mouseY = e.clientY - this.rect.y
                    }
                    ,
                    this.leftClick = e => {
                        this.leftClickCallback()
                    }
                    ,
                    this.rightClick = e => {
                        this.rightClickCallback()
                    }
                    ,
                    this.touchMove = e => {
                        e.preventDefault();
                        const t = e.touches[0];
                        this.mouseX = t.clientX - this.rect.x,
                        this.mouseY = t.clientY - this.rect.y
                    }
                    ,
                    this.touchStart = e => {
                        this.mousePressed = !0;
                        const t = e.touches[0];
                        this.mouseX = t.clientX - this.rect.x,
                        this.mouseY = t.clientY - this.rect.y
                    }
                    ,
                    this.touchEnd = e => {
                        this.mousePressed = !1
                    }
                    ,
                    this.leftClickCallback = t,
                    this.rightClickCallback = s,
                    this.wheelAction = i,
                    this.mouseX = 0,
                    this.mouseY = 0,
                    this.mousePressed = !1,
                    this.wheelPressed = !1,
                    this.rect = e.getBoundingClientRect(),
                    document.addEventListener("mousemove", this.mouseMove),
                    document.addEventListener("mousedown", this.mouseDown),
                    document.addEventListener("mouseup", this.mouseUp),
                    document.addEventListener("wheel", this.wheel),
                    document.addEventListener("touchmove", this.touchMove, {
                        passive: !1
                    }),
                    document.addEventListener("touchstart", this.touchStart, {
                        passive: !1
                    }),
                    document.addEventListener("touchend", this.touchEnd, {
                        passive: !1
                    }),
                    document.addEventListener("click", this.leftClick),
                    document.addEventListener("contextmenu", this.rightClick)
                }
                dispose() {
                    document.removeEventListener("mousemove", this.mouseMove),
                    document.removeEventListener("mousedown", this.mouseDown),
                    document.removeEventListener("mouseup", this.mouseUp),
                    document.removeEventListener("wheel", this.wheel),
                    document.removeEventListener("touchmove", this.touchMove),
                    document.removeEventListener("touchstart", this.touchStart),
                    document.removeEventListener("touchend", this.touchEnd),
                    document.removeEventListener("click", this.leftClick),
                    document.removeEventListener("contextmenu", this.rightClick)
                }
                getMousePosition() {
                    return [this.mouseX, this.mouseY]
                }
                getMousePressed() {
                    return this.mousePressed
                }
                getWheelPressed() {
                    return this.wheelPressed
                }
            }
        }
        ,
        82: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.ArrowData = void 0;
            class s {
                constructor() {
                    this.type = 0,
                    this.rotation = 0,
                    this.flipped = !1
                }
                static fromArrow(e) {
                    const t = new s;
                    return void 0 === e || (t.type = e.type,
                    t.rotation = e.rotation,
                    t.flipped = e.flipped),
                    t
                }
                static fromState(e, t, i) {
                    const n = new s;
                    return n.type = e,
                    n.rotation = t,
                    n.flipped = i,
                    n
                }
                static fromCopy(e) {
                    const t = new s;
                    return t.type = e.type,
                    t.rotation = e.rotation,
                    t.flipped = e.flipped,
                    t
                }
                equals(e) {
                    return this.type === e.type && this.rotation === e.rotation && this.flipped === e.flipped
                }
            }
            t.ArrowData = s
        }
        ,
        370: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.Arrow = void 0,
            t.Arrow = class {
                constructor() {
                    this.type = 0,
                    this.rotation = 0,
                    this.flipped = !1,
                    this.signal = 0,
                    this.signalsCount = 0,
                    this.lastType = 0,
                    this.lastRotation = 0,
                    this.lastFlipped = !1,
                    this.lastSignal = 0,
                    this.canBeEdited = !0
                }
            }
        }
        ,
        691: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.ChunkUpdates = void 0;
            const i = s(3278);
            var n;
            !function(e) {
                function t(e) {
                    void 0 !== e && e.signalsCount++
                }
                function s(e) {
                    void 0 !== e && (e.signal = 0)
                }
                function n(e) {
                    e.lastType = e.type,
                    e.lastRotation = e.rotation,
                    e.lastFlipped = e.flipped,
                    e.lastSignal = e.signal
                }
                function o(e, t, s, n, o, a=-1, r=0) {
                    o && (r = -r),
                    0 === n ? (s += a,
                    t += r) : 1 === n ? (t -= a,
                    s += r) : 2 === n ? (s -= a,
                    t -= r) : 3 === n && (t += a,
                    s -= r);
                    let l = e;
                    if (t >= i.CHUNK_SIZE ? s >= i.CHUNK_SIZE ? (l = e.adjacentChunks[3],
                    t -= i.CHUNK_SIZE,
                    s -= i.CHUNK_SIZE) : s < 0 ? (l = e.adjacentChunks[1],
                    t -= i.CHUNK_SIZE,
                    s += i.CHUNK_SIZE) : (l = e.adjacentChunks[2],
                    t -= i.CHUNK_SIZE) : t < 0 ? s < 0 ? (l = e.adjacentChunks[7],
                    t += i.CHUNK_SIZE,
                    s += i.CHUNK_SIZE) : s >= i.CHUNK_SIZE ? (l = e.adjacentChunks[5],
                    t += i.CHUNK_SIZE,
                    s -= i.CHUNK_SIZE) : (l = e.adjacentChunks[6],
                    t += i.CHUNK_SIZE) : s < 0 ? (l = e.adjacentChunks[0],
                    s += i.CHUNK_SIZE) : s >= i.CHUNK_SIZE && (l = e.adjacentChunks[4],
                    s -= i.CHUNK_SIZE),
                    void 0 !== l)
                        return l.getArrow(t, s)
                }
                e.update = function(e) {
                    e.chunks.forEach((e => function(e) {
                        for (let s = 0; s < i.CHUNK_SIZE; s++)
                            for (let a = 0; a < i.CHUNK_SIZE; a++) {
                                const i = e.getArrow(s, a);
                                n(i),
                                1 === i.type ? 1 === i.signal && t(o(e, s, a, i.rotation, i.flipped)) : 2 === i.type ? 1 === i.signal && (t(o(e, s, a, i.rotation, i.flipped, -1, 0)),
                                t(o(e, s, a, i.rotation, i.flipped, 0, 1)),
                                t(o(e, s, a, i.rotation, i.flipped, 1, 0)),
                                t(o(e, s, a, i.rotation, i.flipped, 0, -1))) : 4 === i.type || 5 === i.type ? 1 === i.signal && t(o(e, s, a, i.rotation, i.flipped)) : 6 === i.type ? 1 === i.signal && (t(o(e, s, a, i.rotation, i.flipped, -1, 0)),
                                t(o(e, s, a, i.rotation, i.flipped, 1, 0))) : 7 === i.type ? 1 === i.signal && (t(o(e, s, a, i.rotation, i.flipped, -1, 0)),
                                t(o(e, s, a, i.rotation, i.flipped, 0, 1))) : 8 === i.type ? 1 === i.signal && (t(o(e, s, a, i.rotation, i.flipped, -1, 0)),
                                t(o(e, s, a, i.rotation, i.flipped, 0, 1)),
                                t(o(e, s, a, i.rotation, i.flipped, 0, -1))) : 9 === i.type ? 1 === i.signal && (t(o(e, s, a, i.rotation, i.flipped, -1, 0)),
                                t(o(e, s, a, i.rotation, i.flipped, 0, 1)),
                                t(o(e, s, a, i.rotation, i.flipped, 1, 0)),
                                t(o(e, s, a, i.rotation, i.flipped, 0, -1))) : 10 === i.type ? 2 === i.signal && t(o(e, s, a, i.rotation, i.flipped, -2)) : 11 === i.type ? 2 === i.signal && t(o(e, s, a, i.rotation, i.flipped, -1, 1)) : 12 === i.type ? 2 === i.signal && (t(o(e, s, a, i.rotation, i.flipped, -1, 0)),
                                t(o(e, s, a, i.rotation, i.flipped, -2, 0))) : 13 === i.type ? 2 === i.signal && (t(o(e, s, a, i.rotation, i.flipped, -2, 0)),
                                t(o(e, s, a, i.rotation, i.flipped, 0, 1))) : 14 === i.type ? 2 === i.signal && (t(o(e, s, a, i.rotation, i.flipped, -1, 0)),
                                t(o(e, s, a, i.rotation, i.flipped, -1, 1))) : 15 === i.type || 16 === i.type || 17 === i.type || 18 === i.type || 19 === i.type ? 3 === i.signal && t(o(e, s, a, i.rotation, i.flipped)) : 20 === i.type ? 5 === i.signal && t(o(e, s, a, i.rotation, i.flipped)) : 21 === i.type ? 5 === i.signal && (t(o(e, s, a, i.rotation, i.flipped, -1, 0)),
                                t(o(e, s, a, i.rotation, i.flipped, 0, 1)),
                                t(o(e, s, a, i.rotation, i.flipped, 1, 0)),
                                t(o(e, s, a, i.rotation, i.flipped, 0, -1))) : 22 === i.type ? 1 === i.signal && t(o(e, s, a, i.rotation, i.flipped)) : 24 === i.type && 5 === i.signal && t(o(e, s, a, i.rotation, i.flipped))
                            }
                    }(e))),
                    e.chunks.forEach((e => function(e) {
                        for (let t = 0; t < i.CHUNK_SIZE; t++)
                            for (let s = 0; s < i.CHUNK_SIZE; s++) {
                                const i = e.getArrow(t, s);
                                if (1 === i.type)
                                    i.signalsCount > 0 ? i.signal = 1 : i.signal = 0;
                                else if (2 === i.type)
                                    i.signal = 1;
                                else if (3 === i.type)
                                    i.signalsCount > 0 ? i.signal = 1 : i.signal = 0;
                                else if (4 === i.type)
                                    2 === i.signal ? i.signal = 1 : 0 === i.signal && i.signalsCount > 0 ? i.signal = 2 : 1 === i.signal && i.signalsCount > 0 ? i.signal = 1 : i.signal = 0;
                                else if (5 === i.type) {
                                    const n = o(e, t, s, i.rotation, i.flipped, 1);
                                    void 0 !== n && 0 !== n.lastSignal ? i.signal = 1 : i.signal = 0
                                } else if (6 === i.type)
                                    i.signalsCount > 0 ? i.signal = 1 : i.signal = 0;
                                else if (7 === i.type)
                                    i.signalsCount > 0 ? i.signal = 1 : i.signal = 0;
                                else if (8 === i.type)
                                    i.signalsCount > 0 ? i.signal = 1 : i.signal = 0;
                                else if (9 === i.type)
                                    0 === i.signal ? i.signal = 1 : 1 === i.signal && (i.signal = 2);
                                else if (10 === i.type)
                                    i.signalsCount > 0 ? i.signal = 2 : i.signal = 0;
                                else if (11 === i.type)
                                    i.signalsCount > 0 ? i.signal = 2 : i.signal = 0;
                                else if (12 === i.type)
                                    i.signalsCount > 0 ? i.signal = 2 : i.signal = 0;
                                else if (13 === i.type)
                                    i.signalsCount > 0 ? i.signal = 2 : i.signal = 0;
                                else if (14 === i.type)
                                    i.signalsCount > 0 ? i.signal = 2 : i.signal = 0;
                                else if (15 === i.type)
                                    i.signalsCount > 0 ? i.signal = 0 : i.signal = 3;
                                else if (16 === i.type)
                                    i.signalsCount > 1 ? i.signal = 3 : i.signal = 0;
                                else if (17 === i.type)
                                    i.signalsCount % 2 == 1 ? i.signal = 3 : i.signal = 0;
                                else if (18 === i.type)
                                    i.signalsCount > 1 ? i.signal = 3 : 1 === i.signalsCount && (i.signal = 0);
                                else if (19 === i.type)
                                    i.signalsCount > 0 && (0 === i.signal ? i.signal = 3 : i.signal = 0);
                                else if (20 === i.type)
                                    i.signalsCount > 0 && Math.random() < .5 ? i.signal = 5 : i.signal = 0;
                                else if (21 === i.type)
                                    i.signal = 0;
                                else if (22 === i.type) {
                                    i.signalsCount > 0 ? i.signal = 1 : i.signal = 0;
                                    const n = e.getLevelArrow(t, s);
                                    null == n || n.update()
                                } else
                                    23 === i.type ? i.signalsCount > 0 ? i.signal = 1 : i.signal = 0 : 24 === i.type && (i.signalsCount > 0 ? i.signal = 5 : i.signal = 0);
                                i.signalsCount = 0
                            }
                    }(e))),
                    e.chunks.forEach((e => function(e) {
                        for (let t = 0; t < i.CHUNK_SIZE; t++)
                            for (let n = 0; n < i.CHUNK_SIZE; n++) {
                                const i = e.getArrow(t, n);
                                3 === i.type && 1 === i.lastSignal && s(o(e, t, n, i.rotation, i.flipped))
                            }
                    }(e))),
                    e.chunks.forEach((e => function(e) {
                        e.levelArrows.forEach((e => {
                            23 === e.arrow.type && e.update()
                        }
                        ))
                    }(e)))
                }
                ,
                e.wasArrowChanged = function(e) {
                    return e.type !== e.lastType || e.rotation !== e.lastRotation || e.flipped !== e.lastFlipped || e.signal !== e.lastSignal
                }
                ,
                e.clearSignals = function(e) {
                    e.chunks.forEach((e => {
                        for (let t = 0; t < i.CHUNK_SIZE; t++)
                            for (let s = 0; s < i.CHUNK_SIZE; s++) {
                                const i = e.getArrow(t, s);
                                i.signal = 0,
                                i.lastSignal = 0,
                                i.signalsCount = 0
                            }
                        e.levelArrows.forEach((e => {
                            e.state = null
                        }
                        ))
                    }
                    ))
                }
            }(n || (t.ChunkUpdates = n = {}))
        }
        ,
        8798: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.Chunk = void 0;
            const i = s(370)
              , n = s(3278);
            t.Chunk = class {
                constructor(e, t) {
                    this.x = e,
                    this.y = t,
                    this.adjacentChunks = new Array(8),
                    this.arrows = new Array(n.CHUNK_SIZE * n.CHUNK_SIZE);
                    for (let e = 0; e < n.CHUNK_SIZE; e++)
                        for (let t = 0; t < n.CHUNK_SIZE; t++)
                            this.arrows[e + t * n.CHUNK_SIZE] = new i.Arrow;
                    this.levelArrows = new Map
                }
                getArrow(e, t) {
                    return this.arrows[e + t * n.CHUNK_SIZE]
                }
                removeArrow(e, t) {
                    this.arrows[e + t * n.CHUNK_SIZE].type = 0,
                    this.arrows[e + t * n.CHUNK_SIZE].rotation = 0,
                    this.arrows[e + t * n.CHUNK_SIZE].flipped = !1,
                    this.arrows[e + t * n.CHUNK_SIZE].signal = 0
                }
                getLevelArrow(e, t) {
                    return this.levelArrows.get(e + t * n.CHUNK_SIZE)
                }
                isEmpty() {
                    for (let e = 0; e < n.CHUNK_SIZE; e++)
                        for (let t = 0; t < n.CHUNK_SIZE; t++)
                            if (0 !== this.arrows[e + t * n.CHUNK_SIZE].type)
                                return !1;
                    return !0
                }
                getArrowTypes() {
                    const e = new Set;
                    for (let t = 0; t < n.CHUNK_SIZE; t++)
                        for (let s = 0; s < n.CHUNK_SIZE; s++) {
                            const i = this.getArrow(t, s).type;
                            0 !== i && e.add(i)
                        }
                    return Array.from(e)
                }
                clear() {
                    for (let e = 0; e < n.CHUNK_SIZE; e++)
                        for (let t = 0; t < n.CHUNK_SIZE; t++)
                            this.arrows[e + t * n.CHUNK_SIZE].type = 0;
                    this.levelArrows.clear()
                }
            }
        }
        ,
        3278: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.CHUNK_SIZE = t.CELL_SIZE = void 0,
            t.CELL_SIZE = 256,
            t.CHUNK_SIZE = 16
        }
        ,
        4817: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.GameMap = void 0;
            const i = s(258)
              , n = s(8798)
              , o = s(3278);
            t.GameMap = class {
                constructor() {
                    this.chunks = new Map
                }
                setArrowType(e, t, s, n=!0) {
                    const a = this.getOrCreateChunkByArrowCoordinates(e, t)
                      , r = a.getArrow(e - a.x * o.CHUNK_SIZE, t - a.y * o.CHUNK_SIZE);
                    n && !r.canBeEdited || n && i.PlayerSettings.levelArrows.includes(r.type) || (r.type !== s && (r.signal = 0),
                    r.type = s)
                }
                setArrowSignal(e, t, s) {
                    const i = this.getArrowForEditing(e, t);
                    void 0 !== i && 0 !== i.type && (i.signal = s)
                }
                setArrowRotation(e, t, s, n=!0) {
                    const o = this.getArrowForEditing(e, t);
                    if (void 0 !== o && 0 !== o.type) {
                        if (n && !o.canBeEdited)
                            return;
                        if (n && i.PlayerSettings.levelArrows.includes(o.type))
                            return;
                        o.rotation = s
                    }
                }
                setArrowFlipped(e, t, s, n=!0) {
                    const o = this.getArrowForEditing(e, t);
                    if (void 0 !== o && 0 !== o.type) {
                        if (n && !o.canBeEdited)
                            return;
                        if (n && i.PlayerSettings.levelArrows.includes(o.type))
                            return;
                        o.flipped = s
                    }
                }
                getArrowType(e, t) {
                    const s = this.getArrow(e, t);
                    return void 0 === s ? 0 : s.type
                }
                resetArrow(e, t, s=!0) {
                    const n = this.getArrowForEditing(e, t);
                    void 0 !== n && (s && !n.canBeEdited || s && i.PlayerSettings.levelArrows.includes(n.type) || (n.type = 0,
                    n.signal = 0,
                    n.signalsCount = 0,
                    n.rotation = 0,
                    n.flipped = !1))
                }
                removeArrow(e, t, s=!0) {
                    const n = this.getChunkByArrowCoordinates(e, t);
                    if (void 0 === n)
                        return;
                    const o = this.getArrowForEditing(e, t);
                    if (void 0 !== o) {
                        if (s && !o.canBeEdited)
                            return;
                        if (s && i.PlayerSettings.levelArrows.includes(o.type))
                            return;
                        o.type = 0,
                        o.signal = 0,
                        o.signalsCount = 0,
                        o.rotation = 0,
                        o.flipped = !1
                    }
                    this.clearChunkIfEmpty(n)
                }
                getArrow(e, t) {
                    const s = this.getChunkByArrowCoordinates(e, t);
                    if (void 0 !== s)
                        return s.getArrow(e - s.x * o.CHUNK_SIZE, t - s.y * o.CHUNK_SIZE)
                }
                getChunk(e, t) {
                    const s = `${e},${t}`;
                    return this.chunks.get(s)
                }
                getOrCreateChunk(e, t) {
                    const s = `${e},${t}`
                      , i = this.chunks.get(s);
                    if (void 0 !== i)
                        return i;
                    const o = new n.Chunk(e,t);
                    this.chunks.set(s, o);
                    const a = [this.getChunk(e, t - 1), this.getChunk(e + 1, t - 1), this.getChunk(e + 1, t), this.getChunk(e + 1, t + 1), this.getChunk(e, t + 1), this.getChunk(e - 1, t + 1), this.getChunk(e - 1, t), this.getChunk(e - 1, t - 1)];
                    for (let e = 0; e < 8; e++) {
                        const t = a[e];
                        void 0 !== t && (o.adjacentChunks[e] = t,
                        t.adjacentChunks[(e + 4) % 8] = o)
                    }
                    return o
                }
                clear() {
                    this.chunks.forEach((e => {
                        e.clear(),
                        this.clearChunkIfEmpty(e)
                    }
                    ))
                }
                getChunkByArrowCoordinates(e, t) {
                    const s = e < 0 ? 1 : 0
                      , i = t < 0 ? 1 : 0
                      , n = ~~((e + s) / o.CHUNK_SIZE) - s
                      , a = ~~((t + i) / o.CHUNK_SIZE) - i;
                    return this.getChunk(n, a)
                }
                clearChunkIfEmpty(e) {
                    if (e.isEmpty()) {
                        for (let t = 0; t < 8; t++) {
                            const s = e.adjacentChunks[t];
                            void 0 !== s && (s.adjacentChunks[(t + 4) % 8] = void 0)
                        }
                        this.chunks.delete(`${e.x},${e.y}`)
                    }
                }
                setLevelArrow(e) {
                    const t = this.getOrCreateChunkByArrowCoordinates(e.x, e.y)
                      , s = e.x - t.x * o.CHUNK_SIZE + (e.y - t.y * o.CHUNK_SIZE) * o.CHUNK_SIZE;
                    if (t.levelArrows.has(s))
                        return;
                    t.levelArrows.set(s, e);
                    const i = t.getArrow(e.x - t.x * o.CHUNK_SIZE, e.y - t.y * o.CHUNK_SIZE);
                    i.type = e.type,
                    e.arrow = i
                }
                getOrCreateChunkByArrowCoordinates(e, t) {
                    const s = e < 0 ? 1 : 0
                      , i = t < 0 ? 1 : 0
                      , n = ~~((e + s) / o.CHUNK_SIZE) - s
                      , a = ~~((t + i) / o.CHUNK_SIZE) - i;
                    return this.getOrCreateChunk(n, a)
                }
                getArrowForEditing(e, t) {
                    const s = this.getChunkByArrowCoordinates(e, t);
                    if (void 0 !== s)
                        return s.getArrow(e - s.x * o.CHUNK_SIZE, t - s.y * o.CHUNK_SIZE)
                }
            }
        }
        ,
        7514: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.LevelArrow = void 0;
            const i = s(370);
            t.LevelArrow = class {
                constructor(e, t, s, n) {
                    this.type = e,
                    this.x = t,
                    this.y = s,
                    this.action = n,
                    this.levelAction = () => {}
                    ,
                    this.state = null,
                    this.isStateValid = !1,
                    this.arrow = new i.Arrow
                }
                setAction(e) {
                    this.action = e
                }
                setLevelAction(e) {
                    this.levelAction = e
                }
                update() {
                    this.isStateValid = this.action(this)
                }
                updateLevel() {
                    this.levelAction()
                }
                isValid() {
                    return this.isStateValid
                }
            }
        }
        ,
        110: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.SelectedMap = void 0;
            const i = s(2149)
              , n = s(2714)
              , o = s(974)
              , a = s(370)
              , r = s(3278)
              , l = s(4817);
            t.SelectedMap = class {
                constructor() {
                    this.selectedArrows = new Set,
                    this.arrowsToPutOriginal = new Map,
                    this.arrowsToPut = new Map,
                    this.currentSelectedArrows = new Set,
                    this.currentSelectionFirstPoint = void 0,
                    this.currentSelectionSecondPoint = void 0,
                    this.rotationState = 0,
                    this.flipState = !1,
                    this.tempMap = new l.GameMap
                }
                select(e, t) {
                    this.currentSelectedArrows.add(`${e},${t}`)
                }
                deselect(e, t) {
                    this.selectedArrows.delete(`${e},${t}`)
                }
                clearCurrentSelection() {
                    this.currentSelectedArrows.clear()
                }
                clear() {
                    this.selectedArrows.clear()
                }
                getSelectedArrows() {
                    return [...this.selectedArrows, ...this.currentSelectedArrows]
                }
                getCount() {
                    return this.selectedArrows.size
                }
                updateSelectionFromCurrentSelection() {
                    this.selectedArrows = new Set([...this.selectedArrows, ...this.currentSelectedArrows]),
                    this.currentSelectedArrows.clear(),
                    this.currentSelectionFirstPoint = void 0,
                    this.currentSelectionSecondPoint = void 0
                }
                updateCurrentSelectedArea(e, t) {
                    void 0 !== this.currentSelectionFirstPoint ? this.currentSelectionSecondPoint = [e, t] : this.currentSelectionFirstPoint = [e, t]
                }
                updateMouseSelection(e, t, s, i) {
                    if (i || this.clear(),
                    this.updateCurrentSelectedArea(t, s),
                    void 0 === this.currentSelectionFirstPoint || void 0 === this.currentSelectionSecondPoint)
                        return;
                    const n = this.currentSelectionFirstPoint[0] - (this.currentSelectionFirstPoint[0] < 0 ? 1 : 0)
                      , o = this.currentSelectionFirstPoint[1] - (this.currentSelectionFirstPoint[1] < 0 ? 1 : 0)
                      , a = this.currentSelectionSecondPoint[0] - (this.currentSelectionSecondPoint[0] < 0 ? 1 : 0)
                      , r = this.currentSelectionSecondPoint[1] - (this.currentSelectionSecondPoint[1] < 0 ? 1 : 0)
                      , l = ~~n
                      , h = ~~o
                      , c = ~~a
                      , d = ~~r;
                    if (this.clearCurrentSelection(),
                    Math.abs(n - a) > .25 || Math.abs(o - r) > .25) {
                        const t = Math.min(l, c)
                          , s = Math.min(h, d)
                          , i = Math.max(l, c)
                          , n = Math.max(h, d);
                        for (let o = t; o <= i; o++)
                            for (let t = s; t <= n; t++)
                                0 !== e.getArrowType(o, t) && this.select(o, t)
                    }
                }
                getCurrentSelectedArea() {
                    if (void 0 !== this.currentSelectionFirstPoint && void 0 !== this.currentSelectionSecondPoint)
                        return [this.currentSelectionFirstPoint[0], this.currentSelectionFirstPoint[1], this.currentSelectionSecondPoint[0], this.currentSelectionSecondPoint[1]]
                }
                setArrow(e) {
                    const t = new a.Arrow;
                    t.type = e,
                    t.rotation = 0,
                    t.flipped = !1,
                    this.arrowsToPutOriginal.clear(),
                    this.arrowsToPutOriginal.set("0,0", t),
                    this.rotateOrFlipArrows(this.rotationState, this.flipState)
                }
                copyFromGameMap(e) {
                    this.rotationState = 0,
                    this.flipState = !1,
                    this.arrowsToPutOriginal.clear(),
                    this.arrowsToPut.clear();
                    let t = Number.MAX_SAFE_INTEGER
                      , s = Number.MAX_SAFE_INTEGER;
                    this.tempMap.clear(),
                    this.selectedArrows.forEach((i => {
                        const [n,o] = i.split(",").map((e => parseInt(e, 10)))
                          , a = e.getArrow(n, o);
                        void 0 !== a && a.canBeEdited && (t = Math.min(t, n),
                        s = Math.min(s, o))
                    }
                    )),
                    this.selectedArrows.forEach((i => {
                        const [n,o] = i.split(",").map((e => parseInt(e, 10)))
                          , a = n - t
                          , r = o - s
                          , l = e.getArrow(n, o);
                        void 0 !== l && l.canBeEdited && (this.tempMap.setArrowType(a, r, l.type),
                        this.tempMap.setArrowRotation(a, r, l.rotation),
                        this.tempMap.setArrowFlipped(a, r, l.flipped))
                    }
                    ));
                    const i = (0,
                    n.save)(this.tempMap);
                    return o.Utils.arrayBufferToBase64(i)
                }
                pasteFromText(e, t, s) {
                    this.tempMap.clear();
                    try {
                        const s = window.atob(e).split("").map((e => e.charCodeAt(0)));
                        if ((0,
                        i.load)(this.tempMap, s),
                        0 === this.tempMap.chunks.size)
                            throw new Error("No chunks found");
                        t()
                    } catch (e) {
                        s()
                    }
                    this.arrowsToPutOriginal.clear(),
                    this.arrowsToPut.clear(),
                    this.tempMap.chunks.forEach((e => {
                        for (let t = 0; t < r.CHUNK_SIZE; t++)
                            for (let s = 0; s < r.CHUNK_SIZE; s++) {
                                const i = e.getArrow(t, s);
                                if (0 !== i.type && i.canBeEdited) {
                                    const n = e.x * r.CHUNK_SIZE + t
                                      , o = e.y * r.CHUNK_SIZE + s;
                                    this.arrowsToPutOriginal.set(`${n},${o}`, i),
                                    this.arrowsToPut.set(`${n},${o}`, i)
                                }
                            }
                    }
                    ))
                }
                getCopiedArrows() {
                    return this.arrowsToPut
                }
                rotateOrFlipArrows(e, t) {
                    this.arrowsToPut.clear(),
                    null !== e && (this.rotationState = e),
                    t && (this.flipState = !this.flipState),
                    this.arrowsToPutOriginal.forEach(( (e, t) => {
                        let[s,i] = t.split(",").map((e => parseInt(e, 10)));
                        const n = new a.Arrow;
                        n.type = e.type,
                        n.rotation = e.rotation,
                        n.flipped = e.flipped;
                        let o = e.rotation;
                        this.flipState && (n.flipped = !n.flipped,
                        1 !== n.rotation && 3 !== n.rotation || (o = (e.rotation + 2) % 4),
                        s = -s),
                        n.rotation = o;
                        let r = s
                          , l = i;
                        1 === this.rotationState ? (r = -i,
                        l = s,
                        n.rotation = (o + 1) % 4) : 2 === this.rotationState ? (r = -s,
                        l = -i,
                        n.rotation = (o + 2) % 4) : 3 === this.rotationState && (r = i,
                        l = -s,
                        n.rotation = (o + 3) % 4),
                        this.arrowsToPut.set(`${r},${l}`, n)
                    }
                    ))
                }
                dispose() {
                    this.selectedArrows.clear(),
                    this.arrowsToPutOriginal.clear(),
                    this.arrowsToPut.clear(),
                    this.currentSelectedArrows.clear()
                }
            }
        }
        ,
        2413: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.ArrowDescriptions = void 0;
            const i = s(6161);
            var n;
            !function(e) {
                const t = new Map([[0, new i.I18nText("Empty cell","Пустая клетка","Порожня клітина","Пустая клетка","Case vide")], [1, new i.I18nText("Arrow","Стрелка","Стрілка","Стрэлка","Flèche")], [2, new i.I18nText("Source block","Блок источника","Блок джерела","Блок крыніцы","Bloc de source")], [3, new i.I18nText("Blocker","Блокер","Блокер","Блокер","Bloqueur")], [4, new i.I18nText("Delay arrow","Стрелка задержки","Стрілка затримки","Стрэлка затрымкі","Flèche de retard")], [5, new i.I18nText("Signal detector","Детектор сигнала","Детектор сигналу","Дэтэктар сігналу","Directuer du signal")], [6, new i.I18nText("Splitter","Разветвитель","Розгалужувач","Разгалінавальнік","Diviseur")], [7, new i.I18nText("Splitter","Разветвитель","Розгалужувач","Разгалінавальнік","Diviseur")], [8, new i.I18nText("Splitter","Разветвитель","Розгалужувач","Разгалінавальнік","Diviseur")], [9, new i.I18nText("Pulse generator","Генератор импульса","Генератор імпульсу","Генератар імпульсу","Générateur de pulsion")], [10, new i.I18nText("Blue arrow","Синяя стрелка","Синя стрілка","Сіняя стрэлка","Flèche bleue")], [11, new i.I18nText("Diagonal arrow","Диагональная стрелка","Діагональна стрілка","Дыяганальная стрэлка","Flèche diagonale")], [12, new i.I18nText("Blue splitter","Синий разветвитель","Синій розгалужувач","Сіні разгалінавальнік","Diviseur bleu")], [13, new i.I18nText("Blue splitter","Синий разветвитель","Синій розгалужувач","Сіні разгалінавальнік","Diviseur bleu")], [14, new i.I18nText("Blue splitter","Синий разветвитель","Синій розгалужувач","Сіні разгалінавальнік","Diviseur bleu")], [15, new i.I18nText("Not gate","Отрицание","Заперечення","Адмоўнік","Porte logique de négation")], [16, new i.I18nText("And gate","И","І","І",'Porte logique "et"')], [17, new i.I18nText("XOR gate","Исключающее ИЛИ","Виняткове АБО","Выключнае АБО",'Porte logique de négation "XOR"')], [18, new i.I18nText("Latch","Триггер","Тригер","Трыгер","Déclencheur")], [19, new i.I18nText("T flip-flop","T-триггер","T-тригер","T-трыгер","Déclencheur-T")], [20, new i.I18nText("Randomizer","Рандомайзер","Рандомайзер","Рандамайзер","Randomiseur")], [21, new i.I18nText("Button","Кнопка","Кнопка","Кнопка","Bouton")], [22, new i.I18nText("Source","Источник","Джерело","Крыніца","Source")], [23, new i.I18nText("Target","Приемник","Приймач","Прыёмнік","Cible")], [24, new i.I18nText("Directional button","Направленная кнопка","Направлена кнопка","Накіраваная кнопка","Bouton dirrectionel")]])
                  , s = new Map([[0, new i.I18nText("Never.","Никогда.","Ніколи.","Ніколі.","Jamais")], [1, new i.I18nText("On any incoming signal.","Любым входящим сигналом.","Будь-яким вхідним сигналом.","Любым уваходным сігналам.","Avec n'importe quel signal intrant")], [2, new i.I18nText("Every time.","Всегда.","Завжди.","Заўсёды.","Toujours")], [3, new i.I18nText("On any incoming signal.","Любым входящим сигналом.","Будь-яким вхідним сигналом.","Любым уваходным сігналам.","Avec n'importe quel signal intrant")], [4, new i.I18nText("#b(Blue) on any incoming signal if not active.<br>#r(Red) if the current color is #b(blue).","#b(Синим) при любом входящем сигнале если не активна.<br>#r(Красным) если активна #b(синим).","#b(Синім) при будь-якому вхідному сигналі якщо не активна.<br>#r(Червоним) якщо активна #b(синім).","#b(Сіняй) пры любым уваходным сігнале калі не актыўна.<br>#r(Чырвонай) калі актыўна #b(сіняй).","#b(Bleu) non-actif n'importe le signal intrant.<br>#r(Rouge) si la couleur actuelle est : #b(bleu).")], [5, new i.I18nText("If an cell behind is active.","Если активна стрелка сзади.","Якщо активна стрілка ззаду.","Калі актыўна стрэлка ззаду.","Si la case derrière est active")], [6, new i.I18nText("On any incoming signal.","Любым входящим сигналом.","Будь-яким вхідним сигналом.","Любым уваходным сігналам.","N'importe le signal intrant")], [7, new i.I18nText("On any incoming signal.","Любым входящим сигналом.","Будь-яким вхідним сигналом.","Любым уваходным сігналам.","N'importe le signal intrant")], [8, new i.I18nText("On any incoming signal.","Любым входящим сигналом.","Будь-яким вхідним сигналом.","Любым уваходным сігналам.","N'importe le signal intrant")], [9, new i.I18nText("#r(Red) if not active.<br>#b(Blue) if the current color is #r(red) or #b(blue).","#r(Красным) если не активна.<br>#b(Синим) если активна #r(красным) или #b(синим).","#r(Червоним) якщо не активна.<br>#b(Синім) якщо активна #r(червоним) або #b(синім).","#r(Чырвонай) калі не актыўна.<br>#b(Сіняй) калі актыўна #r(чырвонай) або #b(сіняй).","#r(Rouge) quand n'est pas actif.<br>#b(Bleu) quand est actif #r(rouge) ou #b(bleu).")], [10, new i.I18nText("On any incoming signal.","Любым входящим сигналом.","Будь-яким вхідним сигналом.","Любым уваходным сігналам.","N'importe le signal intrant")], [11, new i.I18nText("On any incoming signal.","Любым входящим сигналом.","Будь-яким вхідним сигналом.","Любым уваходным сігналам.","N'importe le signal intrant")], [12, new i.I18nText("On any incoming signal.","Любым входящим сигналом.","Будь-яким вхідним сигналом.","Любым уваходным сігналам.","N'importe le signal intrant")], [13, new i.I18nText("On any incoming signal.","Любым входящим сигналом.","Будь-яким вхідним сигналом.","Любым уваходным сігналам.","N'importe le signal intrant")], [14, new i.I18nText("On any incoming signal.","Любым входящим сигналом.","Будь-яким вхідним сигналом.","Любым уваходным сігналам.","N'importe le signal intrant")], [15, new i.I18nText("When there are no incoming signals.","Когда нет входящих сигналов.","Коли немає вхідних сигналів.","Калі няма ўваходных сігналаў.","Quand il n'y a pas de signaux intrants")], [16, new i.I18nText("On at least two incoming signals.","При минимум двух входящих сигналах.","При мінімум двох вхідних сигналах.","Пры мінімум двух уваходных сігналах.","Au minimum de deux signaux intrants")], [17, new i.I18nText("On odd number of incoming signals.","При нечетном количестве входящих сигналов.","При непарній кількості вхідних сигналів.","Пры няцотнай колькасці ўваходных сігналаў.","Quand il y a un nombre de signaux intrants non-paire")], [18, new i.I18nText("On at least two incoming signals. Or when there are no incoming signals and already active.","При минимум двух входящих сигналах. Или когда нет входящих сигналов и уже активна.","При мінімум двох вхідних сигналах. Або коли немає вхідних сигналів і вже активна.","Пры мінімум двух уваходных сігналах. Або калі няма ўваходных сігналаў і ўжо актыўна.","Au minimum de deux signaux intrants. Ou quand il n'y a pas de signaux intrants et est encore actif")], [19, new i.I18nText("On any incoming signal if not active. Or when there are no incoming signals and already active.","При любом входящем сигнале, если не активна. Или когда нет входящих сигналов и уже активна.","При будь-якому вхідному сигналі, якщо не активна. Або коли немає вхідних сигналів і вже активна.","Пры любым уваходным сігнале, калі не актыўна. Або калі няма ўваходных сігналаў і ўжо актыўна.","N'importe le signal intrant, quand n'est pas actif. Ou quand il n'y a pas de signaux intrants et est déjà activé")], [20, new i.I18nText("On any incoming signal with 50% chance.","При любом входящем сигнале с 50% вероятностью.","При будь-якому вхідному сигналі з 50% ймовірністю.","Пры любым уваходным сігнале з 50% верагоднасцю.","N'importe le signal intrant avec une chance de 50%")], [21, new i.I18nText("When pressed with the left mouse button.","При нажатии левой кнопкой мыши.","При натисканні лівою кнопкою миші.","Пры націсканні левай кнопкай мышы.","Quand le bouton gauche de la souris est appuyé.")], [22, new i.I18nText("On any incoming signal.","Любым входящим сигналом.","Будь-яким вхідним сигналом.","Любым уваходным сігналам.","N'importe le signal intrant")], [23, new i.I18nText("On any incoming signal.","Любым входящим сигналом.","Будь-яким вхідним сигналом.","Любым уваходным сігналам.","N'importe le signal intrant")], [24, new i.I18nText("When pressed with the left mouse button or on any incoming signal.","При нажатии левой кнопкой мыши или любым входящим сигналом.","При натисканні лівою кнопкою миші або будь-яким вхідним сигналом.","Пры націсканні левай кнопкай мышы або любым уваходным сігналам.","N'importe le signal intrant ou quand le bouton gauche de la souris est appuyé.")]])
                  , n = new Map([[0, new i.I18nText("Does nothing.","Ничего не делает.","Нічого не робить.","Нічога не робіць.","Ne fait rien")], [1, new i.I18nText("Sends a signal forwards.","Передает сигнал вперед.","Передає сигнал вперед.","Перадае сігнал наперад.","Transmet un signal en avant.")], [2, new i.I18nText("Sends signals in four directions around it.","Передает сигналы в четырех направлениях вокруг себя.","Передає сигнали в чотирьох напрямках навколо себе.","Перадае сігналы ў чатырох напрамках навакол сябе.","Transmet des signaux dans les quatre directions autour de soi-même.")], [3, new i.I18nText("Turns off an arrow in front of it.","Выключает стрелку перед собой.","Вимикає стрілку перед собою.","Выключае стрэлку перад сабою.","Éteint une flèche devant lui")], [4, new i.I18nText("If the signal is #r(red) sends a signal forwards.","Если сигнал #r(красный), передает сигнал вперед.","Якщо сигнал #r(червоний), передає сигнал вперед.","Калі сігнал #r(чырвоны), перадае сігнал наперад.","Si le signal est #r(rouge), transmet un signal en avant.")], [5, new i.I18nText("Sends a signal forwards.","Передает сигнал вперед.","Передає сигнал вперед.","Перадае сігнал наперад.","Transmet un signal en avant")], [6, new i.I18nText("Sends a signal both forwards and backwards.","Передает сигнал и вперед, и назад.","Передає сигнал і вперед, і назад.","Перадае сігнал і наперад, і назад.","Transmet un signal en avant et en arrière")], [7, new i.I18nText("Sends a signal forward and to the right.","Передает сигнал вперед и вправо.","Передає сигнал вперед і праворуч.","Перадае сігнал наперад і ўправа.","Transmet un signal en avant et à gauche")], [8, new i.I18nText("Sends a signal forward, right, and left.","Передает сигнал вперед, вправо и влево.","Передає сигнал вперед, праворуч і ліворуч.","Перадае сігнал наперад, управа і ўлева.","Transmet un signal en avant, à gauche et à droite.")], [9, new i.I18nText("If the signal is #r(red) sends signals in four directions around it.","Если сигнал #r(красный), передает сигналы в четырех направлениях вокруг себя.","Якщо сигнал #r(червоний), передає сигнали в чотирьох напрямках навколо себе.","Калі сігнал #r(чырвоны), перадае сігналы ў чатырох напрамках вакол сябе.","Si le signal est #r(rouge), transmet des signaux dans les quatre directions autour de soi-même.")], [10, new i.I18nText("Sends a signal forwards, skipping one cell.","Передает сигнал вперед через одну клетку.","Передає сигнал вперед через одну клітинку.","Перадае сігнал наперад праз адну клетку.","Transmet un signal en avant, en sautant une case.")], [11, new i.I18nText("Sends a signal diagonally.","Передает сигнал по диагонали.","Передає сигнал по діагоналі.","Перадае сігнал па дыяганалі.","Tranmet un signal en diagonale.")], [12, new i.I18nText("Sends a signal to the two cells directly in front of it.","Передает сигнал в две клетки перед собой.","Передає сигнал у дві клітинки перед собою.","Перадае сігнал у два клеткі перад сабою.","Transmet un signal dans les deux cases directement devant lui.")], [13, new i.I18nText("Sends a signal forwards, skipping one cell and to the right.","Передает сигнал вперед через одну клетку и вправо.","Передає сигнал вперед через одну клітинку і праворуч.","Перадае сігнал наперад праз адну клетку і ўправа.","Transmet un signal en avant et à droite, en sautant une case.")], [14, new i.I18nText("Sends a signal forwards and diagonally.","Передает сигнал вперед и по диагонали.","Передає сигнал вперед і по діагоналі.","Перадае сігнал наперад і па дыяганалі.","Transmet un signal en avant et en diagonale.")], [15, new i.I18nText("Sends a signal forwards.","Передает сигнал вперед.","Передає сигнал вперед.","Перадае сігнал наперад.","Transmet un signal en avant.")], [16, new i.I18nText("Sends a signal forwards.","Передает сигнал вперед.","Передає сигнал вперед.","Перадае сігнал наперад.","Transmet un signal en avant.")], [17, new i.I18nText("Sends a signal forwards.","Передает сигнал вперед.","Передає сигнал вперед.","Перадае сігнал наперад.","Transmet un signal en avant.")], [18, new i.I18nText("Sends a signal forwards.","Передает сигнал вперед.","Передає сигнал вперед.","Перадае сігнал наперад.","Transmet un ssignal en avant.")], [19, new i.I18nText("Sends a signal forwards.","Передает сигнал вперед.","Передає сигнал вперед.","Перадае сігнал наперад.","Transmet un ssignal en avant.")], [20, new i.I18nText("Sends a signal forwards.","Передает сигнал вперед.","Передає сигнал вперед.","Перадае сігнал наперад.","Transmet un ssignal en avant.")], [21, new i.I18nText("Sends signals in four directions around it.","Передает сигналы в четырех направлениях вокруг себя.","Передає сигнали в чотирьох напрямках навколо себе.","Перадае сігналы ў чатырох напрамках вакол сябе.","Transmet des signaux dans les quatre directions autour de soi-même.")], [22, new i.I18nText("Sends a signal forwards.","Передает сигнал вперед.","Передає сигнал вперед.","Перадае сігнал наперад.","Transmet un ssignal en avant.")], [23, new i.I18nText("Does nothing.","Ничего не делает.","Нічого не робить.","Нічога не робіць.","Ne fait rien")], [24, new i.I18nText("Sends a signal forwards.","Передает сигнал вперед.","Передає сигнал вперед.","Перадае сігнал наперад.","Transmet un ssignal en avant.")]]);
                e.getArrowsCount = function() {
                    return t.size
                }
                ,
                e.getArrowName = function(e) {
                    var s;
                    const i = null === (s = t.get(e)) || void 0 === s ? void 0 : s.get();
                    return void 0 !== i ? i : "Unknown"
                }
                ,
                e.getArrowActivation = function(e) {
                    var t;
                    const i = null === (t = s.get(e)) || void 0 === t ? void 0 : t.get();
                    return void 0 !== i ? i : "Unknown"
                }
                ,
                e.getArrowAction = function(e) {
                    var t;
                    const s = null === (t = n.get(e)) || void 0 === t ? void 0 : t.get();
                    return void 0 !== s ? s : "Unknown"
                }
            }(n || (t.ArrowDescriptions = n = {}))
        }
        ,
        7906: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.ControlsHintsText = void 0;
            const i = s(6161);
            var n;
            !function(e) {
                e.MOVE = new i.I18nText("move","двигаться","рухатися","рухацца","se déplacer"),
                e.ROTATE = new i.I18nText("rotate","повернуть","обернути","абярыць","tourner"),
                e.DELETE = new i.I18nText("delete","удалить","видалити","выдаліць","supprimer"),
                e.SELECT = new i.I18nText("select","выделить","виділіць","вылучыць","sélectionner"),
                e.UNDO = new i.I18nText("undo","отмена","відміна","адмена","annuler"),
                e.PAUSE = new i.I18nText("pause","пауза","пауза","паўза","pause"),
                e.MENU = new i.I18nText("menu","меню","меню","меню","menu"),
                e.SET_ARROW = new i.I18nText("set","поставить","поставити","паставіць","mettre"),
                e.FLIP = new i.I18nText("flip","отразить","відзеркаліць","адлюстраваць","refléter"),
                e.PICK = new i.I18nText("pick","пипетка","піпетка","піпетка","pipette"),
                e.INVENTORY = new i.I18nText("inventory","инвентарь","інвентар","інвентар","inventaire"),
                e.FREE_CURSOR = new i.I18nText("free cursor","освободить курсор","звільніць курсор","зваліць курсор","libérer le curseur"),
                e.COPY = new i.I18nText("copy","скопировать","скопіювати","скапіяваць","copier"),
                e.PASTE = new i.I18nText("paste","вставить","вставити","ўставіць","coller"),
                e.CUT = new i.I18nText("cut","вырезать","вирізати","выразаць","couper"),
                e.DELETE_SELECTION = new i.I18nText("delete selection","удалить выделенное","видалити виділене","выдаліць вылучанае","supprimer la sélection"),
                e.SELECT_OR_DESELECT = new i.I18nText("select / deselect","выделить / сбросить","виділіць / скинути","вылучыць / скінуць","sélectionner / désélectionner"),
                e.ADD_SELECTION = new i.I18nText("add selection","добавить выделение","додати виділення","дадаць вылучэнне","ajouter une sélection")
            }(n || (t.ControlsHintsText = n = {}))
        }
        ,
        3446: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.GameText = void 0;
            const i = s(6161);
            var n;
            !function(e) {
                e.SIGN_IN_WITH_GOOGLE = new i.I18nText("Sign in with Google","Войти через Google","Увійти через Google","Увайсці праз Google","Se connecter via Google"),
                e.LOGIN_TEXT = new i.I18nText("Let’s play with simplicity to create complexity!","Создайте сложные структуры из простых элементов!","Створіть складні структури з простих елементів!","Стварыце складаныя структуры з простых элементаў!","Créez des structures compliquées avec des éléments simples !"),
                e.LOGOUT = new i.I18nText("Logout","Выйти","Вийти","Выйсці","Se connecter"),
                e.ARROWS_TITLE = new i.I18nText("Logic Arrows","Стрелочки","Стрілочки","Стрэлачкі","Fléchettes"),
                e.MAPS = new i.I18nText("Maps","Карты","Мапи","Карты","Cartes"),
                e.GUIDE = new i.I18nText("Guide","Гайд","Гайд","Гайд","Guide"),
                e.MENU_BACK = new i.I18nText("Back","Назад","Назад","Назад","Retour"),
                e.PERFOMANCE_TITLE = new i.I18nText("Perfomance","Производительность","Продуктивність","Прадукцыйнасць","Performance"),
                e.PER_SECOND = new i.I18nText("per second","в секунду","за секунду","у секунду","par seconde"),
                e.NEW_MAP = new i.I18nText("New map","Новая карта","Нова мапа","Новая карта","Nouvelle carte"),
                e.MAP_NAME = new i.I18nText("Map name","Название карты","Назва мапи","Назва карты","Nom de la carte"),
                e.MAP_DESCRIPTION = new i.I18nText("Map description","Описание карты","Опис мапи","Апісанне карты","Description de la carte"),
                e.SAVING = new i.I18nText("Saving...","Сохранение...","Збереження...","Захаванне...","Sauvegarde..."),
                e.SAVED = new i.I18nText("Saved","Сохранено","Збережено","Захавана","Sauvé"),
                e.CANCEL = new i.I18nText("Cancel","Отмена","Скасувати","Адмяніць","Annuler"),
                e.DELETE = new i.I18nText("Delete","Удалить","Видалити","Выдаліць","Supprimer"),
                e.START_GAME = new i.I18nText("Start game","Начать игру","Почати гру","Пачаць гульню","Commencer le jeu"),
                e.LEVELS = new i.I18nText("Levels","Уровни","Рівні","Узроўні","Niveaux"),
                e.LEVEL = new i.I18nText("Level","Уровень","Рівень","Узровень","Niveau"),
                e.ACCEPT = new i.I18nText("Accept","Принять","Прийняти","Прыняць","Accepter"),
                e.SET_NAME = new i.I18nText("Enter your game name","Введите ваше имя в игре","Введіть ваше ім'я у грі","Увядзіце ваша імя ў гульні","Entrer votre pseudo"),
                e.NAME = new i.I18nText("Name","Имя","Ім'я","Імя","Nom"),
                e.ACCOUNT = new i.I18nText("Account","Аккаунт","Акаунт","Акаўнт","Compte"),
                e.COMMUNITY_MAPS = new i.I18nText("Community maps","Карты сообщества","Мапи спільноти","Карты суполкі","Cartes de comminauté"),
                e.NEWS = new i.I18nText("News","Новости","Новини","Навіны","Nouvelles"),
                e.SETTINGS = new i.I18nText("Settings","Настройки","Налаштування","Налады","Paramètres"),
                e.NAME_ERROR_TOO_SHORT = new i.I18nText("Name must be longer than 3 characters","Имя должно быть длиннее 3 символов","Ім'я повинно бути довшим за 3 символи","Імя павінна быць даўжэй чым за 3 сімвалы","Le nom doit être plus long que 3 symboles"),
                e.NAME_ERROR_CHARS = new i.I18nText('Name can only contain English letters, numbers, spaces or "_" symbol','Имя может содержать только английские буквы, цифры, пробелы или символ "_"','Ім\'я може містити тільки англійські літери, цифри, пробіли або символ "_"','Імя можа ўтрымліваць толькі ангельскія літары, лічбы, прабелы або сімвал "_"','Le nom ne peut contenir que des lettres anglaises, espaces ou le symbole "_"'),
                e.NAME_ERROR_SPACE = new i.I18nText("Name cannot start or end with a space","Имя не может начинаться или заканчиваться пробелом","Ім'я не може починатися або закінчуватися пробілом","Імя не можа пачынацца ці заканчвацца прабелам","Le nom ne doit pas se terminer avec une espace"),
                e.NAME_ERROR_SPACES_COUNT = new i.I18nText("Name cannot contain more than one space in a row","Имя не может содержать больше одного пробела подряд","Ім'я не може містити більше одного пробілу поспіль","Імя не можа ўтрымліваць больш за адзін прабел пад радок","Le nom ne doit pas contenir plus qu'une espace de suite"),
                e.NAME_ERROR_UNDERSCORES_COUNT = new i.I18nText('Name cannot contain more than one "_" symbol in a row','Имя не может содержать больше одного символа "_" подряд','Ім\'я не може містити більше одного символу "_" поспіль','Імя не можа ўтрымліваць больш за адзін сімвал "_" пад радок','Le nom ne doit pas contenir plus q\'un symbole "_" de suite'),
                e.NAME_ERROR_CANNOT_START_WITH_DIGIT = new i.I18nText("Name cannot start with a digit","Имя не может начинаться с цифры","Ім'я не може починатися з цифри","Імя не можа пачынацца з лічбы","Le nom ne doit pas se commencer avec une chiffre"),
                e.NAME_ERROR_EXIST_OR_UNAVAILABLE = new i.I18nText("This name already exists or unavailable","Это имя уже существует или недоступно","Це ім'я вже існує або недоступне","Гэта імя ўжо існуе або недаступна","Ce nom-ci est déjà pris ou indisponible"),
                e.PRIVACY_POLICY = new i.I18nText("Privacy policy","Политика конфиденциальности","Політика конфіденційності","Палітыка канфідэнцыяльнасці","Politique de confidentialité"),
                e.TERMS_AND_CONDITIONS = new i.I18nText("Terms and conditions","Условия использования","Умови використання","Умовы выкарыстання","Conditions d'usage"),
                e.LEVEL_TESTING = new i.I18nText("Testing the level...","Тестирование уровня...","Тестування рівня...","Тэставанне ўзроўня...","Test du niveau..."),
                e.MAPS_10_LVL = new i.I18nText("Complete level 10 to unlock maps","Пройдите уровень 10, чтобы разблокировать карты","Пройдіть рівень 10, щоби розблокувати мапи","Прайдзіце ўзровень 10, каб разблакаваць карты","Complétez le niveau 10 pour débloquer les cartes"),
                e.UNABLE_TO_SAVE = new i.I18nText("Unable to save","Не удалось сохранить","Неможливо зберегти","Не атрымалася захаваць","Impossible de sauver"),
                e.MAP_TOO_LARGE = new i.I18nText("Map is too large","Карта слишком большая","Мапа занадта вялікая","Карта занадта вялікая","La carte est trop grande"),
                e.SHOW_SPOILER = new i.I18nText("Show spoiler","Показать подсказку","Показати підказку","Паказаць падказку","Montrer une astuce"),
                e.COOKIES_TITLE = new i.I18nText("Accept cookies to start the game","Примите куки, чтобы начать игру","Прийміть кукі, щоби почати гру","Прымеце кукі, каб пачаць гульню",'Accepter les "Cookies" pour commencer le jeu'),
                e.COOKIES_TEXT = new i.I18nText('Our website uses cookies for authentication and saving the game progress.\n     We do not collect any cookies unless you click the "Accept" button below.','Наш сайт использует куки для аутентификации и сохранения прогресса игры.\n      Мы не собираем никаких куки, пока вы не нажмете кнопку "Принять" ниже.','Наш сайт використовує кукі для аутентифікації та збереження прогресу гри.\n      Ми не збираємо жодних кукі, поки ви не натиснете кнопку "Прийняти" нижче.','Наш сайт выкарыстоўвае кукі для аўтэнтыфікацыі і захавання прагрэсу гульні.\n      Мы не збіраем ніякіх кукі, пакуль вы не націснеце кнопку "Прыняць" ніжэй.','Notre site web n\'utilise les "Cookies" que pour authentification et pour saver le progrès du jeu.\n      L\'on ne collecte pas de "Cookies" si vous n\'avez encore pas cliqué sur le bouton "Accepter" ci-dessous'),
                e.AUTOSAVING = new i.I18nText("Autosaving...","Автосохранение...","Автозбереження...","Аўтазахаванне...","Sauvegarde automatique"),
                e.ACTIVATES = new i.I18nText("Activates:","Активируется:","Активується:","Актывуецца:","S'active :"),
                e.ON_ACTIVATION = new i.I18nText("On activation:","При активации:","При активації:","Пры актывацыі:","Quand activé :"),
                e.LANGUAGE = new i.I18nText("Language","Язык","Мова","Мова","Langue"),
                e.SHOW_CONTROLS_HINTS = new i.I18nText("Show controls hints","Показывать подсказки управления","Показувати підказки управління","Паказваць падказкі кіравання","Afficher les conseils sur les contrôles"),
                e.MAX_ZOOM_OUT = new i.I18nText("Max zoom out","Максимальное отдаление","Максимальне віддалення","Максімальнае аддаленне","Zoom arrière maximum")
            }(n || (t.GameText = n = {}))
        }
        ,
        6161: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.I18nText = void 0;
            const i = s(3295);
            t.I18nText = class {
                constructor(e, t, s, i, n) {
                    this.en = e,
                    this.ru = t,
                    this.ua = s,
                    this.by = i,
                    this.fr = n
                }
                get(...e) {
                    switch (i.LangSettings.getLanguage()) {
                    case "en":
                    default:
                        return "string" == typeof this.en ? this.en : this.en(e);
                    case "ru":
                        return "string" == typeof this.ru ? this.ru : this.ru(e);
                    case "ua":
                        return "string" == typeof this.ua ? this.ua : this.ua(e);
                    case "by":
                        return "string" == typeof this.by ? this.by : this.by(e);
                    case "fr":
                        return "string" == typeof this.fr ? this.fr : this.fr(e)
                    }
                }
            }
        }
        ,
        3295: (e, t) => {
            var s;
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.LangSettings = void 0,
            function(e) {
                let t = "en";
                e.languages = ["en", "ru", "ua", "by", "fr"],
                e.languageNames = ["English", "Русский", "Українська", "Беларуская", "Français"],
                e.htmlCodes = ["en", "ru", "uk", "be", "fr"],
                e.getLanguage = function() {
                    return t
                }
                ,
                e.setLanguage = function(s) {
                    e.languages.includes(s) && (t = s,
                    document.documentElement.lang = e.htmlCodes[e.languages.indexOf(s)])
                }
            }(s || (t.LangSettings = s = {}))
        }
        ,
        3737: (e, t) => {
            var s;
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.LangUtils = void 0,
            function(e) {
                e.getLanguageFromString = function(e) {
                    switch (e) {
                    case "en":
                    default:
                        return "en";
                    case "ru":
                        return "ru";
                    case "ua":
                        return "ua";
                    case "by":
                        return "by";
                    case "fr":
                        return "fr"
                    }
                }
                ,
                e.getLanguageFromName = function(e) {
                    switch (e) {
                    case "English":
                    default:
                        return "en";
                    case "Русский":
                        return "ru";
                    case "Українська":
                        return "ua";
                    case "Беларуская":
                        return "by";
                    case "Français":
                        return "fr"
                    }
                }
            }(s || (t.LangUtils = s = {}))
        }
        ,
        8448: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.LevelInfo = void 0,
            t.LevelInfo = class {
                constructor(e, t) {
                    this.id = e,
                    this.state = "locked",
                    this.nextLevels = t,
                    this.previousLevels = [],
                    this.stateCallback = void 0
                }
                setState(e) {
                    return this.state = e,
                    void 0 !== this.stateCallback && this.stateCallback(e),
                    this
                }
                setCallback(e) {
                    this.stateCallback = e
                }
            }
        }
        ,
        4909: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.LevelOverlayInfo = void 0,
            t.LevelOverlayInfo = class {
                constructor(e, t, s, i, n) {
                    this.x = e,
                    this.y = t,
                    this.width = s,
                    this.height = i,
                    this.outputs = n
                }
            }
        }
        ,
        304: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.LevelsControls = void 0;
            const i = s(8463)
              , n = s(3278);
            t.LevelsControls = class {
                constructor(e, t) {
                    this.wheelCallback = e => {
                        this.wheelDelta += e
                    }
                    ,
                    this.game = t,
                    this.mouseHandler = new i.MouseHandler(e,( () => {}
                    ),( () => {}
                    ),this.wheelCallback),
                    this.mousePosPrev = [0, 0],
                    this.mousePressedPrev = !1,
                    this.wheelDelta = 0
                }
                update() {
                    const e = this.mouseHandler.getMousePosition();
                    if (0 !== this.wheelDelta) {
                        let t = this.game.scale * (1 - .001 * this.wheelDelta);
                        t = Math.max(20, Math.min(t, 128)),
                        this.game.setScale(t, e),
                        this.wheelDelta = 0
                    }
                    const t = e[0] * window.devicePixelRatio / this.game.scale - this.game.offset[0] / n.CELL_SIZE
                      , s = e[1] * window.devicePixelRatio / this.game.scale - this.game.offset[1] / n.CELL_SIZE
                      , i = ~~t - (t < 0 ? 1 : 0)
                      , o = ~~s - (s < 0 ? 1 : 0);
                    this.game.mousePosition = [i, o],
                    this.mouseHandler.getWheelPressed() ? (this.moveCamera(e[0], e[1]),
                    this.game.screenUpdated = !0) : this.mouseHandler.getMousePressed() ? (this.mousePressedPrev || (this.mousePosPrev = e),
                    this.moveCamera(e[0], e[1]),
                    this.game.screenUpdated = !0,
                    this.mousePressedPrev = !0) : this.mousePressedPrev = !1,
                    this.mousePosPrev = e
                }
                dispose() {
                    this.mouseHandler.dispose()
                }
                moveCamera(e, t) {
                    this.game.offset[0] += (e - this.mousePosPrev[0]) * n.CELL_SIZE / this.game.scale * window.devicePixelRatio,
                    this.game.offset[1] += (t - this.mousePosPrev[1]) * n.CELL_SIZE / this.game.scale * window.devicePixelRatio
                }
            }
        }
        ,
        5164: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.LevelsUI = void 0,
            t.LevelsUI = class {
                dispose() {}
            }
        }
        ,
        9010: (e, t, s) => {
            var i;
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.Levels = void 0;
            const n = s(7514)
              , o = s(8246)
              , a = s(1521)
              , r = s(8448)
              , l = s(4909);
            class h {
                static completeLevel(e) {
                    const t = this.levels.get(e);
                    void 0 !== t && (t.setState("completed"),
                    t.nextLevels.forEach((e => {
                        const t = this.levels.get(e);
                        void 0 !== t && "completed" !== t.state && this.allPreviousLevelsCompleted(t) && t.setState("unlocked")
                    }
                    )))
                }
                static unlockLevel(e) {
                    const t = this.levels.get(e);
                    void 0 !== t && t.setState("unlocked")
                }
                static startLevel(e) {
                    var t;
                    null === (t = this.levelInitActions.get(e.info.id)) || void 0 === t || t(e)
                }
                static addLevel(e, t, s, i, n, o) {
                    const a = new r.LevelInfo(e,t)
                      , h = new l.LevelOverlayInfo(s,i,n,n,o);
                    this.levels.set(e, a),
                    this.levelOverlayInfos.set(e, h)
                }
                static setPreviousLevels() {
                    this.levels.forEach((e => {
                        e.nextLevels.forEach((t => {
                            const s = this.levels.get(t);
                            void 0 !== s && s.previousLevels.push(e.id)
                        }
                        ))
                    }
                    ))
                }
                static allPreviousLevelsCompleted(e) {
                    for (let t = 0; t < e.previousLevels.length; t++) {
                        const s = i.levels.get(e.previousLevels[t]);
                        if (void 0 === s || "completed" !== s.state)
                            return !1
                    }
                    return !0
                }
            }
            t.Levels = h,
            i = h,
            h.levels = new Map,
            h.levelOverlayInfos = new Map,
            h.levelInitActions = new Map([[0, e => {
                e.levelArrows.push(new n.LevelArrow(23,0,0,(e => 1 === e.arrow.signal))),
                e.levelArrows.push(new n.LevelArrow(22,0,10,(e => (e.arrow.signal = 1,
                !0))));
                const t = i.levelRights.get(e.info.id);
                void 0 !== t && e.playerControls.updatePlayerAccess(t),
                e.initLevel(),
                e.showTutorial((e => {
                    const t = new a.UIGameView(e,"AAABAAAAAAACFwAAAAEDEAAgADAAQAAWAFAA");
                    t.setResizeAction(( () => t.game.focusOnBox(1, 0, 0, 6, .5, 1)))
                }
                ))
            }
            ], [1, e => {
                const t = e => (null === e.state && 1 === e.arrow.signal && (e.state = 1),
                2 === e.state && 1 === e.arrow.signal)
                  , s = [[0, new n.LevelArrow(22,0,0,t)], [0, new n.LevelArrow(22,0,-10,t)], [1, new n.LevelArrow(22,0,-20,t)], [2, new n.LevelArrow(22,10,-20,t)], [3, new n.LevelArrow(22,10,-10,t)], [0, new n.LevelArrow(22,2,-10,t)], [0, new n.LevelArrow(22,2,-18,(e => (null === e.state && 1 === e.arrow.signal && (e.state = 1),
                1 === e.arrow.signal)))]]
                  , o = [ () => {
                    e.game.focusOnBox(0, -10, 0, 10, 3, .01),
                    e.nextTutorialStep()
                }
                , () => {
                    e.game.focusOnBox(0, -25, 0, -5, 3, .01),
                    setTimeout(( () => {
                        e.game.focusOnBox(0, -10, 0, 10, 3, .02),
                        e.playerControls.updatePlayerAccess({
                            canMove: !0
                        }),
                        e.nextTutorialStep()
                    }
                    ), 2e3)
                }
                , () => {
                    e.game.focusOnBox(0, -20, 10, -5, 3, .01),
                    e.playerControls.updatePlayerAccess({
                        canRotate: !0
                    }),
                    e.nextTutorialStep()
                }
                , () => {}
                , () => {}
                , () => {}
                , () => {}
                ]
                  , a = (t, i) => {
                    if (1 === t.state) {
                        t.state = 2;
                        const n = s[i + 1][1];
                        e.levelArrows.push(n),
                        e.game.gameMap.setLevelArrow(n),
                        n.arrow.rotation = s[i + 1][0],
                        o[i](),
                        e.game.screenUpdated = !0
                    }
                }
                ;
                for (let e = 0; e < s.length - 1; e++) {
                    const t = s[e][1];
                    t.setLevelAction(( () => a(t, e)))
                }
                const r = s[0][1];
                e.levelArrows.push(r),
                e.game.gameMap.setLevelArrow(r),
                e.levelArrows.push(new n.LevelArrow(22,0,5,(e => (e.arrow.signal = 1,
                !0))));
                const l = i.levelRights.get(e.info.id);
                void 0 !== l && e.playerControls.updatePlayerAccess(l),
                e.initLevel(),
                e.showTutorial()
            }
            ], [2, e => {
                const t = [0];
                let s = 0
                  , o = 0;
                const r = () => {
                    s = 0,
                    e.game.updateSpeedLevel = 0,
                    e.restartLevel()
                }
                ;
                e.levelArrows.push(new n.LevelArrow(22,-2,10,(t => (t.arrow.signal = e.game.tick % 2,
                !0)))),
                e.levelArrows.push(new n.LevelArrow(22,2,10,(t => (t.arrow.signal = e.game.tick % 3 == 2 ? 1 : 0,
                !0)))),
                e.levelArrows.push(new n.LevelArrow(23,0,0,(i => {
                    if (e.game.tick > 200 ? r() : e.game.tick > 50 ? e.game.updateSpeedLevel = 2 : e.game.tick > 10 && (e.game.updateSpeedLevel = 1),
                    null === i.state) {
                        if (t.push(i.arrow.signal),
                        t.length > 2) {
                            let s = 1 === t.at(-1);
                            s && (s = 1 === t.at(-2)),
                            s && (s = 1 === t.at(-3)),
                            s && (i.state = 1,
                            o = e.game.tick - 3,
                            t.length = 0)
                        }
                        return !1
                    }
                    const n = (e.game.tick - o) % 2
                      , a = (e.game.tick - o) % 3 == 2 ? 1 : 0;
                    return i.arrow.signal === (n | a) ? s++ : (i.state = null,
                    r()),
                    e.setProgress(s / 50),
                    s >= 50
                }
                )));
                const l = i.levelRights.get(e.info.id);
                void 0 !== l && e.playerControls.updatePlayerAccess(l),
                e.initLevel(!0),
                e.showTutorial((e => {
                    const t = new a.UIGameView(e,"AAABAAAAAAACCQGwALQAARZhAXEAgQCRALEAAgASACIAMgBCAFIAYgCiArIDYwNzAIMAkwCUA5UDtQCmArYDBwGhAKUA");
                    t.setResizeAction(( () => t.game.focusOnBox(2, 4, 3, 8, .5, 1)))
                }
                ))
            }
            ], [3, e => {
                e.levelArrows.push(new n.LevelArrow(23,0,0,(e => 1 === e.arrow.signal))),
                e.levelArrows.push(new n.LevelArrow(23,2,0,(e => 1 === e.arrow.signal))),
                e.levelArrows.push(new n.LevelArrow(23,4,0,(e => 1 === e.arrow.signal))),
                e.levelArrows.push(new n.LevelArrow(23,6,0,(e => 1 === e.arrow.signal))),
                e.game.gameMap.setArrowType(3, 5, 2);
                const t = e.game.gameMap.getArrow(3, 5);
                void 0 !== t && (t.canBeEdited = !1);
                const s = i.levelRights.get(e.info.id);
                void 0 !== s && e.playerControls.updatePlayerAccess(s),
                e.initLevel(),
                e.showTutorial()
            }
            ], [4, e => {
                e.levelArrows.push(new n.LevelArrow(23,0,0,(e => 1 === e.arrow.signal))),
                e.levelArrows.push(new n.LevelArrow(23,-2,0,(e => 1 === e.arrow.signal))),
                e.levelArrows.push(new n.LevelArrow(23,2,0,(e => 1 === e.arrow.signal))),
                e.levelArrows.push(new n.LevelArrow(22,0,5,(e => (e.arrow.signal = 1,
                !0))));
                const t = i.levelRights.get(e.info.id);
                void 0 !== t && e.playerControls.updatePlayerAccess(t),
                e.initLevel(),
                e.showTutorial((e => {
                    const t = new a.UIGameView(e,"AAABAAAAAAAFCQCwAAwAsQEBEgIAEgAiADIAQgBSAGIAcgCCAJIAsgCjAbMDVAG0A1UBtQNWAVcBBwCiAAUAUwELAKQB");
                    t.setResizeAction(( () => t.game.focusOnBox(2, 4, 4, 8, .5, 1)))
                }
                ))
            }
            ], [5, e => {
                const t = [0];
                let s = 0
                  , o = 0;
                const r = () => {
                    s = 0,
                    e.game.updateSpeedLevel = 0,
                    e.restartLevel()
                }
                ;
                e.levelArrows.push(new n.LevelArrow(22,0,10,(e => (e.arrow.signal = 1,
                !0)))),
                e.levelArrows.push(new n.LevelArrow(22,4,10,(t => (t.arrow.signal = e.game.tick % 4 == 0 ? 1 : 0,
                !0)))),
                e.levelArrows.push(new n.LevelArrow(23,0,0,(i => {
                    if (e.game.tick > 200 ? r() : e.game.tick > 50 ? e.game.updateSpeedLevel = 2 : e.game.tick > 10 && (e.game.updateSpeedLevel = 1),
                    null === i.state) {
                        if (t.push(i.arrow.signal),
                        t.length > 2) {
                            let s = 1 === t.at(-1);
                            s && (s = 0 === t.at(-2)),
                            s && (s = 1 === t.at(-3)),
                            s && (i.state = 1,
                            o = e.game.tick - 1,
                            t.length = 0)
                        }
                        return !1
                    }
                    const n = (e.game.tick - o) % 4 == 0 ? 0 : 1;
                    return i.arrow.signal === n ? s++ : (i.state = null,
                    r()),
                    e.setProgress(s / 50),
                    s >= 50
                }
                )));
                const l = i.levelRights.get(e.info.id);
                void 0 !== l && e.playerControls.updatePlayerAccess(l),
                e.initLevel(!0),
                e.showTutorial((e => {
                    const t = new a.UIGameView(e,"AAABAAAAAAAGAQ8AABAAIAAwAEAAUABgAHAAQgNDA0QDNQAWAiYCNgJGAwIAgAADAEEDCwAlAAcARQMMAFYACQBmAw==");
                    t.setResizeAction(( () => t.game.focusOnBox(-2, 3, 4, 6, .5, 1)))
                }
                ))
            }
            ], [6, e => {
                let t = 0;
                const s = () => {
                    t = 0,
                    e.game.updateSpeedLevel = 0,
                    e.restartLevel()
                }
                ;
                e.levelArrows.push(new n.LevelArrow(22,0,10,(t => (t.arrow.signal = e.game.tick % 4 == 0 ? 1 : 0,
                !0)))),
                e.levelArrows.push(new n.LevelArrow(23,0,0,(i => {
                    if (e.game.tick > 200 ? s() : e.game.tick > 50 ? e.game.updateSpeedLevel = 2 : e.game.tick > 10 && (e.game.updateSpeedLevel = 1),
                    null === i.state)
                        return 1 === i.arrow.signal && (i.state = 1),
                        !1;
                    if (1 === i.state && 0 === i.arrow.signal)
                        i.state = 2;
                    else {
                        if (2 !== i.state || 1 !== i.arrow.signal)
                            return i.state = null,
                            s(),
                            !1;
                        i.state = 1
                    }
                    return t++,
                    e.setProgress(t / 50),
                    t >= 50
                }
                )));
                const o = i.levelRights.get(e.info.id);
                void 0 !== o && e.playerControls.updatePlayerAccess(o),
                e.initLevel(!0),
                e.showTutorial((e => {
                    const t = new a.UIGameView(e,"AAABAAAAAAAFARsAABAAIAAwAEAAUABgAHAAgACQAJEDsgCTAaMBswMEABQAJAA0AEQAVABkAHQAhACUALQDdQO1AwkAsQAGAJIBBwCiAAsApAEFAYUAlQE=");
                    t.setResizeAction(( () => t.game.focusOnBox(-1, 2, 6, 5, .5, 1)))
                }
                ))
            }
            ], [7, e => {
                let t = 0;
                const s = [1, 4, 5, 8, 9, 10]
                  , o = [0, 3, 7]
                  , r = [0];
                let l = 0;
                const h = () => {
                    t = 0,
                    e.game.updateSpeedLevel = 0,
                    e.restartLevel()
                }
                ;
                e.levelArrows.push(new n.LevelArrow(22,0,10,(t => (t.arrow.signal = 0,
                s.includes(e.game.tick % 12) && (t.arrow.signal = 1),
                !0)))),
                e.levelArrows.push(new n.LevelArrow(23,0,0,(s => {
                    if (e.game.tick > 200 ? h() : e.game.tick > 50 ? e.game.updateSpeedLevel = 2 : e.game.tick > 10 && (e.game.updateSpeedLevel = 1),
                    null === s.state) {
                        if (r.push(s.arrow.signal),
                        r.length > 3) {
                            let t = 0 === r.at(-1);
                            t && (t = 1 === r.at(-2)),
                            t && (t = 1 === r.at(-3)),
                            t && (t = 0 === r.at(-4)),
                            t && (s.state = 1,
                            l = e.game.tick - 3,
                            r.length = 0)
                        }
                        return !1
                    }
                    let i = 0 === s.arrow.signal && o.includes((e.game.tick - l) % 12);
                    return i || (i = 1 === s.arrow.signal && !o.includes((e.game.tick - l) % 12)),
                    i ? t++ : (s.state = null,
                    h()),
                    e.setProgress(t / 50),
                    t >= 50
                }
                )));
                const c = i.levelRights.get(e.info.id);
                void 0 !== c && e.playerControls.updatePlayerAccess(c),
                e.initLevel(!0),
                e.showTutorial((e => {
                    let t = "AAACAAAAAAAHARgAABAAIAAwAEAAUABgAHAAgACQAJEDogCTAcMA0wDzAQQAFAAkADQARABUAGQ";
                    t += "AdACEAAYAkgEQALIAEwDCAAwA0gAOAOIABwHyAJQACwKzA/QBlQMAAAEAAQkAAQABAwIAAwMEAwUD";
                    const s = new a.UIGameView(e,"AAACAAAAAAAHARgAABAAIAAwAEAAUABgAHAAgACQAJEDogCTAcMA0wDzAQQAFAAkADQARABUAGQAdACEAAYAkgEQALIAEwDCAAwA0gAOAOIABwHyAJQACwKzA/QBlQMAAAEAAQkAAQABAwIAAwMEAwUD");
                    s.setResizeAction(( () => s.game.focusOnBox(-1, 2, 6, 5, .5, 1)))
                }
                ))
            }
            ], [8, e => {
                let t = 0;
                const s = [0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0]
                  , o = [0];
                let a = 0;
                const r = () => {
                    t = 0,
                    e.game.updateSpeedLevel = 0,
                    e.restartLevel()
                }
                ;
                e.levelArrows.push(new n.LevelArrow(22,0,10,(t => (t.arrow.signal = s[e.game.tick % s.length],
                !0)))),
                e.levelArrows.push(new n.LevelArrow(23,0,0,(i => {
                    if (e.game.tick > 200 ? r() : e.game.tick > 50 ? e.game.updateSpeedLevel = 2 : e.game.tick > 10 && (e.game.updateSpeedLevel = 1),
                    null === i.state) {
                        if (o.push(i.arrow.signal),
                        o.length > 2) {
                            let t = 1 === o.at(-1);
                            t && (t = 0 === o.at(-2)),
                            t && (t = 1 === o.at(-3)),
                            t && (i.state = 1,
                            a = e.game.tick - 2,
                            o.length = 0)
                        }
                        return !1
                    }
                    return i.arrow.signal === 1 - s[(e.game.tick - a) % s.length] ? t++ : (i.state = null,
                    r()),
                    e.setProgress(t / 50),
                    t >= 50
                }
                )));
                const l = i.levelRights.get(e.info.id);
                void 0 !== l && e.playerControls.updatePlayerAccess(l),
                e.initLevel(!0),
                e.showTutorial()
            }
            ], [9, e => {
                let t = 0;
                const s = [0, 1, 1, 0]
                  , o = [0];
                let r = 0;
                const l = () => {
                    t = 0,
                    e.game.updateSpeedLevel = 0,
                    e.restartLevel()
                }
                ;
                e.levelArrows.push(new n.LevelArrow(23,0,0,(i => {
                    if (e.game.tick > 200 ? l() : e.game.tick > 50 ? e.game.updateSpeedLevel = 2 : e.game.tick > 10 && (e.game.updateSpeedLevel = 1),
                    null === i.state) {
                        if (o.push(i.arrow.signal),
                        o.length > 3) {
                            let t = 0 === o.at(-1);
                            t && (t = 1 === o.at(-2)),
                            t && (t = 1 === o.at(-3)),
                            t && (t = 0 === o.at(-4)),
                            t && (i.state = 1,
                            r = e.game.tick - 3,
                            o.length = 0)
                        }
                        return !1
                    }
                    return i.arrow.signal === s[(e.game.tick - r) % s.length] ? t++ : (i.state = null,
                    l()),
                    e.setProgress(t / 50),
                    t >= 50
                }
                )));
                const h = i.levelRights.get(e.info.id);
                void 0 !== h && e.playerControls.updatePlayerAccess(h),
                e.initLevel(!0),
                e.showTutorial((e => {
                    const t = new a.UIGameView(e,"AAABAAAAAAADFwAAAAEDEAAgADAAQAACAFAAAwBRAw==");
                    t.setResizeAction(( () => t.game.focusOnBox(-2, 0, 3, 4, .5, 1)))
                }
                ))
            }
            ], [10, e => {
                let t = 0;
                const s = [0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0]
                  , o = [0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0]
                  , r = [0];
                let l = 0;
                const h = () => {
                    t = 0,
                    e.game.updateSpeedLevel = 0,
                    e.restartLevel()
                }
                ;
                e.levelArrows.push(new n.LevelArrow(22,0,10,(t => (t.arrow.signal = s[e.game.tick % s.length],
                !0)))),
                e.game.gameMap.setArrowType(0, 5, 4);
                const c = e.game.gameMap.getArrow(0, 5);
                void 0 !== c && (c.canBeEdited = !1),
                e.levelArrows.push(new n.LevelArrow(23,0,0,(s => {
                    if (e.game.tick > 200 ? h() : e.game.tick > 50 ? e.game.updateSpeedLevel = 2 : e.game.tick > 10 && (e.game.updateSpeedLevel = 1),
                    null === s.state) {
                        if (r.push(s.arrow.signal),
                        r.length > 4) {
                            let t = 1 === r.at(-1);
                            t && (t = 0 === r.at(-2)),
                            t && (t = 0 === r.at(-3)),
                            t && (t = 0 === r.at(-4)),
                            t && (t = 0 === r.at(-5)),
                            t && (s.state = 1,
                            l = e.game.tick - 1,
                            r.length = 0)
                        }
                        return !1
                    }
                    const i = o[(e.game.tick - l) % o.length];
                    return s.arrow.signal === i ? t++ : (s.state = null,
                    h()),
                    e.setProgress(t / 50),
                    t >= 50
                }
                )));
                const d = i.levelRights.get(e.info.id);
                void 0 !== d && e.playerControls.updatePlayerAccess(d),
                e.initLevel(!0),
                e.showTutorial((e => {
                    let t = "AAACAAAAAAAHARcAABAAIAAwAEAAUABgAHAAgACQAJEDogCTAdMA4wAEABQAJAA0AEQAV";
                    t += "ABkAHQAhAAGAJIBDAGyAOIAEADCABMA0gAOAfIAlAALAMMDAwCFAwAAAQADCQARAAcAAgABBBIAAwETAxQDFQMLAAQB";
                    const s = new a.UIGameView(e,"AAACAAAAAAAHARcAABAAIAAwAEAAUABgAHAAgACQAJEDogCTAdMA4wAEABQAJAA0AEQAVABkAHQAhAAGAJIBDAGyAOIAEADCABMA0gAOAfIAlAALAMMDAwCFAwAAAQADCQARAAcAAgABBBIAAwETAxQDFQMLAAQB");
                    s.setResizeAction(( () => s.game.focusOnBox(-1, 2, 6, 5, .5, 1)))
                }
                ))
            }
            ]]),
            h.levelRights = new Map([[0, o.PlayerAccess.makeOnly({
                canSetArrows: !0,
                arrowGroups: [[1]]
            })], [1, o.PlayerAccess.makeOnly({
                canSetArrows: !0,
                arrowGroups: [[1]]
            })], [2, o.PlayerAccess.makeOnly({
                canSetArrows: !0,
                canMove: !0,
                canZoom: !0,
                canRotate: !0,
                canDelete: !0,
                arrowGroups: [[1]]
            })], [3, o.PlayerAccess.makeOnly({
                canSetArrows: !0,
                canMove: !0,
                canZoom: !0,
                canRotate: !0,
                canDelete: !0,
                arrowGroups: [[1]]
            })], [4, o.PlayerAccess.makeOnly({
                canSetArrows: !0,
                canMove: !0,
                canZoom: !0,
                canRotate: !0,
                canDelete: !0,
                arrowGroups: [[1, 5]]
            })], [5, o.PlayerAccess.makeOnly({
                canSetArrows: !0,
                canMove: !0,
                canZoom: !0,
                canRotate: !0,
                canDelete: !0,
                arrowGroups: [[1, 3]]
            })], [6, o.PlayerAccess.makeOnly({
                canSetArrows: !0,
                canMove: !0,
                canZoom: !0,
                canRotate: !0,
                canDelete: !0,
                arrowGroups: [[1, 5]]
            })], [7, o.PlayerAccess.makeOnly({
                canSetArrows: !0,
                canMove: !0,
                canZoom: !0,
                canRotate: !0,
                canDelete: !0,
                arrowGroups: [[1, 4, 5]]
            })], [8, o.PlayerAccess.makeOnly({
                canSetArrows: !0,
                canMove: !0,
                canZoom: !0,
                canRotate: !0,
                canDelete: !0,
                arrowGroups: [[1, 2, 3]]
            })], [9, o.PlayerAccess.makeOnly({
                canSetArrows: !0,
                canMove: !0,
                canZoom: !0,
                canRotate: !0,
                canDelete: !0,
                arrowGroups: [[1, 2, 3]]
            })], [10, o.PlayerAccess.makeOnly({
                canSetArrows: !0,
                canMove: !0,
                canZoom: !0,
                canRotate: !0,
                canDelete: !0,
                arrowGroups: [[1, 2, 3, 5]]
            })]]),
            i.addLevel(0, [1], 15, 7, 5, [[2, -1, 1]]),
            i.addLevel(1, [2], 15, -1, 5, [[2, -1, 1]]),
            i.addLevel(2, [3], 15, -9, 5, [[2, -1, 1]]),
            i.addLevel(3, [4, 5], 15, -17, 5, [[-1, 2, 1], [5, 2, 1]]),
            i.addLevel(4, [6], 0, -17, 5, [[2, -1, 1]]),
            i.addLevel(5, [8], 30, -17, 5, [[2, -1, 1]]),
            i.addLevel(6, [7], 2, -27, 5, [[3, -1, 2]]),
            i.addLevel(7, [10], 8, -36, 5, [[4, -1, 2]]),
            i.addLevel(8, [9], 28, -27, 5, [[1, -1, 2]]),
            i.addLevel(9, [10], 22, -36, 5, [[0, -1, 2]]),
            i.addLevel(10, [], 15, -45, 5, [[2, -1, 2]]),
            i.setPreviousLevels()
        }
        ,
        8804: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.OverlayLevel = void 0;
            const i = s(3278);
            t.OverlayLevel = class {
                constructor(e, t, s) {
                    this.elementOffset = [0, 0],
                    this.click = () => {
                        "locked" !== this.info.state && this.onLevelClick(this.info.id)
                    }
                    ,
                    this.info = e,
                    this.overlayInfo = t,
                    this.info.setCallback((e => this.setState(e))),
                    this.onLevelClick = s,
                    this.element = null,
                    this.upperDiv = null,
                    this.lowerDiv = null,
                    this.textColor = "#000"
                }
                setState(e) {
                    return null === this.element || ("locked" === e ? (this.element.style.backgroundColor = "#ccc",
                    this.element.style.boxShadow = "0px 0px 0px 0.2em #aaa inset") : "unlocked" === e ? (this.element.style.boxShadow = "0px 0px 0px 0.2em #fa5 inset",
                    this.element.style.backgroundColor = "#fec") : "completed" === e && (this.element.style.boxShadow = "0px 0px 0px 0.2em #7cf inset",
                    this.element.style.backgroundColor = "#def")),
                    this
                }
                add(e) {
                    null === this.element && (this.element = document.createElement("div"),
                    this.element.onclick = this.click,
                    e.appendChild(this.element),
                    this.element.className = "overlay-level",
                    this.element.style.backgroundColor = "#ccc",
                    this.element.style.boxShadow = "0px 0px 0px 0.2em #aaa inset",
                    this.element.style.color = this.textColor,
                    this.upperDiv = document.createElement("div"),
                    this.upperDiv.style.paddingRight = "0.2em",
                    this.upperDiv.innerText = `${this.info.id}`,
                    this.element.appendChild(this.upperDiv),
                    this.lowerDiv = document.createElement("div"),
                    this.lowerDiv.style.fontFamily = "Trebuchet MS",
                    this.lowerDiv.style.paddingLeft = "0.3em",
                    this.lowerDiv.style.paddingRight = "0.3em",
                    this.element.appendChild(this.lowerDiv),
                    this.update([0, 0], 80))
                }
                update(e, t) {
                    if (null === this.element || null === this.upperDiv || null === this.lowerDiv)
                        return;
                    const s = .05 * (t /= window.devicePixelRatio)
                      , n = (e[0] / i.CELL_SIZE + this.overlayInfo.x) * t + s + this.elementOffset[0]
                      , o = (e[1] / i.CELL_SIZE + this.overlayInfo.y) * t + s + this.elementOffset[1]
                      , a = this.overlayInfo.width * t - s
                      , r = this.overlayInfo.height * t - s;
                    this.element.style.left = `${n}px`,
                    this.element.style.top = `${o}px`,
                    this.element.style.width = `${a}px`,
                    this.element.style.height = `${r}px`,
                    this.element.style.fontSize = `${t}px`,
                    this.upperDiv.style.fontSize = 2 * t + "px",
                    this.lowerDiv.style.fontSize = .65 * t + "px"
                }
                remove() {
                    null !== this.element && (this.element.remove(),
                    this.element = null)
                }
            }
        }
        ,
        6760: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.OverlayText = void 0;
            const i = s(3278);
            t.OverlayText = class {
                constructor(e, t, s, i, n, o) {
                    this.element = null,
                    this.text = e,
                    this.x = t,
                    this.y = s,
                    this.width = i,
                    this.height = n,
                    this.textSize = o,
                    this.color = "#fec",
                    this.textColor = "#000"
                }
                add(e) {
                    null === this.element && (this.element = document.createElement("div"),
                    this.element.innerText = this.text,
                    e.appendChild(this.element),
                    this.element.style.position = "absolute",
                    this.element.style.backgroundColor = this.color,
                    this.element.style.color = this.textColor,
                    this.element.style.fontFamily = "Trebuchet MS",
                    this.element.style.overflow = "hidden",
                    this.element.style.userSelect = "none",
                    this.update([0, 0], 80))
                }
                update(e, t) {
                    if (null === this.element)
                        return;
                    const s = .05 * (t /= window.devicePixelRatio)
                      , n = (e[0] / i.CELL_SIZE + this.x) * t + s
                      , o = (e[1] / i.CELL_SIZE + this.y) * t + s
                      , a = this.width * t - s
                      , r = this.height * t - s
                      , l = this.textSize * t;
                    this.element.style.left = `${n}px`,
                    this.element.style.top = `${o}px`,
                    this.element.style.width = `${a}px`,
                    this.element.style.height = `${r}px`,
                    this.element.style.fontSize = `${l}px`
                }
                remove() {
                    null !== this.element && (this.element.remove(),
                    this.element = null)
                }
            }
        }
        ,
        6530: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.AccountPage = void 0;
            const i = s(3446)
              , n = s(3602)
              , o = s(2461)
              , a = s(4723);
            class r extends a.Page {
                constructor(e) {
                    super(e);
                    const t = document.createElement("div");
                    t.className = "account-user-name-title",
                    t.innerText = n.PlayerState.userName,
                    this.mainDiv.appendChild(t);
                    const s = document.createElement("div");
                    s.className = "logout-button",
                    s.innerText = i.GameText.LOGOUT.get(),
                    s.onclick = () => o.Routes.logout(),
                    this.mainDiv.appendChild(s)
                }
                getClass() {
                    return "account-page"
                }
            }
            t.AccountPage = r
        }
        ,
        3051: function(e, t, s) {
            var i = this && this.__awaiter || function(e, t, s, i) {
                return new (s || (s = Promise))((function(n, o) {
                    function a(e) {
                        try {
                            l(i.next(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function r(e) {
                        try {
                            l(i.throw(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function l(e) {
                        var t;
                        e.done ? n(e.value) : (t = e.value,
                        t instanceof s ? t : new s((function(e) {
                            e(t)
                        }
                        ))).then(a, r)
                    }
                    l((i = i.apply(e, t || [])).next())
                }
                ))
            }
            ;
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.GamePage = void 0;
            const n = s(3446)
              , o = s(5583)
              , a = s(1154)
              , r = s(8695)
              , l = s(7779)
              , h = s(9303)
              , c = s(403)
              , d = s(8939)
              , u = s(2149)
              , g = s(2461)
              , p = s(2714)
              , m = s(974);
            t.GamePage = class {
                constructor(e) {
                    this.resize = () => {
                        this.game.resize(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio)
                    }
                    ,
                        this.update = () => {
                            this.isDeleted || (this.playerControls.update(),
                                this.game.updateFrame(),
                                this.game.draw(),
                                this.playerOverlay.update(),
                                window.requestAnimationFrame(this.update))
                        }
                    ,
                    this.mapInfo = e,
                    this.isDeleted = !1,
                    this.canvasDiv = document.createElement("div"),
                    document.body.appendChild(this.canvasDiv);
                    const t = document.createElement("canvas");
                    t.className = "cnv",
                    t.width = window.innerWidth * window.devicePixelRatio,
                    t.height = window.innerHeight * window.devicePixelRatio,
                    this.canvasDiv.appendChild(t);
                    const s = t.getContext("webgl", {
                        premultipliedAlpha: !1,
                        preserveDrawingBuffer: !0
                    });
                    this.game = new o.Game(s,t.width,t.height),
                    this.history = new a.GameHistory,
                    this.history.pushState(new l.PlayerMapAction),
                    this.playerUI = new c.PlayerUI(this.mapInfo),
                    this.playerControls = new r.PlayerControls(t,this.game,this.playerUI,this.history),
                    this.playerControls.updatePlayerAccess({}),
                    this.playerOverlay = new h.PlayerOverlay(this.canvasDiv,this.game);
                    try {
                        const t = window.atob(e.data).split("").map((e => e.charCodeAt(0)));
                        (0,
                        u.load)(this.game.gameMap, t)
                    } catch (e) {
                        console.error("Failed to load the map", e)
                    }
                    this.saveInterval = window.setInterval(( () => this.autosave()), 3e4),
                    window.requestAnimationFrame(this.update),
                    window.addEventListener("resize", this.resize)
                }
                dispose() {
                    return i(this, void 0, void 0, (function*() {
                        this.isDeleted = !0,
                        window.clearInterval(this.saveInterval);
                        const e = (0,
                        p.save)(this.game.gameMap);
                        yield this.saveMap(e),
                        window.removeEventListener("resize", this.resize),
                        this.playerControls.dispose(),
                        this.playerUI.dispose(),
                        this.playerOverlay.dispose(),
                        this.game.dispose(),
                        document.body.removeChild(this.canvasDiv)
                    }
                    ))
                }
                autosave() {
                    return i(this, void 0, void 0, (function*() {
                        if (this.isDeleted)
                            return;
                        this.playerUI.showAutoSaveMessage(n.GameText.AUTOSAVING.get());
                        const e = (0,
                        p.save)(this.game.gameMap);
                        200 === (yield this.saveMap(e)) ? this.playerUI.showAutoSaveMessage(n.GameText.SAVED.get()) : this.playerUI.showAutoSaveMessage(n.GameText.UNABLE_TO_SAVE.get(), !0),
                        this.playerUI.hideAutoSaveMessage()
                    }
                    ))
                }
                saveMap(e) {
                    return i(this, void 0, void 0, (function*() {
                        if (void 0 === this.mapInfo)
                            return -1;
                        const t = m.Utils.arrayBufferToBase64(e);
                        if (this.mapInfo.data === t)
                            return 200;
                        yield d.ArrowsDB.write("mapCache", {
                            id: this.mapInfo.id,
                            version: this.mapInfo.version + 1,
                            data: t
                        });
                        const s = yield g.Routes.saveMap(this.mapInfo.id, t);
                        return 200 === s && (this.mapInfo.version++,
                        this.mapInfo.data = t),
                        s
                    }
                    ))
                }
            }
        },
        8562: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.GuidePage = void 0;
            const i = s(2413)
              , n = s(332)
              , o = s(4723);
            class a extends o.Page {
                constructor(e) {
                    super(e);
                    const t = i.ArrowDescriptions.getArrowsCount();
                    for (let e = 1; e < t; e++)
                        this.addArrowInfo(e)
                }
                getClass() {
                    return "guide-page"
                }
                addArrowInfo(e) {
                    22 !== e && 23 !== e && new n.UIArrowInfo(this.mainDiv,e)
                }
            }
            t.GuidePage = a
        }
        ,
        2543: function(e, t, s) {
            var i = this && this.__awaiter || function(e, t, s, i) {
                return new (s || (s = Promise))((function(n, o) {
                    function a(e) {
                        try {
                            l(i.next(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function r(e) {
                        try {
                            l(i.throw(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function l(e) {
                        var t;
                        e.done ? n(e.value) : (t = e.value,
                        t instanceof s ? t : new s((function(e) {
                            e(t)
                        }
                        ))).then(a, r)
                    }
                    l((i = i.apply(e, t || [])).next())
                }
                ))
            }
            ;
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.LevelPage = void 0;
            const n = s(2413)
              , o = s(3446)
              , a = s(3295)
              , r = s(5583)
              , l = s(8246)
              , h = s(8695)
              , c = s(9303)
              , d = s(258)
              , u = s(403)
              , g = s(1402)
              , p = s(2461);
            t.LevelPage = class {
                constructor(e) {
                    this.levelRights = new l.PlayerAccess,
                    this.resize = () => {
                        this.game.resize(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio)
                    }
                    ,
                    this.runLevel = () => {
                        null !== this.playButton && (this.game.playing = !0,
                        this.playButton.setVisibility(!1),
                        this.levelRights = this.playerControls.getPlayerAccess(),
                        this.playerControls.updatePlayerAccess(l.PlayerAccess.makeLevelSpectator()),
                        this.levelTestHolder.style.visibility = "visible",
                        this.levelTesting = !0)
                    }
                    ,
                    this.update = () => {
                        this.isDeleted || (this.playerControls.update(),
                        this.game.updateFrame(( () => this.updateLevelArrows())),
                        this.game.draw(),
                        this.playerOverlay.update(),
                        this.levelTesting && (this.levelTestBar.style.width = this.game.tick / 2 + "%"),
                        window.requestAnimationFrame(this.update))
                    }
                    ,
                    this.replaceInlineArrows = e => {
                        const t = e.match(/@(\d+)/);
                        if (null === t || 0 === t.length)
                            return "";
                        const s = t[1]
                          , i = e.match(/\((.+)\)/);
                        let o = n.ArrowDescriptions.getArrowName(Number(s));
                        return null !== i && i.length > 0 && (o = i[1]),
                        `<span class="inline-arrow"><img class="inline-icon" src="res/sprites/arrow${s}.png">${o}</span>`
                    }
                    ,
                    this.replaceInlineKeys = e => `<span class="inline-key">${e = e.replace("#", "").replace("(", "").replace(")", "")}</span>`,
                    this.replaceInlineSpoilers = e => {
                        const t = e.indexOf("$(");
                        let s = -1
                          , i = 1;
                        for (let n = t + 2; n < e.length; n++)
                            if ("(" === e[n] ? i++ : ")" === e[n] && i--,
                            0 === i) {
                                s = n + 1;
                                break
                            }
                        if (-1 === s)
                            return e;
                        const n = `<span class="inline-spoiler" onclick="this.firstChild.className='inline-spoiler-caption-opened';"><span class="inline-spoiler-caption">${o.GameText.SHOW_SPOILER.get()}</span><span class="inline-spoiler-text">${e.substring(t + 2, s - 1)}</span></span>`;
                        return e.substring(0, t) + n + e.substring(s)
                    }
                    ,
                    this.info = e,
                    this.levelArrows = [],
                    this.isDeleted = !1,
                    this.canvasDiv = document.createElement("div"),
                    this.playButton = null,
                    this.sidePanel = null,
                    this.tutorialDataStep = 0,
                    this.tutorialData = [],
                    this.levelTesting = !1,
                    document.body.appendChild(this.canvasDiv);
                    const t = document.createElement("canvas");
                    t.className = "cnv",
                    t.width = window.innerWidth * window.devicePixelRatio,
                    t.height = window.innerHeight * window.devicePixelRatio,
                    this.canvasDiv.appendChild(t);
                    const s = t.getContext("webgl", {
                        premultipliedAlpha: !1,
                        preserveDrawingBuffer: !0
                    });
                    this.game = new r.Game(s,t.width,t.height),
                    this.playerUI = new u.PlayerUI,
                    this.playerControls = new h.PlayerControls(t,this.game,this.playerUI),
                    this.playerOverlay = new c.PlayerOverlay(this.canvasDiv,this.game),
                    this.scoreHolder = document.createElement("div"),
                    this.scoreHolder.className = "score-holder",
                    document.body.appendChild(this.scoreHolder),
                    this.prograssBar = document.createElement("div"),
                    this.prograssBar.className = "score-progress",
                    this.scoreHolder.appendChild(this.prograssBar),
                    this.levelTestHolder = document.createElement("div"),
                    this.levelTestHolder.className = "level-test-holder",
                    document.body.appendChild(this.levelTestHolder),
                    this.levelTestHolder.style.visibility = "hidden";
                    const i = document.createElement("div");
                    i.className = "level-test-title",
                    i.innerText = o.GameText.LEVEL_TESTING.get(),
                    this.levelTestHolder.appendChild(i),
                    this.levelTestBar = document.createElement("div"),
                    this.levelTestBar.className = "level-test-bar",
                    this.levelTestHolder.appendChild(this.levelTestBar),
                    window.requestAnimationFrame(this.update),
                    window.addEventListener("resize", this.resize),
                    this.game.focusOnBox(0, 0, 1, 12, 3, 1)
                }
                showTutorial(e) {
                    return i(this, void 0, void 0, (function*() {
                        const t = yield fetch(`/res/tutorials/${a.LangSettings.getLanguage()}/tutorial-${this.info.id}.html?v=${d.PlayerSettings.version}`);
                        if (!t.ok)
                            return;
                        const s = document.createElement("div");
                        this.sidePanel = s,
                        s.className = "level-side-panel",
                        s.onwheel = e => e.stopPropagation(),
                        s.onmousemove = e => e.stopPropagation(),
                        document.body.appendChild(s);
                        const i = yield t.text();
                        this.tutorialData = i.split("---"),
                        s.innerHTML = `<h1>${o.GameText.LEVEL.get()} ${this.info.id}</h1>`,
                        this.nextTutorialStep(),
                        void 0 !== e && e(s)
                    }
                    ))
                }
                nextTutorialStep() {
                    if (null === this.sidePanel)
                        return;
                    if (this.tutorialDataStep >= this.tutorialData.length)
                        return;
                    let e = this.tutorialData[this.tutorialDataStep];
                    e = this.replaceInlineSpoilers(e),
                    e = e.replace(/(@(\d+)(\(.+?\)))|@(\d+)/gm, this.replaceInlineArrows),
                    e = e.replace(/(#(\w+))|(#\(.+?\))/gm, this.replaceInlineKeys),
                    this.sidePanel.innerHTML += e,
                    this.tutorialDataStep++
                }
                dispose() {
                    this.isDeleted = !0,
                    window.removeEventListener("resize", this.resize),
                    this.playerControls.dispose(),
                    this.playerUI.dispose(),
                    this.playerOverlay.dispose(),
                    this.game.dispose(),
                    document.body.removeChild(this.scoreHolder),
                    document.body.removeChild(this.canvasDiv),
                    null !== this.playButton && this.playButton.remove(),
                    null !== this.sidePanel && document.body.removeChild(this.sidePanel)
                }
                setProgress(e) {
                    this.prograssBar.style.height = 100 * e + "%"
                }
                initLevel(e=!1) {
                    this.levelArrows.forEach((e => {
                        this.game.gameMap.setLevelArrow(e)
                    }
                    )),
                    e && (this.game.playing = !1,
                    this.playButton = new g.UILevelPlayButton(document.body,this.runLevel))
                }
                restartLevel() {
                    this.game.playing = !1,
                    null !== this.playButton && this.playButton.setVisibility(!0),
                    this.playerControls.updatePlayerAccess(this.levelRights),
                    this.game.clearSignals(),
                    this.game.screenUpdated = !0,
                    this.game.tick = -1,
                    this.levelTestHolder.style.visibility = "hidden",
                    this.levelTesting = !1
                }
                updateLevelArrows() {
                    const e = new Array(this.levelArrows.length);
                    for (let t = 0; t < this.levelArrows.length; t++) {
                        const s = this.levelArrows[t];
                        s.updateLevel(),
                        e[t] = s.isValid()
                    }
                    e.length > 0 && e.every((e => e)) && this.complete()
                }
                complete() {
                    return i(this, void 0, void 0, (function*() {
                        this.isDeleted || (this.dispose(),
                        "unlocked" === this.info.state ? (yield p.Routes.completeLevel(this.info.id),
                        window.location.href = "/levels") : window.location.href = "/levels")
                    }
                    ))
                }
            }
        },
        606: function(e, t, s) {
            var i = this && this.__awaiter || function(e, t, s, i) {
                return new (s || (s = Promise))((function(n, o) {
                    function a(e) {
                        try {
                            l(i.next(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function r(e) {
                        try {
                            l(i.throw(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function l(e) {
                        var t;
                        e.done ? n(e.value) : (t = e.value,
                        t instanceof s ? t : new s((function(e) {
                            e(t)
                        }
                        ))).then(a, r)
                    }
                    l((i = i.apply(e, t || [])).next())
                }
                ))
            }
            ;
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.LevelsPage = void 0;
            const n = s(3278)
              , o = s(9010)
              , a = s(304)
              , r = s(5164)
              , l = s(8804)
              , h = s(5583)
              , c = s(9303)
              , d = s(3602)
              , u = s(2461)
              , g = s(4723);
            class p extends g.Page {
                constructor(e, t) {
                    super(t),
                    this.resize = () => {
                        this.game.resize(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio),
                        this.playerOverlay.resize()
                    }
                    ,
                    this.update = () => {
                        this.isDeleted || (this.levelsControls.update(),
                        this.game.draw(),
                        this.playerOverlay.update(),
                        window.requestAnimationFrame(this.update))
                    }
                    ,
                    this.onLevelClick = e;
                    const s = document.createElement("canvas");
                    s.className = "cnv",
                    null != t || (t = document.body);
                    const i = t.getBoundingClientRect();
                    s.width = i.width * window.devicePixelRatio,
                    s.height = i.height * window.devicePixelRatio,
                    this.mainDiv.appendChild(s);
                    const n = s.getContext("webgl", {
                        premultipliedAlpha: !1,
                        preserveDrawingBuffer: !0
                    });
                    this.game = new h.Game(n,s.width,s.height),
                    this.levelsUI = new r.LevelsUI,
                    this.levelsControls = new a.LevelsControls(s,this.game),
                    this.playerOverlay = new c.PlayerOverlay(this.mainDiv,this.game),
                    this.levelOverlays = new Map,
                    this.makeMap().then(( () => {
                        window.requestAnimationFrame(this.update),
                        window.addEventListener("resize", this.resize)
                    }
                    ))
                }
                getClass() {
                    return "levels-page"
                }
                dispose() {
                    window.removeEventListener("resize", this.resize),
                    this.levelsControls.dispose(),
                    this.levelsUI.dispose(),
                    this.playerOverlay.dispose(),
                    this.game.dispose(),
                    super.dispose()
                }
                makeMap() {
                    return i(this, void 0, void 0, (function*() {
                        const e = yield u.Routes.getLevels();
                        d.PlayerState.completedLevels = e,
                        this.makeRedArrows(17, 6, 17, 4, !0),
                        this.makeRedArrows(17, -2, 17, -4, !0),
                        this.makeRedArrows(17, -10, 17, -12, !0),
                        this.makeRedArrows(14, -15, 5, -15, !1),
                        this.makeRedArrows(20, -15, 29, -15, !1),
                        this.makeObliqueArrows(2, -18, 2, !1, !1),
                        this.makeObliqueArrows(5, -28, 2, !1, !0),
                        this.makeObliqueArrows(32, -18, 2, !0, !1),
                        this.makeObliqueArrows(12, -37, 2, !1, !0),
                        this.makeObliqueArrows(29, -28, 2, !0, !0),
                        this.makeObliqueArrows(22, -37, 2, !0, !0),
                        o.Levels.levels.forEach((e => {
                            this.addLevelOverlay(e.id)
                        }
                        )),
                        o.Levels.unlockLevel(0),
                        e.forEach((e => {
                            o.Levels.completeLevel(e)
                        }
                        )),
                        this.game.setScale(60, [0, 0]),
                        this.focusOnLevel(),
                        this.updateMap()
                    }
                    ))
                }
                focusOnLevel() {
                    for (const e of this.levelOverlays) {
                        const t = e[1];
                        if ("unlocked" === t.info.state) {
                            const e = (t.overlayInfo.x + t.overlayInfo.width / 2) * n.CELL_SIZE + n.CELL_SIZE / 2
                              , s = (t.overlayInfo.y + t.overlayInfo.height / 2) * n.CELL_SIZE + n.CELL_SIZE / 2;
                            return this.game.offset[0] = -e + this.game.width * n.CELL_SIZE / this.game.scale / 2,
                            void (this.game.offset[1] = -s + this.game.height * n.CELL_SIZE / this.game.scale / 2)
                        }
                    }
                }
                addLevelOverlay(e) {
                    const t = o.Levels.levels.get(e)
                      , s = o.Levels.levelOverlayInfos.get(e);
                    if (void 0 === t)
                        throw new Error(`Level with id ${e} not found`);
                    if (void 0 === s)
                        throw new Error(`Level overlay with id ${e} not found`);
                    const i = new l.OverlayLevel(t,s,this.onLevelClick);
                    return this.playerOverlay.addLevel(i),
                    this.levelOverlays.set(t.id, i),
                    i
                }
                makeRedArrows(e, t, s, i, n) {
                    const o = s - e
                      , a = i - t
                      , r = Math.sign(o)
                      , l = Math.sign(a);
                    let h = e
                      , c = t;
                    if (n) {
                        this.game.gameMap.setArrowType(h, c, 1);
                        for (let e = 1; e <= Math.abs(a); e++)
                            c += l,
                            this.game.gameMap.setArrowType(h, c, 1),
                            e === Math.abs(a) && Math.abs(o) > 0 && (r > 0 ? this.game.gameMap.setArrowRotation(h, c, 1) : this.game.gameMap.setArrowRotation(h, c, 3));
                        for (let e = 1; e <= Math.abs(o); e++)
                            h += r,
                            this.game.gameMap.setArrowType(h, c, 1),
                            r > 0 ? this.game.gameMap.setArrowRotation(h, c, 1) : this.game.gameMap.setArrowRotation(h, c, 3)
                    } else {
                        this.game.gameMap.setArrowType(h, c, 1),
                        r > 0 ? this.game.gameMap.setArrowRotation(h, c, 1) : this.game.gameMap.setArrowRotation(h, c, 3);
                        for (let e = 1; e <= Math.abs(o); e++)
                            h += r,
                            this.game.gameMap.setArrowType(h, c, 1),
                            e === Math.abs(o) && Math.abs(a) > 0 || (r > 0 ? this.game.gameMap.setArrowRotation(h, c, 1) : this.game.gameMap.setArrowRotation(h, c, 3));
                        for (let e = 1; e <= Math.abs(a); e++)
                            c += l,
                            this.game.gameMap.setArrowType(h, c, 1)
                    }
                }
                makeObliqueArrows(e, t, s, i, n) {
                    let o = e
                      , a = t
                      , r = 1;
                    n && (r = 11);
                    for (let e = 0; e < 2 * s + 1; e++) {
                        this.game.gameMap.setArrowType(o, a, r);
                        let e = 0
                          , t = -1;
                        11 === r && (e = 1),
                        i && (this.game.gameMap.setArrowFlipped(o, a, !0),
                        e = -e),
                        o += e,
                        a += t,
                        r = 1 === r ? 11 : 1
                    }
                }
                makeBlueArrows(e, t, s) {
                    let i = e
                      , n = t;
                    for (let e = 0; e < s; e++)
                        this.game.gameMap.setArrowType(i, n, 10),
                        n -= 2
                }
                updateMap() {
                    for (let e = 0; e < 15; e++) {
                        this.game.updateFrame();
                        for (const e of this.levelOverlays) {
                            const t = e[1];
                            "completed" === t.info.state && t.overlayInfo.outputs.forEach((e => {
                                this.game.gameMap.setArrowSignal(t.overlayInfo.x + e[0], t.overlayInfo.y + e[1], e[2])
                            }
                            ))
                        }
                    }
                }
            }
            t.LevelsPage = p
        },
        8135: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.LoginPage = void 0;
            const i = s(3295)
              , n = s(3446)
              , o = s(5583)
              , a = s(2461)
              , r = s(3278)
              , l = s(3737)
              , h = s(3602)
              , c = s(258);
            t.LoginPage = class {
                constructor(e, t, s) {
                    this.CELL_SIZE = 160,
                    this.LEFT_PANEL_WIDTH = .4,
                    this.resize = () => {
                        const e = window.innerWidth * window.devicePixelRatio * this.LEFT_PANEL_WIDTH
                          , t = Math.min(Math.floor(e / this.CELL_SIZE), r.CHUNK_SIZE)
                          , s = .025 * this.CELL_SIZE * window.devicePixelRatio;
                        this.canvas.style.width = (t * this.CELL_SIZE + s) / window.devicePixelRatio + "px",
                        this.game.resize(t * this.CELL_SIZE + s, window.innerHeight * window.devicePixelRatio),
                        this.game.setScale(this.CELL_SIZE, [0, 0])
                    }
                    ,
                    this.update = () => {
                        if (this.isDeleted)
                            return;
                        this.game.screenUpdated = !0,
                        this.game.updateFrame(),
                        this.game.draw(),
                        this.game.offset[1] = this.game.frame;
                        const e = -Math.floor(this.game.offset[1] / 256);
                        this.setChunk(~~(e / r.CHUNK_SIZE) - 1);
                        const t = e + ~~(this.game.height / this.CELL_SIZE) + 1 * r.CHUNK_SIZE + 1;
                        this.deleteChunk(1 + ~~(t / r.CHUNK_SIZE)),
                        window.requestAnimationFrame(this.update)
                    }
                    ,
                    this.isDeleted = !1,
                    this.canvas = document.createElement("canvas"),
                    this.canvas.id = "login-cnv",
                    document.body.appendChild(this.canvas),
                    this.mainDiv = document.createElement("div"),
                    this.mainDiv.id = "login-main-div",
                    document.body.appendChild(this.mainDiv);
                    const a = [];
                    for (let e = i.LangSettings.languages.length - 1; e >= 0; e--) {
                        const s = i.LangSettings.languages[e];
                        if (i.LangSettings.getLanguage() === s)
                            continue;
                        const n = document.createElement("div");
                        n.className = "login-lang",
                        n.innerText = i.LangSettings.languageNames[e],
                        a.push(n),
                        this.mainDiv.appendChild(n);
                        const o = "true" === localStorage.getItem("cookies");
                        n.addEventListener("click", ( () => {
                            i.LangSettings.setLanguage(l.LangUtils.getLanguageFromString(s)),
                            o && localStorage.setItem("lang", s),
                            t()
                        }
                        ))
                    }
                    const h = document.createElement("h1")
                      , d = document.createElement("div");
                    h.id = "login-caption",
                    d.id = "login-text",
                    h.innerText = n.GameText.ARROWS_TITLE.get(),
                    d.innerText = n.GameText.LOGIN_TEXT.get(),
                    this.mainDiv.appendChild(h),
                    this.mainDiv.appendChild(d);
                    const u = document.createElement("div");
                    u.className = "policy-links-div",
                    this.mainDiv.appendChild(u);
                    const g = document.createElement("a");
                    g.className = "policy-link",
                    g.innerText = n.GameText.PRIVACY_POLICY.get(),
                    g.href = "/doc/privacy.html",
                    g.target = "_blank",
                    u.appendChild(g);
                    const p = document.createElement("a");
                    p.className = "policy-link",
                    p.innerText = n.GameText.TERMS_AND_CONDITIONS.get(),
                    p.href = "/doc/terms.html",
                    p.target = "_blank",
                    u.appendChild(p);
                    const m = document.createElement("div");
                    m.className = "version-div",
                    m.innerText = `v${c.PlayerSettings.version.replace(/_/g, ".")}`,
                    u.appendChild(m),
                    this.addStartButton(s, e);
                    const v = this.canvas.getContext("webgl", {
                        premultipliedAlpha: !1,
                        preserveDrawingBuffer: !0
                    });
                    this.game = new o.Game(v,this.canvas.width,this.canvas.height),
                    window.addEventListener("resize", this.resize),
                    this.resize(),
                    this.setChunk(1),
                    this.setChunk(0),
                    this.setChunk(-1),
                    this.setChunk(-2),
                    window.requestAnimationFrame(this.update)
                }
                dispose() {
                    this.isDeleted = !0,
                    window.removeEventListener("resize", this.resize),
                    this.game.dispose(),
                    document.body.removeChild(this.canvas),
                    document.body.removeChild(this.mainDiv)
                }
                addStartButton(e, t) {
                    if ("true" === localStorage.getItem("cookies"))
                        return void a.Routes.checkUser((t => {
                            h.PlayerState.userName = t;
                            const s = this.makeGoToGameButton();
                            this.mainDiv.appendChild(s),
                            s.addEventListener("click", e)
                        }
                        ), ( () => {
                            const e = this.makeLoginWithGoogleButton();
                            this.mainDiv.appendChild(e),
                            e.addEventListener("click", t)
                        }
                        ));
                    const s = document.createElement("div");
                    s.className = "login-cookies-div",
                    this.mainDiv.appendChild(s);
                    const o = document.createElement("div");
                    o.className = "login-cookies-title",
                    o.innerText = n.GameText.COOKIES_TITLE.get(),
                    s.appendChild(o);
                    const r = document.createElement("div");
                    r.className = "login-cookies-text",
                    r.innerText = n.GameText.COOKIES_TEXT.get(),
                    s.appendChild(r);
                    const l = document.createElement("div");
                    l.className = "login-cookies-button",
                    l.innerText = n.GameText.ACCEPT.get(),
                    l.addEventListener("click", ( () => {
                        localStorage.setItem("cookies", "true"),
                        this.mainDiv.removeChild(s),
                        this.addStartButton(e, t),
                        localStorage.setItem("lang", i.LangSettings.getLanguage())
                    }
                    )),
                    s.appendChild(l)
                }
                makeGoToGameButton() {
                    const e = document.createElement("div");
                    return e.id = "login-btn",
                    e.innerText = n.GameText.START_GAME.get(),
                    e
                }
                makeLoginWithGoogleButton() {
                    const e = document.createElement("div");
                    e.className = "google-btn";
                    const t = document.createElement("div");
                    t.className = "google-icon-wrapper",
                    e.appendChild(t);
                    const s = document.createElement("img");
                    s.className = "google-icon-svg",
                    s.src = "/res/icons/icon_google.svg",
                    t.appendChild(s);
                    const i = document.createElement("p");
                    return i.className = "google-btn-text",
                    i.innerText = n.GameText.SIGN_IN_WITH_GOOGLE.get(),
                    e.appendChild(i),
                    e
                }
                setChunk(e) {
                    if (void 0 !== this.game.gameMap.getChunk(0, e))
                        return;
                    const t = this.game.gameMap.getOrCreateChunk(0, e);
                    for (let s = 0; s < r.CHUNK_SIZE; s++)
                        for (let i = 0; i < r.CHUNK_SIZE; i++) {
                            const n = t.getArrow(s, i)
                              , o = s ^ i + Math.abs(e + 2) * r.CHUNK_SIZE;
                            n.type = Math.floor(o % 20)
                        }
                }
                deleteChunk(e) {
                    const t = this.game.gameMap.getChunk(0, e);
                    void 0 !== t && (t.clear(),
                    this.game.gameMap.clearChunkIfEmpty(t))
                }
            }
        }
        ,
        953: function(e, t, s) {
            var i = this && this.__awaiter || function(e, t, s, i) {
                return new (s || (s = Promise))((function(n, o) {
                    function a(e) {
                        try {
                            l(i.next(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function r(e) {
                        try {
                            l(i.throw(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function l(e) {
                        var t;
                        e.done ? n(e.value) : (t = e.value,
                        t instanceof s ? t : new s((function(e) {
                            e(t)
                        }
                        ))).then(a, r)
                    }
                    l((i = i.apply(e, t || [])).next())
                }
                ))
            }
            ;
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.MapsPage = void 0;
            const n = s(3446)
              , o = s(1418)
              , a = s(9676)
              , r = s(8939)
              , l = s(2461)
              , h = s(4723);
            class c extends h.Page {
                constructor(e, t) {
                    super(t),
                    this.addNewMapButton(this.mainDiv, e),
                    this.loadMaps(this.mainDiv, e)
                }
                getClass() {
                    return "maps-page"
                }
                addNewMapButton(e, t) {
                    new o.UIMapsMenuItem(e,n.GameText.NEW_MAP.get(),( () => {
                        l.Routes.createMap((e => {
                            t(e)
                        }
                        ))
                    }
                    ))
                }
                loadMaps(e, t) {
                    return i(this, void 0, void 0, (function*() {
                        const s = yield l.Routes.getMapsInfo()
                          , i = [];
                        for (let e = 0; e < s.length; e++) {
                            const t = s[e];
                            i.push(this.getCachedMapData(t.id, t.version))
                        }
                        const n = yield Promise.all(i)
                          , o = [];
                        for (let i = 0; i < s.length; i++) {
                            const r = s[i]
                              , l = n[i];
                            void 0 !== l ? (r.data = l,
                            new a.UISavedItem(e,r,t)) : o.push(r.id)
                        }
                        const r = yield l.Routes.getMaps(o);
                        for (let s = 0; s < r.length; s++) {
                            const i = r[s];
                            this.cacheMapData(i),
                            new a.UISavedItem(e,i,t)
                        }
                    }
                    ))
                }
                getCachedMapData(e, t) {
                    return i(this, void 0, void 0, (function*() {
                        const s = yield r.ArrowsDB.read("mapCache", e);
                        if (void 0 !== s && "data"in s && "version"in s && s.version === t && void 0 !== s.data && "string" == typeof s.data)
                            return s.data
                    }
                    ))
                }
                cacheMapData(e) {
                    return i(this, void 0, void 0, (function*() {
                        yield r.ArrowsDB.write("mapCache", {
                            id: e.id,
                            version: e.version,
                            data: e.data
                        })
                    }
                    ))
                }
            }
            t.MapsPage = c
        },
        4820: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.MenuPage = void 0;
            const i = s(3446)
              , n = s(3602);
            t.MenuPage = class {
                constructor(e, t) {
                    this.categories = new Map([["account", [i.GameText.ACCOUNT.get(), "res/icons/icon-user.svg", null]], ["levels", [i.GameText.LEVELS.get(), "res/icons/icon-levels.svg", null]], ["maps", [i.GameText.MAPS.get(), "res/icons/icon-maps.svg", null]], ["guide", [i.GameText.GUIDE.get(), "res/icons/icon-guide.svg", null]], ["settings", [i.GameText.SETTINGS.get(), "res/icons/icon-settings.svg", null]], ["back", [i.GameText.MENU_BACK.get(), "res/icons/menu-back-icon.svg", null]]]),
                    this.action = t,
                    this.page = null,
                    this.mainDiv = document.createElement("div"),
                    document.body.appendChild(this.mainDiv),
                    this.mainDiv.id = "menu-page-main-div",
                    this.sideBar = document.createElement("div"),
                    this.mainDiv.appendChild(this.sideBar),
                    this.sideBar.id = "menu-page-side-bar",
                    this.content = document.createElement("div"),
                    this.mainDiv.appendChild(this.content),
                    this.content.id = "menu-page-content";
                    for (const e of this.categories)
                        this.addMenuItem(e[0]);
                    this.selectedCategory = e,
                    this.updateSelectedCategory()
                }
                setCategory(e) {
                    this.selectedCategory = e,
                    this.updateSelectedCategory()
                }
                getContent() {
                    return this.content
                }
                dispose() {
                    this.mainDiv.remove()
                }
                addMenuItem(e) {
                    this.selectedCategory = e;
                    const t = this.categories.get(e);
                    if (void 0 === t)
                        return;
                    const s = t[0]
                      , o = t[1]
                      , a = document.createElement("div");
                    t[2] = a,
                    a.className = "side-menu-element",
                    this.sideBar.appendChild(a);
                    const r = document.createElement("img");
                    r.className = "side-menu-icon",
                    r.src = o,
                    r.ondragstart = () => !1,
                    a.appendChild(r);
                    const l = document.createElement("div");
                    if (l.className = "side-menu-title",
                    l.innerText = s,
                    a.appendChild(l),
                    "maps" === e && !n.PlayerState.completedLevels.includes(10)) {
                        const e = document.createElement("div");
                        r.style.opacity = "0.5",
                        l.style.opacity = "0.5",
                        e.className = "tooltip-holder",
                        e.style.visibility = "hidden",
                        a.appendChild(e);
                        const t = document.createElement("div");
                        t.className = "side-menu-locked-tooltip",
                        t.innerText = i.GameText.MAPS_10_LVL.get(),
                        e.appendChild(t),
                        a.onmouseenter = () => {
                            e.style.visibility = "visible"
                        }
                        ,
                        a.onmouseleave = () => {
                            e.style.visibility = "hidden"
                        }
                    }
                    a.onclick = () => {
                        this.selectedCategory !== e && ("maps" !== e || n.PlayerState.completedLevels.includes(10)) && ("back" === e && (window.location.href = "/login"),
                        this.selectedCategory = e,
                        this.updateSelectedCategory(),
                        this.action(this.selectedCategory))
                    }
                }
                updateSelectedCategory() {
                    for (const e of this.categories) {
                        const t = e[1][2];
                        null !== t && (e[0] === this.selectedCategory ? t.classList.add("side-menu-element-selected") : t.classList.remove("side-menu-element-selected"))
                    }
                }
            }
        }
        ,
        6537: function(e, t, s) {
            var i = this && this.__awaiter || function(e, t, s, i) {
                return new (s || (s = Promise))((function(n, o) {
                    function a(e) {
                        try {
                            l(i.next(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function r(e) {
                        try {
                            l(i.throw(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function l(e) {
                        var t;
                        e.done ? n(e.value) : (t = e.value,
                        t instanceof s ? t : new s((function(e) {
                            e(t)
                        }
                        ))).then(a, r)
                    }
                    l((i = i.apply(e, t || [])).next())
                }
                ))
            }
            ;
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.NameChangePage = void 0;
            const n = s(3446)
              , o = s(2461)
              , a = s(4723);
            class r extends a.Page {
                constructor(e) {
                    super(e),
                    this.acceptCallback = e => i(this, void 0, void 0, (function*() {
                        return e.length < 3 ? n.GameText.NAME_ERROR_TOO_SHORT.get() : e.includes("  ") ? n.GameText.NAME_ERROR_SPACES_COUNT.get() : e.includes("__") ? n.GameText.NAME_ERROR_UNDERSCORES_COUNT.get() : " " === e.charAt(0) || " " === e.at(-1) ? n.GameText.NAME_ERROR_SPACE.get() : e.charAt(0).match(/[0-9]/) ? n.GameText.NAME_ERROR_CANNOT_START_WITH_DIGIT.get() : e.match(/^[A-Za-z0-9_\s]+$/) ? (yield o.Routes.setName(e)) ? (window.location.href = "/maps",
                        "") : n.GameText.NAME_ERROR_EXIST_OR_UNAVAILABLE.get() : n.GameText.NAME_ERROR_CHARS.get()
                    }
                    ));
                    const t = document.createElement("div");
                    t.className = "name-change-center-div",
                    this.mainDiv.appendChild(t);
                    const s = document.createElement("div");
                    s.className = "name-change-title",
                    s.innerText = n.GameText.SET_NAME.get(),
                    t.appendChild(s);
                    const a = document.createElement("input");
                    a.className = "name-change-input",
                    a.type = "text",
                    a.maxLength = 20,
                    a.placeholder = n.GameText.NAME.get(),
                    t.appendChild(a);
                    const r = document.createElement("div");
                    r.className = "name-change-message",
                    t.appendChild(r);
                    const l = document.createElement("div");
                    l.className = "name-change-button-div",
                    t.appendChild(l);
                    const h = document.createElement("div");
                    h.className = "logout-button",
                    h.innerText = n.GameText.CANCEL.get(),
                    h.onclick = () => o.Routes.logout(),
                    l.appendChild(h);
                    const c = document.createElement("div");
                    c.className = "accept-button",
                    c.innerText = n.GameText.ACCEPT.get(),
                    c.onclick = () => i(this, void 0, void 0, (function*() {
                        const e = a.value;
                        r.innerText = yield this.acceptCallback(e)
                    }
                    )),
                    l.appendChild(c)
                }
                getClass() {
                    return "name-change-page"
                }
            }
            t.NameChangePage = r
        },
        1494: function(e, t, s) {
            var i = this && this.__awaiter || function(e, t, s, i) {
                return new (s || (s = Promise))((function(n, o) {
                    function a(e) {
                        try {
                            l(i.next(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function r(e) {
                        try {
                            l(i.throw(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function l(e) {
                        var t;
                        e.done ? n(e.value) : (t = e.value,
                        t instanceof s ? t : new s((function(e) {
                            e(t)
                        }
                        ))).then(a, r)
                    }
                    l((i = i.apply(e, t || [])).next())
                }
                ))
            }
            ;
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.Navigation = void 0;
            const n = s(3446)
              , o = s(3295)
              , a = s(3737)
              , r = s(9010)
              , l = s(3602)
              , h = s(7755)
              , c = s(2461)
              , d = s(6530)
              , u = s(8562)
              , g = s(3051)
              , p = s(2543)
              , m = s(606)
              , v = s(8135)
              , w = s(953)
              , f = s(4820)
              , A = s(6537)
              , y = s(2637)
              , C = s(4913);
            class S {
                constructor() {
                    this.loginPage = null,
                    this.gamePage = null,
                    this.levelPage = null,
                    this.nameChangePage = null,
                    this.menuPage = null,
                    this.accountPage = null,
                    this.mapsPage = null,
                    this.levelsPage = null,
                    this.guidePage = null,
                    this.settingsPage = null,
                    this.performancePage = null,
                    this.startGameAction = () => i(this, void 0, void 0, (function*() {
                        if (yield c.Routes.checkNameChange())
                            return void this.goToNameChange("go");
                        const e = yield c.Routes.getLevels();
                        l.PlayerState.completedLevels = e,
                        this.goToMaps("go")
                    }
                    )),
                    this.reloadLoginPage = () => {
                        this.removePages(),
                        this.loginPage = new v.LoginPage(S.authGoogle,this.reloadLoginPage,this.startGameAction)
                    }
                    ,
                    this.doMenuAction = e => {
                        "account" === e ? this.goToAccount("go") : "levels" === e ? this.goToLevels("go") : "maps" === e ? this.goToMaps("go") : "community" === e || ("guide" === e ? this.goToGuide("go") : "news" === e || "settings" === e && this.goToSettings("go"))
                    }
                }
                static setLanguege() {
                    try {
                        const e = localStorage.getItem("lang");
                        null !== e && o.LangSettings.setLanguage(a.LangUtils.getLanguageFromString(e))
                    } catch (e) {
                        console.log(e)
                    }
                }
                start() {
                    S.setLanguege(),
                    "/login" === window.location.pathname ? this.goToLogin("start") : "/performance" === window.location.pathname ? this.goToPerformance("start") : "/setname" === window.location.pathname ? this.goToNameChange("start") : c.Routes.checkUser((e => i(this, void 0, void 0, (function*() {
                        l.PlayerState.userName = e;
                        const t = yield c.Routes.getLevels();
                        l.PlayerState.completedLevels = t,
                        this.goToPath("start")
                    }
                    ))), ( () => {
                        this.goToLogin("start")
                    }
                    )),
                    window.addEventListener("popstate", ( () => this.goToPath("return")))
                }
                goToLogin(e) {
                    this.removePages(),
                    document.title = n.GameText.ARROWS_TITLE.get(),
                    this.loginPage = new v.LoginPage(S.authGoogle,this.reloadLoginPage,this.startGameAction),
                    "go" === e ? window.history.pushState(null, "", "login") : "start" === e && window.history.replaceState(null, "", "login")
                }
                goToGame(e, t) {
                    this.removePages(),
                    this.gamePage = new g.GamePage(t),
                    document.title = `${t.name} | ${n.GameText.ARROWS_TITLE.get()}`,
                    "go" === e ? window.history.pushState(null, "", `map-${t.id}`) : "start" === e && window.history.replaceState(null, "", `map-${t.id}`)
                }
                goToPerformance(e) {
                    this.removePages(),
                    document.title = `${n.GameText.PERFOMANCE_TITLE.get()} | ${n.GameText.ARROWS_TITLE.get()}`,
                    this.performancePage = new y.PerformancePage,
                    "go" === e ? window.history.pushState(null, "", "performance") : "start" === e && window.history.replaceState(null, "", "performance")
                }
                goToNameChange(e) {
                    return i(this, void 0, void 0, (function*() {
                        (yield c.Routes.checkNameChange()) ? (this.removePages(),
                        document.title = `${n.GameText.SET_NAME.get()} | ${n.GameText.ARROWS_TITLE.get()}`,
                        this.nameChangePage = new A.NameChangePage,
                        "go" === e ? window.history.pushState(null, "", "setname") : "start" === e && window.history.replaceState(null, "", "setname")) : this.goToLogin(e)
                    }
                    ))
                }
                goToLevel(e, t) {
                    const s = r.Levels.levels.get(t);
                    void 0 !== s && "locked" !== s.state ? (this.removePages(),
                    document.title = `${n.GameText.LEVEL.get()} ${t} | ${n.GameText.ARROWS_TITLE.get()}`,
                    this.levelPage = new p.LevelPage(s),
                    r.Levels.startLevel(this.levelPage),
                    "go" === e ? window.history.pushState(null, "", `level-${t}`) : "start" === e && window.history.replaceState(null, "", `level-${t}`)) : this.goToLevels(e)
                }
                goToPath(e) {
                    if ("/login" === window.location.pathname)
                        this.goToLogin(e);
                    else if ("/maps" === window.location.pathname)
                        this.goToMaps(e);
                    else if (window.location.pathname.startsWith("/map")) {
                        const t = window.location.pathname.substring(5);
                        c.Routes.getMap(t, (t => this.goToGame(e, t)))
                    } else if ("/performance" === window.location.pathname)
                        this.goToPerformance(e);
                    else if ("/levels" === window.location.pathname)
                        this.goToLevels(e);
                    else if ("/account" === window.location.pathname)
                        this.goToAccount(e);
                    else if ("/guide" === window.location.pathname)
                        this.goToGuide(e);
                    else if ("/settings" === window.location.pathname)
                        this.goToSettings(e);
                    else if (window.location.pathname.startsWith("/level")) {
                        const t = Number(window.location.pathname.substring(7));
                        this.goToLevel(e, t)
                    } else
                        this.goToLogin(e)
                }
                removePages() {
                    return i(this, void 0, void 0, (function*() {
                        null !== this.loginPage && (this.loginPage.dispose(),
                        this.loginPage = null),
                        null !== this.menuPage && (this.menuPage.dispose(),
                        this.menuPage = null),
                        null !== this.gamePage && (yield this.gamePage.dispose(),
                        this.gamePage = null),
                        null !== this.performancePage && (this.performancePage.dispose(),
                        this.performancePage = null),
                        null !== this.nameChangePage && (this.nameChangePage.dispose(),
                        this.nameChangePage = null),
                        null !== this.levelPage && (this.levelPage.dispose(),
                        this.levelPage = null)
                    }
                    ))
                }
                goToAccount(e) {
                    var t;
                    null !== this.menuPage ? null === (t = this.menuPage.page) || void 0 === t || t.dispose() : (this.removePages(),
                    this.menuPage = new f.MenuPage("account",this.doMenuAction)),
                    document.title = `${n.GameText.ACCOUNT.get()} | ${n.GameText.ARROWS_TITLE.get()}`,
                    this.accountPage = new d.AccountPage(this.menuPage.getContent()),
                    this.menuPage.page = this.accountPage,
                    "go" === e ? window.history.pushState(null, "", "account") : "start" === e ? window.history.replaceState(null, "", "account") : "return" === e && this.menuPage.setCategory("account")
                }
                goToMaps(e) {
                    var t;
                    return i(this, void 0, void 0, (function*() {
                        l.PlayerState.completedLevels.includes(10) ? (null !== this.menuPage ? null === (t = this.menuPage.page) || void 0 === t || t.dispose() : (yield this.removePages(),
                        this.menuPage = new f.MenuPage("maps",this.doMenuAction)),
                        document.title = `${n.GameText.MAPS.get()} | ${n.GameText.ARROWS_TITLE.get()}`,
                        this.mapsPage = new w.MapsPage((e => this.goToGame("go", e)),this.menuPage.getContent()),
                        this.menuPage.page = this.mapsPage,
                        "go" === e ? window.history.pushState(null, "", "maps") : "start" === e ? window.history.replaceState(null, "", "maps") : "return" === e && this.menuPage.setCategory("maps")) : this.goToLevels(e)
                    }
                    ))
                }
                goToLevels(e) {
                    var t;
                    null !== this.menuPage ? null === (t = this.menuPage.page) || void 0 === t || t.dispose() : (this.removePages(),
                    this.menuPage = new f.MenuPage("levels",this.doMenuAction)),
                    document.title = `${n.GameText.LEVELS.get()} | ${n.GameText.ARROWS_TITLE.get()}`,
                    this.levelsPage = new m.LevelsPage((e => this.goToLevel("go", e)),this.menuPage.getContent()),
                    this.menuPage.page = this.levelsPage,
                    "go" === e ? window.history.pushState(null, "", "levels") : "start" === e ? window.history.replaceState(null, "", "levels") : "return" === e && this.menuPage.setCategory("levels")
                }
                goToGuide(e) {
                    var t;
                    null !== this.menuPage ? null === (t = this.menuPage.page) || void 0 === t || t.dispose() : (this.removePages(),
                    this.menuPage = new f.MenuPage("guide",this.doMenuAction)),
                    document.title = `${n.GameText.GUIDE.get()} | ${n.GameText.ARROWS_TITLE.get()}`,
                    this.guidePage = new u.GuidePage(this.menuPage.getContent()),
                    this.menuPage.page = this.guidePage,
                    "go" === e ? window.history.pushState(null, "", "guide") : "start" === e ? window.history.replaceState(null, "", "guide") : "return" === e && this.menuPage.setCategory("guide")
                }
                goToSettings(e) {
                    var t;
                    null !== this.menuPage ? null === (t = this.menuPage.page) || void 0 === t || t.dispose() : (this.removePages(),
                    this.menuPage = new f.MenuPage("settings",this.doMenuAction)),
                    document.title = `${n.GameText.SETTINGS.get()} | ${n.GameText.ARROWS_TITLE.get()}`,
                    this.settingsPage = new C.SettingsPage(this.menuPage.getContent()),
                    this.menuPage.page = this.settingsPage,
                    "go" === e ? window.history.pushState(null, "", "settings") : "start" === e ? window.history.replaceState(null, "", "settings") : "return" === e && this.menuPage.setCategory("settings")
                }
            }
            t.Navigation = S,
            S.authGoogle = () => {
                const e = h.AuthGoogle.getAuthURL();
                window.location.href = e
            }
        },
        4723: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.Page = void 0,
            t.Page = class {
                constructor(e) {
                    this.isDeleted = !1,
                    this.mainDiv = document.createElement("div"),
                    this.mainDiv.className = this.getClass(),
                    void 0 !== e ? e.appendChild(this.mainDiv) : document.body.appendChild(this.mainDiv)
                }
                dispose() {
                    this.isDeleted = !0,
                    this.mainDiv.remove()
                }
            }
        }
        ,
        2637: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.PerformancePage = void 0;
            const i = s(5583);
            t.PerformancePage = class {
                constructor() {
                    this.framesTotal = 100,
                    this.phase = 0,
                    this.frame = 0,
                    this.times = [0, 0, 0, 0, 0, 0],
                    this.update = () => {
                        if (!this.isDeleted) {
                            if (0 === this.phase)
                                return this.start(),
                                void window.requestAnimationFrame(this.update);
                            if (this.frame === this.framesTotal)
                                return this.start(),
                                this.frame = 0,
                                void window.requestAnimationFrame(this.update);
                            1 !== this.phase && 2 !== this.phase && 3 !== this.phase || (this.measureUpdate(),
                            this.game.draw()),
                            4 !== this.phase && 5 !== this.phase && 6 !== this.phase || (this.game.updateFrame(),
                            this.measureDraw()),
                            this.frame++,
                            window.requestAnimationFrame(this.update)
                        }
                    }
                    ,
                    this.isDeleted = !1,
                    this.canvas = document.createElement("canvas"),
                    this.canvas.className = "cnv",
                    this.canvas.width = 3840,
                    this.canvas.height = 2160,
                    document.body.appendChild(this.canvas);
                    const e = this.canvas.getContext("webgl", {
                        premultipliedAlpha: !1,
                        preserveDrawingBuffer: !0
                    });
                    this.game = new i.Game(e,this.canvas.width,this.canvas.height),
                    window.requestAnimationFrame(this.update)
                }
                dispose() {
                    this.isDeleted = !0,
                    this.game.dispose(),
                    document.body.removeChild(this.canvas)
                }
                start() {
                    this.game.gameMap.clear(),
                    this.phase++;
                    let e = 80;
                    1 === this.phase ? e = 80 : 2 === this.phase ? e = 40 : 3 === this.phase ? e = 20 : 4 === this.phase ? e = 80 : 5 === this.phase ? e = 40 : 6 === this.phase ? e = 20 : (this.dispose(),
                    document.body.innerHTML = this.times.map((e => (e / this.framesTotal).toFixed(2))).join("<br>"));
                    const t = ~~(this.canvas.width / e)
                      , s = ~~(this.canvas.height / e);
                    for (let e = 0; e < t; e++)
                        for (let t = 0; t < s; t++) {
                            const s = ~~(25 * Math.random())
                              , i = ~~(4 * Math.random())
                              , n = Math.random() > .5;
                            this.game.gameMap.setArrowType(e, t, s),
                            this.game.gameMap.setArrowRotation(e, t, i),
                            this.game.gameMap.setArrowFlipped(e, t, n)
                        }
                    this.game.updateSpeedLevel = 2,
                    this.game.setScale(e, [0, 0])
                }
                measureUpdate() {
                    const e = performance.now();
                    this.game.updateFrame();
                    const t = performance.now();
                    this.times[this.phase - 1] += t - e
                }
                measureDraw() {
                    const e = performance.now();
                    this.game.draw();
                    const t = performance.now();
                    this.times[this.phase - 1] += t - e
                }
            }
        }
        ,
        4913: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.SettingsPage = void 0;
            const i = s(3446)
              , n = s(3295)
              , o = s(3737)
              , a = s(4723);
            class r extends a.Page {
                constructor(e) {
                    super(e),
                    this.table = document.createElement("table"),
                    this.table.classList.add("settings-table"),
                    this.mainDiv.appendChild(this.table),
                    this.addSetting(i.GameText.LANGUAGE.get(), ( () => {
                        const e = document.createElement("select");
                        e.classList.add("lang-select");
                        for (let t = 0; t < n.LangSettings.languages.length; t++) {
                            const s = document.createElement("option");
                            s.value = n.LangSettings.languages[t],
                            s.innerText = n.LangSettings.languageNames[t],
                            e.appendChild(s)
                        }
                        return e.value = n.LangSettings.getLanguage(),
                        e.addEventListener("change", ( () => {
                            const t = o.LangUtils.getLanguageFromString(e.value);
                            n.LangSettings.setLanguage(t),
                            localStorage.setItem("lang", t),
                            window.location.reload()
                        }
                        )),
                        e
                    }
                    )),
                    this.addSetting(i.GameText.SHOW_CONTROLS_HINTS.get(), ( () => {
                        const e = document.createElement("input");
                        return e.type = "checkbox",
                        e.checked = "false" !== localStorage.getItem("show-controls-hints"),
                        e.addEventListener("change", ( () => {
                            localStorage.setItem("show-controls-hints", e.checked.toString())
                        }
                        )),
                        e
                    }
                    )),
                    this.addSetting(i.GameText.MAX_ZOOM_OUT.get(), ( () => {
                        const e = document.createElement("div")
                          , t = document.createElement("input")
                          , s = document.createElement("span");
                        return t.type = "range",
                        t.min = "1",
                        t.max = "4",
                        t.step = "1",
                        t.value = localStorage.getItem("max-zoom-out") || "1",
                        t.addEventListener("change", ( () => {
                            localStorage.setItem("max-zoom-out", t.value),
                            s.innerText = `${t.value}x`
                        }
                        )),
                        t.style.display = "inline",
                        e.appendChild(t),
                        s.innerText = `${t.value}x`,
                        s.className = "setting-max-zoom-out-text",
                        e.appendChild(s),
                        e
                    }
                    ))
                }
                getClass() {
                    return "settings-page"
                }
                addSetting(e, t) {
                    const s = document.createElement("tr");
                    this.table.appendChild(s);
                    const i = document.createElement("td");
                    i.classList.add("setting-name"),
                    i.innerText = `${e}:`,
                    s.appendChild(i);
                    const n = document.createElement("td");
                    n.classList.add("setting-value"),
                    n.appendChild(t()),
                    s.appendChild(n)
                }
            }
            t.SettingsPage = r
        }
        ,
        1154: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.GameHistory = void 0;
            const i = s(7779);
            class n {
                constructor() {
                    this.states = [],
                    this.current = -1,
                    this.lastChangeTime = 0
                }
                addChange(e, t, s, n) {
                    if (s.equals(n))
                        return;
                    const o = Date.now();
                    o - this.lastChangeTime > 2e3 && (this.pushState(new i.PlayerMapAction),
                    this.lastChangeTime = o),
                    this.getCurrentState().addChangedArrow(e, t, s, n)
                }
                pushState(e) {
                    this.current !== this.states.length - 1 && (this.states.length = this.current + 1),
                    this.states.push(e),
                    this.states.length > n.MAX_SIZE && this.states.shift(),
                    this.current = this.states.length - 1
                }
                undo() {
                    this.current <= 0 || this.current--
                }
                redo() {
                    this.current !== this.states.length - 1 && 0 !== this.states.length && this.current++
                }
                getCurrentState() {
                    return this.states[this.current]
                }
                getIsLastState() {
                    return this.current === this.states.length - 1
                }
            }
            t.GameHistory = n,
            n.MAX_SIZE = 100
        }
        ,
        5583: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.Game = void 0;
            const i = s(691)
              , n = s(3278)
              , o = s(4817)
              , a = s(110)
              , r = s(3246)
              , l = s(258);
            t.Game = class {
                constructor(e, t, s) {
                    this.updateTime = 0,
                    this.drawTime = 0,
                    this.updatesPerSecond = 0,
                    this.drawsPerSecond = 0,
                    this.focusingTime = 1,
                    this.focusingSpeed = .017,
                    this.focusingOffset = [0, 0],
                    this.focusingScale = 80,
                    this.startingOffset = [0, 0],
                    this.startingScale = 80,
                    this.focusing = !1,
                    this.width = t,
                    this.height = s,
                    this.frame = 0,
                    this.tick = 0,
                    this.playing = !0,
                    this.updateSpeedLevel = 0,
                    this.pasteDirection = 0,
                    this.isSelecting = !1,
                    this.mousePosition = [0, 0],
                    this.gameMap = new o.GameMap,
                    this.selectedMap = new a.SelectedMap,
                    this.scale = 40 * window.devicePixelRatio,
                    this.offset = [0, 0],
                    this.screenUpdated = !0,
                    this.drawPastedArrows = !1,
                    this.render = new r.Render(e)
                }
                draw() {
                    this.updateFocus(),
                    (this.drawPastedArrows || 0 !== this.selectedMap.getSelectedArrows().length) && (this.screenUpdated = !0),
                    l.PlayerSettings.framesToUpdate[this.updateSpeedLevel] > 1 && (this.screenUpdated = !0),
                    this.screenUpdated && this.render.drawBackground(this.scale, [-this.offset[0] / n.CELL_SIZE, -this.offset[1] / n.CELL_SIZE]);
                    const e = this.scale;
                    this.render.prepareArrows(e);
                    const t = ~~(-this.offset[0] / n.CELL_SIZE / 16) - 1
                      , s = ~~(-this.offset[1] / n.CELL_SIZE / 16) - 1
                      , o = ~~(-this.offset[0] / n.CELL_SIZE / 16 + this.width / this.scale / 16)
                      , a = ~~(-this.offset[1] / n.CELL_SIZE / 16 + this.height / this.scale / 16);
                    if (this.render.setArrowAlpha(1),
                    this.gameMap.chunks.forEach((e => {
                        if (!(e.x >= t && e.x <= o && e.y >= s && e.y <= a))
                            return;
                        const r = this.offset[0] * this.scale / n.CELL_SIZE + .025 * this.scale
                          , l = this.offset[1] * this.scale / n.CELL_SIZE + .025 * this.scale;
                        for (let t = 0; t < n.CHUNK_SIZE; t++)
                            for (let s = 0; s < n.CHUNK_SIZE; s++) {
                                const o = e.getArrow(t, s);
                                if (o.type > 0 && (this.screenUpdated || i.ChunkUpdates.wasArrowChanged(o))) {
                                    const i = (e.x * n.CHUNK_SIZE + t) * this.scale + r
                                      , a = (e.y * n.CHUNK_SIZE + s) * this.scale + l;
                                    this.render.drawArrow(i, a, o.type, o.signal, o.rotation, o.flipped)
                                }
                            }
                    }
                    )),
                    performance.now() - this.drawTime > 1e3 && (this.drawTime = performance.now(),
                    this.drawsPerSecond = 0),
                    this.drawsPerSecond++,
                    this.drawPastedArrows) {
                        this.render.setArrowAlpha(.5);
                        const e = this.selectedMap.getCopiedArrows();
                        0 !== e.size && (this.screenUpdated = !0),
                        e.forEach(( (e, t) => {
                            const [s,i] = t.split(",").map((e => parseInt(e, 10)));
                            let o = s
                              , a = i
                              , r = 0;
                            1 === this.pasteDirection ? (o = -i,
                            a = s,
                            r = 1) : 2 === this.pasteDirection ? (o = -s,
                            a = -i,
                            r = 2) : 3 === this.pasteDirection && (o = i,
                            a = -s,
                            r = 3);
                            const l = (o + this.mousePosition[0]) * this.scale + this.offset[0] * this.scale / n.CELL_SIZE + .025 * this.scale
                              , h = (a + this.mousePosition[1]) * this.scale + this.offset[1] * this.scale / n.CELL_SIZE + .025 * this.scale;
                            this.render.drawArrow(l, h, e.type, e.signal, (e.rotation + r) % 4, e.flipped)
                        }
                        ))
                    }
                    if (this.render.disableArrows(),
                    this.render.prepareSolidColor(),
                    this.render.setSolidColor(.25, .5, 1, .25),
                    this.selectedMap.getSelectedArrows().forEach((e => {
                        const t = e.split(",").map((e => parseInt(e, 10)))
                          , s = t[0] * this.scale + this.offset[0] * this.scale / n.CELL_SIZE
                          , i = t[1] * this.scale + this.offset[1] * this.scale / n.CELL_SIZE
                          , o = this.scale + .05 * this.scale;
                        this.render.drawSolidColor(s, i, o, o)
                    }
                    )),
                    this.isSelecting) {
                        this.render.prepareSolidColor(),
                        this.render.setSolidColor(.5, .5, .75, .25);
                        const e = this.selectedMap.getCurrentSelectedArea();
                        if (void 0 !== e) {
                            const t = e[0] * this.scale + this.offset[0] * this.scale / n.CELL_SIZE
                              , s = e[1] * this.scale + this.offset[1] * this.scale / n.CELL_SIZE
                              , i = e[2] - e[0]
                              , o = e[3] - e[1];
                            this.render.drawSolidColor(t, s, i * this.scale, o * this.scale)
                        }
                    }
                    this.render.disableSolidColor(),
                    this.screenUpdated = !1,
                    this.frame++
                }
                updateFrame(e=( () => {}
                )) {
                    if (this.playing && this.frame % l.PlayerSettings.framesToSkip[this.updateSpeedLevel] == 0)
                        for (let t = 0; t < l.PlayerSettings.framesToUpdate[this.updateSpeedLevel]; t++)
                            this.updateTick(e),
                            performance.now() - this.updateTime > 1e3 && (this.updateTime = performance.now(),
                                this.updatesPerSecond = 0),
                                this.updatesPerSecond++
                }
                updateTick(e=( () => {}
                )) {
                    e(),
                    i.ChunkUpdates.update(this.gameMap),
                    this.tick++
                }
                undoChanges(e) {
                    e.changedArrows.forEach(( ([e,t], s) => {
                        const [i,n] = s.split(",").map((e => parseInt(e, 10)));
                        0 === e.type ? (this.gameMap.removeArrow(i, n, !0),
                        this.selectedMap.deselect(i, n)) : (this.gameMap.resetArrow(i, n, !0),
                        this.gameMap.setArrowType(i, n, e.type, !0),
                        this.gameMap.setArrowRotation(i, n, e.rotation, !0),
                        this.gameMap.setArrowFlipped(i, n, e.flipped, !0))
                    }
                    ))
                }
                redoChanges(e) {
                    e.changedArrows.forEach(( ([e,t], s) => {
                        const [i,n] = s.split(",").map((e => parseInt(e, 10)));
                        0 === t.type ? (this.gameMap.removeArrow(i, n, !0),
                        this.selectedMap.deselect(i, n)) : (this.gameMap.resetArrow(i, n, !0),
                        this.gameMap.setArrowType(i, n, t.type, !0),
                        this.gameMap.setArrowRotation(i, n, t.rotation, !0),
                        this.gameMap.setArrowFlipped(i, n, t.flipped, !0))
                    }
                    ))
                }
                clearSignals() {
                    i.ChunkUpdates.clearSignals(this.gameMap)
                }
                focusOnBox(e, t, s, i, o=0, a=1) {
                    const r = (s += o) - (e -= o)
                      , l = (i += o) - (t -= o)
                      , h = Math.min(this.width / r, this.height / l)
                      , c = (e + s) * n.CELL_SIZE / 2
                      , d = (t + i) * n.CELL_SIZE / 2;
                    if (this.focusingScale = h,
                    this.focusingOffset[0] = this.width / h * n.CELL_SIZE / 2 - c,
                    this.focusingOffset[1] = this.height / h * n.CELL_SIZE / 2 - d,
                    this.startingOffset[0] = this.offset[0],
                    this.startingOffset[1] = this.offset[1],
                    this.startingScale = this.scale,
                    a >= 1)
                        return this.offset[0] = this.focusingOffset[0],
                        this.offset[1] = this.focusingOffset[1],
                        this.scale = this.focusingScale,
                        void (this.focusingTime = 1);
                    this.focusingTime = 0,
                    this.focusing = !0,
                    this.focusingSpeed = a
                }
                updateFocus() {
                    if (!this.focusing)
                        return;
                    this.focusingTime >= 1 && (this.focusingTime = 1,
                    this.focusing = !1);
                    const e = .5 * -Math.cos(this.focusingTime * Math.PI) + .5;
                    this.scale = this.focusingScale * e + this.startingScale * (1 - e),
                    this.offset[0] = this.focusingOffset[0] * e + this.startingOffset[0] * (1 - e),
                    this.offset[1] = this.focusingOffset[1] * e + this.startingOffset[1] * (1 - e),
                    this.focusingTime += this.focusingSpeed,
                    this.focusingTime = Math.min(this.focusingTime, 1),
                    this.screenUpdated = !0
                }
                setScale(e, t) {
                    const s = t[0] * n.CELL_SIZE * window.devicePixelRatio / this.scale - this.offset[0]
                      , i = t[1] * n.CELL_SIZE * window.devicePixelRatio / this.scale - this.offset[1];
                    this.offset[0] = t[0] * n.CELL_SIZE * window.devicePixelRatio / e - s,
                    this.offset[1] = t[1] * n.CELL_SIZE * window.devicePixelRatio / e - i,
                    this.scale = e,
                    this.screenUpdated = !0
                }
                resize(e, t) {
                    this.width = e,
                    this.height = t,
                    this.render.resize(e, t),
                    this.screenUpdated = !0
                }
                dispose() {
                    this.gameMap.clear(),
                    this.selectedMap.dispose(),
                    this.render.dispose()
                }
            }
        }
        ,
        8246: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.PlayerAccess = void 0;
            class s {
                constructor() {
                    this.arrowGroups = [[1, 2, 3, 4, 5], [6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 24]],
                    this.canMove = !0,
                    this.canZoom = !0,
                    this.canPause = !0,
                    this.canOpenMenu = !0,
                    this.canChangeSpeed = !0,
                    this.canSetArrows = !0,
                    this.canDelete = !0,
                    this.canRotate = !0,
                    this.canFlip = !0,
                    this.canSelect = !0,
                    this.canCopy = !0,
                    this.canPaste = !0,
                    this.canPick = !0,
                    this.canUndo = !0,
                    this.canClearSignals = !0,
                    this.canRunOneTick = !0
                }
                static makeCopy(e) {
                    return Object.assign({}, e)
                }
                static makeLevelSpectator() {
                    const e = this.makeSpectator();
                    return e.canClearSignals = !1,
                    e.canRunOneTick = !1,
                    e
                }
                static makeSpectator() {
                    return {
                        canSetArrows: !1,
                        canDelete: !1,
                        canRotate: !1,
                        canFlip: !1,
                        canSelect: !1,
                        canCopy: !1,
                        canPaste: !1,
                        canPick: !1,
                        canUndo: !1
                    }
                }
                static makeOnly(e) {
                    const t = new s;
                    return t.arrowGroups = [[]],
                    t.canMove = !1,
                    t.canZoom = !1,
                    t.canPause = !1,
                    t.canOpenMenu = !1,
                    t.canChangeSpeed = !1,
                    t.canSetArrows = !1,
                    t.canDelete = !1,
                    t.canRotate = !1,
                    t.canFlip = !1,
                    t.canSelect = !1,
                    t.canCopy = !1,
                    t.canPaste = !1,
                    t.canPick = !1,
                    t.canUndo = !1,
                    t.canClearSignals = !1,
                    t.canRunOneTick = !1,
                    Object.assign(Object.assign({}, t), e)
                }
            }
            t.PlayerAccess = s
        }
        ,
        8695: function(e, t, s) {
            var i = this && this.__awaiter || function(e, t, s, i) {
                return new (s || (s = Promise))((function(n, o) {
                    function a(e) {
                        try {
                            l(i.next(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function r(e) {
                        try {
                            l(i.throw(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function l(e) {
                        var t;
                        e.done ? n(e.value) : (t = e.value,
                        t instanceof s ? t : new s((function(e) {
                            e(t)
                        }
                        ))).then(a, r)
                    }
                    l((i = i.apply(e, t || [])).next())
                }
                ))
            }
            ;
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.PlayerControls = void 0;
            const n = s(7403)
              , o = s(8463)
              , a = s(82)
              , r = s(3278)
              , l = s(8939)
              , h = s(8246)
              , c = s(258);
            t.PlayerControls = class {
                constructor(e, t, s, i=null) {
                    this.onPaste = () => {
                        this.game.drawPastedArrows = !0,
                        this.freeCursor = !1
                    }
                    ,
                    this.onPasteError = () => {
                        this.game.drawPastedArrows = !1,
                        this.freeCursor = !0
                    }
                    ,
                    this.keyDownCallback = (e, t) => {
                        const s = this.keyboardHandler.getShiftPressed();
                        if (this.keyboardHandler.getKeyPressed("MetaLeft") || this.keyboardHandler.getKeyPressed("MetaRight"))
                            return;
                        if ("Escape" === e && this.playerAccess.canOpenMenu && this.playerUI.toggleMenu(this.game),
                        this.playerUI.isMenuOpen())
                            return;
                        const i = this.playerUI.toolbarController.getCurrentGroup();
                        for (let t = 0; t < i.length; t++) {
                            const s = i[t];
                            e === `Digit${t + 1}` && this.selectToolBarArrow(s)
                        }
                        if ("KeyQ" === e)
                            this.pickArrow();
                        else if ("Backquote" === e)
                            this.takeCursor();
                        else if ("Space" === e)
                            this.togglePause();
                        else if ("Enter" === e)
                            this.runOneTick();
                        else if ("KeyZ" === e)
                            null !== this.history && (s ? this.redo() : this.undo());
                        else if ("KeyY" === e)
                            this.redo();
                        else if ("KeyX" === e)
                            this.cutArrows();
                        else if ("KeyF" === e) {
                            if (this.freeCursor) {
                                const e = this.getArrowByMousePosition();
                                void 0 !== e && (this.flipDirection = !e.flipped,
                                this.game.screenUpdated = !0)
                            }
                        } else if ("Backspace" === e)
                            this.deleteSelectedArrows();
                        else if ("KeyC" === e)
                            this.keyboardHandler.getCtrlPressed() || this.copyArrows();
                        else if ("KeyV" === e)
                            this.keyboardHandler.getCtrlPressed() || this.pasteArrows();
                        else if ("KeyH" === e && this.playerAccess.canMove) {
                            const e = this.game.width / this.game.scale
                              , t = this.game.height / this.game.scale;
                            this.game.focusOnBox(0, 0, e, t, 0, .017)
                        }
                        this.freeCursor || (this.playerAccess.canRotate && ("KeyW" === e ? this.game.selectedMap.rotateOrFlipArrows(0, !1) : "KeyD" === e ? this.game.selectedMap.rotateOrFlipArrows(1, !1) : "KeyS" === e ? this.game.selectedMap.rotateOrFlipArrows(2, !1) : "KeyA" === e && this.game.selectedMap.rotateOrFlipArrows(3, !1)),
                        "KeyF" === e && this.playerAccess.canFlip && this.game.selectedMap.rotateOrFlipArrows(null, !0)),
                        "Tab" === e && this.playerUI.toolbarController.toggleInventory(),
                        "KeyN" === e && this.clearSignals()
                    }
                    ,
                    this.keyUpCallback = e => {
                        this.playerUI.isMenuOpen() || "KeyE" === e && (this.game.selectedMap.updateSelectionFromCurrentSelection(),
                        this.game.screenUpdated = !0)
                    }
                    ,
                    this.leftClickCallback = () => {
                        const e = this.getArrowByMousePosition()
                          , t = this.keyboardHandler.getShiftPressed();
                        void 0 !== e && this.freeCursor && !t && (21 !== e.type && 24 !== e.type || (0 === e.signal || this.game.playing ? e.signal = 5 : e.signal = 0,
                        this.game.screenUpdated = !0))
                    }
                    ,
                    this.wheelCallback = e => {
                        this.playerUI.isMenuOpen() || (this.wheelDelta += e)
                    }
                    ,
                    this.pasteEvent = e => {
                        if (null === e.clipboardData || !this.playerAccess.canPaste)
                            return;
                        const t = e.clipboardData.getData("text");
                        this.game.selectedMap.pasteFromText(t, this.onPaste, this.onPasteError)
                    }
                    ,
                    this.copyEvent = e => {
                        if (null === e.clipboardData || !this.playerAccess.canCopy)
                            return;
                        if (0 === this.game.selectedMap.getCount())
                            return;
                        const t = this.game.selectedMap.copyFromGameMap(this.game.gameMap);
                        "" !== t && (e.clipboardData.setData("text/plain", t),
                        e.preventDefault(),
                        this.game.selectedMap.clear(),
                        this.game.screenUpdated = !0)
                    }
                    ,
                    this.playerAccess = new h.PlayerAccess,
                    this.flipDirection = !0,
                    this.mousePosPrev = [0, 0],
                    this.mousePressedPrev = !1,
                    this.wheelDelta = 0,
                    this.mouseHandler = new o.MouseHandler(e,this.leftClickCallback,( () => {}
                    ),this.wheelCallback),
                    this.keyboardHandler = new n.KeyboardHandler(this.keyDownCallback,this.keyUpCallback),
                    this.game = t,
                    this.playerUI = s,
                    this.history = i,
                    this.freeCursor = !0,
                    this.activeArrowType = -1,
                    this.keyboardZoomVelocity = 0,
                    this.keyboardMoveVelocity = [0, 0],
                    this.arrowStartPoint = null,
                    document.addEventListener("paste", this.pasteEvent),
                    document.addEventListener("copy", this.copyEvent),
                    this.playerUI.toolbarController.setSelectCallback((e => this.selectToolBarArrow(e))),
                    this.playerUI.addControlsHint(this.playerAccess),
                    this.controlsHints = "false" !== localStorage.getItem("show-controls-hints"),
                    this.maxZoomOut = parseInt(localStorage.getItem("max-zoom-out") || "1", 10)
                }
                updatePlayerAccess(e) {
                    this.playerAccess = Object.assign(Object.assign({}, this.playerAccess), e),
                    this.playerAccess.canChangeSpeed ? this.playerUI.addSpeedController() : this.playerUI.removeSpeedController(),
                    this.playerUI.updateToolbar(this.playerAccess),
                    this.playerUI.toolbarController.setSelectCallback((e => this.selectToolBarArrow(e))),
                    this.playerUI.updateControlsHintRights(this.playerAccess)
                }
                getPlayerAccess() {
                    return this.playerAccess
                }
                update() {
                    if (this.playerUI.isMenuOpen())
                        return;
                    this.handleZoom(this.wheelDelta, this.playerAccess.canMove),
                    this.wheelDelta = 0;
                    const e = this.mouseHandler.getMousePosition()
                      , t = e[0] * window.devicePixelRatio / this.game.scale - this.game.offset[0] / r.CELL_SIZE
                      , s = e[1] * window.devicePixelRatio / this.game.scale - this.game.offset[1] / r.CELL_SIZE
                      , i = ~~t - (t < 0 ? 1 : 0)
                      , n = ~~s - (s < 0 ? 1 : 0);
                    this.game.mousePosition = [i, n];
                    const o = this.keyboardHandler.getShiftPressed();
                    if (this.mouseHandler.getWheelPressed() ? (this.moveCamera(e[0], e[1]),
                    this.game.screenUpdated = !0) : this.mouseHandler.getMousePressed() ? (this.mousePressedPrev || (this.mousePosPrev = e,
                    this.arrowStartPoint = [t, s]),
                    this.playerUI.isMouseCaptured() ? null !== this.playerUI.speedController && (this.game.updateSpeedLevel = this.playerUI.speedController.getValue()) : (this.freeCursor ? this.moveCamera(e[0], e[1]) : this.setArrows(i, n),
                    this.game.screenUpdated = !0),
                    this.mousePressedPrev = !0) : this.mousePressedPrev = !1,
                    this.keyboardHandler.getKeyPressed("KeyR") && this.deleteArrow(i, n),
                    this.keyboardHandler.getKeyPressed("KeyW") ? this.rotateArrow(i, n, 0) : this.keyboardHandler.getKeyPressed("KeyD") ? this.rotateArrow(i, n, 1) : this.keyboardHandler.getKeyPressed("KeyS") ? this.rotateArrow(i, n, 2) : this.keyboardHandler.getKeyPressed("KeyA") ? this.rotateArrow(i, n, 3) : this.keyboardHandler.getKeyPressed("KeyF") && this.flipArrow(i, n),
                    this.keyboardHandler.getKeyPressed("ArrowUp") ? this.keyboardMoveVelocity[1] += 4 : this.keyboardHandler.getKeyPressed("ArrowDown") && (this.keyboardMoveVelocity[1] -= 4),
                    this.keyboardHandler.getKeyPressed("ArrowLeft") ? this.keyboardMoveVelocity[0] += 4 : this.keyboardHandler.getKeyPressed("ArrowRight") && (this.keyboardMoveVelocity[0] -= 4),
                    (Math.abs(this.keyboardMoveVelocity[0]) > .1 || Math.abs(this.keyboardMoveVelocity[1]) > .1) && (this.game.offset[0] += this.keyboardMoveVelocity[0] * r.CELL_SIZE / this.game.scale,
                    this.game.offset[1] += this.keyboardMoveVelocity[1] * r.CELL_SIZE / this.game.scale,
                    this.keyboardMoveVelocity[0] *= .85,
                    this.keyboardMoveVelocity[1] *= .85,
                    this.game.screenUpdated = !0),
                    this.mousePosPrev = e,
                    this.game.isSelecting = !1,
                    this.keyboardHandler.getKeyPressed("KeyE") && this.selectArrows(t, s),
                    this.keyboardHandler.getKeyPressed("Minus") || this.keyboardHandler.getCharPressed("-"))
                        this.keyboardZoomVelocity += 5;
                    else if (this.keyboardHandler.getKeyPressed("Equal") || this.keyboardHandler.getCharPressed("+"))
                        if (o && this.playerAccess.canZoom) {
                            const e = this.game.width / 2 / window.devicePixelRatio
                              , t = this.game.height / 2 / window.devicePixelRatio;
                            this.game.setScale(40 * window.devicePixelRatio, [e, t])
                        } else
                            this.keyboardZoomVelocity -= 5;
                    const a = this.game.gameMap.getArrow(i, n);
                    void 0 === a || !this.freeCursor || 21 !== a.type && 24 !== a.type ? document.body.style.cursor = "default" : document.body.style.cursor = "pointer",
                    0 !== this.keyboardZoomVelocity && (Math.abs(this.keyboardZoomVelocity) < .01 && (this.keyboardZoomVelocity = 0),
                    this.keyboardZoomVelocity *= .9,
                    this.handleZoom(this.keyboardZoomVelocity, !1)),
                    this.updateControlsHints()
                }
                dispose() {
                    this.keyboardHandler.dispose(),
                    this.mouseHandler.dispose()
                }
                updateControlsHints() {
                    this.controlsHints ? this.game.selectedMap.getCount() > 0 ? this.playerUI.setControlsHintState("selected") : this.freeCursor ? this.playerUI.setControlsHintState("free") : this.playerUI.setControlsHintState("arrow") : this.playerUI.setControlsHintState("none")
                }
                getArrowByMousePosition() {
                    const e = this.mouseHandler.getMousePosition()
                      , t = e[0] * window.devicePixelRatio / this.game.scale - this.game.offset[0] / r.CELL_SIZE
                      , s = e[1] * window.devicePixelRatio / this.game.scale - this.game.offset[1] / r.CELL_SIZE
                      , i = ~~t - (t < 0 ? 1 : 0)
                      , n = ~~s - (s < 0 ? 1 : 0);
                    return this.game.gameMap.getArrow(i, n)
                }
                selectToolBarArrow(e) {
                    this.activeArrowType === e ? this.takeCursor() : this.takeArrow(e)
                }
                takeArrow(e) {
                    this.activeArrowType = e,
                    this.playerUI.toolbarController.activateItem(e),
                    this.freeCursor = !1,
                    this.game.selectedMap.setArrow(e),
                    this.game.drawPastedArrows = !0
                }
                takeCursor() {
                    this.activeArrowType = -1,
                    this.playerUI.toolbarController.activateItem(-1),
                    this.freeCursor = !0,
                    this.game.drawPastedArrows = !1,
                    this.game.screenUpdated = !0
                }
                undo() {
                    if (!this.playerAccess.canUndo)
                        return;
                    if (null === this.history)
                        return;
                    const e = this.history.getCurrentState();
                    this.game.undoChanges(e),
                    this.game.screenUpdated = !0,
                    this.history.undo()
                }
                redo() {
                    if (!this.playerAccess.canUndo)
                        return;
                    if (null === this.history)
                        return;
                    if (this.history.getIsLastState())
                        return;
                    this.history.redo();
                    const e = this.history.getCurrentState();
                    this.game.redoChanges(e),
                    this.game.screenUpdated = !0
                }
                moveCamera(e, t) {
                    this.playerAccess.canMove && (this.game.offset[0] += (e - this.mousePosPrev[0]) * r.CELL_SIZE / this.game.scale * window.devicePixelRatio,
                    this.game.offset[1] += (t - this.mousePosPrev[1]) * r.CELL_SIZE / this.game.scale * window.devicePixelRatio)
                }
                handleZoom(e, t) {
                    if (0 === e || !this.playerAccess.canZoom)
                        return;
                    let s = this.mouseHandler.getMousePosition();
                    t || (s = [this.game.width / 2 / window.devicePixelRatio, this.game.height / 2 / window.devicePixelRatio]);
                    let i = this.game.scale * (1 - .001 * e);
                    const n = 10 / this.maxZoomOut;
                    i = Math.max(n, Math.min(i, 128)),
                    this.game.setScale(i, s)
                }
                togglePause() {
                    this.playerAccess.canPause && (this.game.playing = !this.game.playing,
                    this.playerUI.pauseSign.setVisibility(!this.game.playing))
                }
                setArrows(e, t) {
                    this.playerAccess.canSetArrows && this.game.selectedMap.getCopiedArrows().forEach(( (s, i) => {
                        if (c.PlayerSettings.levelArrows.includes(s.type))
                            return;
                        const [n,o] = i.split(",").map((e => parseInt(e, 10)))
                          , r = a.ArrowData.fromArrow(this.game.gameMap.getArrow(e + n, t + o))
                          , l = a.ArrowData.fromState(s.type, s.rotation, s.flipped);
                        null !== this.history && this.history.addChange(e + n, t + o, r, l),
                        this.game.gameMap.setArrowType(e + n, t + o, s.type),
                        this.game.gameMap.setArrowRotation(e + n, t + o, s.rotation),
                        this.game.gameMap.setArrowFlipped(e + n, t + o, s.flipped)
                    }
                    ))
                }
                deleteArrow(e, t) {
                    if (!this.playerAccess.canDelete)
                        return;
                    const s = a.ArrowData.fromArrow(this.game.gameMap.getArrow(e, t))
                      , i = a.ArrowData.fromState(0, 0, !1);
                    null !== this.history && this.history.addChange(e, t, s, i),
                    this.game.gameMap.removeArrow(e, t),
                    this.game.selectedMap.deselect(e, t),
                    this.game.screenUpdated = !0
                }
                deleteSelectedArrows() {
                    this.playerAccess.canDelete && (this.game.selectedMap.getSelectedArrows().forEach((e => {
                        const [t,s] = e.split(",").map((e => parseInt(e, 10)))
                          , i = a.ArrowData.fromArrow(this.game.gameMap.getArrow(t, s))
                          , n = a.ArrowData.fromState(0, 0, !1);
                        null !== this.history && this.history.addChange(t, s, i, n),
                        this.game.gameMap.removeArrow(t, s)
                    }
                    )),
                    this.game.selectedMap.clear(),
                    this.game.screenUpdated = !0)
                }
                rotateArrow(e, t, s) {
                    if (!this.freeCursor || !this.playerAccess.canRotate)
                        return;
                    const i = a.ArrowData.fromArrow(this.game.gameMap.getArrow(e, t));
                    this.game.gameMap.setArrowRotation(e, t, s),
                    this.game.screenUpdated = !0;
                    const n = a.ArrowData.fromArrow(this.game.gameMap.getArrow(e, t));
                    null !== this.history && this.history.addChange(e, t, i, n)
                }
                flipArrow(e, t) {
                    if (!this.freeCursor || !this.playerAccess.canFlip)
                        return;
                    const s = a.ArrowData.fromArrow(this.game.gameMap.getArrow(e, t));
                    this.game.gameMap.setArrowFlipped(e, t, this.flipDirection),
                    this.game.screenUpdated = !0;
                    const i = a.ArrowData.fromArrow(this.game.gameMap.getArrow(e, t));
                    null !== this.history && this.history.addChange(e, t, s, i)
                }
                selectArrows(e, t) {
                    if (!this.playerAccess.canSelect)
                        return;
                    const s = this.keyboardHandler.getShiftPressed();
                    this.game.selectedMap.updateMouseSelection(this.game.gameMap, e, t, s),
                    this.game.isSelecting = !0,
                    this.game.screenUpdated = !0
                }
                copyArrows() {
                    return i(this, void 0, void 0, (function*() {
                        if (!this.playerAccess.canCopy)
                            return;
                        if (0 === this.game.selectedMap.getCount())
                            return;
                        const e = this.game.selectedMap.copyFromGameMap(this.game.gameMap);
                        yield l.ArrowsDB.write("clipboard", {
                            id: 1,
                            data: e
                        }),
                        this.game.selectedMap.clear(),
                        this.game.screenUpdated = !0
                    }
                    ))
                }
                pasteArrows() {
                    return i(this, void 0, void 0, (function*() {
                        if (!this.playerAccess.canPaste)
                            return;
                        const e = yield l.ArrowsDB.read("clipboard", 1);
                        if (null == e || !("data"in e))
                            return;
                        const t = e.data;
                        "string" == typeof t && this.game.selectedMap.pasteFromText(t, this.onPaste, this.onPasteError)
                    }
                    ))
                }
                cutArrows() {
                    this.playerAccess.canCopy && this.playerAccess.canDelete && (this.copyArrows(),
                    this.deleteSelectedArrows())
                }
                pickArrow() {
                    if (!this.playerAccess.canPick)
                        return;
                    const e = this.getArrowByMousePosition();
                    void 0 !== e && 0 !== e.type && e.canBeEdited ? (this.takeArrow(e.type),
                    this.game.selectedMap.rotateOrFlipArrows(e.rotation, e.flipped)) : this.takeCursor()
                }
                runOneTick() {
                    this.playerAccess.canRunOneTick && (this.game.playing || this.game.updateTick())
                }
                clearSignals() {
                    this.playerAccess.canClearSignals && (this.game.clearSignals(),
                    this.game.screenUpdated = !0)
                }
            }
        },
        7779: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.PlayerMapAction = void 0,
            t.PlayerMapAction = class {
                constructor() {
                    this.changedArrows = new Map
                }
                addChangedArrow(e, t, s, i) {
                    const n = `${e},${t}`
                      , o = this.changedArrows.get(n);
                    void 0 !== o && (s = o[0]),
                    this.changedArrows.set(n, [s, i])
                }
            }
        }
        ,
        9303: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.PlayerOverlay = void 0;
            const i = s(6760);
            t.PlayerOverlay = class {
                constructor(e, t) {
                    this.overlayTexts = [],
                    this.overlayLevels = [],
                    this.canvasDiv = e,
                    this.game = t
                }
                addText(e, t, s, n, o, a) {
                    const r = new i.OverlayText(e,t,s,n,o,a);
                    r.add(this.canvasDiv),
                    this.overlayTexts.push(r)
                }
                addLevel(e) {
                    e.add(this.canvasDiv),
                    this.overlayLevels.push(e);
                    const t = this.canvasDiv.getBoundingClientRect();
                    e.elementOffset = [t.left, t.top]
                }
                update() {
                    for (let e = 0; e < this.overlayTexts.length; e++)
                        this.overlayTexts[e].update(this.game.offset, this.game.scale);
                    for (let e = 0; e < this.overlayLevels.length; e++)
                        this.overlayLevels[e].update(this.game.offset, this.game.scale)
                }
                resize() {
                    const e = this.canvasDiv.getBoundingClientRect();
                    for (let t = 0; t < this.overlayLevels.length; t++)
                        this.overlayLevels[t].elementOffset = [e.left, e.top]
                }
                dispose() {
                    for (let e = 0; e < this.overlayTexts.length; e++)
                        this.overlayTexts[e].remove();
                    this.overlayTexts = [];
                    for (let e = 0; e < this.overlayLevels.length; e++)
                        this.overlayLevels[e].remove();
                    this.overlayLevels = []
                }
            }
        }
        ,
        258: (e, t) => {
            var s;
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.PlayerSettings = void 0,
            function(e) {
                e.version = "1_2_1",
                e.arrowAtlasImage = new Image,
                e.levelArrows = [22, 23],
                e.framesToSkip = [20, 5, 1, 1, 1, 1],
                e.framesToUpdate = [1, 1, 1, 5, 20, 100]
            }(s || (t.PlayerSettings = s = {}))
        }
        ,
        3602: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.PlayerState = void 0;
            class s {
            }
            t.PlayerState = s,
            s.userName = "",
            s.completedLevels = []
        }
        ,
        403: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.PlayerUI = void 0;
            const i = s(3446)
              , n = s(9770)
              , o = s(503)
              , a = s(6709)
              , r = s(3516)
              , l = s(9237)
              , h = s(258);
            t.PlayerUI = class {
                constructor(e) {
                    this.mapInfo = e,
                    this.toolbarController = new l.UIToolbarController([[]]),
                    this.pauseSign = new a.UIPauseSign(document.body),
                    this.menu = null,
                    this.speedController = null,
                    this.controlsHint = null,
                    this.autoSaveMessage = document.createElement("span"),
                    this.autoSaveMessage.className = "ui-text-message",
                    document.body.appendChild(this.autoSaveMessage)
                }
                updateToolbar(e) {
                    this.toolbarController.remove(),
                    this.toolbarController = new l.UIToolbarController(e.arrowGroups)
                }
                addSpeedController() {
                    this.speedController = new r.UIRange(document.body,5,(e => (e => `${h.PlayerSettings.framesToUpdate[e] / h.PlayerSettings.framesToSkip[e] * 60} ${i.GameText.PER_SECOND.get()}`)(e)))
                }
                removeSpeedController() {
                    null !== this.speedController && (this.speedController.remove(),
                    this.speedController = null)
                }
                isMenuOpen() {
                    return null !== this.menu && !this.menu.getIsRemoved()
                }
                isMouseCaptured() {
                    return !(null === this.speedController || !this.speedController.isMouseCaptured()) || this.toolbarController.isMouseCaptured()
                }
                toggleMenu(e) {
                    void 0 !== this.mapInfo && (null === this.menu || this.menu.getIsRemoved() ? this.menu = new o.UIMenu(document.body,this.mapInfo,e) : (this.menu.remove(),
                    this.menu = null))
                }
                showAutoSaveMessage(e, t=!1) {
                    if (this.autoSaveMessage.innerText = e,
                    t ? this.autoSaveMessage.classList.add("error") : this.autoSaveMessage.classList.add("active"),
                    this.autoSaveMessage.style.bottom = "10px",
                    null !== this.controlsHint) {
                        const e = this.controlsHint.getRect();
                        this.autoSaveMessage.style.left = `${e.left + e.width}px`
                    }
                }
                hideAutoSaveMessage() {
                    this.autoSaveMessage.classList.remove("active")
                }
                addControlsHint(e) {
                    this.controlsHint = new n.UIControlsHint(document.body,e)
                }
                setControlsHintState(e) {
                    null !== this.controlsHint && this.controlsHint.setState(e)
                }
                updateControlsHintRights(e) {
                    null !== this.controlsHint && this.controlsHint.updateRights(e)
                }
                dispose() {
                    var e, t;
                    this.toolbarController.remove(),
                    this.pauseSign.remove(),
                    null === (e = this.speedController) || void 0 === e || e.remove(),
                    this.autoSaveMessage.remove(),
                    null === (t = this.controlsHint) || void 0 === t || t.remove(),
                    null !== this.menu && this.menu.remove()
                }
            }
        }
        ,
        2845: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.QUAD_INDICES = t.QUAD_POSITIONS = void 0,
            t.QUAD_POSITIONS = [0, 0, 1, 0, 1, 1, 0, 1],
            t.QUAD_INDICES = [0, 1, 2, 0, 2, 3]
        }
        ,
        3246: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.Render = void 0;
            const i = s(258)
              , n = s(2845)
              , o = s(7504)
              , a = s(3713)
              , r = s(7023)
              , l = s(5154);
            t.Render = class {
                constructor(e) {
                    this.lastArrowType = 0,
                    this.lastArrowSignal = 0,
                    this.lastArrowRotation = 0,
                    this.lastArrowFlipped = !1,
                    this.gl = e,
                    this.positionBuffer = null,
                    this.indexBuffer = null,
                    this.arrowAtlas = null,
                    this.resize(this.gl.canvas.width, this.gl.canvas.height),
                    this.initBuffers(),
                    this.arrowShader = new o.ArrowShader,
                    this.arrowShader.updateProgram(this.gl),
                    this.backgroundShader = new a.BackgroundShader,
                    this.backgroundShader.updateProgram(this.gl),
                    this.solidColorShader = new r.SolidColorShader,
                    this.solidColorShader.updateProgram(this.gl),
                    this.textureShader = new l.TextureShader,
                    this.textureShader.updateProgram(this.gl),
                    this.createArrowTexture(i.PlayerSettings.arrowAtlasImage),
                    this.gl.enable(this.gl.BLEND),
                    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA),
                    this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !0),
                    this.backgroundTexture = null,
                    this.backgroundFrameBuffer = null,
                    this.initBackgroundTexture()
                }
                resize(e, t) {
                    this.gl.canvas.width = e,
                    this.gl.canvas.height = t,
                    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)
                }
                prepareArrows(e) {
                    this.gl.useProgram(this.arrowShader.getProgram()),
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.arrowAtlas),
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer),
                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer),
                    this.gl.enableVertexAttribArray(this.arrowShader.getPositionAttribute()),
                    this.gl.vertexAttribPointer(this.arrowShader.getPositionAttribute(), 2, this.gl.FLOAT, !1, 0, 0),
                    this.gl.uniform2f(this.arrowShader.getResolutionUniform(), this.gl.canvas.width, this.gl.canvas.height),
                    this.gl.uniform1f(this.arrowShader.getSizeUniform(), e),
                    this.gl.uniform1f(this.arrowShader.getSpriteSizeUniform(), 1 / 8)
                }
                prepareTextures(e, t=1) {
                    this.gl.bindTexture(this.gl.TEXTURE_2D, e),
                    this.gl.useProgram(this.textureShader.getProgram()),
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer),
                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer),
                    this.gl.enableVertexAttribArray(this.textureShader.getPositionAttribute()),
                    this.gl.vertexAttribPointer(this.textureShader.getPositionAttribute(), 2, this.gl.FLOAT, !1, 0, 0),
                    this.gl.uniform2f(this.textureShader.getResolutionUniform(), this.gl.canvas.width, this.gl.canvas.height),
                    this.gl.uniform1f(this.textureShader.getTilesUniform(), t)
                }
                disableTextures() {
                    this.gl.disableVertexAttribArray(this.textureShader.getPositionAttribute()),
                    this.gl.bindTexture(this.gl.TEXTURE_2D, null)
                }
                setArrowAlpha(e) {
                    this.gl.uniform1f(this.arrowShader.getAlphaUniform(), e)
                }
                disableArrows() {
                    this.gl.disableVertexAttribArray(this.arrowShader.getPositionAttribute())
                }
                prepareSolidColor() {
                    this.gl.useProgram(this.solidColorShader.getProgram()),
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer),
                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer),
                    this.gl.enableVertexAttribArray(this.solidColorShader.getPositionAttribute()),
                    this.gl.vertexAttribPointer(this.solidColorShader.getPositionAttribute(), 2, this.gl.FLOAT, !1, 0, 0),
                    this.gl.uniform2f(this.solidColorShader.getResolutionUniform(), this.gl.canvas.width, this.gl.canvas.height)
                }
                disableSolidColor() {
                    this.gl.disableVertexAttribArray(this.solidColorShader.getPositionAttribute())
                }
                setSolidColor(e, t, s, i) {
                    this.gl.uniform4f(this.solidColorShader.getColorUniform(), e, t, s, i)
                }
                drawSolidColor(e, t, s, i) {
                    s < 0 && (e -= s = -s),
                    i < 0 && (t -= i = -i),
                    this.gl.uniform4f(this.solidColorShader.getTransformUniform(), e, t, s, i),
                    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0)
                }
                drawArrow(e, t, s, i, n, o) {
                    if ((s -= 1) !== this.lastArrowType) {
                        const e = s / 8 % 1
                          , t = ~~(s / 8) / 8;
                        this.gl.uniform2f(this.arrowShader.getSpritePositionUniform(), e, t),
                        this.lastArrowType = s
                    }
                    i !== this.lastArrowSignal && (this.gl.uniform1i(this.arrowShader.getSignalUniform(), i),
                    this.lastArrowSignal = i),
                    n === this.lastArrowRotation && o === this.lastArrowFlipped || (this.gl.uniform2f(this.arrowShader.getRotationUniform(), n / 2 * Math.PI, o ? 1 : 0),
                    this.lastArrowRotation = n,
                    this.lastArrowFlipped = o),
                    this.gl.uniform2f(this.arrowShader.getPositionUniform(), e, t),
                    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0)
                }
                drawBackground(e, t) {
                    const s = 16;
                    this.prepareTextures(this.backgroundTexture, 2);
                    const i = Math.ceil(this.gl.canvas.width / (s * e)) + 1
                      , n = Math.ceil(this.gl.canvas.height / (s * e)) + 1
                      , o = ~~(t[0] / s) - (t[0] / s < 0 ? 1 : 0)
                      , a = ~~(t[1] / s) - (t[1] / s < 0 ? 1 : 0);
                    for (let r = 0; r < i; r++)
                        for (let i = 0; i < n; i++) {
                            const n = (r + o) * s - t[0]
                              , l = (i + a) * s - t[1];
                            this.drawTexture(n * e, l * e, 8 * e)
                        }
                    this.disableTextures()
                }
                drawTexture(e, t, s) {
                    this.gl.uniform3f(this.textureShader.getTransformUniform(), e, t, s),
                    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0)
                }
                createArrowTexture(e) {
                    const t = this.gl.createTexture();
                    this.arrowAtlas = t,
                    null !== t && (this.gl.bindTexture(this.gl.TEXTURE_2D, t),
                    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, e),
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR),
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE),
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE),
                    this.gl.generateMipmap(this.gl.TEXTURE_2D))
                }
                dispose() {
                    var e;
                    this.gl.deleteBuffer(this.positionBuffer),
                    this.gl.deleteBuffer(this.indexBuffer),
                    null !== this.arrowAtlas && this.gl.deleteTexture(this.arrowAtlas),
                    this.gl.deleteTexture(this.backgroundTexture),
                    this.gl.deleteFramebuffer(this.backgroundFrameBuffer),
                    this.arrowShader.dispose(this.gl),
                    this.backgroundShader.dispose(this.gl),
                    this.solidColorShader.dispose(this.gl),
                    this.textureShader.dispose(this.gl),
                    null === (e = this.gl.getExtension("WEBGL_lose_context")) || void 0 === e || e.loseContext()
                }
                initBuffers() {
                    this.positionBuffer = this.gl.createBuffer(),
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer),
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(n.QUAD_POSITIONS), this.gl.STATIC_DRAW),
                    this.indexBuffer = this.gl.createBuffer(),
                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer),
                    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(n.QUAD_INDICES), this.gl.STATIC_DRAW)
                }
                initBackgroundTexture() {
                    this.backgroundTexture = this.gl.createTexture(),
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.backgroundTexture),
                    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1024, 1024, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null),
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR),
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT),
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT),
                    this.backgroundFrameBuffer = this.gl.createFramebuffer(),
                    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.backgroundFrameBuffer),
                    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.backgroundTexture, 0),
                    this.gl.viewport(0, 0, 1024, 1024),
                    this.prepareBackgroundOrigin(),
                    this.drawBackgroundOrigin(8, [0, 0]),
                    this.disableBackgroundOrigin(),
                    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height),
                    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null),
                    this.gl.generateMipmap(this.gl.TEXTURE_2D),
                    this.gl.bindTexture(this.gl.TEXTURE_2D, null)
                }
                drawBackgroundOrigin(e, t) {
                    this.gl.uniform1f(this.backgroundShader.getScaleUniform(), e),
                    this.gl.uniform2fv(this.backgroundShader.getOffsetUniform(), t),
                    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0)
                }
                prepareBackgroundOrigin() {
                    this.gl.useProgram(this.backgroundShader.getProgram()),
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer),
                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer),
                    this.gl.enableVertexAttribArray(this.backgroundShader.getPositionAttribute()),
                    this.gl.vertexAttribPointer(this.backgroundShader.getPositionAttribute(), 2, this.gl.FLOAT, !1, 0, 0)
                }
                disableBackgroundOrigin() {
                    this.gl.disableVertexAttribArray(this.backgroundShader.getPositionAttribute())
                }
            }
        }
        ,
        7504: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.ArrowShader = void 0;
            const i = s(7377);
            class n extends i.Shader {
                constructor() {
                    super(...arguments),
                    this.positionUniform = null,
                    this.alphaUniform = null,
                    this.signalUniform = null,
                    this.rotationUniform = null,
                    this.sizeUniform = null,
                    this.spriteSizeUniform = null,
                    this.spritePositionUniform = null
                }
                updateProgram(e) {
                    super.updateProgram(e),
                    null !== this.program && (this.positionUniform = e.getUniformLocation(this.program, "u_position"),
                    this.alphaUniform = e.getUniformLocation(this.program, "u_alpha"),
                    this.signalUniform = e.getUniformLocation(this.program, "u_signal"),
                    this.rotationUniform = e.getUniformLocation(this.program, "u_rotation"),
                    this.sizeUniform = e.getUniformLocation(this.program, "u_size"),
                    this.spriteSizeUniform = e.getUniformLocation(this.program, "u_spriteSize"),
                    this.spritePositionUniform = e.getUniformLocation(this.program, "u_spritePosition"))
                }
                getPositionUniform() {
                    return this.positionUniform
                }
                getAlphaUniform() {
                    return this.alphaUniform
                }
                getSignalUniform() {
                    return this.signalUniform
                }
                getRotationUniform() {
                    return this.rotationUniform
                }
                getSizeUniform() {
                    return this.sizeUniform
                }
                getSpriteSizeUniform() {
                    return this.spriteSizeUniform
                }
                getSpritePositionUniform() {
                    return this.spritePositionUniform
                }
                makeVertexShader() {
                    return "\n    attribute vec2 a_position;\n    \n    uniform vec2 u_resolution;\n    uniform vec2 u_position;\n    uniform float u_size;\n    uniform vec2 u_rotation;\n\n    varying vec2 v_texcoord;\n\n    mat2 rot(float a) {\n      float s = sin(a);\n      float c = cos(a);\n      return mat2(c, -s, s, c);\n    }\n\n    void main() {\n      v_texcoord = (a_position * 2.0 - 1.0) * rot(u_rotation.x) * 0.5 + 0.5;\n      if (u_rotation.y > 0.5) v_texcoord.x = 1.0 - v_texcoord.x;\n      float aspect = u_resolution.y / u_resolution.x;\n      vec2 size = vec2(u_size) / u_resolution.y * 2.0;\n      size.x *= aspect;\n      vec2 position = u_position / u_resolution.y * 2.0;\n      position.x = position.x * aspect - 1.0;\n      position.y = -position.y - size.y + 1.0;\n      gl_Position = vec4(a_position * size + position, 0.0, 1.0);\n    }"
                }
                makeFragmentShader() {
                    return "\n    precision lowp float;\n\n    varying vec2 v_texcoord;\n\n    uniform sampler2D u_texture;\n    uniform float u_alpha;\n    uniform int u_signal;\n    uniform vec2 u_spritePosition;\n    uniform float u_spriteSize;\n\n    const vec2 border = vec2(0.475);\n\n    void main() {\n      vec4 signalColors[6];\n      vec4 signalColor;\n      if (u_signal == 0) signalColor = vec4(1.0, 1.0, 1.0, 1.0);\n      if (u_signal == 1) signalColor = vec4(1.0, 0.0, 0.0, 1.0);\n      if (u_signal == 2) signalColor = vec4(0.3, 0.5, 1.0, 1.0);\n      if (u_signal == 3) signalColor = vec4(1.0, 1.0, 0.0, 1.0);\n      if (u_signal == 4) signalColor = vec4(0.0, 0.8, 0.0, 1.0);\n      if (u_signal == 5) signalColor = vec4(1.0, 0.8, 0.2, 1.0);\n      if (u_signal == 6) signalColor = vec4(1.0, 0.2, 1.0, 1.0);\n      vec2 uv = v_texcoord;\n      uv.y = 1.0 - v_texcoord.y;\n      vec4 color = texture2D(u_texture, uv * u_spriteSize + u_spritePosition);\n      color = mix(color, signalColor, 1.0 - color.a);\n      color.a = 1.0;\n      uv = abs(uv - 0.5);\n      float borderColor = 1.0 - float(any(greaterThan(uv, border))) * 0.2;\n      color.rgb *= borderColor;\n      color.a *= u_alpha;\n      gl_FragColor = color;\n    }"
                }
            }
            t.ArrowShader = n
        }
        ,
        3713: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.BackgroundShader = void 0;
            const i = s(7377);
            class n extends i.Shader {
                constructor() {
                    super(...arguments),
                    this.scaleUniform = null,
                    this.offsetUniform = null
                }
                updateProgram(e) {
                    super.updateProgram(e),
                    null !== this.program && (this.scaleUniform = e.getUniformLocation(this.program, "u_scale"),
                    this.offsetUniform = e.getUniformLocation(this.program, "u_offset"))
                }
                getScaleUniform() {
                    return this.scaleUniform
                }
                getOffsetUniform() {
                    return this.offsetUniform
                }
                makeVertexShader() {
                    return "\n    attribute vec2 a_position;\n\n    varying vec2 v_texcoord;\n\n    void main() {\n      v_texcoord = a_position;\n      vec2 position = a_position * 2.0 - 1.0;\n      gl_Position = vec4(position, 0.0, 1.0);\n    }"
                }
                makeFragmentShader() {
                    return "\n    precision lowp float;\n\n    varying vec2 v_texcoord;\n\n    uniform vec2 u_offset;\n    uniform float u_scale;\n\n    void main() {\n      vec2 uv = v_texcoord;\n      uv.y += 0.05 / u_scale;\n      vec2 grid = fract(uv * u_scale + u_offset) - 0.05;\n      float color = 1.0 - step(min(grid.x, grid.y), 0.0) * 0.2;\n      gl_FragColor = vec4(vec3(color), 1.0);\n    }"
                }
            }
            t.BackgroundShader = n
        }
        ,
        7377: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.Shader = void 0,
            t.Shader = class {
                constructor() {
                    this.program = null,
                    this.positionAttribute = -1,
                    this.resolutionUniform = null
                }
                updateProgram(e) {
                    const t = e.createShader(e.VERTEX_SHADER);
                    if (null === t)
                        return;
                    e.shaderSource(t, this.makeVertexShader()),
                    e.compileShader(t);
                    const s = e.getShaderInfoLog(t);
                    null !== s && "" !== s && console.log(s);
                    const i = e.createShader(e.FRAGMENT_SHADER);
                    if (null === i)
                        return;
                    e.shaderSource(i, this.makeFragmentShader()),
                    e.compileShader(i);
                    const n = e.getShaderInfoLog(i);
                    null !== n && "" !== n && console.log(n);
                    const o = e.createProgram();
                    null !== o && (e.attachShader(o, t),
                    e.attachShader(o, i),
                    e.linkProgram(o),
                    e.deleteShader(t),
                    e.deleteShader(i),
                    this.program = o,
                    this.positionAttribute = e.getAttribLocation(o, "a_position"),
                    this.resolutionUniform = e.getUniformLocation(this.program, "u_resolution"))
                }
                getProgram() {
                    return this.program
                }
                getPositionAttribute() {
                    return this.positionAttribute
                }
                getResolutionUniform() {
                    return this.resolutionUniform
                }
                dispose(e) {
                    null !== this.program && e.deleteProgram(this.program)
                }
            }
        }
        ,
        7023: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.SolidColorShader = void 0;
            const i = s(7377);
            class n extends i.Shader {
                constructor() {
                    super(...arguments),
                    this.transformUniform = null,
                    this.colorUniform = null
                }
                updateProgram(e) {
                    super.updateProgram(e),
                    null !== this.program && (this.transformUniform = e.getUniformLocation(this.program, "u_transform"),
                    this.colorUniform = e.getUniformLocation(this.program, "u_color"))
                }
                getTransformUniform() {
                    return this.transformUniform
                }
                getColorUniform() {
                    return this.colorUniform
                }
                makeVertexShader() {
                    return "\n    attribute vec2 a_position;\n    \n    uniform vec2 u_resolution;\n    uniform vec4 u_transform;\n\n    varying vec2 v_texcoord;\n\n    void main() {\n      v_texcoord = a_position;\n      float aspect = u_resolution.y / u_resolution.x;\n      vec2 size = u_transform.zw / u_resolution.y * 2.0;\n      size.x *= aspect;\n      vec2 position = u_transform.xy / u_resolution.y * 2.0;\n      position.x = position.x * aspect - 1.0;\n      position.y = -position.y - size.y + 1.0;\n      gl_Position = vec4(a_position * size + position, 0.0, 1.0);\n    }"
                }
                makeFragmentShader() {
                    return "\n    precision highp float;\n\n    varying vec2 v_texcoord;\n\n    uniform vec4 u_transform;\n    uniform vec4 u_color;\n\n    void main() {\n      vec2 uv = v_texcoord;\n      uv = abs(uv - 0.5);\n      gl_FragColor = u_color;\n      vec2 border = u_transform.zw;\n      border = 0.5 - 4.0 / border;\n      if (any(greaterThan(uv, border))) {\n        gl_FragColor.rgb *= gl_FragColor.rgb;\n        gl_FragColor.a = 1.0;\n      }\n    }"
                }
            }
            t.SolidColorShader = n
        }
        ,
        5154: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.TextureShader = void 0;
            const i = s(7377);
            class n extends i.Shader {
                constructor() {
                    super(...arguments),
                    this.transformUniform = null,
                    this.rotationUniform = null,
                    this.tilesUniform = null,
                    this.shadeUniform = null
                }
                updateProgram(e) {
                    super.updateProgram(e),
                    null !== this.program && (this.transformUniform = e.getUniformLocation(this.program, "u_transform"),
                    this.rotationUniform = e.getUniformLocation(this.program, "u_rotation"),
                    this.tilesUniform = e.getUniformLocation(this.program, "u_tiles"),
                    this.shadeUniform = e.getUniformLocation(this.program, "u_shade"))
                }
                getTransformUniform() {
                    return this.transformUniform
                }
                getRotationUniform() {
                    return this.rotationUniform
                }
                getTilesUniform() {
                    return this.tilesUniform
                }
                getShadeUniform() {
                    return this.shadeUniform
                }
                makeVertexShader() {
                    return "\n    attribute vec2 a_position;\n    \n    uniform vec2 u_resolution;\n    uniform vec3 u_transform;\n    uniform float u_tiles;\n\n    varying vec2 v_texcoord;\n\n    void main() {\n      v_texcoord = a_position * u_tiles;\n      float aspect = u_resolution.y / u_resolution.x;\n      vec2 size = u_transform.zz / u_resolution.y * 2.0;\n      size.x *= aspect;\n      vec2 position = u_transform.xy / u_resolution.y * 2.0;\n      position.x = position.x * aspect - 1.0;\n      position.y = -position.y - size.y * 2.0 + 1.0;\n      gl_Position = vec4(a_position * size * u_tiles + position, 0.0, 1.0);\n    }"
                }
                makeFragmentShader() {
                    return "\n    precision lowp float;\n\n    varying vec2 v_texcoord;\n\n    uniform sampler2D u_texture;\n    uniform float u_shade;\n\n    void main() {\n      vec4 color = texture2D(u_texture, v_texcoord);\n      color.rgb = mix(color.rgb, vec3(0.8), u_shade);\n      gl_FragColor = color;\n    }"
                }
            }
            t.TextureShader = n
        }
        ,
        332: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIArrowInfo = void 0;
            const i = s(2413)
              , n = s(3446)
              , o = s(9148);
            class a extends o.UIComponent {
                constructor(e, t) {
                    super(e),
                    this.replaceInlineColors = e => {
                        const t = e.match(/#\w/);
                        if (null === t || 0 === t.length)
                            return "";
                        const s = t[0].at(1);
                        if (void 0 === s)
                            return "";
                        let i = "#000";
                        "r" === s ? i = "#f00" : "b" === s && (i = "#00f");
                        const n = e.match(/\((.+)\)/);
                        return null === n || 0 === n.length ? "" : `<span style="color:${i};">${n[1]}</span>`
                    }
                    ;
                    const s = document.createElement("div");
                    s.className = "ui-arrow-left-div",
                    this.element.appendChild(s);
                    const o = document.createElement("img");
                    o.src = `res/sprites/arrow${t}.png`,
                    o.className = "ui-arrow-info-image",
                    s.appendChild(o);
                    const a = document.createElement("div");
                    a.className = "ui-arrow-info-div",
                    this.element.appendChild(a);
                    const r = document.createElement("div");
                    r.className = "ui-arrow-info-name",
                    r.innerText = i.ArrowDescriptions.getArrowName(t),
                    a.appendChild(r);
                    const l = document.createElement("div");
                    l.className = "ui-arrow-info-text-title",
                    l.innerText = n.GameText.ACTIVATES.get(),
                    a.appendChild(l);
                    const h = document.createElement("div");
                    h.className = "ui-arrow-info-text";
                    const c = /(#(\w)(\(.+?\)))|@(\w+)/gm;
                    let d = i.ArrowDescriptions.getArrowActivation(t);
                    d = d.replace(c, this.replaceInlineColors),
                    h.innerHTML = d,
                    a.appendChild(h);
                    const u = document.createElement("div");
                    u.className = "ui-arrow-info-text-title",
                    u.innerText = n.GameText.ON_ACTIVATION.get(),
                    a.appendChild(u);
                    const g = document.createElement("div");
                    g.className = "ui-arrow-info-text";
                    let p = i.ArrowDescriptions.getArrowAction(t);
                    p = p.replace(c, this.replaceInlineColors),
                    g.innerHTML = p,
                    a.appendChild(g)
                }
                getClass() {
                    return "ui-arrow-info"
                }
            }
            t.UIArrowInfo = a
        }
        ,
        9148: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIComponent = void 0,
            t.UIComponent = class {
                constructor(e) {
                    this.element = document.createElement("div"),
                    this.isRemoved = !1,
                    e.appendChild(this.element),
                    this.element.className = this.getClass(),
                    this.mutationObserver = new MutationObserver(( () => {
                        document.body.contains(this.element) || this.remove()
                    }
                    )),
                    this.mutationObserver.observe(document.body, {
                        childList: !0,
                        subtree: !0
                    })
                }
                getRect() {
                    return this.element.getBoundingClientRect()
                }
                setVisibility(e) {
                    this.element.hidden = !e
                }
                getIsRemoved() {
                    return this.isRemoved
                }
                remove() {
                    this.isRemoved || (this.mutationObserver.disconnect(),
                    this.element.remove(),
                    this.isRemoved = !0)
                }
            }
        }
        ,
        9770: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIControlsHint = void 0;
            const i = s(7906)
              , n = s(9148);
            class o extends n.UIComponent {
                constructor(e, t) {
                    super(e),
                    this.replaceInlineKeys = e => `<span class="inline-key-blue">${e = e.replace("#", "").replace("(", "").replace(")", "")}</span>`,
                    this.state = "none",
                    this.rights = t,
                    this.hint = document.createElement("div"),
                    this.element.appendChild(this.hint)
                }
                updateRights(e) {
                    this.rights = e,
                    "free" === this.state ? this.showFreeCursorHint() : "arrow" === this.state ? this.showArrowCursorHint() : "selected" === this.state && this.showSelectedHint()
                }
                setState(e) {
                    this.state !== e && (this.state = e,
                    "none" === this.state ? this.hide() : "free" === this.state ? this.showFreeCursorHint() : "arrow" === this.state ? this.showArrowCursorHint() : "selected" === this.state && this.showSelectedHint())
                }
                showFreeCursorHint() {
                    this.hide();
                    let e = "";
                    this.rights.canMove && (e += `<p><img class="inline-icon-blue" src="res/icons/icon_mouse_left.svg"> ${i.ControlsHintsText.MOVE.get()}</p>`),
                    this.rights.canRotate && (e += `<p>#W #A #S #D ${i.ControlsHintsText.ROTATE.get()}</p>`),
                    this.rights.canDelete && (e += `<p>#R ${i.ControlsHintsText.DELETE.get()}</p>`),
                    this.rights.canSelect && (e += `<p>#E ${i.ControlsHintsText.SELECT.get()}</p>`),
                    this.rights.canUndo && (e += `<p>#Z ${i.ControlsHintsText.UNDO.get()}</p>`),
                    this.rights.canPause && (e += `<p>#(Space) ${i.ControlsHintsText.PAUSE.get()}</p>`),
                    this.rights.canOpenMenu && (e += `<p>#Esc ${i.ControlsHintsText.MENU.get()}</p>`),
                    e = e.replace(/(#(\w+))|(#\(.+?\))/gm, this.replaceInlineKeys),
                    this.hint.innerHTML += e
                }
                showArrowCursorHint() {
                    this.hide();
                    let e = "";
                    this.rights.canSetArrows && (e += `<p><img class="inline-icon-blue" src="res/icons/icon_mouse_left.svg"> ${i.ControlsHintsText.SET_ARROW.get()}</p>`),
                    this.rights.canMove && (e += `<p><img class="inline-icon-blue" src="res/icons/icon_mouse_middle.svg"> ${i.ControlsHintsText.MOVE.get()}</p>`),
                    this.rights.canRotate && (e += `<p>#W #A #S #D ${i.ControlsHintsText.ROTATE.get()}</p>`),
                    this.rights.canFlip && (e += `<p>#F ${i.ControlsHintsText.FLIP.get()}</p>`),
                    this.rights.canPick && (e += `<p>#Q ${i.ControlsHintsText.PICK.get()}</p>`),
                    this.rights.arrowGroups.length > 1 && (e += `<p>#Tab ${i.ControlsHintsText.INVENTORY.get()}</p>`),
                    e += `<p>#(~) ${i.ControlsHintsText.FREE_CURSOR.get()}</p>`,
                    e = e.replace(/(#(\w+))|(#\(.+?\))/gm, this.replaceInlineKeys),
                    this.hint.innerHTML += e
                }
                showSelectedHint() {
                    this.hide();
                    let e = "";
                    this.rights.canCopy && (e += `<p>#C ${i.ControlsHintsText.COPY.get()}</p>`),
                    this.rights.canPaste && (e += `<p>#V ${i.ControlsHintsText.PASTE.get()}</p>`),
                    this.rights.canCopy && this.rights.canDelete && (e += `<p>#X ${i.ControlsHintsText.CUT.get()}</p>`),
                    this.rights.canDelete && (e += `<p>#(⌫) ${i.ControlsHintsText.DELETE_SELECTION.get()}</p>`),
                    this.rights.canSelect && (e += `<p>#E ${i.ControlsHintsText.SELECT_OR_DESELECT.get()}</p>`),
                    this.rights.canSelect && (e += `<p>#(Shift + E) ${i.ControlsHintsText.ADD_SELECTION.get()}</p>`),
                    e = e.replace(/(#(\w+))|(#\(.+?\))/gm, this.replaceInlineKeys),
                    this.hint.innerHTML += e
                }
                hide() {
                    this.hint.remove(),
                    this.hint = document.createElement("div"),
                    this.element.appendChild(this.hint)
                }
                getClass() {
                    return "ui-controls-hint"
                }
            }
            t.UIControlsHint = o
        }
        ,
        1521: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIGameView = void 0;
            const i = s(5583)
              , n = s(2149)
              , o = s(9148);
            class a extends o.UIComponent {
                constructor(e, t) {
                    super(e),
                    this.resize = () => {
                        const e = this.element.clientWidth * window.devicePixelRatio
                          , t = this.element.clientHeight * window.devicePixelRatio;
                        this.game.resize(e, t),
                        this.resizeAction()
                    }
                    ,
                    this.update = () => {
                        this.isDeleted || (this.game.updateFrame(),
                        this.game.draw(),
                        this.time += .017,
                        window.requestAnimationFrame(this.update))
                    }
                    ,
                    this.time = 0,
                    this.isDeleted = !1,
                    this.resizeAction = () => {}
                    ;
                    const s = document.createElement("canvas");
                    s.className = "ui-game-view-canvas",
                    this.element.appendChild(s);
                    const o = s.getContext("webgl", {
                        premultipliedAlpha: !1,
                        preserveDrawingBuffer: !0
                    });
                    this.game = new i.Game(o,s.width,s.height),
                    this.resize();
                    const a = window.atob(t).split("").map((e => e.charCodeAt(0)));
                    (0,
                    n.load)(this.game.gameMap, a),
                    this.game.drawPastedArrows = !0,
                    window.requestAnimationFrame(this.update),
                    window.addEventListener("resize", this.resize)
                }
                getClass() {
                    return "ui-game-view"
                }
                setResizeAction(e) {
                    this.resizeAction = e,
                    this.resizeAction()
                }
                remove() {
                    this.isDeleted = !0,
                    window.removeEventListener("resize", this.resize),
                    this.game.dispose(),
                    super.remove()
                }
            }
            t.UIGameView = a
        }
        ,
        9984: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIInventory = void 0;
            const i = s(258)
              , n = s(9148);
            class o extends n.UIComponent {
                constructor(e) {
                    super(e),
                    this.dialog = document.createElement("dialog"),
                    this.itemsBlock = document.createElement("div"),
                    this.selectCallback = () => {}
                    ,
                    this.arrowGroups = [],
                    this.arrows = [],
                    this.dialog.className = "ui-inventory",
                    this.element.appendChild(this.dialog),
                    this.dialog.appendChild(this.itemsBlock),
                    this.dialog.onmousedown = e => e.stopPropagation(),
                    this.dialog.onclick = () => this.dialog.close()
                }
                show() {
                    this.dialog.showModal()
                }
                hide() {
                    this.dialog.close()
                }
                toggle() {
                    this.dialog.open ? this.dialog.close() : this.dialog.showModal()
                }
                setSelectCallback(e) {
                    this.selectCallback = e
                }
                addArrows(e) {
                    this.arrows = [],
                    this.arrowGroups = e,
                    this.itemsBlock.remove(),
                    this.itemsBlock = document.createElement("div"),
                    this.itemsBlock.className = "ui-inventory-items",
                    this.dialog.appendChild(this.itemsBlock);
                    for (let t = 0; t < e.length; t++) {
                        const s = e[t]
                          , n = document.createElement("div");
                        n.className = "ui-inventory-line",
                        this.itemsBlock.appendChild(n),
                        this.arrows.push([]);
                        for (let e = 0; e < s.length; e++) {
                            const o = document.createElement("div");
                            o.className = "inventory-item",
                            o.onclick = () => {
                                this.selectCallback(s[e])
                            }
                            ,
                            n.appendChild(o);
                            const a = document.createElement("img");
                            a.src = `/res/sprites/arrow${s[e]}.png?v=${i.PlayerSettings.version}`,
                            o.appendChild(a),
                            this.arrows[t].push(o)
                        }
                    }
                }
                updateSelected(e) {
                    for (let t = 0; t < this.arrowGroups.length; t++)
                        for (let s = 0; s < this.arrowGroups[t].length; s++) {
                            const i = this.arrows[t][s];
                            i.classList.remove("ui-toolbar-item-active"),
                            this.arrowGroups[t][s] === e && i.classList.add("ui-toolbar-item-active")
                        }
                }
                getClass() {
                    return "ui-inventory-div"
                }
            }
            t.UIInventory = o
        }
        ,
        1402: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UILevelPlayButton = void 0;
            const i = s(9148);
            class n extends i.UIComponent {
                constructor(e, t) {
                    super(e);
                    const s = document.createElement("img");
                    s.src = "res/icons/level-play-button.svg",
                    s.className = "level-play-button",
                    s.onclick = () => {}
                    ,
                    this.element.appendChild(s),
                    this.element.addEventListener("click", t),
                    this.element.onmousedown = e => e.stopPropagation()
                }
                getClass() {
                    return "ui-level-play-button"
                }
            }
            t.UILevelPlayButton = n
        }
        ,
        1418: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIMapsMenuItem = void 0;
            const i = s(9148);
            class n extends i.UIComponent {
                constructor(e, t, s) {
                    super(e),
                    this.element.addEventListener("click", ( () => s()));
                    const i = document.createElement("div");
                    i.className = "ui-maps-menu-item-name",
                    this.element.appendChild(i),
                    i.innerText = t
                }
                getClass() {
                    return "ui-new-item"
                }
            }
            t.UIMapsMenuItem = n
        }
        ,
        503: function(e, t, s) {
            var i = this && this.__awaiter || function(e, t, s, i) {
                return new (s || (s = Promise))((function(n, o) {
                    function a(e) {
                        try {
                            l(i.next(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function r(e) {
                        try {
                            l(i.throw(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function l(e) {
                        var t;
                        e.done ? n(e.value) : (t = e.value,
                        t instanceof s ? t : new s((function(e) {
                            e(t)
                        }
                        ))).then(a, r)
                    }
                    l((i = i.apply(e, t || [])).next())
                }
                ))
            }
            ;
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIMenu = void 0;
            const n = s(3446)
              , o = s(2461)
              , a = s(2714)
              , r = s(974)
              , l = s(8560);
            class h extends l.UIPanel {
                constructor(e, t, s) {
                    super(e),
                    this.setSaved = e => {
                        this.savingDiv.innerText = 413 === e ? `${n.GameText.UNABLE_TO_SAVE.get()}. ${n.GameText.MAP_TOO_LARGE.get()}.` : 200 !== e ? n.GameText.UNABLE_TO_SAVE.get() : n.GameText.SAVED.get()
                    }
                    ,
                    this.messagePanelDiv = document.createElement("div"),
                    this.messagePanelDiv.className = "ui-menu-panel",
                    this.messagePanelDiv.onpointerdown = e => e.stopPropagation(),
                    this.element.appendChild(this.messagePanelDiv);
                    const i = document.createElement("input");
                    i.type = "text",
                    i.placeholder = n.GameText.MAP_NAME.get(),
                    i.value = t.name,
                    i.maxLength = 32,
                    i.className = "ui-menu-map-name-input",
                    i.onblur = () => {
                        "" !== i.value && i.value !== t.name && (t.name = i.value,
                        this.setSaving(),
                        document.title = `${t.name} | ${n.GameText.ARROWS_TITLE.get()}`,
                        o.Routes.saveMapInfo(t, this.setSaved))
                    }
                    ,
                    this.messagePanelDiv.appendChild(i);
                    const a = document.createElement("img");
                    a.src = t.isPublic ? "res/icons/icon_public_active.svg" : "res/icons/icon_public.svg",
                    a.className = "ui-menu-public-checkbox",
                    a.onclick = () => {
                        t.isPublic = !t.isPublic,
                        this.setSaving(),
                        o.Routes.saveMapInfo(t, this.setSaved),
                        a.src = t.isPublic ? "res/icons/icon_public_active.svg" : "res/icons/icon_public.svg"
                    }
                    ,
                    this.messagePanelDiv.appendChild(a),
                    this.savingDiv = document.createElement("div"),
                    this.savingDiv.className = "ui-menu-saving",
                    this.saveMap(t, s)
                }
                saveMap(e, t) {
                    return i(this, void 0, void 0, (function*() {
                        this.setSaving(),
                        this.messagePanelDiv.appendChild(this.savingDiv);
                        const s = (0,
                        a.save)(t.gameMap)
                          , i = r.Utils.arrayBufferToBase64(s);
                        if (i === e.data)
                            return void this.setSaved(200);
                        const n = yield o.Routes.saveMap(e.id, i);
                        this.setSaved(n)
                    }
                    ))
                }
                setSaving() {
                    this.savingDiv.innerText = n.GameText.SAVING.get()
                }
            }
            t.UIMenu = h
        },
        881: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIOkCancel = void 0;
            const i = s(3446)
              , n = s(8560);
            class o extends n.UIPanel {
                constructor(e, t, s, n) {
                    super(e);
                    const o = document.createElement("div");
                    o.className = "ui-ok-cancel-panel",
                    this.element.appendChild(o),
                    this.element.onpointerdown = e => e.stopPropagation();
                    const a = document.createElement("div");
                    a.innerText = t,
                    a.className = "ui-ok-cancel-message",
                    o.appendChild(a);
                    const r = document.createElement("div");
                    r.className = "ui-ok-cancel-bottom",
                    o.appendChild(r);
                    const l = document.createElement("div");
                    l.className = "ui-button",
                    l.innerText = s,
                    r.appendChild(l),
                    l.addEventListener("click", ( () => {
                        this.remove(),
                        n()
                    }
                    ));
                    const h = document.createElement("div");
                    h.className = "ui-button",
                    h.innerText = i.GameText.CANCEL.get(),
                    r.appendChild(h),
                    h.addEventListener("click", ( () => this.element.remove()))
                }
            }
            t.UIOkCancel = o
        }
        ,
        8560: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIPanel = void 0;
            const i = s(9148);
            class n extends i.UIComponent {
                constructor(e) {
                    super(e),
                    this.element.onpointerdown = () => {
                        this.remove()
                    }
                }
                getClass() {
                    return "ui-panel"
                }
            }
            t.UIPanel = n
        }
        ,
        6709: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIPauseSign = void 0;
            const i = s(9148);
            class n extends i.UIComponent {
                constructor(e) {
                    super(e),
                    this.element.hidden = !0;
                    const t = document.createElement("div");
                    t.className = "ui-pause-sign-line",
                    this.element.appendChild(t);
                    const s = document.createElement("div");
                    s.className = "ui-pause-sign-line",
                    this.element.appendChild(s)
                }
                getClass() {
                    return "ui-pause-sign"
                }
            }
            t.UIPauseSign = n
        }
        ,
        3516: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIRange = void 0;
            const i = s(9148);
            class n extends i.UIComponent {
                constructor(e, t, s=( () => "")) {
                    super(e),
                    this.mouseUp = () => {
                        this.mousePressed = !1,
                        this.textElement.classList.remove("active")
                    }
                    ,
                    this.mouseMove = e => {
                        if (!this.mousePressed)
                            return;
                        const t = e.clientX - this.rect.left - this.mouseOffset
                          , s = 1 - this.thumbRect.width / this.rect.width
                          , i = t / this.rect.width / s;
                        this.value = Math.max(0, Math.min(this.maxValue, Math.round(i * this.maxValue)));
                        const n = this.value / this.maxValue * s;
                        this.thumb.style.left = 100 * n + "%",
                        this.textElement.classList.add("active"),
                        this.textElement.innerText = this.messageCallback(this.value)
                    }
                    ,
                    this.mousePressed = !1,
                    this.mouseOffset = 0,
                    this.value = 0,
                    this.maxValue = t - 1,
                    this.thumb = document.createElement("div"),
                    this.thumb.className = "ui-range-thumb",
                    this.element.appendChild(this.thumb),
                    this.rect = this.element.getBoundingClientRect(),
                    this.thumbRect = this.thumb.getBoundingClientRect(),
                    this.textElement = document.createElement("span"),
                    this.textElement.className = "ui-text-message",
                    this.element.appendChild(this.textElement);
                    const i = this.thumbRect.width / this.rect.width * 100;
                    for (let e = 0; e <= this.maxValue; e++) {
                        const t = document.createElement("div");
                        t.className = "ui-range-tick",
                        t.style.left = 100 * e / (this.maxValue + 1) + i / 2 + "%",
                        this.element.appendChild(t)
                    }
                    this.messageCallback = s,
                    this.thumb.onpointerdown = e => this.mouseDown(e),
                    document.addEventListener("pointerup", ( () => this.mouseUp())),
                    document.addEventListener("pointermove", (e => this.mouseMove(e)))
                }
                getClass() {
                    return "ui-range"
                }
                isMouseCaptured() {
                    return this.mousePressed
                }
                getValue() {
                    return this.value
                }
                remove() {
                    document.removeEventListener("pointerup", this.mouseUp),
                    document.removeEventListener("pointermove", this.mouseMove),
                    super.remove()
                }
                mouseDown(e) {
                    this.rect = this.element.getBoundingClientRect(),
                    this.thumbRect = this.thumb.getBoundingClientRect(),
                    this.mousePressed = !0,
                    this.mouseOffset = e.clientX - this.thumbRect.left
                }
            }
            t.UIRange = n
        }
        ,
        9676: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UISavedItem = void 0;
            const i = s(3446)
              , n = s(2461)
              , o = s(9148)
              , a = s(881);
            class r extends o.UIComponent {
                constructor(e, t, s) {
                    super(e),
                    this.element.addEventListener("click", ( () => s(t)));
                    const o = document.createElement("div");
                    o.className = "ui-saved-item-top",
                    this.element.appendChild(o);
                    const r = document.createElement("div");
                    if (r.className = "ui-saved-item-name",
                    r.innerText = t.name,
                    o.appendChild(r),
                    t.isPublic) {
                        const e = document.createElement("img");
                        e.src = "res/icons/icon_public_active.svg",
                        e.className = "ui-saved-item-public",
                        o.appendChild(e)
                    }
                    const l = document.createElement("div");
                    l.className = "ui-saved-item-bottom",
                    this.element.appendChild(l);
                    const h = document.createElement("div");
                    h.className = "ui-saved-item-tags",
                    l.appendChild(h),
                    h.innerText = t.tags.join(", ");
                    const c = document.createElement("img");
                    c.src = "res/icons/icon_bin.svg",
                    c.alt = i.GameText.DELETE.get(),
                    c.className = "ui-saved-item-delete",
                    l.appendChild(c);
                    const d = () => {
                        n.Routes.deleteMap(t.id, ( () => {
                            this.dispose()
                        }
                        ))
                    }
                    ;
                    c.addEventListener("click", (e => {
                        e.stopPropagation();
                        const s = `${i.GameText.DELETE.get()} ${t.name}?`;
                        new a.UIOkCancel(document.body,s,i.GameText.DELETE.get(),d)
                    }
                    ))
                }
                dispose() {
                    this.remove()
                }
                getClass() {
                    return "ui-saved-item"
                }
            }
            t.UISavedItem = r
        }
        ,
        2203: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIToolbarArrow = void 0;
            const i = s(9148);
            class n extends i.UIComponent {
                constructor(e, t) {
                    super(e),
                    this.type = t,
                    this.element.className = this.getClass();
                    const s = document.createElement("img");
                    s.src = "res/icons/toolbar-arrow.svg",
                    s.className = "toolbar-arrow-icon",
                    s.onclick = () => {}
                    ,
                    s.onmousedown = e => {
                        e.stopPropagation(),
                        e.preventDefault()
                    }
                    ,
                    this.element.appendChild(s)
                }
                setCallback(e) {
                    this.element.onclick = e
                }
                toggle(e) {
                    e ? this.element.classList.remove("disabled") : this.element.classList.add("disabled")
                }
                getClass() {
                    return `ui-toolbar-arrow-${this.type}`
                }
            }
            t.UIToolbarArrow = n
        }
        ,
        8783: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIToolbarItemEmpty = void 0;
            const i = s(9148);
            class n extends i.UIComponent {
                constructor(e) {
                    super(e),
                    this.mouseCaptured = !1,
                    this.pointerUp = () => {
                        this.mouseCaptured = !1
                    }
                    ,
                    this.element.onpointerdown = () => {
                        this.mouseCaptured = !0
                    }
                    ,
                    document.addEventListener("pointerup", this.pointerUp)
                }
                getClass() {
                    return "ui-toolbar-item-empty"
                }
                isMouseCaptured() {
                    return this.mouseCaptured
                }
                remove() {
                    document.removeEventListener("pointerup", this.pointerUp),
                    super.remove()
                }
            }
            t.UIToolbarItemEmpty = n
        }
        ,
        1655: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIToolbarItem = void 0;
            const i = s(258)
              , n = s(9148);
            class o extends n.UIComponent {
                constructor(e, t, s, i) {
                    super(e),
                    this.mouseCaptured = !1,
                    this.pointerUp = () => {
                        this.mouseCaptured = !1
                    }
                    ,
                    this.arrowType = s + 1,
                    this.image = document.createElement("img"),
                    this.setImage(s),
                    this.image.draggable = !1,
                    this.element.appendChild(this.image);
                    const n = document.createElement("span");
                    n.innerText = `${t}`,
                    this.element.appendChild(n),
                    this.element.onpointerdown = () => {
                        i(this.arrowType),
                        this.mouseCaptured = !0
                    }
                    ,
                    document.addEventListener("pointerup", this.pointerUp)
                }
                setImage(e) {
                    this.image.src = `res/sprites/arrow${e + 1}.png?v=${i.PlayerSettings.version}`
                }
                activate() {
                    this.element.classList.add("ui-toolbar-item-active")
                }
                deactivate() {
                    this.element.classList.remove("ui-toolbar-item-active")
                }
                getClass() {
                    return "ui-toolbar-item"
                }
                isMouseCaptured() {
                    return this.mouseCaptured
                }
                remove() {
                    document.removeEventListener("pointerup", this.pointerUp),
                    super.remove()
                }
            }
            t.UIToolbarItem = o
        }
        ,
        9841: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIToolbar = void 0;
            const i = s(9148)
              , n = s(2203)
              , o = s(1655)
              , a = s(8783);
            class r extends i.UIComponent {
                constructor(e, t, s) {
                    super(e),
                    this.items = [],
                    this.mouseCaptured = !1,
                    this.itemsDiv = document.createElement("div"),
                    this.itemsDiv.className = "ui-toolbar-items",
                    this.arrowLeft = new n.UIToolbarArrow(this.element,"left"),
                    this.element.appendChild(this.itemsDiv),
                    this.arrowRight = new n.UIToolbarArrow(this.element,"right"),
                    this.setArrows(t, s),
                    this.selectCallback = () => {}
                    ,
                    this.setItems(t, s),
                    this.element.onpointerdown = e => {
                        this.mouseCaptured = !0
                    }
                    ,
                    this.element.onpointerup = e => {
                        this.mouseCaptured = !1
                    }
                }
                setItems(e, t) {
                    this.setArrows(e, t);
                    for (let e = 0; e < this.items.length; e++)
                        this.items[e].remove();
                    this.items = [],
                    this.setVisibility(0 !== t[e].length);
                    for (let s = 0; s < 5; s++)
                        if (s < t[e].length) {
                            const i = new o.UIToolbarItem(this.itemsDiv,s + 1,t[e][s] - 1,this.selectCallback);
                            this.items.push(i)
                        } else {
                            const e = new a.UIToolbarItemEmpty(this.itemsDiv);
                            this.items.push(e)
                        }
                }
                activateItem(e) {
                    for (let t = 0; t < this.items.length; t++) {
                        const s = this.items[t];
                        s instanceof a.UIToolbarItemEmpty || (s.deactivate(),
                        s.arrowType === e && s.activate())
                    }
                }
                isMouseCaptured() {
                    if (this.mouseCaptured)
                        return !0;
                    for (let e = 0; e < this.items.length; e++)
                        if (this.items[e].isMouseCaptured())
                            return !0;
                    return !1
                }
                setSelectCallback(e) {
                    this.selectCallback = e
                }
                setArrowsCallback(e, t) {
                    this.arrowLeft.setCallback(e),
                    this.arrowRight.setCallback(t)
                }
                getClass() {
                    return "ui-toolbar"
                }
                setArrows(e, t) {
                    this.arrowLeft.toggle(0 !== e),
                    this.arrowRight.toggle(e !== t.length - 1)
                }
            }
            t.UIToolbar = r
        }
        ,
        9237: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.UIToolbarController = void 0;
            const i = s(9148)
              , n = s(9984)
              , o = s(9841);
            class a extends i.UIComponent {
                constructor(e) {
                    super(document.body),
                    this.ITEMS_PER_GROUP = 6,
                    this.currentGroup = 0,
                    this.activeType = -1,
                    this.arrowGroups = [],
                    e.forEach((e => {
                        this.arrowGroups.push(e.slice())
                    }
                    )),
                    this.uiToolbar = new o.UIToolbar(this.element,0,this.arrowGroups),
                    this.inventory = new n.UIInventory(this.element),
                    this.inventory.addArrows(e)
                }
                getClass() {
                    return "ui-toolbar-controller"
                }
                showInventory() {
                    this.inventory.show()
                }
                hideInventory() {
                    this.inventory.hide()
                }
                toggleInventory() {
                    this.inventory.toggle()
                }
                nextGroup() {
                    void 0 !== this.arrowGroups[this.currentGroup + 1] && (this.currentGroup++,
                    this.uiToolbar.setItems(this.currentGroup, this.arrowGroups),
                    this.activateItem(this.activeType))
                }
                previousGroup() {
                    void 0 !== this.arrowGroups[this.currentGroup - 1] && (this.currentGroup--,
                    this.uiToolbar.setItems(this.currentGroup, this.arrowGroups),
                    this.activateItem(this.activeType))
                }
                getCurrentGroup() {
                    return this.arrowGroups[this.currentGroup]
                }
                activateItem(e) {
                    this.activeType = e,
                    this.uiToolbar.activateItem(e),
                    this.inventory.updateSelected(e)
                }
                setSelectCallback(e) {
                    this.uiToolbar.setSelectCallback((t => e(t))),
                    this.uiToolbar.setArrowsCallback(( () => this.previousGroup()), ( () => this.nextGroup())),
                    this.uiToolbar.setItems(this.currentGroup, this.arrowGroups),
                    this.activateItem(this.activeType),
                    this.inventory.setSelectCallback((t => {
                        this.setGroupByType(t),
                        e(t)
                    }
                    ))
                }
                isMouseCaptured() {
                    return this.uiToolbar.isMouseCaptured()
                }
                remove() {
                    this.inventory.remove(),
                    this.uiToolbar.remove()
                }
                setGroupByType(e) {
                    for (let t = 0; t < this.arrowGroups.length; t++)
                        if (-1 !== this.arrowGroups[t].indexOf(e)) {
                            this.currentGroup = t,
                            this.uiToolbar.setItems(t, this.arrowGroups);
                            break
                        }
                }
            }
            t.UIToolbarController = a
        }
        ,
        8939: function(e, t) {
            var s, i = this && this.__awaiter || function(e, t, s, i) {
                return new (s || (s = Promise))((function(n, o) {
                    function a(e) {
                        try {
                            l(i.next(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function r(e) {
                        try {
                            l(i.throw(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function l(e) {
                        var t;
                        e.done ? n(e.value) : (t = e.value,
                        t instanceof s ? t : new s((function(e) {
                            e(t)
                        }
                        ))).then(a, r)
                    }
                    l((i = i.apply(e, t || [])).next())
                }
                ))
            }
            ;
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.ArrowsDB = void 0,
            function(e) {
                function t(e, t) {
                    e.result.objectStoreNames.contains(t) || e.result.createObjectStore(t, {
                        keyPath: "id"
                    }).createIndex("id", "id", {
                        unique: !0
                    })
                }
                function s(e) {
                    t(e, "clipboard"),
                    t(e, "mapCache")
                }
                e.write = function(e, t) {
                    return i(this, void 0, void 0, (function*() {
                        const n = indexedDB.open("arrows", 2);
                        n.onupgradeneeded = () => s(n),
                        n.onsuccess = () => i(this, void 0, void 0, (function*() {
                            const s = n.result;
                            yield function(e, t, s) {
                                return i(this, void 0, void 0, (function*() {
                                    const i = e.transaction([t], "readwrite").objectStore(t).put(s);
                                    return new Promise(( (e, t) => {
                                        i.onsuccess = t => {
                                            const s = t.target;
                                            s instanceof IDBRequest && e(s.result)
                                        }
                                        ,
                                        i.onerror = e => {
                                            t(e)
                                        }
                                    }
                                    ))
                                }
                                ))
                            }(s, e, t)
                        }
                        )),
                        n.onerror = () => {
                            throw new Error("Error opening database")
                        }
                    }
                    ))
                }
                ,
                e.read = function(e, t) {
                    return i(this, void 0, void 0, (function*() {
                        const n = indexedDB.open("arrows", 2);
                        return n.onupgradeneeded = () => s(n),
                        new Promise(( (s, o) => {
                            n.onsuccess = () => i(this, void 0, void 0, (function*() {
                                const o = n.result
                                  , a = yield function(e, t, s) {
                                    return i(this, void 0, void 0, (function*() {
                                        const i = e.transaction([t], "readwrite").objectStore(t).get(s);
                                        return new Promise(( (e, t) => {
                                            i.onsuccess = t => {
                                                const s = t.target;
                                                s instanceof IDBRequest && e(s.result)
                                            }
                                            ,
                                            i.onerror = e => {
                                                t(e)
                                            }
                                        }
                                        ))
                                    }
                                    ))
                                }(o, e, t);
                                s(a)
                            }
                            )),
                            n.onerror = e => {
                                o(e)
                            }
                        }
                        ))
                    }
                    ))
                }
            }(s || (t.ArrowsDB = s = {}))
        },
        7755: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.AuthGoogle = void 0;
            const i = s(2461);
            var n;
            !function(e) {
                e.getAuthURL = function() {
                    const e = {
                        redirect_uri: `${i.Routes.getURL()}/auth/google`,
                        client_id: "480103000605-r44ki2s4brehsbih1nb676gnialp4a5v.apps.googleusercontent.com",
                        access_type: "offline",
                        response_type: "code",
                        prompt: "consent",
                        scope: "https://www.googleapis.com/auth/userinfo.email"
                    };
                    return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(e).toString()}`
                }
            }(n || (t.AuthGoogle = n = {}))
        }
        ,
        2149: (e, t) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.load = void 0,
            t.load = function(e, t) {
                if (t.length < 4)
                    return;
                let s = 0
                  , i = t[s++];
                if (i |= t[s++] << 8,
                0 !== i)
                    throw new Error("Unsupported save version");
                let n = t[s++];
                n |= t[s++] << 8;
                for (let i = 0; i < n; i++) {
                    let i = t[s++];
                    i |= (127 & t[s++]) << 8,
                    0 != (128 & t[s - 1]) && (i = -i);
                    let n = t[s++];
                    n |= (127 & t[s++]) << 8,
                    0 != (128 & t[s - 1]) && (n = -n);
                    const o = t[s++] + 1
                      , a = e.getOrCreateChunk(i, n);
                    for (let e = 0; e < o; e++) {
                        const e = t[s++]
                          , i = t[s++] + 1;
                        for (let n = 0; n < i; n++) {
                            const i = t[s++]
                              , n = t[s++]
                              , o = a.getArrow(15 & i, i >> 4);
                            o.type = e,
                            o.rotation = 3 & n,
                            o.flipped = 0 != (4 & n)
                        }
                    }
                }
            }
        }
        ,
        2461: function(e, t) {
            var s, i = this && this.__awaiter || function(e, t, s, i) {
                return new (s || (s = Promise))((function(n, o) {
                    function a(e) {
                        try {
                            l(i.next(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function r(e) {
                        try {
                            l(i.throw(e))
                        } catch (e) {
                            o(e)
                        }
                    }
                    function l(e) {
                        var t;
                        e.done ? n(e.value) : (t = e.value,
                        t instanceof s ? t : new s((function(e) {
                            e(t)
                        }
                        ))).then(a, r)
                    }
                    l((i = i.apply(e, t || [])).next())
                }
                ))
            }
            ;
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.Routes = void 0,
            function(e) {
                function t() {
                    const e = "localhost" === window.location.hostname ? ":3000" : "";
                    return `${window.location.protocol}//${window.location.hostname}${e}/api`
                }
                e.getURL = t,
                e.getMap = function(e, s) {
                    const i = `${t()}/map`;
                    fetch(i, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            id: e
                        }),
                        credentials: "include"
                    }).then((e => {
                        401 !== e.status ? e.text().then((e => {
                            const t = JSON.parse(e);
                            s(t)
                        }
                        )) : window.location.href = "/login"
                    }
                    ))
                }
                ,
                e.getMaps = function(e) {
                    const s = `${t()}/maps`;
                    return new Promise((t => {
                        fetch(s, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                ids: e
                            }),
                            credentials: "include"
                        }).then((e => {
                            if (401 === e.status)
                                return window.location.href = "/login",
                                void t([]);
                            e.text().then((e => {
                                const s = JSON.parse(e);
                                t(s)
                            }
                            ))
                        }
                        ))
                    }
                    ))
                }
                ,
                e.getMapsInfo = function() {
                    const e = `${t()}/mapsinfo`;
                    return new Promise((t => {
                        fetch(e, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: "",
                            credentials: "include"
                        }).then((e => {
                            if (401 === e.status)
                                return window.location.href = "/login",
                                void t([]);
                            e.text().then((e => {
                                const s = JSON.parse(e);
                                for (let e = 0; e < s.length; e++)
                                    s[e].data = "";
                                t(s)
                            }
                            ))
                        }
                        ))
                    }
                    ))
                }
                ,
                e.saveMap = function(e, s) {
                    if (s.length > 2e6)
                        return Promise.resolve(413);
                    const i = {
                        id: e,
                        data: s
                    }
                      , n = `${t()}/update`;
                    return new Promise((e => {
                        fetch(n, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(i),
                            credentials: "include"
                        }).then((t => {
                            e(t.status),
                            401 === t.status && (window.location.href = "/login")
                        }
                        ))
                    }
                    ))
                }
                ,
                e.saveMapInfo = function(e, s) {
                    const i = {
                        id: e.id,
                        name: e.name,
                        tags: e.tags,
                        isPublic: e.isPublic
                    }
                      , n = `${t()}/updateinfo`;
                    fetch(n, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(i),
                        credentials: "include"
                    }).then((e => {
                        401 !== e.status ? e.text().then(( () => {
                            s(e.status)
                        }
                        )) : window.location.href = "/login"
                    }
                    ))
                }
                ,
                e.createMap = function(e) {
                    const s = `${t()}/create`;
                    fetch(s, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        credentials: "include"
                    }).then((t => {
                        401 !== t.status ? t.text().then((t => {
                            const s = JSON.parse(t);
                            e(s)
                        }
                        )) : window.location.href = "/login"
                    }
                    ))
                }
                ,
                e.deleteMap = function(e, s) {
                    const i = {
                        id: e
                    }
                      , n = `${t()}/delete`;
                    fetch(n, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(i),
                        credentials: "include"
                    }).then((e => {
                        401 !== e.status ? e.text().then(( () => {
                            s()
                        }
                        )) : window.location.href = "/login"
                    }
                    ))
                }
                ,
                e.checkUser = function(e, s) {
                    const i = `${t()}/checkuser`;
                    fetch(i, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: "",
                        credentials: "include"
                    }).then((t => {
                        t.json().then((t => {
                            const i = JSON.parse(t);
                            null !== i && "null" !== i && "object" == typeof i && "name"in i && "string" == typeof i.name && "" !== i.name && "Untitled" !== i.name ? e(i.name) : s()
                        }
                        ))
                    }
                    ))
                }
                ,
                e.checkNameChange = function() {
                    return i(this, void 0, void 0, (function*() {
                        const e = `${t()}/checknamechange`;
                        return new Promise((t => {
                            fetch(e, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: "",
                                credentials: "include"
                            }).then((e => {
                                e.text().then((e => {
                                    t('"false"' !== e)
                                }
                                ))
                            }
                            ))
                        }
                        ))
                    }
                    ))
                }
                ,
                e.logout = function() {
                    const e = `${t()}/logout`;
                    fetch(e, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: "",
                        credentials: "include"
                    }).then(( () => {
                        window.location.href = "/login"
                    }
                    ))
                }
                ,
                e.setName = function(e) {
                    const s = `${t()}/setname`;
                    return new Promise((t => {
                        fetch(s, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                name: e
                            }),
                            credentials: "include"
                        }).then((e => {
                            200 !== e.status ? t(!1) : t(!0)
                        }
                        ))
                    }
                    ))
                }
                ,
                e.getLevels = function() {
                    const e = `${t()}/getlevels`;
                    return new Promise((t => {
                        fetch(e, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: "",
                            credentials: "include"
                        }).then((e => {
                            e.json().then((e => {
                                const s = JSON.parse(e);
                                null !== s && "null" !== s && "object" == typeof s && Array.isArray(s) ? t(s) : t([])
                            }
                            ))
                        }
                        ))
                    }
                    ))
                }
                ,
                e.completeLevel = function(e) {
                    const s = `${t()}/completelevel`;
                    return new Promise((t => {
                        fetch(s, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                level: e
                            }),
                            credentials: "include"
                        }).then(( () => {
                            t()
                        }
                        ))
                    }
                    ))
                }
            }(s || (t.Routes = s = {}))
        },
        2714: (e, t, s) => {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.save = void 0;
            const i = s(3278);
            t.save = function(e) {
                const t = [];
                return t.push(0, 0),
                t.push(255 & e.chunks.size, e.chunks.size >> 8 & 255),
                e.chunks.forEach((e => {
                    const s = e.getArrowTypes()
                      , n = [255 & Math.abs(e.x), Math.abs(e.x) >> 8 & 255]
                      , o = [255 & Math.abs(e.y), Math.abs(e.y) >> 8 & 255];
                    e.x < 0 ? n[1] |= 128 : n[1] &= 127,
                    e.y < 0 ? o[1] |= 128 : o[1] &= 127,
                    t.push(...n),
                    t.push(...o),
                    t.push(s.length - 1),
                    s.forEach((s => {
                        t.push(s),
                        t.push(0);
                        const n = t.length - 1;
                        let o = 0;
                        for (let n = 0; n < i.CHUNK_SIZE; n++)
                            for (let a = 0; a < i.CHUNK_SIZE; a++) {
                                const i = e.getArrow(n, a);
                                if (i.type === s) {
                                    const e = n | a << 4
                                      , s = i.rotation | (i.flipped ? 1 : 0) << 2;
                                    t.push(e),
                                    t.push(s),
                                    o++
                                }
                            }
                        t[n] = o - 1
                    }
                    ))
                }
                )),
                t
            }
        }
        ,
        974: (e, t) => {
            var s;
            Object.defineProperty(t, "__esModule", {
                value: !0
            }),
            t.Utils = void 0,
            function(e) {
                e.arrayBufferToBase64 = function(e) {
                    let t = "";
                    const s = new Uint8Array(e)
                      , i = s.byteLength;
                    for (let e = 0; e < i; e++)
                        t += String.fromCharCode(s[e]);
                    return window.btoa(t)
                }
            }(s || (t.Utils = s = {}))
        }
    }
      , t = {};
    function s(i) {
        var n = t[i];
        if (void 0 !== n)
            return n.exports;
        var o = t[i] = {
            exports: {}
        };
        return e[i].call(o.exports, o, o.exports, s),
        o.exports
    }
    ( () => {
        const e = s(691)
          , t = s(2413)
          , i = s(3446)
          , n = s(3295)
          , o = s(3737)
          , a = s(1494)
          , r = s(258)
          , l = s(8939)
          , h = s(2149)
          , c = s(2461)
          , d = s(2714)
          , u = s(974)
          , g = new a.Navigation
          , p = new Image;
        r.PlayerSettings.arrowAtlasImage = p,
        p.src = `res/sprites/atlas.png?v=${r.PlayerSettings.version}`,
        p.addEventListener("load", ( () => (( () => {
            for (let e = 0; e < navigator.languages.length; e++) {
                let t = navigator.languages[e];
                const s = t.indexOf("-");
                -1 !== s && (t = t.substring(0, s));
                const i = o.LangUtils.getLanguageFromString(t);
                if (n.LangSettings.languages.includes(i)) {
                    n.LangSettings.setLanguage(i);
                    break
                }
            }
        }
        )(),
        void g.start()))),
        window.game = {
            navigation: g,
            PlayerSettings: r.PlayerSettings,
            LangSettings: n.LangSettings,
            LangUtils: o.LangUtils,
            ChunkUpdates: e.ChunkUpdates,
            ArrowsDB: l.ArrowsDB,
            Routes: c.Routes,
            ArrowDescriptions: t.ArrowDescriptions,
            GameText: i.GameText,
            Utils: u.Utils,
            save: d.save,
            load: h.load
        }
    }
    )()
}
)();
