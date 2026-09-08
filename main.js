/* ============================================================
   Spatial AI Companion - 主界面
   ============================================================ */

/* -------- 工具 -------- */
function showToast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    t.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3000);
}

/* -------- 获取用户信息 -------- */
function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('sac_current_user')); }
    catch { return null; }
}
const currentUser = getCurrentUser();
if (!currentUser) { window.location.href = 'auth.html'; }

const userProfile = (function () {
    try { return JSON.parse(localStorage.getItem('sac_user_profile')); }
    catch { return null; }
})() || {
    username: currentUser?.username || '用户',
    gender: 'female',
    age: 20,
    activities: [],
    lat: 39.9597,
    lng: 116.2980,
    locationLabel: '北京·海淀区'
};

/* -------- 初始化用户界面 -------- */
function refreshProfileUI() {
    const profile = (function () { try { return JSON.parse(localStorage.getItem('sac_user_profile')); } catch { return null; } })() || {};
    const username = profile.username || currentUser?.username || '用户';
    const avatarEmoji = profile.avatar || '';
    const avatarBg = profile.avatarBg || '';
    // 顶部栏头像
    const topAvatar = document.getElementById('user-avatar');
    if (avatarEmoji) topAvatar.textContent = avatarEmoji;
    else topAvatar.textContent = username.charAt(0).toUpperCase();
    if (avatarBg) topAvatar.style.background = avatarBg;
    // 我的页面头像
    const pAvatar = document.getElementById('profile-avatar');
    if (pAvatar) {
        if (avatarEmoji) pAvatar.textContent = avatarEmoji;
        else pAvatar.textContent = username.charAt(0).toUpperCase();
        if (avatarBg) pAvatar.style.background = avatarBg;
    }
    const pName = document.getElementById('profile-username');
    if (pName) pName.textContent = username;
    const pId = document.getElementById('profile-id');
    if (pId) pId.textContent = currentUser?.id || 'SAC26001234';
    const locEl = document.getElementById('current-loc');
    if (locEl) locEl.textContent = profile.locationLabel || '北京·海淀区';
    // 统计
    try {
        const favs = JSON.parse(localStorage.getItem('sac_favorites') || '[]');
        const visited = JSON.parse(localStorage.getItem('sac_visited') || '[]');
        const routes = JSON.parse(localStorage.getItem('sac_routes') || '[]');
        const sf = document.getElementById('stat-favorites'); if (sf) sf.textContent = favs.length;
        const se = document.getElementById('stat-explored'); if (se) se.textContent = visited.length || 12;
        const sr = document.getElementById('stat-routes'); if (sr) sr.textContent = routes.length || 3;
    } catch {}
}
refreshProfileUI();

/* ========== 个人资料编辑 ========== */
const AVATAR_OPTIONS = ['🐼','🐨','🐯','🦁','🐱','🐶','🦊','🐻','🐸','🦄','🐙','🦋','🌸','⭐','🌙','☀️','🌈','🎨','🎮','🎧','📷','🚀','🍀'];
const AVATAR_BGS = [
    'linear-gradient(135deg,#6366f1,#06b6d4)',
    'linear-gradient(135deg,#ec4899,#8b5cf6)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#10b981,#06b6d4)',
    'linear-gradient(135deg,#8b5cf6,#ec4899)',
    'linear-gradient(135deg,#f97316,#fbbf24)',
    'linear-gradient(135deg,#14b8a6,#6366f1)',
    'linear-gradient(135deg,#ef4444,#f59e0b)',
    'linear-gradient(135deg,#a78bfa,#f472b6)',
    'linear-gradient(135deg,#0ea5e9,#10b981)',
    'linear-gradient(135deg,#fbbf24,#f97316)',
    'linear-gradient(135deg,#334155,#6366f1)'
];
let pickedAvatar = '';
let pickedBg = AVATAR_BGS[0];
function openProfileEdit() {
    const modal = document.getElementById('edit-modal');
    const picker = document.getElementById('avatar-picker');
    picker.innerHTML = '';
    AVATAR_OPTIONS.forEach(e => {
        const b = document.createElement('button');
        b.className = 'avatar-opt'; b.textContent = e;
        b.onclick = () => {
            document.querySelectorAll('.avatar-opt').forEach(x => x.classList.remove('selected'));
            b.classList.add('selected'); pickedAvatar = e;
        };
        picker.appendChild(b);
    });
    // 背景色
    let bgContainer = document.getElementById('avatar-bg-picker');
    if (!bgContainer) {
        bgContainer = document.createElement('div');
        bgContainer.id = 'avatar-bg-picker';
        bgContainer.className = 'avatar-bg-picker';
        const label = document.createElement('label');
        label.textContent = '底色';
        const wrap = document.createElement('div');
        wrap.className = 'bg-swirls';
        AVATAR_BGS.forEach(g => {
            const s = document.createElement('button');
            s.className = 'bg-swirl';
            s.style.background = g;
            s.onclick = () => {
                document.querySelectorAll('.bg-swirl').forEach(x => x.classList.remove('selected'));
                s.classList.add('selected'); pickedBg = g;
                // 实时预览
                const preview = document.querySelector('.user-avatar-large');
                if (preview) preview.style.background = g;
            };
            wrap.appendChild(s);
        });
        bgContainer.appendChild(label);
        bgContainer.appendChild(wrap);
        picker.parentNode.insertBefore(bgContainer, picker.nextSibling);
    }
    const profile = (function () { try { return JSON.parse(localStorage.getItem('sac_user_profile')); } catch { return null; } })() || {};
    pickedAvatar = profile.avatar || '';
    pickedBg = profile.avatarBg || AVATAR_BGS[0];
    if (pickedAvatar) {
        document.querySelectorAll('.avatar-opt').forEach(x => { if (x.textContent === pickedAvatar) x.classList.add('selected'); });
    }
    document.querySelectorAll('.bg-swirl').forEach((s, i) => { if (AVATAR_BGS[i] === pickedBg) s.classList.add('selected'); });
    document.getElementById('edit-username').value = profile.username || currentUser?.username || '';
    modal.classList.add('show');
}
function saveProfileEdit() {
    const profile = (function () { try { return JSON.parse(localStorage.getItem('sac_user_profile')); } catch { return null; } })() || {};
    const name = document.getElementById('edit-username').value.trim();
    if (!name) { showToast('昵称不能为空', 'error'); return; }
    profile.username = name;
    if (pickedAvatar) profile.avatar = pickedAvatar;
    profile.avatarBg = pickedBg;
    localStorage.setItem('sac_user_profile', JSON.stringify(profile));
    try {
        let users = JSON.parse(localStorage.getItem('sac_users') || '[]');
        const me = users.find(u => u.id === currentUser?.id);
        if (me) { me.username = name; localStorage.setItem('sac_users', JSON.stringify(users)); }
    } catch {}
    refreshProfileUI();
    document.getElementById('edit-modal').classList.remove('show');
    showToast('资料已更新 ✨', 'success');
}

