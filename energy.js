/* 作者：周梓润 */
/* ============================================================
   Spatial AI Companion - 精力规划师 (Energy Planner)
   精力量化 · 爱心消耗 · 小人旅程 · 智能建议 · 重新规划
   ============================================================ */

/* ---------------- 数据定义 ---------------- */
const ENERGY_TYPES = {
    high: { label: '高精力', char: '🦸', hearts: 16, desc: '暴走型选手', grad: 'linear-gradient(135deg,#f97316,#ec4899)', shadow: '#f9731688' },
    mid:  { label: '中精力', char: '🧗', hearts: 12, desc: '张弛有度',   grad: 'linear-gradient(135deg,#c45c26,#c45c26)', shadow: '#c45c2688' },
    low:  { label: '低精力', char: '🧘', hearts: 8,  desc: '节能养生',   grad: 'linear-gradient(135deg,#8a5a3a,#c45c26)', shadow: '#8a5a3a88' }
};

const TYPE_STYLE = {
    park:  { grad: 'linear-gradient(135deg,#34d399,#059669)', glow: '#10b98188', ring: 'rgba(52,211,153,.22)', ring2: '#34d39966', icon: '🌳', img: 'icons/icon_park.png' },
    sight: { grad: 'linear-gradient(135deg,#7c83ff,#5b63f5)', glow: '#7c83ff99', ring: 'rgba(124,131,255,.22)', ring2: '#7c83ff66', icon: '🏯', img: 'icons/icon_sight.png' },
    food:  { grad: 'linear-gradient(135deg,#fb923c,#f43f5e)', glow: '#f43f5e88', ring: 'rgba(251,146,60,.22)',  ring2: '#fb923c66', icon: '🍜', img: 'icons/icon_food.png' },
    cafe:  { grad: 'linear-gradient(135deg,#fbbf24,#d97706)', glow: '#fbbf2488', ring: 'rgba(251,191,36,.22)',  ring2: '#fbbf2466', icon: '☕', img: 'icons/icon_cafe.png' },
    hotel: { grad: 'linear-gradient(135deg,#ec4899,#8b5cf6)', glow: '#ec489999', ring: 'rgba(236,72,153,.22)',  ring2: '#ec489966', icon: '🏨', img: 'icons/icon_hotel.png' }
};

/* ---------------- AI 生成配图（文生图） ---------------- */
const T2I_BASE = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image';
function epImg(prompt, size) {
    return T2I_BASE + '?prompt=' + encodeURIComponent(prompt) + '&image_size=' + (size || 'landscape_16_9');
}
const ROUTE_COVERS = {
    royal: 'Dreamy 3D render illustration of Beijing Summer Palace at golden hour, Kunming Lake, Longevity Hill with traditional Chinese pavilion, the Long Corridor, Seventeen-Arch Bridge, warm sunset glow, soft clouds, mobile game background art, vibrant colors, highly detailed, no text, no watermark',
    oldcity: 'Dreamy 3D render illustration of old Beijing hutong at night, grey brick alley decorated with red lanterns, warm food stalls, Temple of Heaven Hall of Prayer glowing in background, cozy festive atmosphere, mobile game background art, vibrant colors, highly detailed, no text, no watermark',
    chill: 'Dreamy 3D render illustration of a tranquil Beijing city park lake in spring, cherry blossom trees, bamboo grove, small arched stone bridge over calm water, ducks, soft morning light, fresh green tones, relaxing mobile game background art, no text, no watermark',
    campus: 'Dreamy 3D render illustration of a prestigious Chinese university campus, classical white stone arch gate, quiet lake reflecting an ancient pagoda, students riding bicycles, golden ginkgo trees in autumn, warm academic atmosphere, mobile game background art, no text, no watermark',
    art: 'Dreamy 3D render illustration of Beijing 798 art district, red brick factory buildings with tall chimneys, colorful graffiti walls, outdoor modern sculptures, gallery entrances, warm sunset light, trendy creative vibe, mobile game background art, no text, no watermark',
    nature: 'Dreamy 3D render illustration of Beijing Olympic Forest Park, lush green wetland with reeds, wooden boardwalk along a clear lake, people jogging, the Bird Nest stadium silhouette in far distance, blue sky with soft clouds, fresh natural mobile game background art, no text, no watermark'
};
const BEIJING_MAP_BG = 'Cute stylized illustrated tourist map of Beijing, top-down view, simplified glowing roads and rivers, tiny cartoon landmarks, Forbidden City, Temple of Heaven, Summer Palace, CCTV tower, dark navy night theme, neon glowing dots, mobile game UI map texture, highly detailed, no text labels, no watermark';

const ENERGY_ROUTES = [
    {
        id: 'royal', name: '皇家园林线', emoji: '🏛️',
        sub: '紫竹院 · 国图 · 颐和园 · 圆明园 · 五道口', dur: '约 12 小时', km: '约 15 km',
        intensity: '高', tag: '一日极限暴走',
        rcGrad: 'linear-gradient(135deg,#7c83ff,#ec4899)', rcGlow: '#7c83ff77',
        stops: [
            { type: 'park',  name: '紫竹院公园',            dur: 90,  cost: 2, desc: '竹林秘境晨间开走，石桥流水热热身' },
            { type: 'cafe',  name: '国家图书馆·咖啡区',     dur: 50,  cost: 1, desc: '书香里喝杯手冲，养精蓄锐' },
            { type: 'sight', name: '颐和园',                dur: 200, cost: 6, desc: '昆明湖+万寿山+长廊全走一遍，体力大考',
              choices: [
                { type: 'food', name: '苏州街·听鹂馆饭庄', dur: 70, cost: 0, rec: 3, desc: '宫廷菜正餐大回血，必点樱桃肉' },
                { type: 'cafe', name: '北宫门·山景咖啡',   dur: 40, cost: 1, rec: 2, desc: '半山腰咖啡馆，俯瞰昆明湖省体力' }
              ]},
            { type: 'sight', name: '圆明园',                dur: 150, cost: 5, desc: '遗址西区开阔，荷花池绕行一周',
              choices: [
                { type: 'cafe', name: '万泉河畔·落地窗咖啡', dur: 50, cost: 1, rec: 1, desc: '河景位小憩，看夕阳充电' },
                { type: 'food', name: '五道口·枣糕王',       dur: 60, cost: 0, rec: 2, desc: '学生烟火气，热枣糕管饱' }
              ]},
            { type: 'hotel', name: '学院路·青旅旅宿',       dur: 40,  cost: 1, desc: '回旅社泡脚拉伸，为明天存力气' }
        ],
        xy: [[14, 73], [24, 42], [38, 68], [64, 60], [94, 38]]
    },
    {
        id: 'oldcity', name: '老城文化线', emoji: '🏮',
        sub: '北海 · 鼓楼 · 南锣 · 天坛 · 前门', dur: '约 12 小时', km: '约 14 km',
        intensity: '高', tag: '京味儿深度暴走',
        rcGrad: 'linear-gradient(135deg,#f59e0b,#ec4899)', rcGlow: '#f59e0b77',
        stops: [
            { type: 'park',  name: '北海公园',              dur: 100, cost: 3, desc: '白塔映琼岛，环湖一圈划船登岛' },
            { type: 'food',  name: '鼓楼·姚记炒肝',         dur: 70,  cost: 0, rec: 2, desc: '老北京早点天花板，炒肝配包子' },
            { type: 'sight', name: '南锣鼓巷',              dur: 110, cost: 3, desc: '胡同八岔人挤人，四合院钻进钻出',
              choices: [
                { type: 'cafe', name: '什刹海·湖畔咖啡', dur: 50, cost: 1, desc: '银锭桥边看海，慢下来歇脚' },
                { type: 'food', name: '烟袋斜街·卤煮',   dur: 45, cost: 0, rec: 1, desc: '地道卤煮火烧，暖胃续命' }
              ]},
            { type: 'sight', name: '天坛公园',              dur: 180, cost: 5, desc: '祈年殿出片，丹陛桥走到回音壁',
              choices: [
                { type: 'food', name: '前门·大栅栏小吃街', dur: 80, cost: 0, rec: 2, desc: '爆肚卤煮炸酱面，一顿吃三省' },
                { type: 'sight', name: '杨梅竹斜街·模范书局', dur: 70, cost: 2, desc: '文艺胡同慢逛，旧书翻时光' }
              ]},
            { type: 'hotel', name: '四合院·拾光旅宿',       dur: 40,  cost: 1, desc: '躺在四合院里数星星，满血复活' }
        ],
        xy: [[11, 38], [36, 34], [50, 66], [62, 30], [92, 60]]
    },
    {
        id: 'chill', name: '轻松休闲线', emoji: '🌿',
        sub: '玉渊潭 · 紫竹院 · 国图慢游', dur: '约 7.5 小时', km: '约 8 km',
        intensity: '中', tag: '张弛有度慢游',
        rcGrad: 'linear-gradient(135deg,#c45c26,#e07a3d)', rcGlow: '#c45c2677',
        stops: [
            { type: 'park',  name: '玉渊潭公园',            dur: 100, cost: 3, desc: '环湖步行道走一圈，湖边长椅发呆' },
            { type: 'cafe',  name: '樱花咖啡·湖畔店',       dur: 60,  cost: 1, rec: 2, desc: '一杯拿铁，看云飘过湖面' },
            { type: 'park',  name: '紫竹院公园',            dur: 90,  cost: 4, desc: '竹林深处慢走八百米石桥',
              choices: [
                { type: 'sight', name: '国家图书馆·阅览区', dur: 90, cost: 3, desc: '书海里安静充电，看困了眯一会' },
                { type: 'park',  name: '北京动物园',         dur: 80, cost: 3, desc: '看大熊猫啃竹子，治愈满分' }
              ]},
            { type: 'food',  name: '竹韵小馆·晚餐',         dur: 80,  cost: 0, rec: 2, desc: '清淡粤菜收官，喝汤补元气' },
            { type: 'hotel', name: '中关村·愉悦酒店',       dur: 40,  cost: 1, desc: '电梯直达大床房，今夜好梦' }
        ],
        xy: [[13, 66], [30, 36], [50, 64], [84, 62], [94, 40]]
    },
    {
        id: 'campus', name: '高校巡礼线', emoji: '🎓',
        sub: '北大 · 清华 · 五道口 · 北航 · 北师大', dur: '约 10 小时', km: '约 12 km',
        intensity: '中', tag: '青春校园打卡',
        rcGrad: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', rcGlow: '#3b82f677',
        stops: [
            { type: 'sight', name: '北京大学·未名湖',       dur: 120, cost: 4, desc: '博雅塔下漫步，感受百年学风' },
            { type: 'sight', name: '清华大学·二校门',       dur: 100, cost: 4, desc: '荷塘月色近春园，骑行逛校园' },
            { type: 'food',  name: '五道口·枣糕王',         dur: 60,  cost: 0, rec: 2, desc: '宇宙中心美食，热枣糕管饱',
              choices: [
                { type: 'cafe', name: '中关村·创业咖啡',   dur: 50, cost: 1, rec: 1, desc: '孵化器里喝一杯，看看创业青年' },
                { type: 'sight', name: '北航·航空博物馆',   dur: 90, cost: 3, desc: '真机陈列，航空迷的天堂' }
              ]},
            { type: 'sight', name: '北京师范大学·木铎',     dur: 60,  cost: 2, desc: '京师广场木铎金声，校园漫步' },
            { type: 'hotel', name: '学院路·青旅旅宿',       dur: 40,  cost: 1, desc: '回旅社泡脚拉伸，为明天存力气' }
        ],
        xy: [[14, 38], [30, 66], [50, 38], [74, 66], [92, 38]]
    },
    {
        id: 'art', name: '艺术文创线', emoji: '🎨',
        sub: '798 · 草场地 · 三里屯 · 国贸', dur: '约 11 小时', km: '约 13 km',
        intensity: '中', tag: '文艺青年必刷',
        rcGrad: 'linear-gradient(135deg,#f43f5e,#f59e0b)', rcGlow: '#f43f5e77',
        stops: [
            { type: 'sight', name: '798艺术区',             dur: 150, cost: 4, desc: '工业风画廊林立，拍照出片圣地',
              choices: [
                { type: 'sight', name: '草场地艺术区',     dur: 80, cost: 2, desc: '小众艺术家聚集地，安静有质感' },
                { type: 'cafe', name: '798·火车头咖啡',     dur: 45, cost: 1, rec: 1, desc: '老火车车厢改造，氛围感拉满' }
              ]},
            { type: 'sight', name: '三里屯太古里',          dur: 90,  cost: 3, desc: '潮人聚集地，逛街看街拍' },
            { type: 'food',  name: '工体·美食街',           dur: 70,  cost: 0, rec: 2, desc: '各国料理云集，挑花眼',
              choices: [
                { type: 'sight', name: '亮马河风情街',     dur: 60, cost: 2, desc: '河畔漫步，假装在欧洲' },
                { type: 'cafe', name: '国贸·云酷咖啡',     dur: 50, cost: 2, desc: '高空咖啡俯瞰CBD，夕阳绝景' }
              ]},
            { type: 'hotel', name: '国贸·精品酒店',         dur: 40,  cost: 1, desc: 'CBD夜景房，今夜好梦' }
        ],
        xy: [[14, 66], [38, 38], [62, 66], [86, 38], [94, 64]]
    },
    {
        id: 'nature', name: '自然野趣线', emoji: '🌳',
        sub: '奥森 · 鸟巢 · 朝阳公园 · 亮马河', dur: '约 9 小时', km: '约 11 km',
        intensity: '低', tag: '城市绿肺吸氧',
        rcGrad: 'linear-gradient(135deg,#8a5a3a,#e07a3d)', rcGlow: '#8a5a3a77',
        stops: [
            { type: 'park',  name: '奥林匹克森林公园',     dur: 120, cost: 3, desc: '城市绿肺，南园环湖快走',
              choices: [
                { type: 'sight', name: '鸟巢·水立方',       dur: 60, cost: 2, desc: '奥运地标打卡，外观参观' },
                { type: 'park',  name: '奥森北园·花田野趣', dur: 90, cost: 3, desc: '人少景美，花海漫步' }
              ]},
            { type: 'park',  name: '朝阳公园',              dur: 100, cost: 3, desc: '摩天轮+沙滩，假装在海边' },
            { type: 'food',  name: '蓝色港湾·美食',         dur: 70,  cost: 0, rec: 2, desc: '湖畔商业区，吃饭看水景',
              choices: [
                { type: 'sight', name: '三里屯太古里',     dur: 70, cost: 3, desc: '顺道逛潮人聚集地' },
                { type: 'cafe', name: '亮马河·河畔咖啡',   dur: 45, cost: 1, rec: 1, desc: '河边发呆，看野鸭游过' }
              ]},
            { type: 'hotel', name: '亮马桥·河景酒店',       dur: 40,  cost: 1, desc: '河景房，听水声入睡' }
        ],
        xy: [[14, 38], [40, 66], [62, 38], [84, 66], [94, 38]]
    }
];

