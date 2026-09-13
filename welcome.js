/* ============================================================
   Spatial AI Companion - 欢迎引导页面
   ============================================================ */

/* -------- Toast -------- */
function showToast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    t.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3000);
}

/* -------- 获取登录用户 -------- */
function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('sac_current_user')); }
    catch { return null; }
}

const currentUser = getCurrentUser();
if (!currentUser) {
    window.location.href = 'main.html';
}

/* -------- 用户资料 -------- */
const userProfile = {
    username: currentUser?.username || '用户',
    gender: '',
    age: 20,
    activities: [],
    lat: 39.9597,
    lng: 116.2980,
    locationLabel: '北京·海淀区'
};

/* -------- 屏幕切换 -------- */
function goToScreen(name) {
    // 进入位置页前先校验个人信息
    if (name === 'location') {
        const gender = document.querySelector('input[name="gender"]:checked');
        if (!gender) {
            showToast('请选择性别', 'info');
            return;
        }
        userProfile.gender = gender.value;
        userProfile.age = parseInt(ageSlider.value);
        document.querySelectorAll('.activity-chips input:checked').forEach(c => {
            userProfile.activities.push(c.value);
        });
    }

    document.querySelectorAll('.onboard-screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${name}`).classList.add('active');
    if (name === 'map') {
        setTimeout(initMap, 300);
    }
    window.scrollTo(0, 0);
}

/* -------- Step 1: 欢迎页 -------- */
if (currentUser) {
    document.getElementById('user-greeting').textContent =
        `${currentUser.username}，让我们一起开启空间探索之旅`;
}

/* -------- Step 2: 年龄滑块 -------- */
const ageSlider = document.getElementById('age-slider');
const ageDisplay = document.getElementById('age-display');
ageSlider.addEventListener('input', () => {
    ageDisplay.textContent = ageSlider.value + ' 岁';
});

/* -------- Step 3: 位置授权 -------- */
function authorizeLocation() {
    if (!navigator.geolocation) {
        showToast('浏览器不支持定位，使用默认位置', 'info');
        useDefaultLocation();
        return;
    }
    showToast('正在获取你的位置...', 'info');
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            showToast('位置获取成功！', 'success');
            userProfile.lat = pos.coords.latitude;
            userProfile.lng = pos.coords.longitude;
            userProfile.locationLabel = '我的位置';
            goToScreen('map');
        },
        () => {
            showToast('定位失败，使用默认位置（北京·海淀区）', 'info');
            useDefaultLocation();
        },
        { timeout: 8000 }
    );
}

function useDefaultLocation() {
    userProfile.lat = 39.9597;
    userProfile.lng = 116.2980;
    userProfile.locationLabel = '北京·海淀区';
    goToScreen('map');
}

/* -------- Step 4: 地图 -------- */
let map = null;
let markers = [];

/* 海淀区地点数据 */
const PLACES = [
    { name: '颐和园', lat: 39.9999, lng: 116.2755, type: 'culture', icon: 'fa-landmark',
      desc: '皇家园林，世界文化遗产', tags: [{t:'人文',c:'yellow'},{t:'水边',c:'blue'}] },
    { name: '圆明园', lat: 40.0077, lng: 116.2985, type: 'culture', icon: 'fa-landmark',
      desc: '万园之园，历史遗迹', tags: [{t:'人文',c:'yellow'},{t:'遗址',c:'pink'}] },
    { name: '北京大学', lat: 39.9911, lng: 116.3055, type: 'school', icon: 'fa-graduation-cap',
      desc: '未名湖畔，博雅塔下', tags: [{t:'校园',c:'blue'},{t:'人文',c:'yellow'}] },
    { name: '清华大学', lat: 40.0026, lng: 116.3265, type: 'school', icon: 'fa-graduation-cap',
      desc: '水木清华，荷塘月色', tags: [{t:'校园',c:'blue'},{t:'自然',c:'green'}] },
    { name: '香山公园', lat: 39.9969, lng: 116.2070, type: 'nature', icon: 'fa-mountain',
      desc: '红叶胜地，登高望远', tags: [{t:'山地',c:'green'},{t:'徒步',c:'green'}] },
    { name: '玉渊潭公园', lat: 39.9154, lng: 116.3146, type: 'water', icon: 'fa-water',
      desc: '樱花烂漫，湖光潋滟', tags: [{t:'水边',c:'blue'},{t:'休闲',c:'green'}] },
    { name: '紫竹院公园', lat: 39.9402, lng: 116.3190, type: 'park', icon: 'fa-tree',
      desc: '竹影婆娑，清幽雅致', tags: [{t:'绿地',c:'green'},{t:'安静',c:'green'}] },
    { name: '中关村', lat: 39.9842, lng: 116.3162, type: 'mall', icon: 'fa-shopping-bag',
      desc: '中国硅谷，科技商圈', tags: [{t:'科技',c:'blue'},{t:'商圈',c:'pink'}] }
];