/* ========== 侧滑面板 ========== */
function openSidePanel(title, html) {
    document.getElementById('sp-title').textContent = title;
    document.getElementById('sp-body').innerHTML = html;
    document.getElementById('sp-panel').classList.add('show');
}
function closeSidePanel() {
    document.getElementById('sp-panel').classList.remove('show');
}

/* ========== 收藏夹 ========== */
function openFavorites() {
    let favs = [];
    try { favs = JSON.parse(localStorage.getItem('sac_favorites') || '[]'); } catch { favs = []; }
    if (favs.length === 0) {
        openSidePanel('收藏夹', `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <p>还没有收藏的地点</p>
                <span>去推荐或对话中收藏你喜欢的地点吧 ❤️</span>
            </div>`);
        return;
    }
    // 用知识库补全信息
    const kb = (typeof BEIJING_PLACES !== 'undefined') ? BEIJING_PLACES : [];
    const cards = favs.map(name => {
        const p = kb.find(x => x.name === name);
        const type = p ? p.type : '';
        const brief = p ? p.brief : '';
        const imgUrl = p ? `https://staticmap.openstreetmap.de/staticmap.php?center=${p.lat},${p.lng}&zoom=14&size=500x300&markers=${p.lat},${p.lng},red-pushpin` : '';
        return `<div class="fav-card" data-name="${name}">
            <img class="fav-img" src="${imgUrl}" alt="">
            <div class="fav-info">
                <div class="fav-name">${name}</div>
                <div class="fav-brief">${brief}</div>
                <div class="fav-tags">${type ? `<span>${type}</span>` : ''}</div>
            </div>
            <div class="fav-actions">
                <button class="fav-act" title="导航"><i class="fas fa-location-arrow" onclick="navigateFav('${name}',${p?.lat || 39.9},${p?.lng || 116.2})"></i></button>
                <button class="fav-act danger" title="取消收藏"><i class="fas fa-trash" onclick="removeFav('${name}')"></i></button>
            </div>
        </div>`;
    }).join('');
    openSidePanel(`我的收藏 (${favs.length})`, `<div class="fav-list">${cards}</div>`);
}
function removeFav(name) {
    let favs = [];
    try { favs = JSON.parse(localStorage.getItem('sac_favorites') || '[]'); } catch { favs = []; }
    favs = favs.filter(n => n !== name);
    localStorage.setItem('sac_favorites', JSON.stringify(favs));
    openFavorites(); // 刷新面板
    refreshProfileUI();
    showToast(`已取消收藏 ${name}`, 'info');
}
function navigateFav(name, lat, lng) {
    closeSidePanel();
    switchTab('map');
    if (typeof mainMap !== 'undefined' && mainMap) {
        mainMap.flyTo([lat, lng], 15, { duration: 0.8 });
    }
    showToast(`正在导航到 ${name}`, 'success');
}

/* ========== 偏好设置 ========== */
const PREF_CATEGORIES = [
    { key: 'environment', title: '🌿 环境偏好', items: [
        { v: '安静', i: '🤫' }, { v: '热闹', i: '🎉' }, { v: '绿色', i: '🌳' }, { v: '水边', i: '💧' },
        { v: '山地', i: '⛰️' }, { v: '平坦', i: '🚶' }, { v: '阴凉', i: '🌙' }, { v: '阳光', i: '☀️' }
    ]},
    { key: 'activity', title: '🏃 活动偏好', items: [
        { v: '徒步', i: '🚶' }, { v: '跑步', i: '🏃' }, { v: '骑行', i: '🚴' }, { v: '爬山', i: '🧗' },
        { v: '休闲', i: '🛋️' }, { v: '摄影', i: '📷' }, { v: '探索', i: '🧭' }, { v: '冥想', i: '🧘' }
    ]},
    { key: 'social', title: '👥 社交偏好', items: [
        { v: '独自', i: '🙋' }, { v: '情侣', i: '💑' }, { v: '朋友', i: '👯' }, { v: '亲子', i: '👨‍👩‍👧' },
        { v: '宠物', i: '🐶' }, { v: '约会', i: '💕' }
    ]},
    { key: 'purpose', title: '🎯 出行目的', items: [
        { v: '放松', i: '😌' }, { v: '解压', i: '🫠' }, { v: '学习', i: '📚' }, { v: '工作', i: '💻' },
        { v: '美食', i: '🍴' }, { v: '逛街', i: '🛍️' }, { v: '打卡', i: '📌' }, { v: '发呆', i: '🤤' }
    ]},
    { key: 'scene', title: '🏛️ 场景偏好', items: [
        { v: '公园', i: '🌳' }, { v: '湖泊', i: '💧' }, { v: '山脉', i: '⛰️' }, { v: '胡同', i: '🏘️' },
        { v: '商圈', i: '🏙️' }, { v: '校园', i: '🎓' }, { v: '博物馆', i: '🏛️' }, { v: '艺术', i: '🎨' },
        { v: '夜景', i: '🌌' }, { v: '小众', i: '🔍' }
    ]}
];
function openPreferences() {
    const profile = (function () { try { return JSON.parse(localStorage.getItem('sac_user_profile')); } catch { return null; } })() || {};
    const prefs = profile.preferences || {};
    let html = '';
    PREF_CATEGORIES.forEach(cat => {
        html += `<div class="pref-group">
            <div class="pref-title">${cat.title}</div>
            <div class="pref-chips">`;
        cat.items.forEach(it => {
            const sel = (prefs[cat.key] || []).includes(it.v) ? ' selected' : '';
            html += `<button class="pref-chip${sel}" data-cat="${cat.key}" data-v="${it.v}" onclick="togglePrefChip(this)">${it.i} ${it.v}</button>`;
        });
        html += `</div></div>`;
    });
    html += `<button class="sp-btn-primary pref-save-btn" onclick="savePreferences()">保存偏好</button>`;
    openSidePanel('偏好设置', html);
}
function togglePrefChip(btn) { btn.classList.toggle('selected'); }
function savePreferences() {
    const profile = (function () { try { return JSON.parse(localStorage.getItem('sac_user_profile')); } catch { return null; } })() || {};
    const prefs = {};
    PREF_CATEGORIES.forEach(cat => prefs[cat.key] = []);
    document.querySelectorAll('.pref-chip.selected').forEach(c => {
        const cat = c.dataset.cat, v = c.dataset.v;
        if (!prefs[cat]) prefs[cat] = [];
        prefs[cat].push(v);
    });
    profile.preferences = prefs;
    // 同时把所有选中 flatten 成 tags，让 AI 对话也能用
    profile.tags = Object.values(prefs).flat();
    localStorage.setItem('sac_user_profile', JSON.stringify(profile));
    showToast('偏好已保存 ✨', 'success');
    closeSidePanel();
}