/* ---------------- 自定义路线地点池 ---------------- */
const PLACE_POOL = [
    { name:'颐和园', type:'sight', dur:200, cost:6, desc:'昆明湖+万寿山+长廊全走一遍，体力大考', mapX:12, mapY:18 },
    { name:'圆明园', type:'sight', dur:150, cost:5, desc:'遗址西区开阔，荷花池绕行一周', mapX:18, mapY:12 },
    { name:'北京大学·未名湖', type:'sight', dur:120, cost:4, desc:'博雅塔下漫步，感受百年学风', mapX:26, mapY:20 },
    { name:'清华大学·二校门', type:'sight', dur:100, cost:4, desc:'荷塘月色近春园，骑行逛校园', mapX:32, mapY:16 },
    { name:'中关村·创业咖啡', type:'cafe', dur:50, cost:1, rec:1, desc:'孵化器里喝一杯，看创业青年', mapX:30, mapY:28 },
    { name:'五道口·枣糕王', type:'food', dur:60, cost:0, rec:2, desc:'宇宙中心美食，热枣糕管饱', mapX:36, mapY:32 },
    { name:'奥林匹克森林公园', type:'park', dur:120, cost:3, desc:'城市绿肺，南园环湖快走', mapX:52, mapY:12 },
    { name:'鸟巢·水立方', type:'sight', dur:60, cost:2, desc:'奥运地标打卡，外观参观', mapX:56, mapY:20 },
    { name:'紫竹院公园', type:'park', dur:90, cost:2, desc:'竹林秘境晨间开走，石桥流水热热身', mapX:22, mapY:42 },
    { name:'玉渊潭公园', type:'park', dur:100, cost:3, desc:'环湖步行道走一圈，湖边长椅发呆', mapX:16, mapY:54 },
    { name:'国家图书馆', type:'sight', dur:90, cost:3, desc:'书海里安静充电，看困了眯一会', mapX:28, mapY:48 },
    { name:'北京动物园', type:'park', dur:80, cost:3, desc:'看大熊猫啃竹子，治愈满分', mapX:24, mapY:52 },
    { name:'北海公园', type:'park', dur:100, cost:3, desc:'白塔映琼岛，环湖一圈划船登岛', mapX:42, mapY:40 },
    { name:'什刹海·湖畔咖啡', type:'cafe', dur:50, cost:1, desc:'银锭桥边看海，慢下来歇脚', mapX:46, mapY:38 },
    { name:'鼓楼·姚记炒肝', type:'food', dur:70, cost:0, rec:2, desc:'老北京早点天花板，炒肝配包子', mapX:48, mapY:44 },
    { name:'南锣鼓巷', type:'sight', dur:110, cost:3, desc:'胡同八岔人挤人，四合院钻进钻出', mapX:52, mapY:46 },
    { name:'故宫博物院', type:'sight', dur:180, cost:6, desc:'紫禁城深度游，三大殿走一遍', mapX:50, mapY:52 },
    { name:'天安门广场', type:'sight', dur:60, cost:2, desc:'打卡中轴线心脏，升旗降旗', mapX:50, mapY:58 },
    { name:'前门·大栅栏', type:'food', dur:80, cost:0, rec:2, desc:'爆肚卤煮炸酱面，一顿吃三省', mapX:48, mapY:64 },
    { name:'天坛公园', type:'sight', dur:180, cost:5, desc:'祈年殿出片，丹陛桥走到回音壁', mapX:56, mapY:72 },
    { name:'798艺术区', type:'sight', dur:150, cost:4, desc:'工业风画廊林立，拍照出片圣地', mapX:72, mapY:44 },
    { name:'三里屯太古里', type:'sight', dur:90, cost:3, desc:'潮人聚集地，逛街看街拍', mapX:78, mapY:52 },
    { name:'朝阳公园', type:'park', dur:100, cost:3, desc:'摩天轮+沙滩，假装在海边', mapX:82, mapY:40 },
    { name:'国贸CBD', type:'sight', dur:60, cost:2, desc:'高空俯瞰CBD，夕阳绝景', mapX:86, mapY:60 }
];

/* ---------------- 全局状态 ---------------- */
const EP = {
    open: false,
    step: 1,
    typeKey: null,
    routeId: null,
    maxHearts: 0,
    hearts: 0,
    idx: 0,            // 下一个要到达的站
    busy: false,       // 动画锁
    reportedOnce: false,
    leftStart: false,  // 是否已离开起点（首次打卡后置 true）
    origin: null,      // 虚拟起点 P0 坐标
    stops: null,       // 运行时站点列表（深拷贝，支持分支插入）
    xy: null,          // 运行时站点坐标列表
    customStops: []    // 自定义路线：用户选中的地点索引列表
};

