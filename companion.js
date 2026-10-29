/* 作者：周梓润 */
/* ============================================================
   看板娘系统：多角色可选（2男2女+星旅）+ 戳一戳/双击/待机碎碎念/业务联动
   ============================================================ */

const COMPANIONS = {
    xinglv: {
        name: '星旅', gender: 'female', tag: '猫耳向导',
        img: {
            normal: 'assets/companion/companion_normal.png',
            shy: 'assets/companion/companion_shy.png',
            happy: 'assets/companion/companion_happy.png'
        }
    },
    xingye: {
        name: '星野', gender: 'male', tag: '白猫少年',
        img: {
            normal: 'assets/companion/xingye_normal.png',
            shy: 'assets/companion/xingye_shy.png',
            happy: 'assets/companion/xingye_happy.png'
        }
    },
    fengling: {
        name: '枫灵', gender: 'male', tag: '枫叶狐使',
        img: {
            normal: 'assets/companion/fengling_normal.png',
            shy: 'assets/companion/fengling_shy.png',
            happy: 'assets/companion/fengling_happy.png'
        }
    },
    mengdie: {
        name: '梦蝶', gender: 'female', tag: '蝴蝶梦使',
        img: {
            normal: 'assets/companion/mengdie_normal.png',
            shy: 'assets/companion/mengdie_shy.png',
            happy: 'assets/companion/mengdie_happy.png'
        }
    },
    lanyin: {
        name: '蓝音', gender: 'female', tag: '蓝发歌姬',
        img: {
            normal: 'assets/companion/lanyin_normal.png',
            shy: 'assets/companion/lanyin_shy.png',
            happy: 'assets/companion/lanyin_happy.png'
        }
    },
    hiyori: {
        name: '日和', gender: 'female', tag: 'Live2D 特别版', live2d: true,
        img: { normal: 'assets/companion/hiyori_normal.png' }
    }
};

/* ==================== Live2D 支持（pixi-live2d-display） ==================== */

const LIVE2D_MODELS = {
    hiyori: 'assets/live2d/hiyori/Hiyori.model3.json'
};

let live2dApp = null;
let live2dModel = null;

function live2dAvailable() {
    return !!(window.PIXI && window.PIXI.live2d && window.Live2DCubismCore);
}

function destroyLive2D() {
    if (live2dApp) {
        try { live2dApp.destroy(true, { children: true, texture: true, baseTexture: true }); } catch {}
    }
    live2dApp = null;
    live2dModel = null;
    const canvas = document.getElementById('companion-live2d-canvas');
    if (canvas) canvas.remove();
    const img = document.getElementById('companion-img');
    if (img) img.style.display = '';
}

function ensureLive2D(id) {
    const stage = document.getElementById('companion-stage');
    const img = document.getElementById('companion-img');
    if (!stage) return;
    if (!live2dAvailable() || !LIVE2D_MODELS[id]) {
        // Live2D 运行库缺失时回退为静态图
        if (img) img.style.display = '';
        return;
    }
    if (live2dModel && live2dModel.__companionId === id) return;
    destroyLive2D();
    if (img) img.style.display = 'none';
    const canvas = document.createElement('canvas');
    canvas.id = 'companion-live2d-canvas';
    canvas.className = 'companion-live2d';
    stage.insertBefore(canvas, stage.firstChild);
    try {
        live2dApp = new PIXI.Application({
            view: canvas,
            transparent: true,
            autoStart: true,
            resizeTo: stage,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
            autoDensity: true
        });
    } catch { destroyLive2D(); return; }
    PIXI.live2d.Live2DModel.from(LIVE2D_MODELS[id], { autoInteract: false })
        .then(model => {
            if (!live2dApp) { try { model.destroy(); } catch {} return; }
            live2dApp.stage.addChild(model);
            model.__companionId = id;
            live2dModel = model;
            const iw = model.internalModel.width || 1;
            const ih = model.internalModel.height || 1;
            const s = Math.min(stage.clientWidth / iw, stage.clientHeight / ih) * 1.04;
            model.scale.set(s);
            model.anchor.set(0.5, 1);
            model.x = stage.clientWidth / 2;
            model.y = stage.clientHeight;
        })
        .catch(() => destroyLive2D());
}

// Live2D 视线跟随鼠标（只注册一次，canvas 坐标实时换算）
window.addEventListener('pointermove', e => {
    if (!live2dModel) return;
    const canvas = document.getElementById('companion-live2d-canvas');
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    live2dModel.focus(e.clientX - r.left, e.clientY - r.top);
});