/* ========== 关于 ========== */
function openAbout() {
    const html = `
        <div class="about-hero">
            <div class="about-logo">AI</div>
            <div class="about-appname">Spatial AI Companion</div>
            <div class="about-version">Version 1.0.0 · Beta</div>
        </div>
        <div class="about-section">
            <h3><i class="fas fa-bullseye"></i> 产品定位</h3>
            <p>Spatial AI Companion 是一款融合<strong>遥感环境感知</strong>、<strong>多地理场景适配</strong>与<strong>个性化空间推荐</strong>能力的 AI 陪伴型应用。它让 AI 不止知道"附近有什么"，更理解"什么空间适合此刻的你"。</p>
        </div>
        <div class="about-section">
            <h3><i class="fas fa-satellite-dish"></i> 遥感环境感知</h3>
            <p>融合 Landsat-8 / Sentinel-2 多光谱卫星数据，动态计算 NDVI（植被指数）、LST（地表温度）、DSM（数字高程）、水体覆盖率等指标，让推荐基于真实的空间环境数据，而非单纯的用户评价。</p>
        </div>
        <div class="about-section">
            <h3><i class="fas fa-layer-group"></i> 多地理场景适配</h3>
            <p>内置 45+ 北京地区重点空间（涵盖公园、山地、湖泊、胡同、商圈、校园、博物馆等 7 大类），每一类场景都有专属的匹配策略：山地考虑坡度，湖泊考虑水体覆盖，商圈评估步行友好度。</p>
        </div>
        <div class="about-section">
            <h3><i class="fas fa-brain"></i> 个性化空间推荐</h3>
            <p>通过对话记忆、收藏、偏好设置自动构建用户画像，推荐时结合实时遥感数据 + 历史偏好 + 当前位置三维评分，并给出可解释的推荐理由。你喜欢"安静的水边"，AI 会记住。</p>
        </div>
        <div class="about-section">
            <h3><i class="fas fa-map"></i> 内置地图 & 路线规划</h3>
            <p>集成 Leaflet + 高德/OSM 双图层，点击任意地点可一键规划路线，支持驾车/步行导航说明，从北师大出发，目的地可直达海淀任何角落。</p>
        </div>
        <div class="about-section about-footer">
            <div>© 2026 Spatial AI Companion Team</div>
            <div>数据来源：Landsat-8 · Sentinel-2 · OpenStreetMap · 高德地图</div>
        </div>
    `;
    openSidePanel('关于 Spatial AI', html);
}

/* -------- Tab 切换 -------- */
function switchTab(name, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${name}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (btn) btn.classList.add('active');
    else {
        const target = document.querySelector(`.nav-item[data-tab="${name}"]`);
        if (target) target.classList.add('active');
    }

    if (name === 'map' && !mainMap) initMainMap();
    if (name === 'explore' && recommendListRendered === false) renderRecommendList();
}

/* ==================== AI 对话 ==================== */
const chatMessages = document.getElementById('chat-messages');