/* 赶路消耗：两地点间移动的体力开销，按画布距离折算（每约30单位距离耗1💗，至少1💗） */
function epWalkCost(a, b) {
    if (!a || !b) return 0;
    return Math.max(1, Math.round(Math.hypot(a[0] - b[0], a[1] - b[1]) / 30));
}

/* ---------------- HTML 注入 ---------------- */
function epBuildHTML() {
    if (document.getElementById('energyOverlay')) return;

    const typeCards = Object.entries(ENERGY_TYPES).map(([k, t]) => `
        <div class="energy-type-card" data-type="${k}" style="--tc-grad:${t.grad};--tc-shadow:${t.shadow}" onclick="epPickType('${k}')">
            <div class="et-char">${t.char}</div>
            <div class="et-name">${t.label}</div>
            <div class="et-hearts">${'<i class="fas fa-heart"></i>'.repeat(Math.min(t.hearts, 4))} ×${t.hearts}</div>
            <div class="et-desc">${t.desc}</div>
        </div>`).join('');

    const routeCards = ENERGY_ROUTES.map(r => {
        const chain = r.stops.map(s =>
            `<div class="rc-node" style="--nc:${TYPE_STYLE[s.type].grad}" title="${s.name}"><img class="rc-emoji" src="${TYPE_STYLE[s.type].img}" alt="${s.name}"></div>`
        ).join('<div class="rc-link"></div>');
        return `
        <div class="route-card" data-route="${r.id}" style="--rc-grad:${r.rcGrad};--rc-glow:${r.rcGlow}" onclick="epPickRoute('${r.id}')">
            <div class="rc-cover">
                <img src="${epImg(ROUTE_COVERS[r.id] || ROUTE_COVERS.royal)}" alt="${r.name}" loading="lazy" onerror="this.classList.add('img-fail')">
                <div class="rc-cover-mask"></div>
                <div class="rc-cover-emoji">${r.emoji}</div>
                <div class="rc-cover-title">${r.name}</div>
            </div>
            <div class="rc-check"><i class="fas fa-check"></i></div>
            <div class="rc-head">
                <div class="rc-icon">${r.emoji}</div>
                <div class="rc-title"><h4>${r.name}</h4><p>${r.sub}</p></div>
            </div>
            <div class="rc-meta">
                <span class="rc-tag"><i class="fas fa-clock"></i> ${r.dur}</span>
                <span class="rc-tag"><i class="fas fa-route"></i> ${r.km}</span>
                <span class="rc-tag ${r.intensity === '低' ? '' : 'hl'}"><i class="fas fa-bolt"></i> 强度·${r.intensity}</span>
                <span class="rc-tag hl">${r.tag}</span>
            </div>
            <div class="rc-chain">${chain}</div>
        </div>`;
    }).join('');

    const html = `
    <div class="energy-overlay" id="energyOverlay">
        <div class="energy-bg"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div><div class="e-stars"></div></div>
        <div class="energy-panel">
            <div class="e-top">
                <button class="e-back" onclick="epBack()"><i class="fas fa-arrow-left"></i></button>
                <div class="e-top-title"><h2>精力规划师</h2><p>把体力变成看得见的爱心 💗</p></div>
                <div class="e-level-badge" id="epLevelBadge" style="display:none"></div>
            </div>
            <div class="e-steps"><div class="e-step-dot" id="epDot1"></div><div class="e-step-dot" id="epDot2"></div><div class="e-step-dot" id="epDot3"></div></div>
            <div class="e-body">
                <!-- Step 1 -->
                <div class="e-screen" id="epScreen1">
                    <div class="e-hero">
                        <span class="big-emoji">💗</span>
                        <h3>你今天有多少精力？</h3>
                        <p>输入初始精力值，或点下方快捷预设<br>我们把它换算成爱心，随时告诉你还剩多少电</p>
                    </div>
                    <div class="energy-type-grid">${typeCards}</div>
                    <div class="e-custom-input">
                        <button class="e-ci-btn" onclick="epAdjustHearts(-1)" aria-label="减少">−</button>
                        <input type="number" id="epHeartsInput" min="1" max="99" value="12" oninput="epInputHearts(this.value)">
                        <button class="e-ci-btn" onclick="epAdjustHearts(1)" aria-label="增加">+</button>
                        <span class="e-ci-unit">💗</span>
                    </div>
                    <div class="e-tip-bar"><i class="fas fa-lightbulb"></i><span>走 3 公里后依然精神饱满≈16💗；微微出汗但还行≈12💗；想立刻找椅子≈8💗。也可手动输入任意数值。</span></div>
                    <button class="e-cta" id="epCta1" onclick="epGoStep2()"><span>选择旅行路线</span><i class="fas fa-arrow-right"></i></button>
                </div>
                <!-- Step 2 -->
                <div class="e-screen" id="epScreen2">
                    <div class="e-hero" style="padding-bottom:10px">
                        <h3 style="font-size:17px">今天想走哪条线？</h3>
                        <p>路线已按强度标注，爱心消耗各有不同</p>
                    </div>
                    <div class="route-list">${routeCards}</div>
                    <div class="custom-route-entry" onclick="epOpenCustomMap()">
                        <div class="cre-icon"><i class="fas fa-map-marked-alt"></i></div>
                        <div class="cre-text"><h4>🗺️ 自由搭配我的路线</h4><p>从地图上点选任意地点，实时计算精力消耗，拼出你的专属路线</p></div>
                        <i class="fas fa-chevron-right cre-arrow"></i>
                    </div>
                    <button class="e-cta" id="epCta2" onclick="epStartTrip()" disabled><span>开始模拟旅程</span><i class="fas fa-play"></i></button>
                </div>
                <!-- Step 3 -->
                <div class="e-screen" id="epScreen3">
                    <div class="hearts-block">
                        <div class="hearts-head">
                            <div class="hh-left"><div class="hh-char" id="epHhChar">🧗</div><span id="epHhLabel">我的精力</span></div>
                            <div class="hearts-nums"><b id="epHeartNum">9</b> / <span id="epHeartMax">9</span> 💗</div>
                        </div>
                        <div class="hearts-row" id="epHeartsRow"></div>
                        <div class="hearts-foot">
                            <div class="hearts-bar"><div class="hearts-bar-fill" id="epHeartBar" style="width:100%"></div></div>
                            <button class="report-btn" onclick="epToggleReport()"><i class="fas fa-hand-point-up"></i> 实际精力上报</button>
                        </div>
                        <div class="report-pop" id="epReportPop">
                            <p>累了？直接告诉我你现在还剩多少爱心，我会按你的真实状态重新评估路线 👇</p>
                            <div class="report-quick" id="epReportQuick"></div>
                        </div>
                    </div>

                    <div class="route-canvas-wrap">
                        <div class="route-canvas" id="epCanvas"></div>
                    </div>

                    <div class="now-stop" id="epNowStop"></div>
                    <div id="epAdvice"></div>
                    <div class="action-row" id="epActions"></div>
                </div>
                <!-- Finish -->
                <div class="e-screen" id="epScreen4">
                    <div class="finish-wrap" id="epFinish"></div>
                </div>
            </div>
            <div class="e-mini-toast" id="epToast"></div>
        </div>
        <!-- 自定义路线：大地图 -->
        <div class="custom-map-overlay" id="epCustomMap">
            <div class="cm-panel">
                <div class="cm-head">
                    <button class="cm-close" onclick="epCloseCustomMap()"><i class="fas fa-times"></i></button>
                    <h3>🗺️ 自由搭配路线</h3>
                    <p>点击地图上的地点，按顺序拼出你的专属旅程</p>
                </div>
                <div class="cm-body">
                    <div class="cm-map" id="epCustomMapInner">
                        <div class="cm-map-bg" style="background-image:linear-gradient(180deg,rgba(15,23,42,.55),rgba(2,6,23,.82)),url('${epImg(BEIJING_MAP_BG, 'landscape_4_3')}')"></div>
                        <div class="cm-places" id="epPlacesLayer"></div>
                        <svg class="cm-route-line" id="epRouteLine" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
                    </div>
                    <div class="cm-side">
                        <div class="cm-stats">
                            <div class="cm-stat"><span>📍 站点</span><b id="cmStopCount">0</b></div>
                            <div class="cm-stat"><span>⏱️ 耗时</span><b id="cmTotalDur">0</b></div>
                            <div class="cm-stat"><span>🚶 赶路</span><b id="cmWalkCost">0</b></div>
                            <div class="cm-stat"><span>💗 净耗</span><b id="cmNetCost">0</b></div>
                        </div>
                        <div class="cm-selected" id="cmSelected">
                            <div class="cm-empty">还没有选地点，去地图上点一个吧 👆</div>
                        </div>
                        <div class="cm-actions">
                            <button class="cm-btn ghost" onclick="epClearCustom()">清空</button>
                            <button class="cm-btn" id="cmStartBtn" onclick="epStartCustomTrip()" disabled>用这条路线出发 <i class="fas fa-play"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

/* ---------------- 打开 / 关闭 / 返回 ---------------- */
function openEnergyPlanner() {
    epBuildHTML();
    document.getElementById('energyOverlay').classList.add('open');
    EP.open = true;
    document.body.style.overflow = 'hidden';
    if (EP.step === 1 && !EP.typeKey) epShowStep(1);
}

function closeEnergyPlanner() {
    document.getElementById('energyOverlay').classList.remove('open');
    EP.open = false;
    document.body.style.overflow = '';
}

function epBack() {
    if (EP.step === 4) { epReset(); epShowStep(1); return; }
    if (EP.step === 3) { if (!confirm('返回将放弃当前旅程模拟，确定吗？')) return; epReset(); epShowStep(2); return; }
    if (EP.step === 2) { epShowStep(1); return; }
    closeEnergyPlanner(); // step1 时点返回 = 关闭
}

function epReset() {
    EP.typeKey = null; EP.routeId = null; EP.maxHearts = 0; EP.hearts = 0;
    EP.idx = 0; EP.busy = false; EP.reportedOnce = false; EP.leftStart = false;
    EP.stops = null; EP.xy = null; EP.customStops = [];
    document.querySelectorAll('.energy-type-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
    const inp = document.getElementById('epHeartsInput');
    if (inp) inp.value = 12;
    document.getElementById('epCta1').disabled = false;
    document.getElementById('epCta2').disabled = true;
    document.getElementById('epLevelBadge').style.display = 'none';
}

function epToast(msg) {
    const t = document.getElementById('epToast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------------- 自定义路线：大地图 ---------------- */
function epOpenCustomMap() {
    const overlay = document.getElementById('epCustomMap');
    overlay.classList.add('show');
    epRenderCustomPlaces();
    epUpdateCustomPanel();
}
function epCloseCustomMap() {
    document.getElementById('epCustomMap').classList.remove('show');
}
function epRenderCustomPlaces() {
    const layer = document.getElementById('epPlacesLayer');
    layer.innerHTML = PLACE_POOL.map((p, i) => {
        const st = TYPE_STYLE[p.type];
        const inRoute = EP.customStops.indexOf(i);
        return `<div class="cm-pin${inRoute >= 0 ? ' picked' : ''}"
            style="left:${p.mapX}%;top:${p.mapY}%;--pg:${st.grad}"
            data-pi="${i}" onclick="epAddCustomStop(${i})" title="${p.name} · ${p.cost>0?'-'+p.cost:'+'+p.rec}💗">
            <img src="${st.img}" alt=""><span class="cm-pin-name">${p.name}</span>
            ${inRoute >= 0 ? `<b class="cm-pin-order">${inRoute + 1}</b>` : ''}
        </div>`;
    }).join('');
}
function epAddCustomStop(pi) {
    if (EP.customStops.includes(pi)) { epToast('该地点已在路线中'); return; }
    EP.customStops.push(pi);
    epRenderCustomPlaces();
    epUpdateCustomPanel();
}
function epRemoveCustomStop(seq) {
    EP.customStops.splice(seq, 1);
    epRenderCustomPlaces();
    epUpdateCustomPanel();
}
function epClearCustom() {
    EP.customStops = [];
    epRenderCustomPlaces();
    epUpdateCustomPanel();
}
function epUpdateCustomPanel() {
    const stops = EP.customStops.map(pi => PLACE_POOL[pi]);
    const totalDur = stops.reduce((a, s) => a + s.dur, 0);
    const totalCost = stops.reduce((a, s) => a + (s.cost || 0), 0);
    const totalRec = stops.reduce((a, s) => a + (s.rec || 0), 0);
    // 赶路消耗：起点→各站逐段累计（坐标映射与出发后画布一致）
    let walkTotal = 0;
    let from = [7, 88];
    const legWalks = stops.map(p => {
        const w = epWalkCost(from, [8 + p.mapX * 0.84, 10 + p.mapY * 0.76]);
        from = [8 + p.mapX * 0.84, 10 + p.mapY * 0.76];
        walkTotal += w;
        return w;
    });
    const netCost = totalCost - totalRec + walkTotal;

    document.getElementById('cmStopCount').textContent = stops.length;
    document.getElementById('cmTotalDur').textContent = (totalDur / 60).toFixed(1) + 'h';
    document.getElementById('cmWalkCost').textContent = '-' + walkTotal + '💗';
    const netEl = document.getElementById('cmNetCost');
    netEl.textContent = (netCost >= 0 ? '-' : '+') + Math.abs(netCost) + '💗';
    // 与当前输入的精力上限对比，超了变红提醒
    const avail = parseInt(document.getElementById('epHeartsInput')?.value) || 12;
    netEl.style.color = netCost > avail ? '#fca5a5' : '#f0c19a';

    // 已选列表
    const sel = document.getElementById('cmSelected');
    if (!stops.length) {
        sel.innerHTML = '<div class="cm-empty">还没有选地点，去地图上点一个吧 👆</div>';
    } else {
        sel.innerHTML = stops.map((s, i) => {
            const st = TYPE_STYLE[s.type];
            const sign = s.cost > 0 ? `-${s.cost}💗` : `+${s.rec || 0}💗`;
            const leg = i > 0 ? ` · 🚶${legWalks[i]}💗` : '';
            return `<div class="cm-item">
                <div class="cm-item-idx">${i + 1}</div>
                <div class="cm-item-ico" style="--pg:${st.grad}"><img src="${st.img}" alt=""></div>
                <div class="cm-item-info"><b>${s.name}</b><span>${(s.dur/60).toFixed(1)}h · ${sign}${leg}</span></div>
                <button class="cm-item-del" onclick="epRemoveCustomStop(${i})"><i class="fas fa-times"></i></button>
            </div>`;
        }).join('');
    }

    // 路线连线
    const svg = document.getElementById('epRouteLine');
    if (stops.length >= 2) {
        const pts = stops.map(s => `${s.mapX},${s.mapY}`).join(' ');
        svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="#fbbf24" stroke-width="0.8" stroke-dasharray="2,1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
    } else {
        svg.innerHTML = '';
    }

    document.getElementById('cmStartBtn').disabled = stops.length < 2;
}
function epStartCustomTrip() {
    if (EP.customStops.length < 2) { epToast('至少选 2 个地点才能出发'); return; }
    const inp = document.getElementById('epHeartsInput');
    const n = Math.max(1, Math.min(99, parseInt(inp?.value) || 12));
    EP.maxHearts = n; EP.hearts = n;
    EP.idx = 0; EP.leftStart = false; EP.reportedOnce = false;
    EP.routeId = 'custom';

    EP.stops = EP.customStops.map(pi => {
        const p = PLACE_POOL[pi];
        return { type: p.type, name: p.name, dur: p.dur, cost: p.cost, rec: p.rec || 0, desc: p.desc };
    });
    // 地图坐标映射到画布可用区域
    EP.xy = EP.customStops.map(pi => {
        const p = PLACE_POOL[pi];
        return [8 + p.mapX * 0.84, 10 + p.mapY * 0.76];
    });

    if (!EP.typeKey) EP.typeKey = n >= 14 ? 'high' : n >= 10 ? 'mid' : 'low';
    const t = ENERGY_TYPES[EP.typeKey];
    const badge = document.getElementById('epLevelBadge');
    badge.innerHTML = `${t.char} ${t.label} · ${n}💗 · 自定义`;
    badge.style.display = 'flex';
    document.getElementById('epHhChar').innerHTML = epMascotSvg('mini');
    document.getElementById('epHhLabel').textContent = t.label + ' · 我的精力';

    epRenderHearts('init');
    epRenderCanvas();
    epRenderNowStop();
    epEvaluate(true);
    epCloseCustomMap();
    epShowStep(3);
    epToast(`${t.char} 自定义路线出发！共 ${EP.stops.length} 站`);
}

/* ---------------- Step 1: 精力档案 ---------------- */
function epPickType(key) {
    EP.typeKey = key;
    const t = ENERGY_TYPES[key];
    const inp = document.getElementById('epHeartsInput');
    if (inp) inp.value = t.hearts;
    epInputHearts(t.hearts);
    epToast(`已选「${t.label}」预设：${t.hearts} 💗`);
}

// 手动输入精力值
function epInputHearts(val) {
    let n = parseInt(val) || 0;
    n = Math.max(1, Math.min(99, n));
    EP.maxHearts = n;
    // 若输入值恰好匹配某个预设，高亮对应卡片
    document.querySelectorAll('.energy-type-card').forEach(c => {
        const t = ENERGY_TYPES[c.dataset.type];
        c.classList.toggle('selected', t && t.hearts === n);
    });
    const cta = document.getElementById('epCta1');
    if (cta) cta.disabled = n < 1;
}

// +/- 微调
function epAdjustHearts(delta) {
    const inp = document.getElementById('epHeartsInput');
    if (!inp) return;
    let n = (parseInt(inp.value) || 12) + delta;
    n = Math.max(1, Math.min(99, n));
    inp.value = n;
    epInputHearts(n);
}

function epGoStep2() { epShowStep(2); }

/* ---------------- Step 2: 路线选择 ---------------- */
function epPickRoute(id) {
    EP.routeId = id;
    document.querySelectorAll('.route-card').forEach(c =>
        c.classList.toggle('selected', c.dataset.route === id));
    document.getElementById('epCta2').disabled = false;
    const r = ENERGY_ROUTES.find(x => x.id === id);
    epToast(`已选择「${r.name}」`);
}

function epStartTrip() {
    const inp = document.getElementById('epHeartsInput');
    const n = Math.max(1, Math.min(99, parseInt(inp?.value) || 12));
    EP.maxHearts = n;
    EP.hearts = n;
    EP.idx = 0;
    EP.leftStart = false;
    EP.reportedOnce = false;

    const route = ENERGY_ROUTES.find(r => r.id === EP.routeId);
    // 深拷贝站点和坐标到运行时，支持分支插入
    EP.stops = route.stops.map(s => ({ ...s, choices: s.choices ? s.choices.map(c => ({...c})) : undefined }));
    EP.xy = route.xy.map(p => [...p]);

    // 未选预设卡片时，按数值匹配一个类型用于显示图标/标签
    if (!EP.typeKey) {
        EP.typeKey = n >= 14 ? 'high' : n >= 10 ? 'mid' : 'low';
    }
    const t = ENERGY_TYPES[EP.typeKey];

    const badge = document.getElementById('epLevelBadge');
    badge.innerHTML = `${t.char} ${t.label} · ${n}💗`;
    badge.style.display = 'flex';
    document.getElementById('epHhChar').innerHTML = epMascotSvg('mini');
    document.getElementById('epHhLabel').textContent = t.label + ' · 我的精力';

    epRenderHearts('init');
    epRenderCanvas();
    epRenderNowStop();
    epEvaluate(true);
    epShowStep(3);
    epToast(`${t.char} 出发！总精力 ${n} 💗`);
}

/* ---------------- 爱心渲染 ---------------- */
function epRenderHearts(mode, changed) {
    const row = document.getElementById('epHeartsRow');
    row.innerHTML = '';
    for (let i = 0; i < EP.maxHearts; i++) {
        const h = document.createElement('span');
        h.className = 'heart fas fa-heart ' + (i < EP.hearts ? 'full' : 'empty');
        if (mode === 'lose' && i >= EP.hearts && i < EP.hearts + (changed || 0)) h.classList.add('lost');
        if (mode === 'gain' && i >= EP.hearts - (changed || 0) && i < EP.hearts) h.classList.add('gain');
        row.appendChild(h);
    }
    document.getElementById('epHeartNum').textContent = EP.hearts;
    document.getElementById('epHeartMax').textContent = EP.maxHearts;
    const pct = Math.max(0, Math.round(EP.hearts / EP.maxHearts * 100));
    document.getElementById('epHeartBar').style.width = pct + '%';
}

/* ---------------- 路线画布 ---------------- */
function epRenderCanvas() {
    const canvas = document.getElementById('epCanvas');
    const pts = EP.xy;
    const stops = EP.stops;

    // 虚拟起点 P0（画布左下角），小途从这里出发
    const p0 = [7, 88];
    EP.origin = p0;

    // SVG：出发段 + 各站段路径 + 渐变定义（每段双层：底层柔光 + 上层虚线轨迹）
    const d0 = `M ${p0[0]} ${p0[1]} Q ${(p0[0] + pts[0][0]) / 2} ${(p0[1] + pts[0][1]) / 2 - 6} ${pts[0][0]} ${pts[0][1]}`;
    let segs = `<path class="rc-path-glow" d="${d0}" vector-effect="non-scaling-stroke"/><path class="rc-path" id="epSegStart" d="${d0}" vector-effect="non-scaling-stroke"/>`;
    for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + (i % 2 === 0 ? -8 : 8);
        const d = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
        segs += `<path class="rc-path-glow" d="${d}" vector-effect="non-scaling-stroke"/><path class="rc-path" id="epSeg${i}" d="${d}" vector-effect="non-scaling-stroke"/>`;
    }
    const svg = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs><linearGradient id="eGradStroke" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stop-color="#e07a3d"/><stop offset="50%" stop-color="#e8c4a8"/><stop offset="100%" stop-color="#f0c19a"/>
        </linearGradient></defs>${segs}</svg>`;

    // 场景装饰层：星月 / 云 / 飞鸟 / 远山 / 公路汽车 / 花草 / 蝴蝶落叶微风
    const decor = `<div class="rc-decor">
        <div class="rc-moon"><span></span><span></span></div>
        <div class="rc-cloud" style="top:9%;font-size:23px;animation-duration:58s">☁️</div>
        <div class="rc-cloud" style="top:30%;font-size:15px;animation-duration:80s;animation-delay:-40s">☁️</div>
        <div class="rc-star" style="left:14%;top:12%">✦</div>
        <div class="rc-star" style="left:50%;top:6%;animation-delay:1.1s">✦</div>
        <div class="rc-star" style="left:80%;top:18%;animation-delay:2s">✦</div>
        <div class="rc-star" style="left:38%;top:20%;animation-delay:.6s;font-size:10px">✦</div>
        <div class="rc-bird b1"><svg viewBox="0 0 40 14"><path d="M2 10 Q10 2 20 9 Q30 2 38 10" fill="none" stroke="#ffffffc4" stroke-width="2.6" stroke-linecap="round"/></svg></div>
        <div class="rc-bird b2"><svg viewBox="0 0 40 14"><path d="M2 10 Q10 2 20 9 Q30 2 38 10" fill="none" stroke="#a5b4fcc0" stroke-width="2.2" stroke-linecap="round"/></svg></div>
        <svg class="rc-mountains" viewBox="0 0 100 22" preserveAspectRatio="none">
            <path d="M0 22 L0 17 Q13 13 26 16 Q40 11.5 52 15.5 Q65 12.5 78 16 Q90 13.5 100 15.5 L100 22 Z" fill="rgba(224,122,61,.10)"/>
            <path d="M0 22 L0 19 Q22 16 42 18.5 Q64 15.5 100 18 L100 22 Z" fill="rgba(34,211,238,.07)"/>
        </svg>
        <div class="rc-hill" style="left:-12%;bottom:-34px;width:58%;height:96px"></div>
        <div class="rc-hill" style="right:-16%;bottom:-44px;width:62%;height:110px;animation-delay:1.4s"></div>
        <div class="rc-wind w1"></div>
        <div class="rc-wind w2"></div>
        <div class="rc-fall f1"><img src="icons/deco_leaf.png" alt=""></div>
        <div class="rc-fall f2">🌸</div>
        <div class="rc-road"></div>
        <div class="rc-car car1"><img src="icons/deco_car.png" alt=""></div>
        <div class="rc-car car2"><img src="icons/deco_car.png" alt=""></div>
        <div class="rc-plants">
            <img class="pl tree t1" src="icons/icon_park.png" alt="" style="left:-4%">
            <svg class="pl grass g1" style="left:15%" viewBox="0 0 40 26"><path d="M20 26 C16 16 12 10 4 4 C12 10 15 16 18 26Z" fill="#34d39988"/><path d="M20 26 C20 14 20 6 20 1 C24 8 24 16 23 26Z" fill="#6ee7b799"/><path d="M22 26 C26 16 30 10 38 5 C29 11 26 17 24 26Z" fill="#10b98177"/></svg>
            <img class="pl flower fl1" src="icons/deco_tulip.png" alt="" style="left:31%">
            <img class="pl tree t2" src="icons/icon_park.png" alt="" style="left:45%">
            <svg class="pl grass g2" style="left:57%" viewBox="0 0 40 26"><path d="M20 26 C16 16 12 10 4 4 C12 10 15 16 18 26Z" fill="#34d39988"/><path d="M20 26 C20 14 20 6 20 1 C24 8 24 16 23 26Z" fill="#6ee7b799"/><path d="M22 26 C26 16 30 10 38 5 C29 11 26 17 24 26Z" fill="#10b98177"/></svg>
            <img class="pl flower fl2" src="icons/deco_sunflower.png" alt="" style="left:68%">
            <svg class="pl grass g3" style="left:80%" viewBox="0 0 40 26"><path d="M20 26 C16 16 12 10 4 4 C12 10 15 16 18 26Z" fill="#34d39988"/><path d="M20 26 C20 14 20 6 20 1 C24 8 24 16 23 26Z" fill="#6ee7b799"/><path d="M22 26 C26 16 30 10 38 5 C29 11 26 17 24 26Z" fill="#10b98177"/></svg>
            <img class="pl tree t3" src="icons/icon_park.png" alt="" style="left:92%">
        </div>
        <div class="rc-butterfly"><img src="icons/deco_butterfly.png" alt=""></div>
    </div>`;

    // 起点牌
    const start = `<div class="trip-origin${EP.leftStart ? '' : ' at'}" id="epOrigin" style="left:${p0[0]}%;top:${p0[1]}%">
        <div class="to-badge">起</div>
        <div class="to-label">小途出发</div>
    </div>`;

    // 站点（可点击查看详情）
    let nodes = '';
    stops.forEach((s, i) => {
        const st = TYPE_STYLE[s.type];
        const costTag = s.rec ? `<span class="stop-cost rec">+${s.rec}💗</span>` : `<span class="stop-cost">-${s.cost}💗</span>`;
        nodes += `<div class="stop-node" id="epStop${i}" style="left:${pts[i][0]}%;top:${pts[i][1]}%;--sc:${st.grad};--sc-glow:${st.glow};--sc-ring:${st.ring};--sc-ring2:${st.ring2}" onclick="epShowStopDetail(${i})" title="${s.name} · 点击查看详情">
            <div class="stop-bubble"><img class="stop-emoji" src="${st.img}" alt="${s.name}"><span class="stop-idx">${i + 1}</span></div>${costTag}
        </div>`;
    });

    // 分支候选站：全程可见的「分叉预告」。未到达=灰色虚线 preview，到达该站=金色脉冲 active 可点击
    let branchNodes = '';
    let branchPaths = '';
    stops.forEach((s, i) => {
        if (!s.choices || !s.choices.length) return;
        const cur = pts[i];
        // 分叉方向：优先朝向下一站，末站则向右外延伸
        const anchor = pts[i + 1] || [Math.min(95, cur[0] + 16), cur[1]];
        const isActive = EP.leftStart && i === Math.max(0, EP.idx - 1);
        s.choices.forEach((c, ci) => {
            const st = TYPE_STYLE[c.type];
            const t = (ci + 1) / (s.choices.length + 1);
            const cx = cur[0] + (anchor[0] - cur[0]) * t;
            const cy = cur[1] + (anchor[1] - cur[1]) * t + (ci % 2 === 0 ? -12 : 12);
            const costTag = c.rec ? `<span class="stop-cost rec">+${c.rec}💗</span>` : `<span class="stop-cost">-${c.cost}💗</span>`;
            // 分叉小路径：分支站 → 候选点
            branchPaths += `<path d="M ${cur[0]} ${cur[1]} Q ${(cur[0]+cx)/2} ${(cur[1]+cy)/2 - 2} ${cx} ${cy}"
                class="rc-branch-path${isActive ? ' active' : ''}" vector-effect="non-scaling-stroke"/>`;
            branchNodes += `<div class="stop-node branch-choice ${isActive ? 'active' : 'preview'}"
                id="epBranch${i}-${ci}" style="left:${cx}%;top:${cy}%;--sc:${st.grad};--sc-glow:${st.glow};--sc-ring:${st.ring};--sc-ring2:${st.ring2}"
                ${isActive ? `onclick="epChooseBranch(${ci})"` : ''}
                title="${isActive ? '点击选择：' + c.name : '🔮 前方分支：到「' + s.name + '」后二选一 · ' + c.name}">
                <div class="branch-hint${isActive ? '' : ' preview-hint'}">${isActive ? '选我' : '分支'}</div>
                <div class="stop-bubble"><img class="stop-emoji" src="${st.img}" alt="${c.name}"></div>${costTag}
            </div>`;
        });
    });
    const branchSvg = `<svg class="rc-branch-svg" viewBox="0 0 100 100" preserveAspectRatio="none">${branchPaths}</svg>`;

    // 小途位置：未出发在起点 P0，已出发在「刚到达的站」pts[EP.idx-1]（绝不能用 pts[EP.idx]，否则会瞬移到下一站）
    const atOrigin = EP.idx === 0 && !EP.leftStart;
    const wpos = atOrigin ? p0 : (pts[Math.max(0, EP.idx - 1)] || p0);
    const walker = `<div class="walker" id="epWalker" style="left:${wpos[0]}%;top:${wpos[1]}%">
        <div class="w-aura"></div>
        <div class="w-dust"><span></span><span></span><span></span></div>
        <div class="walker-body">${epMascotSvg()}</div>
    </div>`;

    canvas.innerHTML = decor + svg + branchSvg + start + nodes + branchNodes + walker;
    epMarkStops();
}