function live2dActive() {
    return !!(live2dModel && getCurrentCompanion().live2d);
}

const COMPANION_LINES = {
    poke: ['呀！被戳到了啦～', '嘿嘿，找我有事吗？', '我在我在！', '再戳我就要脸红啦！', '喵？'],
    happy: ['太好啦！出发出发！', '这个地方我也超喜欢！', '耶！记下啦～', '和你一起去哪儿都开心！'],
    idle: ['今天想去哪儿走走？', '我可是很认路的哦', '听说湖边现在很舒服', '累了就戳戳我呀', '地图我都帮你看着呢']
};

let companionRevertTimer = null;
let companionBubbleTimer = null;

/* ==================== 待机彩蛋动作池：太久没人理时随机自娱自乐 ==================== */

const COMPANION_IDLE_ACTS = [
    { cls: 'act-doze', dur: 3300, mood: 'shy', particle: 'zzz', lines: ['呼……Zzz……', '有点困了……', 'zzZ……啊！我没睡着！'] },
    { cls: 'act-stretch', dur: 1800, mood: 'normal', particle: 'star', lines: ['伸——个——懒腰～', '活动一下筋骨！'] },
    { cls: 'act-look', dur: 1600, mood: 'normal', particle: null, lines: ['咦？那边有什么？', '左看看……右看看……'] },
    { cls: 'act-spin', dur: 1250, mood: 'happy', particle: 'star', lines: ['转个圈圈～', '芜湖——转起来啦！'] },
    { cls: 'act-squat', dur: 2300, mood: 'normal', particle: null, lines: ['蹲下来歇一会儿……', '腿有点酸，蹲一下下'] }
];

let companionDragged = false; // 本次按压是否构成拖拽（用于抑制点击反应）

function setCompanionPos(left, top) {
    const widget = document.getElementById('companion-widget');
    if (!widget) return;
    widget.style.left = `${left}px`;
    widget.style.top = `${top}px`;
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
}

function getCompanionGround() {
    const widget = document.getElementById('companion-widget');
    const nav = document.querySelector('.bottom-nav');
    const navH = nav ? nav.offsetHeight : 0;
    const h = widget ? widget.offsetHeight : 158;
    // 地面 = 底部导航上沿再留 10px，保证不遮住下半身
    return window.innerHeight - navH - h - 10;
}

function clampCompanionPos(left, top) {
    const widget = document.getElementById('companion-widget');
    const rect = widget ? widget.getBoundingClientRect() : { width: 118, height: 158 };
    const w = rect.width || 118;
    return [
        Math.min(Math.max(left, 4), window.innerWidth - w - 4),
        Math.min(Math.max(top, 4), getCompanionGround())
    ];
}

function saveCompanionPos(left, top) {
    try { localStorage.setItem('sac_companion_pos', JSON.stringify({ left, top })); } catch {}
}

function restoreCompanionPos() {
    try {
        const pos = JSON.parse(localStorage.getItem('sac_companion_pos') || 'null');
        if (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)) {
            const [left, top] = clampCompanionPos(pos.left, pos.top);
            setCompanionPos(left, top);
        }
    } catch {}
}