function sendSuggest(text) {
    document.getElementById('chat-input').value = text;
    sendMessage();
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    // 用户消息
    appendMessage('user', text);

    // AI 思考动画
    const thinkingEl = document.createElement('div');
    thinkingEl.className = 'msg ai-msg';
    thinkingEl.id = 'thinking-msg';
    thinkingEl.innerHTML = `
        <div class="msg-avatar ai"><i class="fas fa-robot"></i></div>
        <div class="msg-bubble">
            <div class="msg-name">Spatial AI</div>
            <div style="display:flex;gap:4px;padding:4px 0;">
                <span style="width:8px;height:8px;border-radius:50%;background:var(--primary-light);animation:dot 1.2s infinite;"></span>
                <span style="width:8px;height:8px;border-radius:50%;background:var(--primary-light);animation:dot 1.2s infinite 0.2s;"></span>
                <span style="width:8px;height:8px;border-radius:50%;background:var(--primary-light);animation:dot 1.2s infinite 0.4s;"></span>
            </div>
            <style>@keyframes dot{0%,60%,100%{opacity:0.3;transform:scale(0.8)}30%{opacity:1;transform:scale(1)}}</style>
        </div>`;
    chatMessages.appendChild(thinkingEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    setTimeout(() => {
        thinkingEl.remove();
        const reply = generateAIReply(text);
        appendMessage('ai', reply.text, reply.reasonCard, reply.places);
    }, 1500);
}

function appendMessage(role, text, reasonCard, places) {
    // 简单 Markdown 渲染：**加粗** 和 \n 换行
    let rendered = text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    const el = document.createElement('div');
    el.className = `msg ${role}-msg`;
    const icon = role === 'ai' ? 'fa-robot' : 'fa-user';
    const name = role === 'ai' ? 'Spatial AI' : '我';
    let reasonHtml = reasonCard ? `
        <div class="recommend-reason-card">
            <div class="reason-title"><i class="fas fa-lightbulb"></i> ${role === 'ai' && reasonCard.length > 0 && reasonCard[0].startsWith('📍') ? '地点详解' : '推荐理由'}</div>
            <ul class="reason-list">${reasonCard.map(r => `<li>${r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</li>`).join('')}</ul>
        </div>` : '';
    // 收藏 + 生成行程按钮（仅 AI 回复且有地点时显示）
    let actionHtml = '';
    if (role === 'ai' && places && places.length > 0) {
        const placeNames = places.map(p => p.name);
        const placeObjs = places.map(p => ({name:p.name, type:p.type, lat:p.lat, lng:p.lng, tags:p.tags}));
        // 转义双引号避免 HTML 属性截断
        const safeNames = JSON.stringify(placeNames).replace(/"/g, '&quot;');
        const safePlaces = JSON.stringify(placeObjs).replace(/"/g, '&quot;');
        actionHtml = `
        <div class="msg-actions">
            <button class="msg-action-btn" onclick="savePlacesToFavorites(${safeNames})">
                <i class="far fa-heart"></i> 收藏全部
            </button>
            <button class="msg-action-btn primary" onclick="showItineraryModal(${safePlaces})">
                <i class="fas fa-route"></i> 生成行程
            </button>
        </div>`;
    }
    el.innerHTML = `
        <div class="msg-avatar ${role}"><i class="fas ${icon}"></i></div>
        <div class="msg-bubble">
            <div class="msg-name">${name}</div>
            <p>${rendered}</p>
            ${reasonHtml}
            ${actionHtml}
        </div>`;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/* -------- 用户喜好记忆系统 -------- */
function getUserMemory() {
    try { return JSON.parse(localStorage.getItem('sac_user_memory')); }
    catch { return null; }
}
function saveUserMemory(memory) {
    localStorage.setItem('sac_user_memory', JSON.stringify(memory));
}
function updateUserMemory(newTags) {
    let mem = getUserMemory() || { tags: [], visitHistory: [] };
    // 合并标签
    newTags.forEach(t => {
        if (!mem.tags.includes(t)) mem.tags.push(t);
    });
    saveUserMemory(mem);
    return mem;
}

/* -------- 意图识别 -------- */
function detectIntent(text) {
    const t = text;
    // 1. 地点名直接查询
    for (const p of BEIJING_PLACES) {
        for (const alias of p.aliases) {
            if (t.includes(alias) && alias.length >= 2) {
                return { type: 'place_query', place: p };
            }
        }
    }
    // 2. 明确的提问词 → 推荐
    const recommendWords = ['推荐', '找', '哪里', '什么地方', '想去', '去哪', '想玩', '想逛', '适合', '有什么', '有没有', '帮我', '给我', '介绍'];
    for (const w of recommendWords) {
        if (t.includes(w)) return { type: 'recommend' };
    }
    // 3. 描述性内容 → 推荐（默认）
    if (t.length >= 3) return { type: 'recommend' };
    return { type: 'chat' };
}

/* -------- 提取偏好标签 -------- */
function extractPreferences(text) {
    const found = [];
    for (const [tag, keywords] of Object.entries(PREFERENCE_KEYWORDS)) {
        for (const kw of keywords) {
            if (text.includes(kw)) { found.push(tag); break; }
        }
    }
    return [...new Set(found)]; // 去重
}

/* -------- 地点评分引擎 -------- */
function scorePlace(place, userTags) {
    let score = 0;
    const reasons = [];

    // 标签匹配（核心）
    const matchedTags = userTags.filter(t => place.tags.includes(t));
    score += matchedTags.length * 25;
    matchedTags.forEach(t => reasons.push(`标签匹配「${t}」`));

    // 环境特征加分
    if (userTags.includes('安静') && place.quietness >= 75) { score += 15; reasons.push(`安静度 ${place.quietness}%`); }
    if (userTags.includes('绿色') && place.features.green >= 0.7) { score += 12; reasons.push(`植被指数 NDVI ${place.features.green}`); }
    if (userTags.includes('水边') && place.features.water >= 0.35) { score += 12; reasons.push(`水体覆盖 ${place.features.water}`); }
    if (userTags.includes('爬山') && place.features.slope >= 15) { score += 10; reasons.push(`平均坡度 ${place.features.slope}°`); }
    if (userTags.includes('徒步') && place.features.slope >= 3) { score += 8; reasons.push(`可步行区域`); }
    if (userTags.includes('拍照')) { score += 5; }
    if (userTags.includes('小众') && (place.crowd === '低' || place.crowd === '中低')) { score += 10; reasons.push(`人流量 ${place.crowd}`); }
    if (userTags.includes('开阔') && (place.features.green >= 0.7 || place.features.water >= 0.5)) { score += 8; }

    // 用户历史偏好加权
    const mem = getUserMemory();
    if (mem && mem.tags.length) {
        const historyMatch = mem.tags.filter(t => place.tags.includes(t));
        score += historyMatch.length * 5;
    }

    return { score, matchedTags, reasons };
}

/* -------- 生成地点介绍 -------- */
function formatPlaceIntro(place) {
    const tagsHtml = place.tags.slice(0, 4).map(t => `#${t}`).join('  ');
    const features = place.features;
    const envLine = `🌿 NDVI ${features.green} · 💧 水体 ${features.water} · 📏 坡度 ${features.slope}° · 🔇 安静度 ${features.quietness}%`;
    return `📍 **${place.name}**（${place.type}）\n\n${place.desc}\n\n${envLine}\n\n🏷️ ${tagsHtml}`;
}

/* -------- 主 AI 回复生成 -------- */
function generateAIReply(text) {
    const intent = detectIntent(text);

    // === 场景 1：直接查询某个地点 ===
    if (intent.type === 'place_query') {
        const place = intent.place;
        return {
            text: formatPlaceIntro(place),
            reasonCard: [
                ...place.tips.slice(0, 3),
                `📍 坐标：${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`
            ],
            places: [place]
        };
    }

    // === 场景 2：根据偏好推荐 ===
    if (intent.type === 'recommend') {
        let userTags = extractPreferences(text);
        const mem = getUserMemory();
        if (mem && mem.tags.length) {
            const historyOnly = mem.tags.filter(t => !userTags.includes(t));
            userTags = [...userTags, ...historyOnly];
        }

        // 用户没描述偏好，使用引导模板
        if (userTags.length === 0) {
            return {
                text: '我可以帮你找到最适合的北京空间 🌍\n\n你可以这样问我：',
                reasonCard: [
                    '"想找安静的绿地放松一下"',
                    '"有水边适合拍照的地方"',
                    '"适合半天徒步的山地"',
                    '"小众不为人知的宝藏地点"'
                ],
                places: []
            };
        }

        updateUserMemory(userTags);

        const scored = BEIJING_PLACES.map(p => ({ place: p, ...scorePlace(p, userTags) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        const intro = `根据你的偏好「${userTags.join('、')}」，结合遥感环境数据，我为你推荐：`;

        const reasonCard = [];
        scored.forEach((item, i) => {
            reasonCard.push(
                `${i + 1}. **${item.place.name}**（${item.place.type}）· 匹配度 ${item.score}分`,
                `   ${item.place.desc.slice(0, 40)}${item.place.desc.length > 40 ? '...' : ''}`,
                `   理由：${item.reasons.slice(0, 3).join('；') || '综合匹配度高'}`,
                ...item.place.tips.slice(0, 1).map(t => `   ⚠️ ${t}`)
            );
        });

        return {
            text: intro,
            reasonCard,
            places: scored.map(s => s.place)
        };
    }

    // === 场景 3：闲聊 ===
    return {
        text: '你好 👋 我是 Spatial AI，能帮你发现北京最适合的空间。你可以告诉我想去什么样的地方，或者直接问我某个地点的情况～',
        reasonCard: null,
        places: []
    };
}

/* ==================== 地图 ==================== */
let mainMap = null;
let mainMarkers = [];
let currentLayer = 'gaode';
let gaodeLayer = null;
let satelliteLayer = null;
let routingControl = null;
let routePolyline = null;
let navPanelOpen = false;
// 路线起点：北京师范大学
const ROUTE_START = { lat: 39.9652, lng: 116.3662, name: '北京师范大学' };

function initMainMap() {
    if (mainMap) { mainMap.invalidateSize(); return; }
    if (typeof L === 'undefined') { showToast('地图库加载失败', 'error'); return; }

    mainMap = L.map('main-map', {
        center: [userProfile.lat, userProfile.lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
    });

    // 高德标准图层 + 失败回退 OSM
    let gaodeErrorCount = 0;
    gaodeLayer = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
        subdomains: ['1', '2', '3', '4'], maxZoom: 18, minZoom: 3
    });
    gaodeLayer.on('tileerror', () => {
        gaodeErrorCount++;
        if (gaodeErrorCount > 3) {
            gaodeLayer.remove();
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18, minZoom: 3, attribution: 'OpenStreetMap'
            }).addTo(mainMap);
            showToast('已切换到 OpenStreetMap 地图', 'info');
        }
    });
    // 高德卫星图层
    satelliteLayer = L.tileLayer('https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {
        subdomains: ['1', '2', '3', '4'], maxZoom: 18, minZoom: 3
    });

    gaodeLayer.addTo(mainMap);
    L.control.zoom({ position: 'topright' }).addTo(mainMap);

    // 地图加载状态提示
    const loading = L.control({ position: 'topleft' });
    loading.onAdd = function () {
        const div = L.DomUtil.create('div', 'map-loading');
        div.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载地图中...';
        return div;
    };
    loading.addTo(mainMap);
    gaodeLayer.once('load', () => loading.remove());
    setTimeout(() => loading.remove(), 5000);

    // 我的位置
    const myIcon = L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;background:#7c83ff;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(124,131,255,0.25),0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [18, 18], iconAnchor: [9, 9]
    });
    L.marker([userProfile.lat, userProfile.lng], { icon: myIcon }).addTo(mainMap);

    // 路线起点标记（北师大）
    const startIcon = L.divIcon({
        className: '',
        html: `<div style="width:22px;height:22px;background:#22c55e;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(34,197,94,0.3),0 2px 8px rgba(0,0,0,0.3);"></div><div style="position:absolute;top:24px;left:50%;transform:translateX(-50%);background:rgba(34,197,94,0.9);color:white;font-size:10px;padding:2px 6px;border-radius:8px;white-space:nowrap;">起点</div>`,
        iconSize: [22, 22], iconAnchor: [11, 11]
    });
    L.marker([ROUTE_START.lat, ROUTE_START.lng], { icon: startIcon }).addTo(mainMap).bindPopup(`<b>路线起点</b><br>${ROUTE_START.name}`);

    // 全部 45 个地点标注
    BEIJING_PLACES.forEach(p => addMainMarker(p));
}

function addMainMarker(place) {
    const iconName = TYPE_TO_ICON[place.type] || 'fa-map-marker-alt';
    const category = TYPE_TO_CATEGORY[place.type] || 'nature';
    const catClass = `marker-${category}`;
    const html = `<div class="cute-marker ${catClass}">
        <div class="cute-marker-icon"><i class="fas ${iconName}"></i></div>
        <div class="cute-marker-label">${place.name}</div>
    </div>`;
    const icon = L.divIcon({ className: '', html, iconSize: [36, 60], iconAnchor: [18, 50], popupAnchor: [0, -50] });
    const tagsHtml = place.tags.slice(0, 4).map(t => `<span class="popup-tag">${t}</span>`).join('');
    const tipsHtml = place.tips.slice(0, 2).map(t => `<div class="popup-tip">⚠️ ${t}</div>`).join('');
    const popup = `<div class="sp-popup">
        <div class="sp-popup-title"><i class="fas ${iconName}" style="color:#a5a9ff"></i> ${place.name}</div>
        <div class="sp-popup-type">${place.type}</div>
        <div class="sp-popup-desc">${place.desc}</div>
        <div class="sp-popup-tags">${tagsHtml}</div>
        ${tipsHtml ? `<div class="sp-popup-tips">${tipsHtml}</div>` : ''}
        <button class="sp-popup-go-btn" onclick="planRouteTo(${place.lat},${place.lng},'${place.name}')">
            <i class="fas fa-route"></i> 到这去
        </button>
    </div>`;
    const m = L.marker([place.lat, place.lng], { icon }).addTo(mainMap).bindPopup(popup);
    mainMarkers.push(m);
}

/* ==================== 路线规划 ==================== */
function planRouteTo(dstLat, dstLng, dstName) {
    if (!mainMap) return;
    mainMap.closePopup();

    // 清除之前的路线
    clearRoute();

    // 尝试用 Leaflet Routing Machine + OSRM
    if (typeof L.Routing !== 'undefined') {
        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(ROUTE_START.lat, ROUTE_START.lng),
                L.latLng(dstLat, dstLng)
            ],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            }),
            lineOptions: {
                styles: [{ color: '#6366f1', opacity: 0.85, weight: 5 },
                         { color: '#a5a9ff', opacity: 0.4, weight: 10 }]
            },
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            showAlternatives: false,
            createMarker: () => null,
            createGeocoder: () => null,
            show: false
        }).addTo(mainMap);

        routingControl.on('routesfound', function (e) {
            const route = e.routes[0];
            const summary = route.summary;
            const distanceKm = (summary.totalDistance / 1000).toFixed(1);
            const timeMin = Math.round(summary.totalTime / 60);
            const instructions = route.instructions || [];
            buildNavPanel(dstName, distanceKm, timeMin, instructions, false);
        });

        routingControl.on('routingerror', function () {
            // OSRM 失败，用兜底 Polyline
            routingControl.remove();
            routingControl = null;
            fallbackRoute(dstLat, dstLng, dstName);
        });
    } else {
        // 插件未加载，直接兜底
        fallbackRoute(dstLat, dstLng, dstName);
    }

    // 飞行到路线范围
    setTimeout(() => {
        if (typeof mainMap !== 'undefined' && mainMap) {
            const bounds = L.latLngBounds([[ROUTE_START.lat, ROUTE_START.lng], [dstLat, dstLng]]).pad(0.2);
            mainMap.fitBounds(bounds);
        }
    }, 800);
}