/* ---------------- 原创角色「小途」：薄荷色麻薯探险家 ---------------- */
function epMascotSvg(extraClass = '') {
    const gid = extraClass === 'mini' ? 'tuBodyMini' : 'tuBody';
    return `<svg class="w-svg ${extraClass}" viewBox="0 0 80 100" aria-label="小途">
        <defs>
            <linearGradient id="${gid}" x1="0.2" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stop-color="#f8e2c8"/><stop offset="55%" stop-color="#e07a3d"/><stop offset="100%" stop-color="#9a4a1c"/>
            </linearGradient>
        </defs>
        <ellipse class="ws-shadow" cx="40" cy="95" rx="18" ry="3.6" fill="rgba(0,0,0,.3)"/>
        <g class="ws-leg l1"><rect x="27" y="76" width="11" height="17" rx="5.5" fill="#9a4a1c" stroke="#fff" stroke-width="2.4"/></g>
        <g class="ws-leg l2"><rect x="42" y="76" width="11" height="17" rx="5.5" fill="#9a4a1c" stroke="#fff" stroke-width="2.4"/></g>
        <g class="ws-arm l1"><rect x="7" y="50" width="10" height="18" rx="5" fill="#e07a3d" stroke="#fff" stroke-width="2.4"/></g>
        <g class="ws-arm l2"><rect x="63" y="50" width="10" height="18" rx="5" fill="#e07a3d" stroke="#fff" stroke-width="2.4"/></g>
        <path d="M40 16 C61 16 71 32 71 51 C71 70 58 84 40 84 C22 84 9 70 9 51 C9 32 19 16 40 16 Z" fill="url(#${gid})" stroke="#fff" stroke-width="2.6"/>
        <ellipse cx="40" cy="66" rx="17" ry="12" fill="#fde7d4" opacity=".55"/>
        <ellipse cx="26" cy="28" rx="7" ry="4" fill="#fff" opacity=".35" transform="rotate(-25 26 28)"/>
        <path d="M17 57 Q40 67 63 57 L63 62.5 Q40 72.5 17 62.5 Z" fill="#f0c674" stroke="#fff" stroke-width="1.6"/>
        <path d="M51 64 L57 76 L50.5 73.5 Z" fill="#f59e0b" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>
        <g class="ws-hat">
            <path d="M40 17 Q40 10 42 5" stroke="#9a4a1c" stroke-width="2.6" fill="none" stroke-linecap="round"/>
            <path d="M42 6 C47 0 55 1 57 5 C52 10 46 10 42 6 Z" fill="#f6e7d4" stroke="#fff" stroke-width="1.4"/>
            <path d="M40.5 9 C36 5 30 5.5 28.5 8.5 C32.5 12 37 12 40.5 9 Z" fill="#e8c4a8" stroke="#fff" stroke-width="1.4"/>
        </g>
        <g class="ws-eye"><ellipse cx="30" cy="42" rx="4.6" ry="5.4" fill="#0b2530"/><circle cx="31.7" cy="39.8" r="1.8" fill="#fff"/><circle cx="28.6" cy="44.4" r=".9" fill="#fff"/></g>
        <g class="ws-eye"><ellipse cx="50" cy="42" rx="4.6" ry="5.4" fill="#0b2530"/><circle cx="51.7" cy="39.8" r="1.8" fill="#fff"/><circle cx="48.6" cy="44.4" r=".9" fill="#fff"/></g>
        <g class="ws-eye-tired" fill="none" stroke="#0b2530" stroke-width="2.4" stroke-linecap="round">
            <path d="M25.5 43 Q30 46.5 34.5 43"/><path d="M45.5 43 Q50 46.5 54.5 43"/>
        </g>
        <ellipse cx="21.5" cy="50" rx="4.2" ry="2.6" fill="#fb7185" opacity=".5"/>
        <ellipse cx="58.5" cy="50" rx="4.2" ry="2.6" fill="#fb7185" opacity=".5"/>
        <path class="ws-smile" d="M36 49 Q40 53 44 49" stroke="#0b2530" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path class="ws-sweat" d="M66 24 C66 24 61.5 30.5 61.5 33 A4.5 4.5 0 0 0 70.5 33 C70.5 30.5 66 24 66 24 Z" fill="#f0c19a" stroke="#fff" stroke-width="1.2"/>
    </svg>`;
}

