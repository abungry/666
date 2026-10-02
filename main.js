/* 作者：周梓润 */
/* ============================================================
   Spatial AI Companion - 主界面
   ============================================================ */

/* -------- Supabase 初始化（从后端 /api/config 拿配置，避免硬编码） -------- */
// 注意：Supabase CDN 脚本本身会占用全局 window.supabase，所以这里用 supabaseClient 避开冲突
let supabaseClient = null;
function reportSupabaseError(action, error) {
    if (!error) return;
    console.warn(action, error);
    const message = error.message || String(error);
    showToast(`云端未写入（${action}）：${message}`, 'error');
}
function initSupabase() {
    try {
        fetch('/api/config')
            .then(r => r.json())
            .then(cfg => {
                try {
                    if (!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && typeof window.supabase.createClient === 'function')) {
                        console.warn('Supabase 未配置，数据只保存在本机');
                        return;
                    }
                    supabaseClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
                    supabaseClient.from('profiles').select('user_id').limit(1).then(({ error }) => {
                        if (error) reportSupabaseError('连接 profiles', error);
                        else console.log('Supabase 已连接');
                    });
                } catch (e) { console.warn('Supabase 创建客户端失败', e); }
            })
            .catch(e => console.warn('获取 Supabase 配置失败，降级 localStorage', e));
    } catch (e) { console.warn('Supabase 初始化异常', e); }
}
initSupabase();

/* -------- 顶层变量声明（防止 TDZ：所有函数引用在声明之后） -------- */
let mainMap = null;
let recommendListRendered = false;

// 地图图层变量（提前声明，避免 TDZ）
let gaodeLayer = null;
let satelliteLayer = null;
let terrainGroup = null;
let tdtImgGroup = null;
let tdtKey = '';
let tdtLayersPromise = null;

// 类型→分类映射（用于筛选）— 提前声明避免 TDZ
const TYPE_TO_CATEGORY = {
    '城市公园': 'nature', '公园绿地': 'nature', '山地公园': 'mountain', '山地': 'mountain',
    '峡谷': 'mountain', '皇家园林': 'culture', '皇家宫殿': 'culture', '皇家祭坛': 'culture',
    '历史街区': 'culture', '遗址公园': 'culture', '学府': 'culture', '博物馆': 'culture',
    '城市地标': 'culture', '纪念建筑': 'culture', '历史建筑': 'culture',
    '宗教建筑': 'culture', '名人故居': 'culture', '历史遗址': 'culture',
    '专类馆': 'culture', '文化场馆': 'culture', '自然遗址': 'mountain',
    '专类园': 'nature', '森林公园': 'nature', '湖泊': 'water', '湿地公园': 'water',
    '长城': 'mountain', '古刹': 'culture', '古村落': 'culture', '当代艺术': 'culture',
    '艺术街区': 'culture', '景观公路': 'nature', '特色景观': 'culture',
    '大学校园': 'culture', '商圈': 'culture', '现代建筑': 'culture', '工业遗产': 'culture',
    '主题乐园': 'culture', '动物园': 'nature', '古镇': 'culture', '滨水街区': 'water'
};