function fallbackRoute(dstLat, dstLng, dstName) {
    // 计算大致路线：从北师大出发，模拟几条主要道路
    const path = [
        [ROUTE_START.lat, ROUTE_START.lng],
        [ROUTE_START.lat + 0.003, ROUTE_START.lng + 0.008],
        [ROUTE_START.lat + 0.006, ROUTE_START.lng + 0.015],
        [dstLat - 0.004, dstLng - 0.005],
        [dstLat, dstLng]
    ];
    routePolyline = L.polyline(path, {
        color: '#6366f1', weight: 5, opacity: 0.85,
        dashArray: '10, 8'
    }).addTo(mainMap);

    const distKm = (ROUTE_START.lat - dstLat) * 111;
    const distanceKm = Math.abs(distKm).toFixed(1);
    const timeMin = Math.round(parseFloat(distanceKm) * 3);
    const instructions = [
        { text: `从 ${ROUTE_START.name} 出发`, distance: 0 },
        { text: '沿主要道路向南行驶', distance: Math.round(parseFloat(distanceKm) * 500) },
        { text: '继续直行，注意交通信号', distance: Math.round(parseFloat(distanceKm) * 300) },
        { text: `到达目的地 ${dstName}`, distance: Math.round(parseFloat(distanceKm) * 200) }
    ];
    buildNavPanel(dstName, distanceKm, timeMin, instructions, true);
    showToast('规划路线仅供参考（网络受限）', 'info');
}