/* 沿 SVG 路径行走：路径坐标与画布百分比一一对应（viewBox 0-100 + preserveAspectRatio none） */
function epWalkAlong(el, path, target, dur) {
    const finish = () => {
        el.classList.remove('pathing');
        el.style.left = target[0] + '%';
        el.style.top = target[1] + '%';
    };
    if (!path || typeof path.getTotalLength !== 'function') { finish(); return; }
    const len = path.getTotalLength();
    const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const t0 = performance.now();
    let lastX = path.getPointAtLength(0).x;
    el.classList.add('pathing');
    const step = now => {
        const t = Math.min(1, (now - t0) / dur);
        const p = path.getPointAtLength(len * ease(t));
        el.style.left = p.x + '%';
        el.style.top = p.y + '%';
        if (Math.abs(p.x - lastX) > 0.05) el.classList.toggle('face-left', p.x < lastX);
        lastX = p.x;
        if (t < 1) requestAnimationFrame(step);
        else finish();
    };
    requestAnimationFrame(step);
}

function epMarkStops() {
    const atOrigin = EP.idx === 0 && !EP.leftStart;
    // walker 实际所在站：未出发在起点（无站 at），已出发在 EP.idx-1
    const walkerHere = EP.leftStart ? Math.max(0, EP.idx - 1) : -1;
    EP.stops.forEach((s, i) => {
        const el = document.getElementById('epStop' + i);
        if (!el || el.classList.contains('skipped')) return;
        el.classList.toggle('passed', i < EP.idx);
        el.classList.toggle('current', i === EP.idx);
        el.classList.toggle('at', i === walkerHere);
    });
    // 出发段点亮；小途未离开时圆牌藏在脚下，只显示文字标签
    const originEl = document.getElementById('epOrigin');
    if (originEl) originEl.classList.toggle('at', !EP.leftStart);
    const segStart = document.getElementById('epSegStart');
    if (segStart) segStart.classList.toggle('done', EP.leftStart);
    // 高亮走过的路段
    for (let i = 0; i < EP.stops.length - 1; i++) {
        const seg = document.getElementById('epSeg' + i);
        if (seg) seg.classList.toggle('done', i < EP.idx);
    }
    // 注意：小人位置不在此函数移动，由 epRenderCanvas（初始/重规划）和 epVisitStop（打卡动画）控制
}