/* -------- 工具 -------- */
function showToast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    t.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span></span>`;
    t.querySelector('span').textContent = String(msg);
    c.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3000);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* -------- 获取用户信息（无登录态时注入默认访客，直接进入主页） -------- */
function getCurrentUser() {
    try {
        const u = JSON.parse(localStorage.getItem('sac_current_user'));
        if (u) return u;
    } catch {}
    const guest = { id: 'SAC_GUEST', username: '探索者', phone: '' };
    localStorage.setItem('sac_current_user', JSON.stringify(guest));
    return guest;
}
const currentUser = getCurrentUser();

// 免登录模式：未完成引导则先去引导页（防止直接访问 main.html 绕过引导）
(function () {
    try {
        var done = JSON.parse(localStorage.getItem('sac_onboarding_done') || '{}');
        if (!done[currentUser.id]) {
            location.replace('welcome.html');
        }
    } catch (e) {}
})();

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
if (!Number.isFinite(userProfile.lat) || !Number.isFinite(userProfile.lng)) {
    userProfile.lat = 39.9597;
    userProfile.lng = 116.2980;
}

/* -------- 初始化用户界面 -------- */
function refreshProfileUI() {
    const profile = (function () { try { return JSON.parse(localStorage.getItem('sac_user_profile')); } catch { return null; } })() || {};
    const username = profile.username || currentUser?.username || '用户';
    const avatarEmoji = profile.avatar || '';
    const avatarBg = profile.avatarBg || '';
    // 顶部栏头像（Font Awesome 图标）
    const topAvatar = document.getElementById('user-avatar');
    if (avatarEmoji && AVATAR_OPTIONS.includes(avatarEmoji)) {
        topAvatar.innerHTML = `<i class="fas ${avatarEmoji}"></i>`;
    } else {
        topAvatar.innerHTML = `<i class="fas fa-user-astronaut"></i>`;
    }
    if (avatarBg) topAvatar.style.background = avatarBg;
    // 我的页面头像
    const pAvatar = document.getElementById('profile-avatar');
    if (pAvatar) {
        if (avatarEmoji && AVATAR_OPTIONS.includes(avatarEmoji)) {
            pAvatar.innerHTML = `<i class="fas ${avatarEmoji}"></i>`;
        } else {
            pAvatar.innerHTML = `<i class="fas fa-user-astronaut"></i>`;
        }
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
        const se = document.getElementById('stat-explored'); if (se) se.textContent = visited.length;
        const sr = document.getElementById('stat-routes'); if (sr) sr.textContent = routes.length;
    } catch {}
}
refreshProfileUI();

/* ========== 个人资料编辑 ========== */
const AVATAR_OPTIONS = [
    'fa-cat','fa-dog','fa-dragon','fa-otter','fa-fish','fa-kiwi-bird','fa-horse','fa-paw',
    'fa-user-astronaut','fa-user-ninja','fa-user-graduate','fa-user-tie',
    'fa-rocket','fa-compass','fa-mountain-sun','fa-tree','fa-leaf','fa-seedling',
    'fa-music','fa-gamepad','fa-camera-retro','fa-palette','fa-book','fa-mug-hot'
];
const AVATAR_BGS = [
    'linear-gradient(135deg,#6366f1,#06b6d4)',
    'linear-gradient(135deg,#ec4899,#8b5cf6)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#10b981,#06b6d4)',
    'linear-gradient(135deg,#8b5cf6,#ec4899)',
    'linear-gradient(135deg,#f97316,#fbbf24)',
    'linear-gradient(135deg,#c45c26,#6366f1)',
    'linear-gradient(135deg,#ef4444,#f59e0b)',
    'linear-gradient(135deg,#a78bfa,#f472b6)',
    'linear-gradient(135deg,#c45c26,#10b981)',
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
        b.className = 'avatar-opt'; b.innerHTML = `<i class="fas ${e}"></i>`;
        b.onclick = () => {
            document.querySelectorAll('.avatar-opt').forEach(x => x.classList.remove('selected'));
            b.classList.add('selected'); pickedAvatar = e;
            // 实时预览
            const preview = document.querySelector('.user-avatar-large');
            if (preview) preview.innerHTML = `<i class="fas ${e}"></i>`;
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
        document.querySelectorAll('.avatar-opt').forEach(x => {
            const icon = x.querySelector('i');
            if (icon && icon.classList.contains(pickedAvatar)) x.classList.add('selected');
        });
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

    // 同步到 Supabase（失败不阻塞）
    if (supabaseClient) {
        supabaseClient.from('profiles').upsert({
            user_id: currentUser?.id || 'SAC_GUEST',
            username: name,
            avatar: pickedAvatar || profile.avatar || 'fa-user-astronaut',
            age: profile.age || null,
            gender: profile.gender || null,
            activity_tags: Array.isArray(profile.tags) ? profile.tags : (Array.isArray(profile.activities) ? profile.activities : []),
            location_label: profile.locationLabel || null,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }).then(({ error }) => reportSupabaseError('保存资料', error));
    }
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
async function openFavorites() {
    let favs = [];
    try { favs = JSON.parse(localStorage.getItem('sac_favorites') || '[]'); } catch { favs = []; }
    // 优先从 Supabase 拉取（覆盖本地）
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('favorites')
                .select('place_name')
                .eq('user_id', currentUser?.id || 'SAC_GUEST');
            if (!error && data && data.length > 0) {
                favs = data.map(r => r.place_name);
                localStorage.setItem('sac_favorites', JSON.stringify(favs));
            }
        } catch {}
    }
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
        const brief = p && p.desc ? p.desc.slice(0, 42) : '';
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
    // 同步删除 Supabase
    if (supabaseClient) {
        supabaseClient.from('favorites')
            .delete()
            .eq('user_id', currentUser?.id || 'SAC_GUEST')
            .eq('place_name', name)
            .then(({ error }) => reportSupabaseError('取消收藏', error));
    }
}
function navigateFav(name, lat, lng) {
    closeSidePanel();
    focusPlaceOnMap(name, lat, lng);
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
    // 同步到 Supabase
    if (supabaseClient) {
        supabaseClient.from('profiles').upsert({
            user_id: currentUser?.id || 'SAC_GUEST',
            activity_tags: profile.tags,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }).then(({ error }) => reportSupabaseError('保存偏好', error));
    }
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
            <p>内置 ${BEIJING_PLACES.length} 个北京代表性景点与建筑（涵盖中轴线、园林、寺观、博物馆、现代建筑、胡同街区、亲子场馆和郊野山水等类别），每一类场景都有专属的匹配策略。</p>
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

    moveNavIndicator();

    // 延迟执行：等整个 main.js 解析完再调用，避开 TDZ
    if (name === 'map' && !mainMap) setTimeout(() => initMainMap(), 0);
    if (name === 'explore' && recommendListRendered === false) setTimeout(() => renderRecommendList(), 0);
}

function moveNavIndicator() {
    const indicator = document.querySelector('.nav-indicator');
    const active = document.querySelector('.nav-item.active:not(.center-btn)');
    if (!indicator) return;
    if (!active) { indicator.style.opacity = '0'; return; }
    indicator.style.opacity = '1';
    indicator.style.width = `${active.offsetWidth}px`;
    indicator.style.transform = `translateX(${active.offsetLeft}px)`;
}
window.addEventListener('resize', moveNavIndicator);
window.addEventListener('load', moveNavIndicator);

/* ==================== AI 对话 ==================== */
const chatMessages = document.getElementById('chat-messages');

function sendSuggest(text) {
    document.getElementById('chat-input').value = text;
    sendMessage();
}

function syncComposer() {
    const composer = document.getElementById('composer');
    const input = document.getElementById('chat-input');
    if (composer && input) composer.classList.toggle('has-text', input.value.trim().length > 0);
}

function hideChatEmpty() {
    const empty = document.getElementById('chat-empty');
    if (empty) empty.remove();
}

let aiRequestInFlight = false;
const CHAT_HISTORY_KEY = `sac_chat_context_${currentUser?.id || 'SAC_GUEST'}`;
let chatHistory = (function () {
    try { return JSON.parse(sessionStorage.getItem(CHAT_HISTORY_KEY) || '[]').slice(-8); }
    catch { return []; }
})();

function saveChatHistory() {
    chatHistory = chatHistory.slice(-8);
    sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
}

function createThinkingMessage(label = '正在理解你的需求并检索地图') {
    hideChatEmpty();
    const thinkingEl = document.createElement('div');
    thinkingEl.className = 'msg ai-msg';
    thinkingEl.innerHTML = `
        <div class="msg-avatar ai"><i class="fas fa-robot"></i></div>
        <div class="msg-bubble">
            <div class="msg-name">Spatial AI · DeepSeek</div>
            <div class="thinking-row">
                <span></span><span></span><span></span>
                <em>${escapeHtml(label)}</em>
            </div>
        </div>`;
    chatMessages.appendChild(thinkingEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return thinkingEl;
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || aiRequestInFlight) return;
    input.value = '';
    syncComposer();
    appendMessage('user', text);
    await requestAIRecommendation(text, 'chat');
}

async function directRecommend() {
    if (aiRequestInFlight) return;
    const memory = getPrioritizedMemoryKeywords();
    if (memory.length === 0) {
        showToast('记忆库还是空的，先搜索一次或添加关键词吧', 'info');
        openMemoryLibrary();
        return;
    }
    appendMessage('user', '✨ 根据我的记忆直接推荐');
    await requestAIRecommendation('', 'direct');
}

async function requestAIRecommendation(text, mode) {
    aiRequestInFlight = true;
    const thinkingEl = createThinkingMessage(mode === 'direct' ? '正在按记忆优先级精排地点' : '正在拆解需求、检索地图并精排');
    try {
        const memory = getPrioritizedMemoryKeywords();
        const localCandidates = buildLocalCandidates(text, memory).slice(0, 180).map(item => ({
            name: item.place.name,
            type: item.place.type,
            lat: item.place.lat,
            lng: item.place.lng,
            tags: item.place.tags,
            description: item.place.desc,
            score: item.score
        }));
        const latestProfile = (function () {
            try { return JSON.parse(localStorage.getItem('sac_user_profile') || '{}'); }
            catch { return {}; }
        })();
        let favorites = [];
        try { favorites = JSON.parse(localStorage.getItem('sac_favorites') || '[]'); } catch {}
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode,
                query: text,
                memory: memory.slice(0, 30),
                localCandidates,
                location: {
                    lat: Number(userProfile.lat) || 39.9597,
                    lng: Number(userProfile.lng) || 116.2980,
                    label: userProfile.locationLabel || '北京·海淀区'
                },
                history: chatHistory.slice(-6),
                userSignals: {
                    profileTags: Array.isArray(latestProfile.tags) ? latestProfile.tags : [],
                    favorites
                }
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || `API 请求失败（${response.status}）`);

        if (text) {
            const learned = Array.isArray(data.memoryUpdates) && data.memoryUpdates.length
                ? data.memoryUpdates
                : (data.keywords || []);
            recordSearchKeywords('', learned, { priority: 1 });
        }
        const places = normalizeAIPlaces(data.recommendations || []);
        const reasonCard = places.map((place, index) => {
            const recommendation = data.recommendations?.[index] || {};
            const reason = recommendation.reason || place.desc || '主要匹配本次需求';
            const personal = recommendation.personalization ? `\n   🎯 ${recommendation.personalization}` : '';
            const tradeoff = recommendation.tradeoff ? `\n   ⚖️ 取舍：${recommendation.tradeoff}` : '';
            const distance = Number.isFinite(Number(recommendation.distanceKm)) ? ` · 约 ${recommendation.distanceKm} km` : '';
            return `${index + 1}. **${place.name}**（${place.type || '地点'}${distance}）\n   ${reason}${personal}${tradeoff}`;
        });
        const replyText = data.text || (mode === 'direct'
            ? `我已按你的记忆优先级「${memory.slice(0, 5).map(item => item.keyword).join('、')}」完成推荐。`
            : '我结合你的需求、记忆库与地图检索结果，为你找到了这些地点：');
        const feedback = {
            like: data.understanding?.likes?.length ? data.understanding.likes : (places[0]?.tags || []),
            avoid: places[0]?.name ? [places[0].name] : []
        };
        appendMessage('ai', replyText, reasonCard.length ? reasonCard : null, places, feedback);
        chatHistory.push({ role: 'user', content: mode === 'direct' ? '根据记忆直接推荐' : text });
        chatHistory.push({ role: 'assistant', content: replyText });
        saveChatHistory();
    } catch (error) {
        const fallbackText = mode === 'direct'
            ? getPrioritizedMemoryKeywords().map(item => item.preference === 'avoid' ? `不要${item.keyword}` : item.keyword).join(' ')
            : text;
        const reply = generateAIReply(text, { skipMemory: true });
        const finalReply = mode === 'direct' ? generateAIReply(`请推荐 ${fallbackText}`, { skipMemory: true }) : reply;
        finalReply.text = `${finalReply.text}\n\n（DeepSeek 暂时不可用，已切换为本地空间推荐）`;
        appendMessage('ai', finalReply.text, finalReply.reasonCard, finalReply.places);
        if (text) recordSearchKeywords(text, [], { priority: 1 });
        chatHistory.push({ role: 'user', content: mode === 'direct' ? '根据记忆直接推荐' : text });
        chatHistory.push({ role: 'assistant', content: finalReply.text });
        saveChatHistory();
        showToast(error.message || 'DeepSeek 服务暂不可用', 'info');
    } finally {
        thinkingEl.remove();
        aiRequestInFlight = false;
    }
}

function buildLocalCandidates(text, memory) {
    const directTags = extractPreferences(text || '');
    const rememberedTags = (memory || []).filter(item => item.preference !== 'avoid').map(item => item.keyword);
    // 普通输入必须优先服从本次需求；只有“直接推荐”模式才完全由记忆驱动。
    const tags = directTags.length ? directTags : [...new Set(rememberedTags)];
    return BEIJING_PLACES
        .map(place => {
            const scored = scorePlace(place, tags, { memoryScale: directTags.length ? 0.3 : 1 });
            const exactMatch = [place.name, ...(place.aliases || [])].some(alias => alias && text?.includes(alias));
            if (exactMatch) {
                scored.score += 500;
                scored.reasons.unshift('本次输入直接提到该地点');
            }
            // “中轴线、奥运、古建”等地点自有标签可能不是通用偏好词，仍需直接命中。
            const directPlaceSignals = [place.type, ...(place.tags || [])]
                .filter(signal => signal && signal.length >= 2 && text?.includes(signal));
            if (directPlaceSignals.length) {
                scored.score += directPlaceSignals.length * 80;
                scored.reasons.unshift(`本次需求命中「${directPlaceSignals.join('、')}」`);
            }
            return { place, ...scored };
        })
        .sort((a, b) => b.score - a.score);
}

function normalizeAIPlaces(recommendations) {
    return recommendations.slice(0, 5).map(item => {
        const local = BEIJING_PLACES.find(place => place.name === item.name);
        if (local) return local;
        return {
            name: String(item.name || '地图候选地点').slice(0, 50),
            type: String(item.type || '地图地点').slice(0, 20),
            lat: Number(item.lat) || userProfile.lat,
            lng: Number(item.lng) || userProfile.lng,
            tags: Array.isArray(item.tags) ? item.tags.map(tag => String(tag).slice(0, 16)).slice(0, 6) : [],
            desc: String(item.reason || item.description || '来自地图检索的候选地点').slice(0, 180),
            tips: [],
            quietness: 60,
            crowd: '未知',
            features: { green: 0.5, water: 0.2, slope: 1, quietness: 60 },
            aliases: [String(item.name || '地图候选地点')]
        };
    });
}

function submitMapSearch() {
    const input = document.getElementById('map-search-input');
    const text = input?.value.trim();
    if (!text) return;
    input.value = '';
    switchTab('map');
    searchAmapPlace(text);
}

// 高德 POI 关键字搜索 → 在地图上打点
async function searchAmapPlace(keywords) {
    if (!mainMap) initMainMap();
    try {
        showToast(`搜索「${keywords}」中...`, 'info');
        const res = await fetch(`/api/amap/place/text?keywords=${encodeURIComponent(keywords)}&city=%E5%8C%97%E4%BA%AC&offset=10`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || '搜索服务不可用');
        if (!data.pois || data.pois.length === 0) {
            showToast(data.info && data.info !== 'OK' ? `搜索失败：${data.info}` : `没找到「${keywords}」相关地点`, 'info');
            return;
        }
        searchMarkers.forEach(m => mainMap.removeLayer(m));
        searchMarkers = [];
        // 把所有结果打点
        const bounds = [];
        data.pois.forEach((p, idx) => {
            if (!p.location) return;
            const [lng, lat] = p.location.split(',').map(Number);
            if (isNaN(lng) || isNaN(lat)) return;
            bounds.push([lat, lng]);
            const isFirst = idx === 0;
            const icon = L.divIcon({
                className: '',
                html: `<div style="width:${isFirst ? 26 : 20}px;height:${isFirst ? 26 : 20}px;background:${isFirst ? '#f97316' : '#6366f1'};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
                iconSize: [isFirst ? 26 : 20, isFirst ? 26 : 20],
                iconAnchor: [isFirst ? 13 : 10, isFirst ? 13 : 10]
            });
            const addr = p.address || p.pname + p.cityname + p.adname;
            const tel = p.tel ? `<br><i class="fas fa-phone"></i> ${p.tel}` : '';
            const safeName = p.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const m = L.marker([lat, lng], { icon }).addTo(mainMap)
                .bindPopup(`<div style="min-width:180px;"><b>${p.name}</b><br><span style="color:#666;font-size:12px;">${addr}</span>${tel}<br><div style="display:flex;gap:6px;margin-top:6px;"><button onclick="planRouteTo(${lat},${lng},'${safeName}')" style="padding:4px 10px;background:#6366f1;color:white;border:none;border-radius:6px;cursor:pointer;">路线导航</button><button onclick="verifyPlace('${safeName}')" style="padding:4px 10px;background:#f59e0b;color:white;border:none;border-radius:6px;cursor:pointer;"><i class="fas fa-shield-halved"></i> 核验</button></div><div id="verify-result"></div></div>`);
            searchMarkers.push(m);
            if (isFirst) m.openPopup();
        });
        if (bounds.length > 1) mainMap.fitBounds(bounds, { padding: [60, 60] });
        else if (bounds.length === 1) mainMap.setView(bounds[0], 16);
        showToast(`找到 ${data.count || data.pois.length} 个结果`, 'success');
    } catch (e) {
        console.error(e);
        showToast('搜索失败，请稍后重试', 'error');
    }
}