function initMap() {
    if (map) {
        map.invalidateSize();
        return;
    }

    // 防御：Leaflet 未加载时给提示，不中断页面
    if (typeof L === 'undefined') {
        const mapEl = document.getElementById('leaflet-map');
        mapEl.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#a5a9c8;text-align:center;padding:20px;"><i class="fas fa-map-marked-alt" style="font-size:48px;margin-bottom:14px;color:#7c83ff;"></i><p style="font-size:14px;margin-bottom:6px;">地图库加载失败</p><p style="font-size:12px;">请检查网络或刷新页面重试</p></div>';
        showToast('地图库加载失败，按钮仍可使用', 'info');
        return;
    }

    map = L.map('leaflet-map', {
        center: [userProfile.lat, userProfile.lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
    });

    // 高德地图瓦片（中文标注，国内加载快）+ 失败自动回退到 OSM
    let tileErrorCount = 0;
    let tileLoaded = false;
    const gaodeLayer = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
        subdomains: ['1', '2', '3', '4'],
        maxZoom: 18,
        minZoom: 3
    });
    const switchToOSM = () => {
        if (tileLoaded) return;
        tileLoaded = true;
        gaodeLayer.remove();
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18, minZoom: 3,
            attribution: 'OpenStreetMap'
        }).addTo(map);
        showToast('已切换到 OpenStreetMap 地图', 'info');
    };
    gaodeLayer.on('tileerror', () => {
        tileErrorCount++;
        if (tileErrorCount > 3) switchToOSM();
    });
    gaodeLayer.on('load', () => { tileLoaded = true; });
    gaodeLayer.addTo(map);
    // 超时回退：5 秒内瓦片未加载则切到 OSM
    setTimeout(() => { if (!tileLoaded) switchToOSM(); }, 5000);

    // 缩放控件
    L.control.zoom({ position: 'topright' }).addTo(map);

    // "我的位置"标记（带脉冲动画）
    const myIcon = L.divIcon({
        className: 'my-location',
        html: `<div style="position:relative;width:24px;height:24px;">
            <div style="position:absolute;inset:0;background:#7c83ff;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(124,131,255,0.25),0 4px 12px rgba(0,0,0,0.3);"></div>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
    L.marker([userProfile.lat, userProfile.lng], { icon: myIcon }).addTo(map)
        .bindPopup(`<div class="popup-title"><i class="fas fa-location-crosshairs" style="color:#7c83ff"></i> ${userProfile.locationLabel}</div><div style="font-size:13px;color:#a5a9c8;">你的当前位置</div>`);

    // 添加地点标记
    PLACES.forEach(place => addPlaceMarker(place));

    // 渲染地点列表
    renderPlaceList();

    // 更新头部
    document.getElementById('map-location-label').textContent = userProfile.locationLabel;
    document.getElementById('map-user-avatar').textContent =
        (userProfile.username || 'U').charAt(0).toUpperCase();
}

function addPlaceMarker(place) {
    const markerHtml = `
        <div class="cute-marker">
            <div class="cute-marker-icon marker-${place.type}">
                <i class="fas ${place.icon}"></i>
            </div>
            <div class="cute-marker-label">${place.name}</div>
        </div>`;

    const icon = L.divIcon({
        className: 'custom-marker',
        html: markerHtml,
        iconSize: [36, 60],
        iconAnchor: [18, 50],
        popupAnchor: [0, -50]
    });

    const tagsHtml = place.tags.map(t =>
        `<span class="popup-tag tag-${t.c}">${t.t}</span>`
    ).join('');
    const popupHtml = `
        <div class="popup-title">
            <i class="fas ${place.icon}" style="color:#a5a9ff"></i> ${place.name}
        </div>
        <div style="font-size:13px;color:#a5a9c8;">${place.desc}</div>
        <div class="popup-tags">${tagsHtml}</div>
    `;

    const marker = L.marker([place.lat, place.lng], { icon })
        .addTo(map)
        .bindPopup(popupHtml);

    markers.push({ marker, place });
}

function renderPlaceList() {
    const list = document.getElementById('place-list');
    list.innerHTML = '';
    markers.forEach(m => {
        const p = m.place;
        const dist = calculateDistance(userProfile.lat, userProfile.lng, p.lat, p.lng);
        const item = document.createElement('div');
        item.className = 'place-item';
        item.innerHTML = `
            <div class="place-item-icon marker-${p.type}">
                <i class="fas ${p.icon}"></i>
            </div>
            <div class="place-item-info">
                <div class="place-item-name">${p.name}</div>
                <div class="place-item-desc">${p.desc}</div>
            </div>
            <div class="place-item-distance">${dist}</div>
        `;
        item.addEventListener('click', () => {
            map.flyTo([p.lat, p.lng], 15, { duration: 0.8 });
            setTimeout(() => m.marker.openPopup(), 900);
        });
        list.appendChild(item);
    });
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
        Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
        Math.sin(dLng/2) ** 2;
    const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return km < 1 ? Math.round(km * 1000) + 'm' : km.toFixed(1) + 'km';
}

function recenterMap() {
    if (map) map.flyTo([userProfile.lat, userProfile.lng], 13, { duration: 0.8 });
}

function toggleList() {
    document.getElementById('place-panel').classList.toggle('hidden');
}

function finishOnboarding() {
    localStorage.setItem('sac_user_profile', JSON.stringify(userProfile));
    // 标记该账号已完成引导
    const cur = JSON.parse(localStorage.getItem('sac_current_user') || '{}');
    let done = {};
    try { done = JSON.parse(localStorage.getItem('sac_onboarding_done') || '{}'); } catch {}
    if (cur.id) { done[cur.id] = true; localStorage.setItem('sac_onboarding_done', JSON.stringify(done)); }
    showToast('引导完成，进入主界面...', 'success');
    setTimeout(() => {
        window.location.href = 'main.html';
    }, 1200);
}