function epSparkle(nodeEl, emoji) {
    const canvas = document.getElementById('epCanvas');
    for (let i = 0; i < 7; i++) {
        const s = document.createElement('span');
        s.className = 'sparkle';
        s.textContent = emoji || ['✨', '💗', '⭐'][i % 3];
        const ang = Math.random() * Math.PI * 2, dist = 26 + Math.random() * 26;
        s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
        s.style.setProperty('--dy', Math.sin(ang) * dist - 14 + 'px');
        s.style.left = nodeEl.style.left; s.style.top = nodeEl.style.top;
        canvas.appendChild(s);
        setTimeout(() => s.remove(), 950);
    }
}

/* ---------------- 站点详情弹窗 ---------------- */
function epShowStopDetail(i) {
    const s = EP.stops[i];
    if (!s) return;
    const st = TYPE_STYLE[s.type];
    const typeLabel = { park: '公园绿地', sight: '景点观光', food: '餐饮补给', cafe: '咖啡歇脚', hotel: '住宿休整' }[s.type] || '站点';

    // 站点状态
    let statusCls = 'future', statusTxt = '⏳ 待到达 · 打卡时扣爱心';
    if (EP.idx >= EP.stops.length || i < EP.idx) { statusCls = 'passed'; statusTxt = '✅ 已走过这段路'; }
    else if (i === EP.idx) { statusCls = 'current'; statusTxt = '📍 下一站 · 点击「打卡这一站」前往'; }
    if (EP.step === 4 || (document.getElementById('epStop' + i) || {}).classList?.contains?.('skipped')) { statusCls = 'skipped'; statusTxt = '✂️ 已在省电版路线中移除'; }

    const tipMap = {
        park: '绿植覆盖高、噪音低，是恢复注意力的天然氧吧',
        sight: '核心游览区，拍照出片但步行量大，量力而行',
        food: '正经吃一顿=被动休息，边吃边回血',
        cafe: '坐下就回血，旅途中的充电宝',
        hotel: '行程终点，好好休息，明天满血'
    };

    let mask = document.getElementById('epStopDetailMask');
    if (!mask) {
        mask = document.createElement('div');
        mask.id = 'epStopDetailMask';
        mask.className = 'stop-detail-mask';
        mask.onclick = (e) => { if (e.target === mask) epCloseStopDetail(); };
        document.querySelector('#energyOverlay .energy-panel').appendChild(mask);
    }

    mask.innerHTML = `
        <div class="stop-detail" style="--sc:${st.grad}">
            <button class="sd-close" onclick="epCloseStopDetail()"><i class="fas fa-xmark"></i></button>
            <div class="sd-hero">
                <div class="sd-ico"><img src="${st.img}" alt=""></div>
                <div class="sd-type-chip">${typeLabel}</div>
            </div>
            <div class="sd-body">
                <h4 class="sd-name">${s.name}</h4>
                <p class="sd-desc">${s.desc}<br><span style="font-size:10.5px;color:#ffffff70">${tipMap[s.type] || ''}</span></p>
                <div class="sd-rows">
                    <div class="sd-row"><i class="sd-ri fas fa-clock" style="background:linear-gradient(135deg,#7c83ff,#5b63f5)"></i><span class="sd-rl">建议停留时间</span><span class="sd-rv">${Math.round(s.dur / 60 * 10) / 10} 小时</span></div>
                    <div class="sd-row"><i class="sd-ri fas fa-heart-broken" style="background:linear-gradient(135deg,#fb7185,#f43f5e)"></i><span class="sd-rl">体力消耗</span><span class="sd-rv cost">${s.cost > 0 ? '-' + s.cost + ' 💗' : '0 💗 不耗体力'}</span></div>
                    ${i >= EP.idx && i < EP.stops.length ? (() => { const fp = i === 0 ? (EP.origin || [7, 88]) : EP.xy[i - 1]; return `<div class="sd-row"><i class="sd-ri fas fa-person-walking" style="background:linear-gradient(135deg,#22d3ee,#3b82f6)"></i><span class="sd-rl">从上一站赶路</span><span class="sd-rv cost">-${epWalkCost(fp, EP.xy[i])} 💗</span></div>`; })() : ''}
                    <div class="sd-row"><i class="sd-ri fas fa-heart-pulse" style="background:linear-gradient(135deg,#34d399,#10b981)"></i><span class="sd-rl">体力恢复</span><span class="sd-rv rec">${s.rec ? '+' + s.rec + ' 💗' : '— 无恢复'}</span></div>
                    <div class="sd-row"><i class="sd-ri fas fa-location-dot" style="background:linear-gradient(135deg,#f59e0b,#d97706)"></i><span class="sd-rl">路线位置</span><span class="sd-rv">第 ${i + 1} 站 / 共 ${EP.stops.length} 站</span></div>
                </div>
                <div class="sd-status ${statusCls}">${statusTxt}</div>
            </div>
        </div>`;
    mask.classList.add('open');
}