// 双源核验：对比高德和百度的地点信息，标记矛盾
async function verifyPlace(name) {
    const box = document.getElementById('verify-result');
    if (box) box.innerHTML = '<div style="margin-top:8px;padding:8px;background:rgba(99,102,241,0.1);border-radius:6px;font-size:12px;"><i class="fas fa-spinner fa-spin"></i> 正在双源核验...</div>';
    try {
        const res = await fetch(`/api/compare?name=${encodeURIComponent(name)}&city=%E5%8C%97%E4%BA%AC`);
        const data = await res.json();
        const confColor = data.confidence === 'high' ? '#10b981' : data.confidence === 'medium' ? '#f59e0b' : '#ef4444';
        const confText = data.confidence === 'high' ? '高' : data.confidence === 'medium' ? '中' : '低';
        let html = `<div style="margin-top:8px;padding:8px;border-radius:6px;font-size:12px;background:rgba(0,0,0,0.15);">`;
        html += `<div style="margin-bottom:6px;"><i class="fas fa-shield-halved" style="color:${confColor};"></i> 信息置信度：<b style="color:${confColor};">${confText}</b></div>`;
        const conflicts = Array.isArray(data.conflicts) ? data.conflicts : [];
        if (conflicts.length === 0) {
            html += `<div style="color:#10b981;"><i class="fas fa-circle-check"></i> 高德与百度信息一致</div>`;
        } else {
            conflicts.forEach(c => {
                const cColor = c.type === 'location_mismatch' || c.type === 'name_mismatch' ? '#ef4444' : '#f59e0b';
                html += `<div style="color:${cColor};margin-top:4px;"><i class="fas fa-triangle-exclamation"></i> ${c.msg}</div>`;
            });
        }
        if (data.amap) html += `<div style="margin-top:6px;color:#a0a8d8;">高德：${data.amap.address || '无地址'}${data.amap.tel ? ' · ' + data.amap.tel : ''}</div>`;
        if (data.baidu) html += `<div style="color:#a0a8d8;">百度：${data.baidu.address || '无地址'}${data.baidu.shopHours ? ' · ' + data.baidu.shopHours : ''}</div>`;
        html += `<div style="margin-top:4px;color:#666;font-size:11px;">核验时间：${new Date(data.fetched_at).toLocaleString('zh-CN')}</div>`;
        html += `</div>`;
        if (box) box.innerHTML = html;
    } catch (e) {
        if (box) box.innerHTML = '<div style="margin-top:8px;color:#ef4444;font-size:12px;">核验失败</div>';
    }
}