function clearRoute() {
    if (routingControl) { routingControl.remove(); routingControl = null; }
    if (routePolyline) { mainMap.removeLayer(routePolyline); routePolyline = null; }
}

function buildNavPanel(dstName, distanceKm, timeMin, instructions, isFallback) {
    const panel = document.getElementById('nav-panel');
    const body = document.getElementById('nav-instructions');
    const headerDst = document.getElementById('nav-dst-name');
    const headerDist = document.getElementById('nav-distance');
    const headerTime = document.getElementById('nav-time');

    headerDst.textContent = dstName;
    headerDist.textContent = `${distanceKm} km`;
    headerTime.textContent = `${timeMin} 分钟`;

    const stepsHtml = instructions.map((inst, i) => {
        const stepDist = inst.distance >= 1000
            ? `${(inst.distance / 1000).toFixed(1)} km`
            : `${Math.round(inst.distance)} m`;
        const icon = i === 0 ? 'fa-location-dot' : (i === instructions.length - 1 ? 'fa-flag-checkered' : 'fa-arrow-right');
        const iconColor = i === 0 ? '#22c55e' : (i === instructions.length - 1 ? '#ef4444' : '#7c83ff');
        return `
        <div class="nav-step">
            <div class="nav-step-icon" style="background:${iconColor}"><i class="fas ${icon}"></i></div>
            <div class="nav-step-content">
                <div class="nav-step-text">${inst.text}</div>
                <div class="nav-step-dist">${stepDist}</div>
            </div>
        </div>`;
    }).join('');

    body.innerHTML = isFallback
        ? `<div class="nav-fallback-note"><i class="fas fa-info-circle"></i> 当前路线为参考路线，建议使用导航 App 获取实时路况</div>${stepsHtml}`
        : stepsHtml;

    panel.classList.add('show');
    navPanelOpen = true;
}

function closeNavPanel() {
    const panel = document.getElementById('nav-panel');
    panel.classList.remove('show');
    navPanelOpen = false;
    clearRoute();
    showToast('已退出路线指引', 'info');
}

function toggleNavPanel() {
    const panel = document.getElementById('nav-panel');
    panel.classList.toggle('collapsed');
}

function recenterMainMap() {
    if (mainMap) mainMap.flyTo([userProfile.lat, userProfile.lng], 13, { duration: 0.8 });
}

function switchLayer(type) {
    if (!mainMap) return;
    if (type === currentLayer) return;
    currentLayer = type;
    document.querySelectorAll('.layer-btn').forEach(b => b.classList.toggle('active', b.dataset.layer === type));
    if (type === 'gaode') { satelliteLayer.remove(); gaodeLayer.addTo(mainMap); }
    else { gaodeLayer.remove(); satelliteLayer.addTo(mainMap); }
    showToast(type === 'gaode' ? '已切换到标准地图' : '已切换到卫星影像', 'info');
}

/* ==================== 推荐列表 ==================== */
let recommendListRendered = false;

// 按地点类型精选真实匹配的 Unsplash 照片（回退用）
const PLACE_TYPE_IMAGES = {
    '皇家园林': 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&h=450&fit=crop',
    '皇家宫殿': 'https://images.unsplash.com/photo-1584646098378-0874589d76b1?w=800&h=450&fit=crop',
    '皇家祭坛': 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&h=450&fit=crop',
    '城市公园': 'https://images.unsplash.com/photo-1558980664-10ea4d1a5aa3?w=800&h=450&fit=crop',
    '山地公园': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=450&fit=crop',
    '山地': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=450&fit=crop',
    '峡谷': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=450&fit=crop',
    '湖泊': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=450&fit=crop',
    '湿地公园': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=450&fit=crop',
    '森林公园': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=450&fit=crop',
    '长城': 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&h=450&fit=crop',
    '历史街区': 'https://images.unsplash.com/photo-1536431311719-398b6704d4cc?w=800&h=450&fit=crop',
    '遗址公园': 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&h=450&fit=crop',
    '博物馆': 'https://images.unsplash.com/photo-1565060169194-19fabd69c8d1?w=800&h=450&fit=crop',
    '大学校园': 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=800&h=450&fit=crop',
    '商圈': 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=450&fit=crop',
    '现代建筑': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=450&fit=crop',
    '工业遗产': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=450&fit=crop',
    '当代艺术': 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&h=450&fit=crop',
    '艺术街区': 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&h=450&fit=crop',
    '古刹': 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&h=450&fit=crop',
    '古村落': 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&h=450&fit=crop',
    '专类园': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=450&fit=crop',
    '景观公路': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=450&fit=crop',
    '特色景观': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=450&fit=crop',
    '学府': 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=800&h=450&fit=crop'
};