function epCloseStopDetail() {
    const mask = document.getElementById('epStopDetailMask');
    if (mask) mask.classList.remove('open');
}

/* ---------------- 当前站点卡 + 操作区 ---------------- */
function epRenderNowStop() {
    const box = document.getElementById('epNowStop');
    const acts = document.getElementById('epActions');

    if (EP.idx >= EP.stops.length) return; // 结算
    const s = EP.stops[EP.idx];
    const st = TYPE_STYLE[s.type];
    const typeLabel = { park: '公园绿地', sight: '景点', food: '餐饮', cafe: '咖啡歇脚', hotel: '住宿休整' }[s.type];
    const totalDur = EP.stops.slice(0, EP.idx + 1).reduce((a, b) => a + b.dur, 0);
    // 赶路消耗：从当前位置走到该站
    const fromPos = EP.idx === 0 ? (EP.origin || [7, 88]) : EP.xy[EP.idx - 1];
    const walk = epWalkCost(fromPos, EP.xy[EP.idx]);

    box.style.setProperty('--sc', st.grad);
    box.style.setProperty('--sc-glow', st.glow);
    const hours = m => Math.round(m / 60 * 10) / 10;
    const heartTile = s.rec
        ? `<div class="ns-stat rec"><i class="fas fa-heart-pulse"></i><b>+${s.rec}</b><span>休息回血</span></div>`
        : `<div class="ns-stat cost"><i class="fas fa-heart"></i><b>-${s.cost || 0}</b><span>打卡消耗</span></div>`;
    box.innerHTML = `
        <div class="ns-head">
            <div class="ns-ico"><img src="${st.img}" alt=""></div>
            <div class="ns-info">
                <div class="ns-kicker">下一站 · 第 ${EP.idx + 1}/${EP.stops.length} 站 · ${typeLabel}</div>
                <h4>${s.name}</h4>
                <p>${s.desc}</p>
            </div>
        </div>
        <div class="ns-stats">
            <div class="ns-stat"><i class="fas fa-clock"></i><b>${hours(s.dur)}h</b><span>建议停留</span></div>
            <div class="ns-stat"><i class="fas fa-person-walking"></i><b>-${walk}</b><span>赶路消耗</span></div>
            ${heartTile}
            <div class="ns-stat"><i class="fas fa-hourglass-half"></i><b>${hours(totalDur)}h</b><span>累计用时</span></div>
        </div>`;

    const need = walk + (s.cost || 0);
    acts.innerHTML = `
        <button class="act-btn go" onclick="epVisitStop()">
            <span class="ab-ico"><i class="fas fa-person-walking"></i></span>
            <span class="ab-text"><span>打卡这一站</span><small>共消耗 ${need}💗 · 赶路 ${walk} + 打卡 ${s.cost || 0}</small></span>
            <i class="fas fa-arrow-right ab-go"></i>
        </button>
        <button class="act-btn replan" onclick="epReplan()" title="砍掉太累的站点">
            <i class="fas fa-wand-magic-sparkles"></i><span>重新规划</span>
        </button>`;
}

/* ---------------- 到站 ---------------- */
// 选择分支：把候选站插入到运行时路线中
function epChooseBranch(ci) {
    if (EP.busy) return;
    const curIdx = EP.idx - 1;
    const curStop = EP.stops[curIdx];
    if (!curStop || !curStop.choices) return;
    const choice = curStop.choices[ci];
    const cur = EP.xy[curIdx];
    const anchor = EP.xy[EP.idx] || [Math.min(95, cur[0] + 16), cur[1]];
    const t = (ci + 1) / (curStop.choices.length + 1);
    const cx = cur[0] + (anchor[0] - cur[0]) * t;
    const cy = cur[1] + (anchor[1] - cur[1]) * t + (ci % 2 === 0 ? -12 : 12);
    // 插入选中站到下一站位置
    EP.stops.splice(EP.idx, 0, { ...choice });
    EP.xy.splice(EP.idx, 0, [cx, cy]);
    // 清除已选择的分支标记
    delete curStop.choices;
    epRenderCanvas();
    epMarkStops();
    epRenderNowStop();
    epEvaluate(true);
    epToast(`选择了「${choice.name}」，点击打卡前往`);
}

function epVisitStop() {
    if (EP.busy) return;
    const s = EP.stops[EP.idx];
    if (!s) return;

    // 赶路消耗：从当前位置走到该站也要花体力
    const fromPos = EP.idx === 0 ? (EP.origin || [7, 88]) : EP.xy[EP.idx - 1];
    const walk = epWalkCost(fromPos, EP.xy[EP.idx]);
    if (EP.hearts < s.cost + walk) {
        epToast('爱心不够啦！先休息或重新规划吧 🥺');
        epEvaluate();
        return;
    }
    EP.busy = true;
    EP.leftStart = true;
    const w = document.getElementById('epWalker');
    w.classList.add('walking');

    const seg = document.getElementById(EP.idx === 0 ? 'epSegStart' : 'epSeg' + (EP.idx - 1));
    epWalkAlong(w, seg, EP.xy[EP.idx], 1150);

    setTimeout(() => {
        w.classList.remove('walking');
        const node = document.getElementById('epStop' + EP.idx);
        const loseTotal = walk + (s.cost || 0);
        if (loseTotal > 0) {
            EP.hearts -= loseTotal;
            epRenderHearts('lose', loseTotal);
        }
        if (s.rec > 0) {
            EP.hearts = Math.min(EP.maxHearts, EP.hearts + s.rec);
            epRenderHearts('gain', s.rec);
        }
        if (node) epSparkle(node, s.rec ? '💚' : '💗');
        EP.idx++;
        epRenderCanvas(); // 重渲染：小人停在刚到达的站；若新到站有 choices，候选点亮起
        epMarkStops();
        // 重绘后在新的小人元素上播放欢呼动画
        const nw = document.getElementById('epWalker');
        nw.classList.add('cheer');
        setTimeout(() => nw.classList.remove('cheer'), 1100);

        if (s.rec) epToast(`赶路 -${walk}💗 · 休息恢复 +${s.rec} 💗`);
        else epToast(`打卡「${s.name}」-${s.cost}💗 · 赶路 -${walk}💗`);

        EP.busy = false;

        if (EP.idx >= EP.stops.length) { setTimeout(epFinish, 900); return; }
        epRenderNowStop();
        epEvaluate();
    }, 1150);
}