function initCompanionDrag(stage) {
    const widget = document.getElementById('companion-widget');
    if (!widget) return;

    let dragging = false;
    let grabDX = 0, grabDY = 0;       // 抓手在卡片内的偏移
    let startX = 0, startY = 0;       // 按压起点（位移阈值判断）
    let lastX = 0, lastY = 0, lastT = 0;
    let vx = 0, vy = 0;               // px/帧 速度
    let rafId = null;

    function stopPhysics() {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    function runPhysics() {
        // 松手后的重力下坠 + 落地弹跳（地面避开底部导航）
        const ground = getCompanionGround();
        const rightWall = window.innerWidth - widget.offsetWidth - 4;
        let left = parseFloat(widget.style.left) || widget.getBoundingClientRect().left;
        let top = parseFloat(widget.style.top) || widget.getBoundingClientRect().top;
        const GRAVITY = 0.9, BOUNCE = 0.42, FRICTION = 0.86;

        function step() {
            vy += GRAVITY;
            left += vx;
            top += vy;
            // 撞左右墙
            if (left < 4) { left = 4; vx = -vx * BOUNCE; }
            if (left > rightWall) { left = rightWall; vx = -vx * BOUNCE; }
            // 撞天花板
            if (top < 4) { top = 4; vy = Math.abs(vy) * BOUNCE; }
            // 落地弹跳
            if (top >= ground) {
                top = ground;
                vy = -vy * BOUNCE;
                vx *= FRICTION;
                if (Math.abs(vy) < 2) vy = 0;
            }
            setCompanionPos(left, top);
            // 静止判定：落地且速度足够小
            if (vy === 0 && Math.abs(vx) < 0.5 && top >= ground) {
                rafId = null;
                saveCompanionPos(left, top);
                return;
            }
            rafId = requestAnimationFrame(step);
        }
        rafId = requestAnimationFrame(step);
    }

    stage.addEventListener('pointerdown', event => {
        // 忽略切换/聊天按钮上的按压
        if (event.target.closest('.companion-switch, .companion-chat-btn')) return;
        stopPhysics();
        dragging = true;
        companionDragged = false;
        stage.classList.add('dragging');
        const rect = widget.getBoundingClientRect();
        // 切换到 left/top 定位，便于拖拽
        setCompanionPos(rect.left, rect.top);
        grabDX = event.clientX - rect.left;
        grabDY = event.clientY - rect.top;
        startX = event.clientX; startY = event.clientY;
        lastX = event.clientX; lastY = event.clientY; lastT = performance.now();
        vx = 0; vy = 0;
        stage.setPointerCapture(event.pointerId);
        // 被拎起来的反应
        companionSetMood('shy', 600000);
    });

    stage.addEventListener('pointermove', event => {
        if (!dragging) return;
        // 位移超过 8px 才算拖拽，避免点击被误吞
        if (!companionDragged && Math.hypot(event.clientX - startX, event.clientY - startY) > 8) {
            companionDragged = true;
        }
        if (!companionDragged) return;
        const now = performance.now();
        const dt = Math.max(now - lastT, 1);
        // 速度采样（px/ms → px/帧）
        vx = ((event.clientX - lastX) / dt) * 16.7;
        vy = ((event.clientY - lastY) / dt) * 16.7;
        lastX = event.clientX; lastY = event.clientY; lastT = now;
        const [left, top] = clampCompanionPos(event.clientX - grabDX, event.clientY - grabDY);
        setCompanionPos(left, top);
        // 拖拽倾斜：跟随横向速度
        const tilt = Math.max(-14, Math.min(14, vx * 1.2));
        stage.style.transform = `rotate(${tilt}deg) scale(1.06)`;
    });

    function endDrag() {
        if (!dragging) return;
        dragging = false;
        stage.classList.remove('dragging');
        stage.style.transform = '';
        const speed = Math.hypot(vx, vy);
        // 限制出手速度，防止飞出
        if (speed > 28) { vx *= 28 / speed; vy *= 28 / speed; }
        if (companionDragged) {
            if (speed > 10) {
                companionSay('哇——飞起来啦！', 2000);
                companionSetMood('happy', 2200);
                companionParticles('star', 5);
            } else {
                companionSetMood('normal', 600);
            }
            runPhysics();
        }
        // 不是拖拽则保持 click 事件正常触发
    }

    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    // 窗口尺寸变化时把小人夹回可视区
    window.addEventListener('resize', () => {
        if (widget.style.left) {
            const [left, top] = clampCompanionPos(parseFloat(widget.style.left), parseFloat(widget.style.top));
            setCompanionPos(left, top);
        }
    });
}

function getCurrentCompanion() {
    let id = 'xinglv';
    try { id = localStorage.getItem('sac_companion_id') || 'xinglv'; } catch {}
    return COMPANIONS[id] ? { id, ...COMPANIONS[id] } : { id: 'xinglv', ...COMPANIONS.xinglv };
}

function setCompanion(id) {
    if (!COMPANIONS[id]) return;
    try { localStorage.setItem('sac_companion_id', id); } catch {}
    const c = COMPANIONS[id];
    const img = document.getElementById('companion-img');
    const nameTag = document.getElementById('companion-name');
    if (c.live2d) {
        ensureLive2D(id);
    } else {
        destroyLive2D();
        if (img) img.src = c.img.normal;
    }
    if (nameTag) nameTag.innerHTML = `<i class="fas fa-location-crosshairs"></i> ${c.name}`;
    // 预加载该角色的差分图
    Object.values(c.img).forEach(src => { const i = new Image(); i.src = src; });
    companionSay(`我是${c.name}，${c.tag}，请多关照！`, 3000);
    companionParticles('star', 5);
}

function toggleCompanionChat(force) {
    const chat = document.getElementById('companion-chat');
    if (!chat) return;
    const show = typeof force === 'boolean' ? force : !chat.classList.contains('show');
    chat.classList.toggle('show', show);
    if (show) setTimeout(() => document.getElementById('companion-chat-input')?.focus(), 220);
}

// 直接对小人说话：复用主对话的 AI 推荐管线（情绪/台词/记忆全部联动）
function sendCompanionChat() {
    const input = document.getElementById('companion-chat-input');
    const text = (input?.value || '').trim();
    if (!text) return;
    if (typeof requestAIRecommendation !== 'function') return;
    input.value = '';
    toggleCompanionChat(false);
    requestAIRecommendation(text, 'chat');
}

function toggleCompanionPicker(force) {
    const picker = document.getElementById('companion-picker');
    if (!picker) return;
    const show = typeof force === 'boolean' ? force : !picker.classList.contains('show');
    picker.classList.toggle('show', show);
}

function buildCompanionPicker() {
    const picker = document.getElementById('companion-picker');
    if (!picker) return;
    const current = getCurrentCompanion().id;
    picker.innerHTML = Object.entries(COMPANIONS).map(([id, c]) => `
        <button class="companion-pick-card${id === current ? ' active' : ''}" data-id="${id}">
            <img src="${c.img.normal}" alt="${c.name}" loading="lazy">
            <span class="pick-name">${c.name}</span>
            <span class="pick-tag"><i class="fas ${c.gender === 'male' ? 'fa-mars' : 'fa-venus'}"></i> ${c.tag}</span>
        </button>
    `).join('');
    picker.querySelectorAll('.companion-pick-card').forEach(card => {
        card.addEventListener('click', event => {
            event.stopPropagation();
            setCompanion(card.dataset.id);
            buildCompanionPicker(); // 刷新选中态
            setTimeout(() => toggleCompanionPicker(false), 600);
        });
    });
}

function companionSetMood(mood, holdMs = 1600) {
    const img = document.getElementById('companion-img');
    const stage = document.getElementById('companion-stage');
    if (!img || !stage) return;
    const c = getCurrentCompanion();
    clearTimeout(companionRevertTimer);
    if (c.live2d && live2dModel) {
        // Live2D 角色：用模型动作表达情绪
        if (mood === 'shy') live2dModel.motion('TapBody');
        else if (mood === 'happy') live2dModel.motion('Idle');
    } else {
        img.src = c.img[mood] || c.img.normal;
    }
    stage.classList.toggle('happy', mood === 'happy');
    companionRevertTimer = setTimeout(() => {
        if (!(getCurrentCompanion().live2d)) img.src = c.img.normal;
        stage.classList.remove('happy');
    }, holdMs);
}

function companionSay(text, holdMs = 3200) {
    const bubble = document.getElementById('companion-bubble');
    if (!bubble) return;
    clearTimeout(companionBubbleTimer);
    bubble.textContent = text;
    bubble.classList.add('show');
    companionBubbleTimer = setTimeout(() => bubble.classList.remove('show'), holdMs);
}

function companionParticles(kind = 'heart', count = 5) {
    const stage = document.getElementById('companion-stage');
    if (!stage) return;
    const icons = kind === 'heart' ? ['💜', '💙', '❤️'] : kind === 'zzz' ? ['Z', 'z'] : ['✨', '⭐', '🌟'];
    for (let i = 0; i < count; i++) {
        const p = document.createElement('span');
        p.className = 'companion-particle';
        if (kind === 'zzz') p.classList.add('zzz');
        p.textContent = icons[Math.floor(Math.random() * icons.length)];
        p.style.left = `${15 + Math.random() * 70}%`;
        p.style.setProperty('--dx', `${(Math.random() - 0.5) * 56}px`);
        p.style.setProperty('--rot', `${(Math.random() - 0.5) * 50}deg`);
        p.style.animationDelay = `${i * 0.07}s`;
        stage.appendChild(p);
        setTimeout(() => p.remove(), 1400);
    }
}

// 对外暴露：收藏 / 导航 / 点赞等业务动作可调用，让看板娘开心一下
function companionReact(mood = 'happy', line = '') {
    companionSetMood(mood, 2000);
    companionParticles(mood === 'happy' ? 'star' : 'heart');
    if (line) companionSay(line);
}

function initCompanion() {
    const stage = document.getElementById('companion-stage');
    if (!stage) return;
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    // 恢复用户选择的角色并预加载其差分图
    const current = getCurrentCompanion();
    const img = document.getElementById('companion-img');
    const nameTag = document.getElementById('companion-name');
    if (current.live2d) {
        ensureLive2D(current.id);
    } else if (img) {
        img.src = current.img.normal;
    }
    if (nameTag) nameTag.innerHTML = `<i class="fas fa-location-crosshairs"></i> ${current.name}`;
    Object.values(current.img).forEach(src => { const i = new Image(); i.src = src; });
    buildCompanionPicker();
    restoreCompanionPos();
    initCompanionDrag(stage);

    // 名牌旁的切换按钮 → 打开/收起选择器
    const switchBtn = document.getElementById('companion-switch');
    if (switchBtn) {
        switchBtn.addEventListener('click', event => {
            event.stopPropagation();
            toggleCompanionChat(false);
            toggleCompanionPicker();
        });
    }

    // 聊天按钮 → 打开/收起对小人的输入条
    const chatBtn = document.getElementById('companion-chat-btn');
    if (chatBtn) {
        chatBtn.addEventListener('click', event => {
            event.stopPropagation();
            toggleCompanionPicker(false);
            toggleCompanionChat();
        });
    }
    const chatInput = document.getElementById('companion-chat-input');
    const chatSend = document.getElementById('companion-chat-send');
    if (chatSend) chatSend.addEventListener('click', event => { event.stopPropagation(); sendCompanionChat(); });
    if (chatInput) {
        chatInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') { event.preventDefault(); sendCompanionChat(); }
            if (event.key === 'Escape') toggleCompanionChat(false);
            event.stopPropagation();
        });
    }

    // 戳一戳 → 害羞 + 爱心（拖拽后不触发）
    stage.addEventListener('click', () => {
        if (companionDragged) return;
        if (live2dActive()) live2dModel.motion('TapBody');
        stage.classList.remove('poked');
        void stage.offsetWidth; // 重启动画
        stage.classList.add('poked');
        companionSetMood('shy', 1600);
        companionParticles('heart', 4);
        companionSay(pick(COMPANION_LINES.poke), 2400);
    });
    // 双击 → 开心 + 星星（拖拽后不触发）
    stage.addEventListener('dblclick', () => {
        if (companionDragged) return;
        companionSetMood('happy', 2200);
        companionParticles('star', 6);
        companionSay(pick(COMPANION_LINES.happy), 2800);
    });

    // 入场打招呼
    setTimeout(() => companionSay(`我是${current.name}，你的出行搭子！戳我试试～`, 4200), 1600);
    // 待机小动作：每隔一段时间原地小跳一下，显得更有活力
    setInterval(() => {
        if (document.hidden || stage.classList.contains('dragging')) return;
        stage.classList.add('hop');
        setTimeout(() => stage.classList.remove('hop'), 750);
    }, 14000);
    // 待机碎碎念
    setInterval(() => {
        if (document.hidden) return;
        if (Math.random() < 0.6) companionSay(pick(COMPANION_LINES.idle), 3600);
    }, 38000);

    // 待机彩蛋：30 秒没人碰她，就随机做一个动作自娱自乐；一碰就重新计时
    let idleActTimer = null;
    function armIdleAct() {
        clearTimeout(idleActTimer);
        idleActTimer = setTimeout(() => {
            if (document.hidden || stage.classList.contains('dragging')) { armIdleAct(); return; }
            if (live2dActive()) {
                // Live2D 角色：播放模型自带的随机动作自娱自乐
                live2dModel.motion('Idle');
                companionSay(pick(COMPANION_LINES.idle), 3600);
            } else {
                const act = COMPANION_IDLE_ACTS[Math.floor(Math.random() * COMPANION_IDLE_ACTS.length)];
                stage.classList.add(act.cls);
                if (act.particle) companionParticles(act.particle, 4);
                if (act.mood) companionSetMood(act.mood, act.dur + 600);
                companionSay(pick(act.lines), act.dur + 800);
                setTimeout(() => stage.classList.remove(act.cls), act.dur);
            }
            armIdleAct();
        }, 30000);
    }
    stage.addEventListener('pointerdown', armIdleAct);
    armIdleAct();
}

document.addEventListener('DOMContentLoaded', initCompanion);