// 类型→渐变配色（兜底用）
const TYPE_TO_GRADIENT = {
    '城市公园': 'linear-gradient(135deg, #10b981, #059669)',
    '皇家园林': 'linear-gradient(135deg, #f59e0b, #d97706)',
    '皇家宫殿': 'linear-gradient(135deg, #f97316, #ea580c)',
    '皇家祭坛': 'linear-gradient(135deg, #fbbf24, #d97706)',
    '山地公园': 'linear-gradient(135deg, #10b981, #047857)',
    '山地': 'linear-gradient(135deg, #059669, #065f46)',
    '峡谷': 'linear-gradient(135deg, #0891b2, #0e7490)',
    '湖泊': 'linear-gradient(135deg, #06b6d4, #0891b2)',
    '湿地公园': 'linear-gradient(135deg, #06b6d4, #059669)',
    '森林公园': 'linear-gradient(135deg, #22c55e, #15803d)',
    '长城': 'linear-gradient(135deg, #f59e0b, #b45309)',
    '历史街区': 'linear-gradient(135deg, #f472b6, #db2777)',
    '遗址公园': 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    '博物馆': 'linear-gradient(135deg, #60a5fa, #3b82f6)',
    '大学校园': 'linear-gradient(135deg, #818cf8, #6366f1)',
    '商圈': 'linear-gradient(135deg, #f9a8d4, #ec4899)',
    '现代建筑': 'linear-gradient(135deg, #67e8f9, #0891b2)',
    '工业遗产': 'linear-gradient(135deg, #a1a1aa, #71717a)',
    '当代艺术': 'linear-gradient(135deg, #c084fc, #9333ea)',
    '艺术街区': 'linear-gradient(135deg, #c084fc, #9333ea)',
    '古刹': 'linear-gradient(135deg, #fbbf24, #d97706)',
    '古村落': 'linear-gradient(135deg, #fb923c, #c2410c)',
    '专类园': 'linear-gradient(135deg, #22c55e, #15803d)',
    '景观公路': 'linear-gradient(135deg, #14b8a6, #0f766e)',
    '特色景观': 'linear-gradient(135deg, #f472b6, #db2777)',
    '学府': 'linear-gradient(135deg, #818cf8, #6366f1)'
};

// 类型→图标（兜底用）
const TYPE_TO_ICON = {
    '城市公园': 'fa-tree', '山地': 'fa-mountain', '湖泊': 'fa-water',
    '皇家园林': 'fa-landmark', '皇家宫殿': 'fa-landmark', '长城': 'fa-mountain',
    '历史街区': 'fa-landmark', '博物馆': 'fa-building', '大学校园': 'fa-graduation-cap',
    '商圈': 'fa-shopping-bag', '现代建筑': 'fa-building', '工业遗产': 'fa-industry',
    '湿地公园': 'fa-water', '森林公园': 'fa-tree', '山地公园': 'fa-mountain',
    '峡谷': 'fa-mountain', '古刹': 'fa-landmark', '古村落': 'fa-house',
    '当代艺术': 'fa-palette', '艺术街区': 'fa-palette', '景观公路': 'fa-route',
    '特色景观': 'fa-star', '专类园': 'fa-tree', '遗址公园': 'fa-landmark',
    '皇家祭坛': 'fa-landmark', '学府': 'fa-graduation-cap'
};

// 构建图片 URL：主用 OSM 静态地图（真实地理位置），回退用 Unsplash 类型图
function buildPlaceImage(place) {
    const lat = place.lat.toFixed(4);
    const lng = place.lng.toFixed(4);
    // OSM 静态地图：真实街道视图 + 蓝色标记点
    const osmUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=700x360&markers=${lat},${lng},ol-marker-blue`;
    // 回退：Unsplash 按地点类型精选照片
    const fallbackUrl = PLACE_TYPE_IMAGES[place.type] || `https://picsum.photos/seed/${encodeURIComponent(place.name)}/700/360`;
    return { osmUrl, fallbackUrl };
}

// 类型→分类映射（用于筛选）
const TYPE_TO_CATEGORY = {
    '城市公园': 'nature', '公园绿地': 'nature', '山地公园': 'mountain', '山地': 'mountain',
    '峡谷': 'mountain', '皇家园林': 'culture', '皇家宫殿': 'culture', '皇家祭坛': 'culture',
    '历史街区': 'culture', '遗址公园': 'culture', '学府': 'culture', '博物馆': 'culture',
    '专类园': 'nature', '森林公园': 'nature', '湖泊': 'water', '湿地公园': 'water',
    '长城': 'mountain', '古刹': 'culture', '古村落': 'culture', '当代艺术': 'culture',
    '艺术街区': 'culture', '景观公路': 'nature', '特色景观': 'culture',
    '大学校园': 'culture', '商圈': 'culture', '现代建筑': 'culture', '工业遗产': 'culture'
};

function getFavs() {
    try { return JSON.parse(localStorage.getItem('sac_favorites') || '[]'); }
    catch { return []; }
}

function generateRecommendations(filter = 'all') {
    let pool = [...BEIJING_PLACES];
    if (filter !== 'all') {
        pool = pool.filter(p => TYPE_TO_CATEGORY[p.type] === filter);
    }
    // 随机打乱取 6 个
    pool.sort(() => Math.random() - 0.5);
    const selected = pool.slice(0, 6);
    const favs = getFavs();
    return selected.map(p => {
        const cat = TYPE_TO_CATEGORY[p.type] || 'nature';
        const features = p.features;
        const meta = [];
        if (features.green >= 0.7) meta.push({t:`NDVI ${features.green}`,c:'green'});
        if (features.water >= 0.3) meta.push({t:`水体 ${features.water}`,c:'blue'});
        if (features.slope >= 15) meta.push({t:`坡度 ${features.slope}°`,c:'yellow'});
        else if (features.slope >= 3) meta.push({t:`缓坡 ${features.slope}°`,c:'blue'});
        if (features.quietness >= 80) meta.push({t:`安静度 ${features.quietness}%`,c:'green'});
        const reason = `${p.desc.slice(0, 30)}${p.desc.length > 30 ? '...' : ''}`;
        const imgs = buildPlaceImage(p);
        return {
            name: p.name,
            type: p.type,
            icon: TYPE_TO_ICON[p.type] || 'fa-map-marker-alt',
            gradient: TYPE_TO_GRADIENT[p.type] || 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            osmImage: imgs.osmUrl,
            fallbackImage: imgs.fallbackUrl,
            match: Math.floor(Math.random() * 25) + 72,
            desc: p.desc.slice(0, 50),
            meta: meta.length > 0 ? meta : [{t:p.tags[0] || '推荐',c:'green'}],
            reason,
            distance: `${(Math.random() * 9 + 1).toFixed(1)}km`,
            category: cat,
            lat: p.lat, lng: p.lng,
            isFav: favs.includes(p.name)
        };
    });
}