/* ---------------- 智能建议引擎 ---------------- */
function epEvaluate(initial) {
    const box = document.getElementById('epAdvice');
    const walker = document.getElementById('epWalker');
    const next = EP.stops[EP.idx];
    if (!next) { box.innerHTML = ''; return; }

    const t = ENERGY_TYPES[EP.typeKey];
    // 下一站需求 = 赶路 + 打卡
    const fromPos = EP.idx === 0 ? (EP.origin || [7, 88]) : EP.xy[EP.idx - 1];
    const walkNext = epWalkCost(fromPos, EP.xy[EP.idx]);
    const need = (next.cost || 0) + walkNext;
    let html = '';

    if (EP.hearts === 0) {
        walker && walker.classList.add('tired');
        html = `<div class="advice-card">
            <div class="advice-head"><span class="pulse-dot"></span> 电量耗尽警告</div>
            <p>你的爱心已经全部用完 💗➡️🖤&nbsp;继续硬撑只会让旅途体验直线下降。建议：<b>结束旅程</b>去最近的咖啡店或酒店回血，或者让我砍掉剩余景点生成"省电版路线"。</p>
            <div class="advice-acts">
                <button class="aa-main" onclick="epReplan()"><i class="fas fa-wand-magic-sparkles"></i> 省电版重新规划</button>
                <button class="aa-sub" onclick="epFinish(true)"><i class="fas fa-mug-hot"></i> 就此结束行程</button>
            </div></div>`;
    } else if (EP.hearts < need) {
        walker && walker.classList.add('tired');
        html = `<div class="advice-card">
            <div class="advice-head"><span class="pulse-dot"></span> 精力不足以到达下一站</div>
            <p>下一站「${next.name}」需要 <b>${need}💗</b>（赶路 ${walkNext} + 打卡 ${next.cost || 0}），你只剩 <b>${EP.hearts}💗</b>。强烈建议砍掉部分后续站点，或先插入一次休息。</p>
            <div class="advice-acts">
                <button class="aa-main" onclick="epReplan()"><i class="fas fa-scissors"></i> 帮我砍站重排</button>
                <button class="aa-sub" onclick="epToggleReport()"><i class="fas fa-hand-point-up"></i> 我实际没这么累</button>
            </div></div>`;
    } else if (EP.hearts <= Math.max(2, EP.maxHearts * 0.3)) {
        walker && walker.classList.remove('tired');
        const restIdx = EP.stops.findIndex((x, i) => i >= EP.idx && x.rec > 0);
        const restTip = restIdx >= 0 ? `坚持到「${EP.stops[restIdx].name}」可以恢复 +${EP.stops[restIdx].rec}💗。` : '后续没有休息点了，注意控制节奏。';
        html = `<div class="advice-card">
            <div class="advice-head"><span class="pulse-dot"></span> 精力偏低提醒</div>
            <p>剩余 ${EP.hearts}💗（${Math.round(EP.hearts / EP.maxHearts * 100)}%）。${restTip}如果实际感觉更累，记得手动上报真实精力。</p>
            <div class="advice-acts">
                <button class="aa-main" onclick="epVisitStop()"><i class="fas fa-person-walking"></i> 还能走，继续</button>
                <button class="aa-sub" onclick="epReplan()"><i class="fas fa-scissors"></i> 砍站保平安</button>
            </div></div>`;
    } else {
        walker && walker.classList.remove('tired');
        if (!initial) {
            html = `<div class="advice-card ok">
                <div class="advice-head"><span class="pulse-dot"></span> 状态良好</div>
                <p>剩余 <b>${EP.hearts}💗</b>，足够覆盖「${next.name}」（需 ${need}💗，含赶路）。按当前节奏走完全程没问题，冲！</p></div>`;
        } else {
            const tripTotal = (() => {
                let c = 0, from = EP.origin || [7, 88];
                for (let i = 0; i < EP.stops.length; i++) {
                    c += epWalkCost(from, EP.xy[i]) + (EP.stops[i].cost || 0) - (EP.stops[i].rec || 0);
                    from = EP.xy[i];
                }
                return Math.max(0, c);
            })();
            html = `<div class="advice-card ok">
                <div class="advice-head"><span class="pulse-dot"></span> 行程已加载</div>
                <p>全程共 ${EP.stops.length} 站，总净耗约 <b>${tripTotal}💗</b>（含站间赶路，已扣回血）。你的初始电量 ${EP.maxHearts}💗，赶路和打卡都会实时扣减，累了随时上报真实状态。</p></div>`;
        }
    }
    box.innerHTML = html;
}

/* ---------------- 手动上报 ---------------- */
function epToggleReport() {
    const pop = document.getElementById('epReportPop');
    if (!pop.classList.contains('open')) {
        const quick = document.getElementById('epReportQuick');
        let chips = '';
        for (let i = 0; i <= EP.maxHearts; i++) {
            chips += `<button class="rq-chip" onclick="epReport(${i})">${'❤️'.repeat(Math.min(i, 5))}${i > 5 ? '+' : ''} ${i}💗</button>`;
        }
        quick.innerHTML = chips;
    }
    pop.classList.toggle('open');
}

function epReport(n) {
    const diff = n - EP.hearts;
    EP.hearts = Math.max(0, Math.min(EP.maxHearts, n));
    EP.reportedOnce = true;
    epRenderHearts(diff >= 0 ? 'gain' : 'lose', Math.abs(diff) || 1);
    document.getElementById('epReportPop').classList.remove('open');
    if (diff < 0) epToast(`已更新为 ${EP.hearts}💗，辛苦了，注意休息 🥺`);
    else epToast(`已更新为 ${EP.hearts}💗，状态不错！`);
    epEvaluate();
}

/* ---------------- 重新规划（砍站） ---------------- */
function epReplan() {
    let remaining = [];
    for (let i = EP.idx; i < EP.stops.length; i++) remaining.push(i);

    if (remaining.length === 0) return;

    // 贪心：从后往前砍 cost 最高且非恢复站的景点，直到 (hearts - 剩余必耗) >= 1 或没有可砍
    const cutOrder = [...remaining].sort((a, b) => {
        const sa = EP.stops[a], sb = EP.stops[b];
        return (sb.cost || 0) - (sa.cost || 0);
    });

    // 剩余总耗 = 赶路 + 打卡（按保留站点顺序逐段累计，砍站后相邻段自动合并）
    let cut = [];
    const totalCost = () => {
        let c = 0, from = EP.leftStart ? EP.xy[EP.idx - 1] : (EP.origin || [7, 88]);
        for (let i = EP.idx; i < EP.stops.length; i++) {
            if (cut.includes(i)) continue;
            c += epWalkCost(from, EP.xy[i]) + (EP.stops[i].cost || 0);
            from = EP.xy[i];
        }
        return c;
    };
    for (const i of cutOrder) {
        if (totalCost() < EP.hearts) break;
        const s = EP.stops[i];
        if (s.rec > 0 && remaining.length - cut.length > 1) continue; // 休息站尽量保留（除非只剩它）
        if (s.cost === 0) continue; // 零耗站不砍
        cut.push(i);
    }
    // 仍不够：把最贵的休息站以外全砍，直奔终点
    if (totalCost() >= EP.hearts && remaining.length) {
        const keep = remaining[remaining.length - 1];
        cut = remaining.filter(i => i !== keep);
    }
    if (!cut.length) { epToast('当前路线已经是最省电版本啦 ✅'); epEvaluate(); return; }

    // 动画砍站
    EP.busy = true;
    cut.forEach((i, k) => {
        const el = document.getElementById('epStop' + i);
        if (el) setTimeout(() => { el.classList.add('cutting'); }, k * 160);
        setTimeout(() => { el && el.classList.add('skipped'); el && el.classList.remove('cutting'); }, k * 160 + 500);
    });

    setTimeout(() => {
        EP.stops = EP.stops.filter((s, i) => !cut.includes(i));
        EP.xy = EP.xy.filter((_, i) => !cut.includes(i));
        EP.busy = false;
        epRenderCanvas();
        epRenderNowStop();
        epEvaluate();
        epToast(`已砍掉 ${cut.length} 站，生成省电版路线 ✂️`);
    }, cut.length * 160 + 560);
}

/* ---------------- 结算 ---------------- */
function epFinish(early) {
    const route = ENERGY_ROUTES.find(r => EP.routeId && r.id === EP.routeId) || {
        name: '自定义路线', emoji: '🗺️'
    };
    const used = EP.maxHearts - EP.hearts;
    const pct = Math.round(EP.hearts / EP.maxHearts * 100);
    let medal, medalDesc;
    if (EP.hearts === 0) { medal = '🫠'; medalDesc = '极限电量生存者——玩是玩爽了，回家倒头就睡。下次记得多安排休息点！'; }
    else if (pct >= 70) { medal = '⚡'; medalDesc = '元气满格旅行家——电量充裕，你可以再战一条线！'; }
    else if (pct >= 40) { medal = '🍃'; medalDesc = '张弛有度规划师——节奏完美，这就是旅行的最优解。'; }
    else { medal = '🌙'; medalDesc = '电量告急勇者——坚持下来了，但下次试试低强度路线吧。'; }

    const totalMin = EP.stops.reduce((a, b) => a + b.dur, 0);
    const coverUrl = ROUTE_COVERS[EP.routeId] ? epImg(ROUTE_COVERS[EP.routeId]) : '';
    const box = document.getElementById('epFinish');
    box.innerHTML = `
        ${coverUrl ? `<div class="finish-cover"><img src="${coverUrl}" alt="" onerror="this.parentNode.style.display='none'"><div class="fc-mask"></div><span class="finish-trophy">${medal}</span></div>` : `<span class="finish-trophy">${medal}</span>`}
        <h3 class="finish-title">${early ? '旅程提前收官' : '旅程完成！'}</h3>
        <p class="finish-sub">${route.emoji} ${route.name} · ${EP.stops.length} 个站点${early ? '（省电版）' : ''}</p>
        <div class="finish-stats">
            <div class="fs-card"><b>${Math.round(totalMin / 60 * 10) / 10}h</b><span>行程总时长</span></div>
            <div class="fs-card"><b style="color:#fda4af">${used}💗</b><span>精力消耗</span></div>
            <div class="fs-card"><b style="color:#f0c19a">${EP.hearts}💗</b><span>剩余电量</span></div>
        </div>
        <div class="finish-medal"><h4>旅途称号 · ${medal}</h4><p>${medalDesc}</p></div>
        <button class="e-cta" onclick="epReset();epShowStep(1)"><span>再来一次</span><i class="fas fa-rotate-right"></i></button>`;
    epShowStep(4);
}

/* ---------------- 步骤切换 ---------------- */
function epShowStep(n) {
    EP.step = n;
    for (let i = 1; i <= 4; i++) {
        document.getElementById('epScreen' + i).classList.toggle('active', i === n);
        const dot = document.getElementById('epDot' + i);
        if (dot) dot.classList.toggle('on', i === n || (n === 4 && i === 3));
    }
    const body = document.querySelector('#energyOverlay .e-body');
    if (body) body.scrollTop = 0;
}