function appendMessage(role, text, reasonCard, places, feedback) {
    // 简单 Markdown 渲染：**加粗** 和 \n 换行
    let rendered = escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    hideChatEmpty();
    const el = document.createElement('div');
    el.className = `msg ${role}-msg`;
    const icon = role === 'ai' ? 'fa-robot' : 'fa-user';
    const name = role === 'ai' ? 'Spatial AI' : '我';
    let reasonHtml = reasonCard ? `
        <div class="recommend-reason-card">
            <div class="reason-title"><i class="fas fa-lightbulb"></i> ${role === 'ai' && reasonCard.length > 0 && reasonCard[0].startsWith('📍') ? '地点详解' : '推荐理由'}</div>
            <ul class="reason-list">${reasonCard.map(r => `<li>${escapeHtml(r).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</li>`).join('')}</ul>
        </div>` : '';
    // 收藏 + 生成行程按钮（仅 AI 回复且有地点时显示）
    let actionHtml = '';
    if (role === 'ai' && places && places.length > 0) {
        const placeNames = places.map(p => p.name);
        const placeObjs = places.map(p => ({name:p.name, type:p.type, lat:p.lat, lng:p.lng, tags:p.tags}));
        // 转义双引号避免 HTML 属性截断
        const safeNames = JSON.stringify(placeNames).replace(/"/g, '&quot;');
        const safePlaces = JSON.stringify(placeObjs).replace(/"/g, '&quot;');
        const safeLikes = JSON.stringify(feedback?.like || places[0]?.tags || []).replace(/"/g, '&quot;');
        const safeAvoids = JSON.stringify(feedback?.avoid || [places[0]?.name]).replace(/"/g, '&quot;');
        actionHtml = `
        <div class="msg-actions">
            <button class="msg-action-btn" onclick="savePlacesToFavorites(${safeNames})">
                <i class="far fa-heart"></i> 收藏全部
            </button>
            <button class="msg-action-btn primary" onclick="showItineraryModal(${safePlaces})">
                <i class="fas fa-route"></i> 生成行程
            </button>
            <button class="msg-action-btn feedback-like" onclick="applyRecommendationFeedback('like', ${safeLikes}, this)">
                <i class="fas fa-thumbs-up"></i> 推荐很准
            </button>
            <button class="msg-action-btn feedback-avoid" onclick="applyRecommendationFeedback('avoid', ${safeAvoids}, this)">
                <i class="fas fa-thumbs-down"></i> 不适合我
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

/* -------- 按用户隔离的关键词记忆库 -------- */
const MEMORY_STORE_KEY = 'sac_memory_by_user_v2';
const MEMORY_PRIORITY_LABELS = { 3: '高优先', 2: '中优先', 1: '低优先' };
const MEMORY_PREFERENCE_LABELS = { like: '喜欢', avoid: '避开' };

function getMemoryStore() {
    try { return JSON.parse(localStorage.getItem(MEMORY_STORE_KEY) || '{}'); }
    catch { return {}; }
}

function getUserMemory() {
    const userId = currentUser?.id || 'SAC_GUEST';
    const store = getMemoryStore();
    if (!store[userId]) {
        let legacy = null;
        try { legacy = JSON.parse(localStorage.getItem('sac_user_memory') || 'null'); } catch {}
        const legacyTags = Array.isArray(legacy?.tags) ? legacy.tags : [];
        store[userId] = {
            keywords: legacyTags.map((keyword, index) => ({
                id: `legacy-${index}-${Date.now()}`,
                keyword,
                priority: 2,
                count: 1,
                lastUsed: Date.now(),
                preference: 'like'
            })),
            updatedAt: Date.now()
        };
        localStorage.setItem(MEMORY_STORE_KEY, JSON.stringify(store));
    }
    store[userId].keywords = (store[userId].keywords || []).map(item => ({
        ...item,
        preference: item.preference === 'avoid' ? 'avoid' : 'like',
        priority: Math.min(3, Math.max(1, Number(item.priority) || 2)),
        count: Math.max(1, Number(item.count) || 1)
    }));
    return store[userId];
}

function saveUserMemory(memory) {
    const userId = currentUser?.id || 'SAC_GUEST';
    const store = getMemoryStore();
    store[userId] = {
        keywords: Array.isArray(memory.keywords) ? memory.keywords : [],
        updatedAt: Date.now()
    };
    localStorage.setItem(MEMORY_STORE_KEY, JSON.stringify(store));
    refreshMemoryBadge();
    // 同步到 Supabase search_memories（全量替换：先删后插，简单可靠）
    if (supabaseClient && memory.keywords && memory.keywords.length > 0) {
        const uid = currentUser?.id || 'SAC_GUEST';
        const rows = memory.keywords.slice(0, 30).map(k => ({
            user_id: uid,
            keyword: String(k.keyword || '').slice(0, 50),
            priority: Math.min(3, Math.max(1, Number(k.priority) || 2)),
            count: Math.max(1, Number(k.count) || 1),
            preference: k.preference === 'avoid' ? 'avoid' : 'like',
            last_used: new Date().toISOString()
        })).filter(r => r.keyword);
        if (rows.length > 0) {
            supabaseClient.from('search_memories')
                .upsert(rows, { onConflict: 'user_id,keyword' })
                .then(({ error }) => reportSupabaseError('保存记忆', error));
        }
    }
}

function extractMemoryKeywords(text) {
    const value = String(text || '').trim();
    if (!value) return [];
    const found = extractPreferences(value);
    for (const place of BEIJING_PLACES) {
        if ([place.name, ...(place.aliases || [])].some(alias => alias && value.includes(alias))) found.push(place.name);
    }
    const cleaned = value
        .replace(/请|帮我|给我|我想|想要|想找|推荐|搜索|查找|一下|一个|一些|有没有|适合|地方|地点|附近|可以|希望|地图中|地图上/g, ' ')
        .replace(/[，。！？、；：,.!?;:\s]+/g, ' ');
    if (found.length === 0) {
        cleaned.split(' ').forEach(part => {
            const keyword = part.trim();
            if (keyword.length >= 2 && keyword.length <= 12 && !/^\d+$/.test(keyword)) found.push(keyword);
        });
    }
    return [...new Set(found.map(item => String(item).trim()).filter(Boolean))].slice(0, 8);
}

function recordSearchKeywords(text, suppliedKeywords = [], options = {}) {
    const records = [
        ...extractMemoryKeywords(text).map(keyword => ({ keyword, preference: 'like' })),
        ...suppliedKeywords.map(item => typeof item === 'string'
            ? { keyword: item.trim(), preference: 'like' }
            : { keyword: String(item?.keyword || '').trim(), preference: item?.preference === 'avoid' ? 'avoid' : 'like' })
    ].filter(item => item.keyword.length >= 2 && item.keyword.length <= 16);
    const unique = [...new Map(records.map(item => [item.keyword, item])).values()];
    if (!unique.length) return;
    const memory = getUserMemory();
    const now = Date.now();
    unique.forEach(record => {
        const existing = memory.keywords.find(item => item.keyword === record.keyword);
        if (existing) {
            existing.count = (existing.count || 1) + (Number(options.increment) || 1);
            existing.lastUsed = now;
            existing.preference = record.preference;
            if (options.priority) existing.priority = Math.max(existing.priority || 1, Number(options.priority));
        } else {
            memory.keywords.push({
                id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
                keyword: record.keyword,
                priority: Math.min(3, Math.max(1, Number(options.priority) || 1)),
                count: 1,
                lastUsed: now,
                preference: record.preference
            });
        }
    });
    saveUserMemory(memory);
}

function updateUserMemory(newTags) {
    recordSearchKeywords('', newTags, { priority: 1 });
    return getUserMemory();
}

function applyRecommendationFeedback(preference, keywords, button) {
    const records = (keywords || []).map(keyword => ({ keyword, preference }));
    if (!records.length) return;
    recordSearchKeywords('', records, { priority: 3, increment: 2 });
    const group = button?.closest('.msg-actions');
    if (group) {
        group.querySelectorAll('.feedback-like, .feedback-avoid').forEach(item => item.classList.remove('selected'));
        button.classList.add('selected');
    }
    showToast(preference === 'avoid' ? '已记住：以后避开这类选择' : '已记住：以后优先推荐这类地点', 'success');
}

function getPrioritizedMemoryKeywords() {
    return [...getUserMemory().keywords].sort((a, b) =>
        (Number(b.priority) - Number(a.priority)) ||
        ((b.count || 0) - (a.count || 0)) ||
        ((b.lastUsed || 0) - (a.lastUsed || 0))
    );
}

function refreshMemoryBadge() {
    const badge = document.getElementById('memory-count-badge');
    if (badge) badge.textContent = getUserMemory().keywords.length;
}

function openMemoryLibrary() {
    const items = getPrioritizedMemoryKeywords();
    const listHtml = items.length ? items.map(item => `
        <div class="memory-item" data-memory-id="${item.id}">
            <div class="memory-keyword-row">
                <i class="fas fa-hashtag"></i>
                <input id="memory-input-${item.id}" class="memory-keyword-input" value="${escapeHtml(item.keyword)}" maxlength="16" aria-label="记忆关键词">
                <button class="memory-icon-btn" onclick="saveMemoryKeyword('${item.id}')" title="保存修改"><i class="fas fa-check"></i></button>
                <button class="memory-icon-btn danger" onclick="deleteMemoryKeyword('${item.id}')" title="删除关键词"><i class="fas fa-trash"></i></button>
            </div>
            <div class="memory-meta-row">
                <span>使用 ${item.count || 1} 次</span>
                <div class="memory-selects">
                    <select class="memory-preference ${item.preference === 'avoid' ? 'avoid' : ''}" onchange="updateMemoryPreference('${item.id}', this.value)" aria-label="喜欢或避开">
                        <option value="like" ${item.preference !== 'avoid' ? 'selected' : ''}>喜欢</option>
                        <option value="avoid" ${item.preference === 'avoid' ? 'selected' : ''}>避开</option>
                    </select>
                    <select class="memory-priority" onchange="updateMemoryPriority('${item.id}', this.value)" aria-label="记忆优先级">
                        <option value="3" ${Number(item.priority) === 3 ? 'selected' : ''}>高优先</option>
                        <option value="2" ${Number(item.priority) === 2 ? 'selected' : ''}>中优先</option>
                        <option value="1" ${Number(item.priority) === 1 ? 'selected' : ''}>低优先</option>
                    </select>
                </div>
            </div>
        </div>`).join('') : `
        <div class="empty-state memory-empty">
            <i class="fas fa-brain"></i>
            <p>记忆库还是空的</p>
            <span>你每次搜索后，这里只会记录关键词</span>
        </div>`;

    openSidePanel('我的记忆库', `
        <div class="memory-privacy-note">
            <i class="fas fa-shield-heart"></i>
            <div><strong>${escapeHtml(currentUser?.username || '当前用户')}的专属记忆</strong><span>关键词可标记为“喜欢”或“避开”；不保存完整搜索句，推荐时会按需交给本地服务与 DeepSeek。</span></div>
        </div>
        <div class="memory-add-row">
            <input class="sp-input" id="memory-add-input" maxlength="16" placeholder="添加关键词，如：安静、水边" onkeypress="if(event.key==='Enter')addMemoryKeyword()">
            <button class="sp-btn-primary memory-add-btn" onclick="addMemoryKeyword()"><i class="fas fa-plus"></i> 添加</button>
        </div>
        <div class="memory-order-tip"><i class="fas fa-arrow-down-wide-short"></i> 硬约束优先，其次按喜欢/避开、优先级、使用次数和最近使用时间排序</div>
        <div class="memory-list">${listHtml}</div>
    `);
}

function addMemoryKeyword() {
    const input = document.getElementById('memory-add-input');
    const keyword = input?.value.trim();
    if (!keyword) return;
    if (keyword.length < 2) { showToast('关键词至少需要 2 个字符', 'error'); return; }
    recordSearchKeywords('', [{ keyword, preference: 'like' }], { priority: 2 });
    openMemoryLibrary();
    showToast(`已添加记忆「${keyword}」`, 'success');
}

function saveMemoryKeyword(id) {
    const input = document.getElementById(`memory-input-${id}`);
    const keyword = input?.value.trim();
    if (!keyword || keyword.length < 2) { showToast('关键词至少需要 2 个字符', 'error'); return; }
    const memory = getUserMemory();
    const item = memory.keywords.find(entry => entry.id === id);
    if (!item) return;
    const duplicate = memory.keywords.find(entry => entry.id !== id && entry.keyword === keyword);
    if (duplicate) {
        duplicate.count = (duplicate.count || 1) + (item.count || 1);
        duplicate.priority = Math.max(Number(duplicate.priority) || 1, Number(item.priority) || 1);
        duplicate.lastUsed = Date.now();
        memory.keywords = memory.keywords.filter(entry => entry.id !== id);
    } else {
        item.keyword = keyword;
        item.lastUsed = Date.now();
    }
    saveUserMemory(memory);
    openMemoryLibrary();
    showToast('记忆关键词已更新', 'success');
}

function updateMemoryPriority(id, priority) {
    const memory = getUserMemory();
    const item = memory.keywords.find(entry => entry.id === id);
    if (!item) return;
    item.priority = Math.min(3, Math.max(1, Number(priority) || 2));
    saveUserMemory(memory);
    openMemoryLibrary();
    showToast(`已设为${MEMORY_PRIORITY_LABELS[item.priority]}`, 'success');
}

function updateMemoryPreference(id, preference) {
    const memory = getUserMemory();
    const item = memory.keywords.find(entry => entry.id === id);
    if (!item) return;
    item.preference = preference === 'avoid' ? 'avoid' : 'like';
    saveUserMemory(memory);
    openMemoryLibrary();
    showToast(`已设为“${MEMORY_PREFERENCE_LABELS[item.preference]}”`, 'success');
}

function deleteMemoryKeyword(id) {
    const memory = getUserMemory();
    const item = memory.keywords.find(entry => entry.id === id);
    memory.keywords = memory.keywords.filter(entry => entry.id !== id);
    saveUserMemory(memory);
    openMemoryLibrary();
    if (item) showToast(`已删除记忆「${item.keyword}」`, 'info');
}

refreshMemoryBadge();

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
function scorePlace(place, userTags, options = {}) {
    let score = 0;
    const reasons = [];
    const memoryScale = Number.isFinite(options.memoryScale) ? options.memoryScale : 1;

    // 标签匹配（核心）
    const matchedTags = userTags.filter(t => place.tags.includes(t));
    score += matchedTags.length * 25;
    matchedTags.forEach(t => reasons.push(`标签匹配「${t}」`));

    // 环境特征加分
    if (userTags.includes('安静') && place.features.quietness >= 75) { score += 15; reasons.push(`安静度 ${place.features.quietness}%`); }
    if (userTags.includes('绿色') && place.features.green >= 0.7) { score += 12; reasons.push(`植被指数 NDVI ${place.features.green}`); }
    if (userTags.includes('水边') && place.features.water >= 0.35) { score += 12; reasons.push(`水体覆盖 ${place.features.water}`); }
    if (userTags.includes('爬山') && place.features.slope >= 15) { score += 10; reasons.push(`平均坡度 ${place.features.slope}°`); }
    if (userTags.includes('徒步') && place.features.slope >= 3) { score += 8; reasons.push(`可步行区域`); }
    if (userTags.includes('拍照')) { score += 5; }
    if (userTags.includes('小众') && (place.features.crowd === '低' || place.features.crowd === '中低')) { score += 10; reasons.push(`人流量 ${place.features.crowd}`); }
    if (userTags.includes('开阔') && (place.features.green >= 0.7 || place.features.water >= 0.5)) { score += 8; }

    // 用户历史偏好加权
    const mem = getUserMemory();
    if (mem && mem.keywords.length) {
        const historyMatch = mem.keywords.filter(item => place.tags.includes(item.keyword));
        historyMatch.forEach(item => {
            const priorityWeight = Math.min(3, Math.max(1, Number(item.priority) || 2));
            const memoryWeight = priorityWeight * 5 + Math.min(5, Number(item.count) || 1);
            if (item.preference === 'avoid') {
                score -= memoryWeight * 3 * memoryScale;
                reasons.push(`避开记忆「${item.keyword}」· ${MEMORY_PRIORITY_LABELS[priorityWeight]}`);
            } else {
                score += memoryWeight * memoryScale;
                reasons.push(`喜欢记忆「${item.keyword}」· ${MEMORY_PRIORITY_LABELS[priorityWeight]}`);
            }
        });
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
function generateAIReply(text, options = {}) {
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
        if (mem && mem.keywords.length) {
            const historyOnly = getPrioritizedMemoryKeywords()
                .filter(item => item.preference !== 'avoid')
                .map(item => item.keyword)
                .filter(t => !userTags.includes(t));
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

        if (!options.skipMemory) updateUserMemory(userTags);

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
let mainMarkers = [];
let searchMarkers = [];
let currentLayer = 'gaode';

// 构造天地图 WMTS 瓦片地址（球面墨卡托 _w，与 Leaflet 投影一致）
function tdtTileUrl(layer) {
    return `https://t{s}.tianditu.gov.cn/${layer}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tdtKey}`;
}

// 懒加载天地图图层（首次切到地形/影像时取 Key 并构建）
function ensureTiandituLayers() {
    if (terrainGroup && tdtImgGroup) return Promise.resolve();
    if (tdtLayersPromise) return tdtLayersPromise;
    tdtLayersPromise = (async () => {
        if (!tdtKey) {
            try {
                const r = await fetch('/api/config');
                const d = await r.json();
                tdtKey = d.tiandituKey || '';
            } catch { tdtKey = ''; }
        }
        if (!tdtKey) throw new Error('天地图 Key 未配置');
        const sub = ['0', '1', '2', '3', '4', '5', '6', '7'];
        const opt = { subdomains: sub, maxZoom: 18, minZoom: 2 };
        // 地形：晕渲底图 ter + 地形注记 cta
        terrainGroup = L.layerGroup([
            L.tileLayer(tdtTileUrl('ter'), opt),
            L.tileLayer(tdtTileUrl('cta'), opt)
        ]);
        // 官方影像：影像底图 img + 影像注记 cia
        tdtImgGroup = L.layerGroup([
            L.tileLayer(tdtTileUrl('img'), opt),
            L.tileLayer(tdtTileUrl('cia'), opt)
        ]);
    })();
    return tdtLayersPromise;
}
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
    L.control.zoom({ position: 'bottomright' }).addTo(mainMap);

    const syncMarkerLabels = () => {
        mainMap.getContainer().classList.toggle('map-labels-hidden', mainMap.getZoom() < 14);
    };
    mainMap.on('zoomend', syncMarkerLabels);
    syncMarkerLabels();

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
    const html = `<div class="cute-marker">
        <div class="cute-marker-icon ${catClass}"><i class="fas ${iconName}"></i></div>
        <div class="cute-marker-label">${place.name}</div>
    </div>`;
    const icon = L.divIcon({ className: '', html, iconSize: [36, 60], iconAnchor: [18, 50], popupAnchor: [0, -50] });
    const tagsHtml = (place.tags || []).slice(0, 4).map(t => `<span class="popup-tag">${t}</span>`).join('');
    const tipsHtml = (place.tips || []).slice(0, 2).map(t => `<div class="popup-tip">⚠️ ${t}</div>`).join('');
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
// 解析高德 polyline 字符串（"lng,lat;lng,lat;..."）为 [[lat,lng],...]
function parseAmapPolyline(polyline) {
    if (!polyline) return [];
    return polyline.split(';').map(seg => {
        const [lng, lat] = seg.split(',').map(Number);
        return [lat, lng];
    }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));
}

async function planRouteWithAmap(dstLat, dstLng, dstName) {
    const origin = `${ROUTE_START.lng},${ROUTE_START.lat}`;
    const dest = `${dstLng},${dstLat}`;
    const res = await fetch(`/api/amap/direction/walking?origin=${origin}&destination=${dest}`);
    const data = await res.json();
    if (data.status !== '1' || !data.route?.paths?.length) return false;

    const path = data.route.paths[0];
    const distanceKm = (path.distance / 1000).toFixed(1);
    const timeMin = Math.round(path.duration / 60);
    // 拼接所有步骤的 polyline
    let allPoints = [];
    const instructions = [];
    (path.steps || []).forEach(s => {
        allPoints = allPoints.concat(parseAmapPolyline(s.polyline));
        const instrText = String(s.instruction || '').replace(/<[^>]+>/g, '');
        instructions.push({ text: instrText, distance: s.distance });
    });
    if (allPoints.length < 2) return false;

    routePolyline = L.polyline(allPoints, {
        color: '#f97316', weight: 6, opacity: 0.85,
        lineCap: 'round', lineJoin: 'round'
    }).addTo(mainMap);

    const bounds = L.latLngBounds(allPoints).pad(0.15);
    mainMap.fitBounds(bounds);
    // 不在地图上弹出文字面板，直接用 toast 提示距离和时间
    showToast(`步行路线已规划：${distanceKm}公里 · 约${timeMin}分钟`, 'success');
    return true;
}

function planRouteTo(dstLat, dstLng, dstName) {
    if (!mainMap) return;
    mainMap.closePopup();

    // 清除之前的路线
    clearRoute();

    // 优先用高德步行路径规划（国内数据更准），失败再走 OSRM 兜底
    planRouteWithAmap(dstLat, dstLng, dstName).then(ok => {
        if (ok) return;
        // 高德失败，兜底用 OSRM
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
            showToast(`步行路线已规划：${distanceKm}公里 · 约${timeMin}分钟`, 'success');
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
    }); // 闭合 planRouteWithAmap 的 .then
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

    const distKm = haversineKm(ROUTE_START.lat, ROUTE_START.lng, dstLat, dstLng);
    const distanceKm = distKm.toFixed(1);
    const timeMin = Math.round(parseFloat(distanceKm) * 3);
    const instructions = [
        { text: `从 ${ROUTE_START.name} 出发`, distance: 0 },
        { text: '沿主要道路向南行驶', distance: Math.round(parseFloat(distanceKm) * 500) },
        { text: '继续直行，注意交通信号', distance: Math.round(parseFloat(distanceKm) * 300) },
        { text: `到达目的地 ${dstName}`, distance: Math.round(parseFloat(distanceKm) * 200) }
    ];
    showToast(`路线已规划：${distanceKm}公里 · 约${timeMin}分钟（仅供参考）`, 'info');
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

// 当前地图上的全部底图图层，切换时统一移除
function allBaseLayers() {
    return [gaodeLayer, satelliteLayer, terrainGroup, tdtImgGroup].filter(Boolean);
}

async function switchLayer(type) {
    if (!mainMap) return;
    if (type === currentLayer) return;

    // 天地图图层需要先确保已加载
    if (type === 'terrain' || type === 'tdt-img') {
        showToast('正在加载天地图图层...', 'info');
        try {
            await ensureTiandituLayers();
        } catch (e) {
            showToast('天地图图层加载失败：' + e.message, 'error');
            return;
        }
    }

    currentLayer = type;
    document.querySelectorAll('.layer-btn').forEach(b => b.classList.toggle('active', b.dataset.layer === type));
    allBaseLayers().forEach(l => mainMap.removeLayer(l));

    if (type === 'gaode') gaodeLayer.addTo(mainMap);
    else if (type === 'satellite') satelliteLayer.addTo(mainMap);
    else if (type === 'terrain') terrainGroup.addTo(mainMap);
    else if (type === 'tdt-img') tdtImgGroup.addTo(mainMap);

    const names = { gaode: '标准地图', satellite: '高德卫星影像', terrain: '天地图地形晕渲', 'tdt-img': '天地图官方影像' };
    showToast(`已切换到${names[type] || ''}`, 'success');
}

/* ==================== OSM 自然景观叠加层 ==================== */
let osmGroup = null;        // Leaflet 图层组
let osmOn = false;          // 当前是否开启
let osmLoading = false;
let osmCenterKey = '';      // 已加载区域的网格键，移动地图后可重新拉取

// 各自然类别的配色与中文名
const OSM_STYLE = {
    water:        { color: '#0ea5e9', fill: '#38bdf8', fillOpacity: 0.35, weight: 1.5, label: '水体' },
    wetland:      { color: '#14b8a6', fill: '#5eead4', fillOpacity: 0.3,  weight: 1.5, label: '湿地' },
    woodland:     { color: '#16a34a', fill: '#4ade80', fillOpacity: 0.28, weight: 1.5, label: '林地' },
    park:         { color: '#22c55e', fill: '#86efac', fillOpacity: 0.22, weight: 1.5, label: '公园绿地' },
    protectedArea:{ color: '#a855f7', fill: '#c084fc', fillOpacity: 0.05, weight: 2.5, dashArray: '6,4', label: '保护区' },
    waterway:     { color: '#0284c7', fillOpacity: 0, weight: 2.5, label: '溪流河道' },
    trail:        { color: '#b45309', fillOpacity: 0, weight: 2, opacity: 0.85, dashArray: '5,4', label: '步道' },
    peak:         { color: '#78350f', label: '山峰' },
    spring:       { color: '#06b6d4', label: '泉眼' }
};

function osmCategory(tags) {
    if (tags.natural === 'peak') return 'peak';
    if (tags.natural === 'spring') return 'spring';
    if (tags.natural === 'water') return 'water';
    if (tags.natural === 'wetland') return 'wetland';
    if (tags.natural === 'wood' || tags.landuse === 'forest') return 'woodland';
    if (tags.leisure === 'park') return 'park';
    if (tags.boundary === 'protected_area') return 'protectedArea';
    if (tags.waterway) return 'waterway';
    if (tags.highway) return 'trail';
    return null;
}

function osmPopup(name, cat, tags) {
    const s = OSM_STYLE[cat];
    // 过滤 OSM 里纯数字之类的无效名称（如 "111"），回退为类别名
    if (name && /^\d+$/.test(name.trim())) name = '';
    let rows = '';
    if (tags.ele) rows += `<div>海拔：${tags.ele} 米</div>`;
    if (tags.waterway) rows += `<div>类型：${{stream:'溪流',river:'河流',canal:'水渠'}[tags.waterway] || tags.waterway}</div>`;
    if (tags.protect_class) rows += `<div>保护等级：${tags.protect_class}</div>`;
    if (tags.surface) rows += `<div>路面：${tags.surface}</div>`;
    return `<div style="min-width:140px;font-size:12px;">
        <b style="color:${s.color};">${name || s.label}</b>
        <div style="color:#999;margin:2px 0;">OSM · ${s.label}</div>${rows}
        <div style="color:#bbb;margin-top:4px;font-size:11px;">数据 © OpenStreetMap 贡献者</div>
    </div>`;
}

// 拉取并渲染当前地图中心周边的 OSM 自然要素
async function loadOsmNature(forceReload) {
    if (!mainMap || osmLoading) return;
    const c = mainMap.getCenter();
    const gridKey = `${Math.round(c.lat * 100) / 100},${Math.round(c.lng * 100) / 100}`;
    if (!forceReload && osmGroup && gridKey === osmCenterKey) return;
    osmLoading = true;
    showToast('正在加载 OpenStreetMap 自然要素...', 'info');
    try {
        const r = await fetch(`/api/osm/nature?lat=${c.lat}&lng=${c.lng}&radius=3000`);
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || '请求失败');
        if (osmGroup) { mainMap.removeLayer(osmGroup); osmGroup = null; }
        osmGroup = L.layerGroup();
        let rendered = 0;
        for (const e of data.elements) {
            const tags = e.tags || {};
            const cat = osmCategory(tags);
            if (!cat) continue;
            const st = OSM_STYLE[cat];
            const popup = osmPopup(tags.name, cat, tags);

            if (e.type === 'node') {
                if (cat === 'peak') {
                    const icon = L.divIcon({
                        className: '',
                        html: `<div style="position:relative;"><div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:13px solid ${st.color};filter:drop-shadow(0 1px 2px rgba(0,0,0,.4));"></div></div>`,
                        iconSize: [14, 13], iconAnchor: [7, 13]
                    });
                    L.marker([e.lat, e.lon], { icon }).bindPopup(popup).addTo(osmGroup);
                } else {
                    L.circleMarker([e.lat, e.lon], {
                        radius: 5, color: '#fff', weight: 1.5, fillColor: st.color, fillOpacity: 0.9
                    }).bindPopup(popup).addTo(osmGroup);
                }
                rendered++;
            } else if (e.geometry && e.geometry.length) {
                const latlngs = e.geometry.map(g => [g.lat, g.lon]);
                const isArea = cat === 'water' || cat === 'wetland' || cat === 'woodland' || cat === 'park' || cat === 'protectedArea';
                const opts = { color: st.color, weight: st.weight, opacity: st.opacity || 1, fillColor: st.fill || st.color, fillOpacity: st.fillOpacity || 0, dashArray: st.dashArray || null };
                const layer = isArea ? L.polygon(latlngs, opts) : L.polyline(latlngs, opts);
                layer.bindPopup(popup).addTo(osmGroup);
                rendered++;
            }
        }
        osmCenterKey = gridKey;
        if (osmOn) osmGroup.addTo(mainMap);
        const ct = data.counts;
        showToast(`OSM 自然要素 ${rendered} 个：山峰${ct.peak} 水体${ct.water + ct.waterway} 林地${ct.woodland} 公园${ct.park} 步道${ct.trail} 保护区${ct.protectedArea}`, 'success');
    } catch (e) {
        showToast('自然要素加载失败：' + e.message, 'error');
    } finally {
        osmLoading = false;
    }
}

function toggleOsmNature() {
    if (!mainMap) return;
    const btn = document.getElementById('osm-toggle-btn');
    osmOn = !osmOn;
    if (osmOn) {
        if (!osmGroup) loadOsmNature(true);
        else osmGroup.addTo(mainMap);
        btn && btn.classList.add('active');
        showToast('已开启 OSM 自然景观图层', 'success');
    } else {
        if (osmGroup) mainMap.removeLayer(osmGroup);
        btn && btn.classList.remove('active');
        showToast('已关闭自然景观图层', 'info');
    }
}

/* ==================== 推荐列表 ==================== */
// 按地点类型精选真实匹配的 Unsplash 照片（回退用）
const PLACE_TYPE_IMAGES = {
    '皇家园林': 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&h=450&fit=crop',
    '皇家宫殿': 'https://images.unsplash.com/photo-1584646098378-0874589d76b1?w=800&h=450&fit=crop',
    '皇家祭坛': 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&h=450&fit=crop',
    '城市地标': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=450&fit=crop',
    '纪念建筑': 'https://images.unsplash.com/photo-1565060169194-19fabd69c8d1?w=800&h=450&fit=crop',
    '历史建筑': 'https://images.unsplash.com/photo-1536431311719-398b6704d4cc?w=800&h=450&fit=crop',
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
    '专类馆': 'https://images.unsplash.com/photo-1565060169194-19fabd69c8d1?w=800&h=450&fit=crop',
    '文化场馆': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=450&fit=crop',
    '宗教建筑': 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&h=450&fit=crop',
    '名人故居': 'https://images.unsplash.com/photo-1536431311719-398b6704d4cc?w=800&h=450&fit=crop',
    '历史遗址': 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&h=450&fit=crop',
    '自然遗址': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=450&fit=crop',
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
    '学府': 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=800&h=450&fit=crop',
    '主题乐园': 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=800&h=450&fit=crop',
    '动物园': 'https://images.unsplash.com/photo-1504173010664-32509aeebb62?w=800&h=450&fit=crop',
    '古镇': 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&h=450&fit=crop',
    '滨水街区': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&h=450&fit=crop'
};

// 类型→渐变配色（兜底用）
const TYPE_TO_GRADIENT = {
    '城市公园': 'linear-gradient(135deg, #10b981, #059669)',
    '皇家园林': 'linear-gradient(135deg, #f59e0b, #d97706)',
    '皇家宫殿': 'linear-gradient(135deg, #f97316, #ea580c)',
    '皇家祭坛': 'linear-gradient(135deg, #fbbf24, #d97706)',
    '城市地标': 'linear-gradient(135deg, #fb7185, #e11d48)',
    '纪念建筑': 'linear-gradient(135deg, #f97316, #c2410c)',
    '历史建筑': 'linear-gradient(135deg, #f59e0b, #92400e)',
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
    '专类馆': 'linear-gradient(135deg, #e8c4a8, #0284c7)',
    '文化场馆': 'linear-gradient(135deg, #818cf8, #4f46e5)',
    '宗教建筑': 'linear-gradient(135deg, #fbbf24, #b45309)',
    '名人故居': 'linear-gradient(135deg, #fb923c, #c2410c)',
    '历史遗址': 'linear-gradient(135deg, #a78bfa, #6d28d9)',
    '自然遗址': 'linear-gradient(135deg, #22c55e, #047857)',
    '大学校园': 'linear-gradient(135deg, #818cf8, #6366f1)',
    '商圈': 'linear-gradient(135deg, #f9a8d4, #ec4899)',
    '现代建筑': 'linear-gradient(135deg, #67e8f9, #0891b2)',
    '工业遗产': 'linear-gradient(135deg, #a1a1aa, #71717a)',
    '当代艺术': 'linear-gradient(135deg, #c084fc, #9333ea)',
    '艺术街区': 'linear-gradient(135deg, #c084fc, #9333ea)',
    '古刹': 'linear-gradient(135deg, #fbbf24, #d97706)',
    '古村落': 'linear-gradient(135deg, #fb923c, #c2410c)',
    '专类园': 'linear-gradient(135deg, #22c55e, #15803d)',
    '景观公路': 'linear-gradient(135deg, #c45c26, #0f766e)',
    '特色景观': 'linear-gradient(135deg, #f472b6, #db2777)',
    '学府': 'linear-gradient(135deg, #818cf8, #6366f1)',
    '主题乐园': 'linear-gradient(135deg, #f472b6, #db2777)',
    '动物园': 'linear-gradient(135deg, #84cc16, #3f6212)',
    '古镇': 'linear-gradient(135deg, #fb923c, #9a3412)',
    '滨水街区': 'linear-gradient(135deg, #22d3ee, #0284c7)'
};

// 类型→图标（兜底用）
const TYPE_TO_ICON = {
    '城市公园': 'fa-tree', '山地': 'fa-mountain', '湖泊': 'fa-water',
    '皇家园林': 'fa-landmark', '皇家宫殿': 'fa-landmark', '长城': 'fa-mountain',
    '历史街区': 'fa-landmark', '博物馆': 'fa-building', '大学校园': 'fa-graduation-cap',
    '城市地标': 'fa-location-dot', '纪念建筑': 'fa-monument', '历史建筑': 'fa-landmark',
    '宗教建筑': 'fa-landmark', '名人故居': 'fa-house', '历史遗址': 'fa-landmark',
    '自然遗址': 'fa-mountain', '专类馆': 'fa-building', '文化场馆': 'fa-building-columns',
    '商圈': 'fa-shopping-bag', '现代建筑': 'fa-building', '工业遗产': 'fa-industry',
    '湿地公园': 'fa-water', '森林公园': 'fa-tree', '山地公园': 'fa-mountain',
    '峡谷': 'fa-mountain', '古刹': 'fa-landmark', '古村落': 'fa-house',
    '当代艺术': 'fa-palette', '艺术街区': 'fa-palette', '景观公路': 'fa-route',
    '特色景观': 'fa-star', '专类园': 'fa-tree', '遗址公园': 'fa-landmark',
    '皇家祭坛': 'fa-landmark', '学府': 'fa-graduation-cap', '主题乐园': 'fa-ticket',
    '动物园': 'fa-paw', '古镇': 'fa-house', '滨水街区': 'fa-water'
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

function getFavs() {
    try { return JSON.parse(localStorage.getItem('sac_favorites') || '[]'); }
    catch { return []; }
}

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateRecommendations(filter = 'all') {
    let pool = [...BEIJING_PLACES];
    const relaxTags = ['休闲', '安静', '散步', '放松', '发呆'];
    if (filter === 'relax') {
        pool = pool.filter(p => (p.tags || []).some(t => relaxTags.includes(t)) || ['城市公园', '公园绿地', '湖泊'].includes(p.type));
    } else if (filter !== 'all') {
        pool = pool.filter(p => TYPE_TO_CATEGORY[p.type] === filter);
    }
    // 随机打乱取 6 个
    pool.sort(() => Math.random() - 0.5);
    const selected = pool.slice(0, 6);
    const favs = getFavs();
    return selected.map(p => {
        const cat = TYPE_TO_CATEGORY[p.type] || 'nature';
        const features = p.features || {};
        const meta = [];
        if (features.green >= 0.7) meta.push({t:`NDVI ${features.green}`,c:'green'});
        if (features.water >= 0.3) meta.push({t:`水体 ${features.water}`,c:'blue'});
        if (features.slope >= 15) meta.push({t:`坡度 ${features.slope}°`,c:'yellow'});
        else if (features.slope >= 3) meta.push({t:`缓坡 ${features.slope}°`,c:'blue'});
        if (features.quietness >= 80) meta.push({t:`安静度 ${features.quietness}%`,c:'green'});
        const desc = p.desc || '';
        const reason = `${desc.slice(0, 30)}${desc.length > 30 ? '...' : ''}`;
        const imgs = buildPlaceImage(p);
        return {
            name: p.name,
            type: p.type,
            icon: TYPE_TO_ICON[p.type] || 'fa-map-marker-alt',
            gradient: TYPE_TO_GRADIENT[p.type] || 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            osmImage: imgs.osmUrl,
            fallbackImage: imgs.fallbackUrl,
            match: Math.floor(Math.random() * 25) + 72,
            desc: desc.slice(0, 50),
            meta: meta.length > 0 ? meta : [{t:(p.tags && p.tags[0]) || '推荐',c:'green'}],
            reason,
            distance: `${haversineKm(userProfile.lat, userProfile.lng, p.lat, p.lng).toFixed(1)}km`,
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
                <div class="card-img-placeholder"><i class="fas ${r.icon}"></i></div>
                <img class="card-real-img" src="${r.osmImage}" alt="" loading="lazy" onerror="if(this.dataset.fallback){this.remove();}else{this.dataset.fallback='1';this.src='${r.fallbackImage}';this.classList.add('has-fallback');}">
                <div class="card-img-type-tag"><i class="fas ${r.icon}"></i> ${r.type}</div>
                <button class="card-fav-btn${favClass}" data-name="${r.name}" onclick="event.stopPropagation();toggleFav(this)" title="收藏" aria-label="收藏">${favIcon}</button>
            </div>
            <div class="card-body">
                <div class="card-title-row">
                    <div class="card-title">${r.name}</div>
                    <div class="card-match"><i class="fas fa-star"></i> ${r.match}%</div>
                </div>
                <div class="card-sub"><i class="fas fa-location-dot"></i> ${r.distance}</div>
                <div class="card-desc">${r.desc}</div>
                <div class="card-meta">${metaHtml}</div>
                <button class="card-go-btn" onclick="event.stopPropagation();navigateToPlace('${r.name}',${r.lat},${r.lng})"><i class="fas fa-location-arrow"></i> 去这里</button>
            </div>`;
        card.addEventListener('click', () => navigateToPlace(r.name, r.lat, r.lng));
        list.appendChild(card);
    });
}

function focusPlaceOnMap(name, lat, lng) {
    switchTab('map');
    setTimeout(() => {
        if (!mainMap) initMainMap();
        if (!mainMap) return;
        mainMap.invalidateSize();
        mainMap.flyTo([Number(lat), Number(lng)], 15, { duration: 0.8 });
        showToast(`正在查看 ${name}`, 'info');
    }, 60);
}

function navigateToPlace(name, lat, lng) {
    focusPlaceOnMap(name, lat, lng);
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
        // Supabase 删除
        if (supabaseClient) {
            supabaseClient.from('favorites')
                .delete()
                .eq('user_id', currentUser?.id || 'SAC_GUEST')
                .eq('place_name', name)
                .then(({ error }) => reportSupabaseError('取消收藏', error));
        }
    } else {
        favs.push(name);
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-heart"></i>';
        showToast(`已收藏 ${name} ❤️`, 'success');
        // Supabase 插入
        if (supabaseClient) {
            const kb = (typeof BEIJING_PLACES !== 'undefined') ? BEIJING_PLACES : [];
            const p = kb.find(x => x.name === name);
            supabaseClient.from('favorites').upsert({
                user_id: currentUser?.id || 'SAC_GUEST',
                place_name: name,
                place_lat: p?.lat || null,
                place_lng: p?.lng || null,
                place_type: p?.type || null,
                source: 'local',
                fetched_at: new Date().toISOString()
            }, { onConflict: 'user_id,place_name' }).then(({ error }) => reportSupabaseError('收藏地点', error));
        }
    }
    localStorage.setItem('sac_favorites', JSON.stringify(favs));
}

/* ==================== 退出登录（已移除登录页，保留为刷新会话） ==================== */
function logout() {
    showToast('已免登录，无需退出', 'info');
}

/* ==================== 天气详情弹窗 ==================== */
// 和风 icon 代码（100晴/101多云/102少云/103晴间多云/104阴/150-154夜间/3xx雨/4xx雪/5xx沙尘）
// 映射到 Font Awesome 图标；带 n 后缀的表示夜间版本
function weatherFaIcon(code, isNight) {
    const c = parseInt(code, 10);
    if (c === 100 || c === 150) return isNight ? 'fa-moon' : 'fa-sun';
    if (c === 101 || c === 151) return isNight ? 'fa-cloud-moon' : 'fa-cloud-sun';
    if (c === 102 || c === 103 || c === 152 || c === 153) return isNight ? 'fa-cloud-moon' : 'fa-cloud-sun';
    if (c === 104 || c === 154) return 'fa-cloud';
    if (c >= 300 && c < 400) return 'fa-cloud-rain';
    if (c >= 400 && c < 500) return 'fa-snowflake';
    if (c >= 500 && c < 600) return 'fa-smog';
    return 'fa-cloud-sun';
}

function isNightHour(dateLike) {
    const h = new Date(dateLike).getHours();
    return h >= 19 || h < 6;
}

let weatherLoadedFor = '';   // 避免同一地点重复请求

async function toggleWeatherModal() {
    const modal = document.getElementById('weather-modal');
    modal.classList.toggle('show');
    if (!modal.classList.contains('show')) return;

    // 以地图中心为查询点；没地图时退回默认北京海淀
    let lat = 39.9597, lng = 116.2980, label = '北京 · 海淀区';
    if (typeof mainMap !== 'undefined' && mainMap) {
        const c = mainMap.getCenter();
        lat = c.lat; lng = c.lng;
        label = `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    }
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    if (key === weatherLoadedFor) return; // 同一地点已成功加载过

    const hero = modal.querySelector('.wm-hero');
    const tempEl = modal.querySelector('.wm-temp');
    const condEl = modal.querySelector('.wm-condition');
    const locEl = modal.querySelector('.wm-location');
    const iconEl = modal.querySelector('.wm-main-icon');
    const details = modal.querySelectorAll('.wm-detail-item');
    const hourlyBox = modal.querySelector('.wm-hourly');
    const tipSpan = modal.querySelector('.wm-tip span');

    locEl.innerHTML = `<i class="fas fa-location-dot"></i> ${label} <span style="opacity:.6;font-size:11px;">加载中…</span>`;

    try {
        const r = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || '请求失败');
        const night = isNightHour(d.now.obsTime);
        const faClass = weatherFaIcon(d.now.icon, night);

        locEl.innerHTML = `<i class="fas fa-location-dot"></i> ${label}`;
        tempEl.textContent = `${d.now.temp}°`;
        condEl.textContent = `${d.now.text} · 体感 ${d.now.feelsLike}°`;
        iconEl.className = `fas ${faClass} wm-main-icon`;

        // 详情 4 格：湿度 / 风力 / 空气 / 紫外线
        const uv = ((d.indices || []).find(i => i.type === '5') || {}).category || '--';
        weatherLoadedFor = key;
        const airText = d.air ? `${d.air.category} ${d.air.aqi}` : '--';
        const detailVals = [
            `${d.now.humidity}%`,
            `${d.now.windDir} ${d.now.windScale}级`,
            airText,
            uv
        ];
        details.forEach((el, i) => {
            const v = el.querySelector('.wm-detail-value');
            if (v) v.textContent = detailVals[i];
        });

        // 逐时预报（前 6 条）
        hourlyBox.innerHTML = (d.hourly || []).slice(0, 6).map((h, idx) => {
            const t = new Date(h.time);
            const timeLabel = idx === 0 ? '现在' : `${t.getHours()}时`;
            const icon = weatherFaIcon(h.icon, isNightHour(h.time));
            return `<div class="wm-hour${idx === 0 ? ' active' : ''}">
                <div class="wm-hour-time">${timeLabel}</div>
                <i class="fas ${icon}"></i>
                <div class="wm-hour-temp">${h.temp}°</div>
            </div>`;
        }).join('');

        // 智能提示：按真实数据拼
        const tips = [];
        const t = d.now.text;
        if (/雨|雷/.test(t)) tips.push('有降水，出门记得带伞');
        else if (/雪/.test(t)) tips.push('有降雪，注意防滑保暖');
        else if (/晴/.test(t) && !night) tips.push('天气晴好，适合户外活动');
        else if (/阴|多云/.test(t)) tips.push('云量较多，体感舒适');
        if (uv === '强' || uv === '很强') tips.push('紫外线较强，做好防晒');
        if (d.air && d.air.aqi > 100) tips.push(`空气${d.air.category}，敏感人群减少户外运动`);
        const wind = parseInt(d.now.windScale, 10);
        if (wind >= 6) tips.push('风力较大，注意防风');
        if (d.now.feelsLike <= 5) tips.push('体感偏冷，注意添衣');
        else if (d.now.feelsLike >= 32) tips.push('体感炎热，及时补水');
        tipSpan.textContent = tips.length ? tips.join('；') + '。' : '天气平稳，适合出行。';
    } catch (e) {
        locEl.innerHTML = `<i class="fas fa-location-dot"></i> ${label}`;
        condEl.textContent = '天气数据加载失败';
        tipSpan.textContent = e.message || '天气数据加载失败';
        weatherLoadedFor = '';
    }
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
    // 批量同步 Supabase
    if (supabaseClient && added > 0) {
        const kb = (typeof BEIJING_PLACES !== 'undefined') ? BEIJING_PLACES : [];
        const rows = placeNames.map(name => {
            const p = kb.find(x => x.name === name);
            return {
                user_id: currentUser?.id || 'SAC_GUEST',
                place_name: name,
                place_lat: p?.lat || null,
                place_lng: p?.lng || null,
                place_type: p?.type || null,
                source: 'local',
                fetched_at: new Date().toISOString()
            };
        });
        supabaseClient.from('favorites').upsert(rows, { onConflict: 'user_id,place_name' })
            .then(({ error }) => reportSupabaseError('收藏地点', error));
    }
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
        const tagsHtml = (p.tags || []).slice(0, 3).map(t => `<span class="iti-tag">#${escapeHtml(t)}</span>`).join('');
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
                <button class="iti-nav-btn" onclick="toggleItinerary(); navigateToPlace('${String(p.name).replace(/'/g, "\\'")}',${p.lat},${p.lng})"><i class="fas fa-location-arrow"></i> 在地图上查看</button>
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