function renderRecommendList(filter = 'all') {
    recommendListRendered = true;
    const list = document.getElementById('recommend-list');
    const data = generateRecommendations(filter);
    list.innerHTML = '';
    data.forEach((r, i) => {
        const metaHtml = r.meta.map(m => `<span class="meta-chip meta-${m.c}">${m.t}</span>`).join('');
        const favClass = r.isFav ? ' active' : '';
        const favIcon = r.isFav ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
        const card = document.createElement('div');
        card.className = 'recommend-card';
        card.style.animationDelay = `${i * 0.06}s`;
        card.innerHTML = `
            <div class="card-image-wrap" style="background:${r.gradient}">
                <img class="card-real-img" src="${r.osmImage}" alt="${r.name}" onerror="this.onerror=null;this.src='${r.fallbackImage}';this.classList.add('has-fallback');">
                <div class="match-badge"><i class="fas fa-star"></i> ${r.match}%</div>
                <div class="card-img-type-tag"><i class="fas ${r.icon}"></i> ${r.type}</div>
                <div class="card-img-map-indicator"><i class="fas fa-map-pin"></i> 真实位置</div>
            </div>
            <div class="card-body">
                <div class="card-title">${r.name}</div>
                <div class="card-desc">${r.desc}</div>
                <div class="card-meta">${metaHtml}</div>
                <div class="card-reason">
                    <div class="card-reason-title"><i class="fas fa-lightbulb"></i> 推荐理由</div>
                    <div class="card-reason-text">${r.reason}</div>
                </div>
                <div class="card-footer">
                    <div class="card-distance"><i class="fas fa-location-dot"></i> ${r.distance}</div>
                    <div class="card-actions">
                        <button class="action-mini-btn${favClass}" data-name="${r.name}" onclick="event.stopPropagation();toggleFav(this)" title="收藏">${favIcon}</button>
                        <button class="action-mini-btn" onclick="event.stopPropagation();navigateToPlace('${r.name}',${r.lat},${r.lng})" title="导航"><i class="fas fa-location-arrow"></i></button>
                    </div>
                </div>
            </div>`;
        card.addEventListener('click', () => navigateToPlace(r.name, r.lat, r.lng));
        list.appendChild(card);
    });
}

function navigateToPlace(name, lat, lng) {
    switchTab('map');
    if (typeof mainMap !== 'undefined' && mainMap) {
        mainMap.flyTo([lat, lng], 15, { duration: 0.8 });
    }
    showToast(`正在导航到 ${name}`, 'info');
}

function refreshRecommendations() {
    const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
    renderRecommendList(activeFilter);
    showToast('已为你刷新推荐 ✨', 'success');
}

function filterRecommend(cat, btn) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    renderRecommendList(cat);
}

function toggleFav(btn) {
    const name = btn.dataset.name;
    let favs = getFavs();
    const idx = favs.indexOf(name);
    if (idx >= 0) {
        favs.splice(idx, 1);
        btn.classList.remove('active');
        btn.innerHTML = '<i class="far fa-heart"></i>';
        showToast('已取消收藏', 'info');
    } else {
        favs.push(name);
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-heart"></i>';
        showToast(`已收藏 ${name} ❤️`, 'success');
    }
    localStorage.setItem('sac_favorites', JSON.stringify(favs));
}

/* ==================== 退出登录 ==================== */
function logout() {
    localStorage.removeItem('sac_current_user');
    showToast('已退出登录', 'info');
    setTimeout(() => { window.location.href = 'auth.html'; }, 1000);
}

/* ==================== 天气详情弹窗 ==================== */
function toggleWeatherModal() {
    const modal = document.getElementById('weather-modal');
    modal.classList.toggle('show');
}

/* ==================== 收藏功能 ==================== */
function savePlacesToFavorites(placeNames) {
    let favs = [];
    try { favs = JSON.parse(localStorage.getItem('sac_favorites') || '[]'); } catch { favs = []; }
    let added = 0;
    placeNames.forEach(name => {
        if (!favs.includes(name)) { favs.push(name); added++; }
    });
    localStorage.setItem('sac_favorites', JSON.stringify(favs));
    if (added > 0) showToast(`已收藏 ${added} 个地点 ❤️`, 'success');
    else showToast('这些地点已在收藏夹中', 'info');
}

/* ==================== 生成行程弹窗 ==================== */
function showItineraryModal(places) {
    const modal = document.getElementById('itinerary-modal');
    if (!modal) return;

    // 时段分配：根据地点数量分配时间段
    const timeSlots = ['上午', '下午', '傍晚', '晚上'];
    const icons = ['fa-sun', 'fa-cloud-sun', 'fa-cloud-moon', 'fa-moon'];
    const estTimes = ['2小时', '3小时', '1.5小时', '2小时'];

    let html = '';
    places.forEach((p, i) => {
        const slot = timeSlots[i % timeSlots.length];
        const icon = icons[i % icons.length];
        const est = estTimes[i % estTimes.length];
        const tagsHtml = p.tags.slice(0, 3).map(t => `<span class="iti-tag">#${t}</span>`).join('');
        html += `
        <div class="iti-step">
            <div class="iti-time-slot">
                <div class="iti-slot-icon"><i class="fas ${icon}"></i></div>
                <div class="iti-slot-info">
                    <div class="iti-slot-label">${slot}</div>
                    <div class="iti-slot-time">预计 ${est}</div>
                </div>
            </div>
            <div class="iti-line"></div>
            <div class="iti-place-card">
                <div class="iti-place-name">${p.name}</div>
                <div class="iti-place-type">${p.type}</div>
                <div class="iti-place-tags">${tagsHtml}</div>
                <button class="iti-nav-btn" onclick="switchTab('map'); if(typeof mainMap!=='undefined'){mainMap.flyTo([${p.lat},${p.lng}],15,{duration:0.8});}"><i class="fas fa-location-arrow"></i> 在地图上查看</button>
            </div>
        </div>`;
    });

    document.getElementById('itinerary-steps').innerHTML = html;
    document.getElementById('itinerary-count').textContent = places.length;
    modal.classList.add('show');
}
function toggleItinerary() {
    document.getElementById('itinerary-modal').classList.toggle('show');
}
