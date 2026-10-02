const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function loadLocalEnv() {
    const envPath = path.join(ROOT, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const separator = trimmed.indexOf('=');
        if (separator < 1) continue;
        const key = trimmed.slice(0, separator).trim();
        let value = trimmed.slice(separator + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
    }
}

loadLocalEnv();

function configuredKey(name) {
    const value = String(process.env[name] || '').trim();
    if (!value || /your_.+_here/i.test(value) || value.includes('在此填写')) return '';
    return value;
}

const PORT = Number(process.env.PORT) || 3000;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash';
const DEEPSEEK_ANALYSIS_MODEL = process.env.DEEPSEEK_ANALYSIS_MODEL || 'deepseek-flash';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function json(res, status, body) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(body));
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', chunk => {
            raw += chunk;
            if (raw.length > 200_000) reject(new Error('请求内容过大'));
        });
        req.on('end', () => {
            try { resolve(JSON.parse(raw || '{}')); }
            catch { reject(new Error('请求 JSON 格式无效')); }
        });
        req.on('error', reject);
    });
}

function cleanText(value, maxLength) {
    return String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, maxLength);
}

function normalizeInput(body) {
    const mode = body.mode === 'direct' ? 'direct' : 'chat';
    const query = cleanText(body.query, 500);
    const memory = Array.isArray(body.memory) ? body.memory.slice(0, 30).map(item => ({
        keyword: cleanText(item.keyword, 24),
        priority: Math.min(3, Math.max(1, Number(item.priority) || 2)),
        count: Math.min(999, Math.max(1, Number(item.count) || 1)),
        preference: item.preference === 'avoid' ? 'avoid' : 'like',
        lastUsed: Number(item.lastUsed) || 0
    })).filter(item => item.keyword) : [];
    const localCandidates = Array.isArray(body.localCandidates) ? body.localCandidates.slice(0, 180).map(item => ({
        name: cleanText(item.name, 60),
        type: cleanText(item.type, 30),
        lat: Number(item.lat),
        lng: Number(item.lng),
        tags: Array.isArray(item.tags) ? item.tags.slice(0, 8).map(tag => cleanText(tag, 20)) : [],
        description: cleanText(item.description, 220),
        score: Number(item.score) || 0,
        source: '本地空间库'
    })).filter(item => item.name && Number.isFinite(item.lat) && Number.isFinite(item.lng)) : [];
    const location = {
        lat: Number(body.location?.lat) || 39.9597,
        lng: Number(body.location?.lng) || 116.2980,
        label: cleanText(body.location?.label || '北京·海淀区', 60)
    };
    const history = Array.isArray(body.history) ? body.history.slice(-6).map(item => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: cleanText(item.content, 500)
    })).filter(item => item.content) : [];
    const userSignals = {
        profileTags: Array.isArray(body.userSignals?.profileTags)
            ? body.userSignals.profileTags.slice(0, 30).map(item => cleanText(item, 24)).filter(Boolean)
            : [],
        favorites: Array.isArray(body.userSignals?.favorites)
            ? body.userSignals.favorites.slice(0, 30).map(item => cleanText(item, 60)).filter(Boolean)
            : []
    };
    if (mode === 'chat' && !query) throw new Error('请输入想搜索或推荐的内容');
    if (mode === 'direct' && !memory.length) throw new Error('记忆库为空，无法直接推荐');
    return { mode, query, memory, localCandidates, location, history, userSignals };
}

async function searchOpenStreetMap(input, understanding) {
    const memoryQuery = input.memory
        .filter(item => item.preference !== 'avoid')
        .slice(0, 5)
        .map(item => item.keyword)
        .join(' ');
    const searchText = understanding.searchQuery || (input.mode === 'direct' ? memoryQuery : input.query);
    const params = new URLSearchParams({
        q: `${searchText} ${input.location.label}`,
        format: 'jsonv2',
        limit: '10',
        addressdetails: '1',
        'accept-language': 'zh-CN'
    });
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
            headers: {
                'User-Agent': 'SpatialAICompanion/2.0 (local travel recommendation app)',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            },
            signal: AbortSignal.timeout(6500)
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.map(item => ({
            name: cleanText(item.name || item.display_name?.split(',')[0] || '地图地点', 60),
            type: cleanText(item.type || item.category || '地图地点', 30),
            lat: Number(item.lat),
            lng: Number(item.lon),
            tags: [item.category, item.type, item.address?.suburb, item.address?.city].filter(Boolean).map(tag => cleanText(tag, 20)),
            description: cleanText(item.display_name, 220),
            score: 0,
            source: 'OpenStreetMap'
        })).filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng));
    } catch {
        return [];
    }
}

function mergeCandidates(localCandidates, mapCandidates) {
    const seen = new Set();
    return [...localCandidates, ...mapCandidates].filter(item => {
        const key = item.name.toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 200);
}

function distanceKm(from, to) {
    const toRad = value => value * Math.PI / 180;
    const earthRadius = 6371;
    const dLat = toRad(to.lat - from.lat);
    const dLng = toRad(to.lng - from.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function candidateContains(candidate, keyword) {
    const haystack = [candidate.name, candidate.type, candidate.description, ...(candidate.tags || [])].join(' ').toLowerCase();
    return haystack.includes(String(keyword).toLowerCase());
}

function personalizeCandidates(input, understanding, candidates) {
    const explicitLikes = Array.isArray(understanding.likes) ? understanding.likes : [];
    const explicitAvoids = Array.isArray(understanding.avoids) ? understanding.avoids : [];
    const hasCurrentQuery = Boolean(input.query.trim());
    const memoryScale = hasCurrentQuery ? 0.3 : 1;
    const currentNeed = [input.query, understanding.resolvedNeed, ...explicitLikes].join(' ').toLowerCase();
    return candidates.map(candidate => {
        let personalizedScore = Number(candidate.score) || 0;
        const matchedMemory = [];
        const conflicts = [];
        for (const item of input.memory) {
            if (!candidateContains(candidate, item.keyword)) continue;
            const strength = item.priority * 9 + Math.min(8, item.count);
            if (item.preference === 'avoid') {
                personalizedScore -= strength * 2 * memoryScale;
                conflicts.push(item.keyword);
            } else {
                personalizedScore += strength * memoryScale;
                matchedMemory.push(item.keyword);
            }
        }
        for (const tag of input.userSignals.profileTags) {
            if (candidateContains(candidate, tag)) personalizedScore += 7;
        }
        for (const like of explicitLikes) {
            if (candidateContains(candidate, like)) personalizedScore += 45;
        }
        for (const avoid of explicitAvoids) {
            if (candidateContains(candidate, avoid)) {
                personalizedScore -= 40;
                conflicts.push(avoid);
            }
        }
        if (input.userSignals.favorites.includes(candidate.name)) personalizedScore += 20;
        // 当前问题中的地点类型和自有标签（如“中轴线”“古建”“奥运”）优先级最高。
        const currentMatches = [candidate.name, candidate.type, ...(candidate.tags || [])]
            .filter(signal => {
                const normalized = String(signal || '').toLowerCase();
                return normalized.length >= 2 && currentNeed.includes(normalized);
            });
        personalizedScore += currentMatches.length * 55;
        const km = distanceKm(input.location, candidate);
        personalizedScore += Math.max(0, 12 - km);
        return {
            ...candidate,
            distanceKm: Number(km.toFixed(1)),
            personalizedScore: Math.round(personalizedScore),
            matchedMemory: [...new Set(matchedMemory)],
            conflicts: [...new Set(conflicts)]
        };
    }).sort((a, b) => b.personalizedScore - a.personalizedScore).slice(0, 60);
}

function parseModelJson(content) {
    const cleaned = cleanText(content, 20_000).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try { return JSON.parse(cleaned); }
    catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
        throw new Error('DeepSeek 返回了无法解析的结果');
    }
}

async function requestDeepSeek({ model, system, payload, maxTokens = 1800, temperature = 0.25 }) {
    if (!configuredKey('DEEPSEEK_API_KEY')) {
        const error = new Error('尚未配置 DEEPSEEK_API_KEY，已由前端切换到本地推荐');
        error.status = 503;
        throw error;
    }
    const response = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: `请严格根据以下 JSON 数据完成任务：\n${JSON.stringify(payload)}` }
            ],
            response_format: { type: 'json_object' },
            thinking: { type: 'disabled' },
            temperature,
            max_tokens: maxTokens,
            stream: false
        }),
        signal: AbortSignal.timeout(45_000)
    });
    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
        const detail = cleanText(raw.error?.message || raw.message || `HTTP ${response.status}`, 240);
        const error = new Error(`DeepSeek 请求失败：${detail}`);
        error.status = response.status >= 500 ? 502 : 400;
        throw error;
    }
    const content = raw.choices?.[0]?.message?.content;
    if (!content) throw new Error('DeepSeek 没有返回有效内容');
    return parseModelJson(content);
}

async function analyzeUserRequest(input) {
    const system = `你是旅行需求分析器。先理解当前消息在最近对话中的真实含义，再把需求拆成可检索、可排序的结构。不要推荐地点，不要补充候选点之外的事实。

规则：
1. 当前输入优先于历史记忆；用户明确说“不要、避开、不喜欢、不能”时必须放入 avoids。
2. 把同行人、时长、体力、预算、交通、时间段、无障碍、天气倾向视为 hardConstraints，不要当作长期记忆。
3. memoryUpdates 只保留稳定的游玩偏好关键词，不保存完整句子、地点位置、日期、预算等一次性信息。
4. direct 模式没有当前输入，应从高优先级喜欢项中总结需求，并排除所有 avoid 记忆。
5. searchQuery 必须是适合地图检索的短查询，包含场所类型与城市/区域，不能复制整段自然语言。
6. 只输出 JSON：
{"intent":"recommend|place_question|chat","resolvedNeed":"一句话需求总结","searchQuery":"地图短查询","likes":["偏好"],"avoids":["避开项"],"hardConstraints":{"companions":"","duration":"","mobility":"","budget":"","transport":"","time":""},"memoryUpdates":[{"keyword":"关键词","preference":"like|avoid"}]}`;
    const payload = {
        mode: input.mode,
        currentQuery: input.query,
        location: input.location,
        prioritizedKeywordMemory: input.memory,
        profileTags: input.userSignals.profileTags,
        favoritePlaces: input.userSignals.favorites,
        recentConversation: input.history
    };
    const raw = await requestDeepSeek({
        model: DEEPSEEK_ANALYSIS_MODEL,
        system,
        payload,
        maxTokens: 1000,
        temperature: 0.1
    });
    const allowedIntents = new Set(['recommend', 'place_question', 'chat']);
    return {
        intent: allowedIntents.has(raw.intent) ? raw.intent : 'recommend',
        resolvedNeed: cleanText(raw.resolvedNeed || input.query || '根据个人偏好推荐游玩地点', 240),
        searchQuery: cleanText(raw.searchQuery || input.query || input.location.label, 120),
        likes: Array.isArray(raw.likes) ? raw.likes.slice(0, 12).map(item => cleanText(item, 24)).filter(Boolean) : [],
        avoids: Array.isArray(raw.avoids) ? raw.avoids.slice(0, 12).map(item => cleanText(item, 24)).filter(Boolean) : [],
        hardConstraints: {
            companions: cleanText(raw.hardConstraints?.companions, 50),
            duration: cleanText(raw.hardConstraints?.duration, 50),
            mobility: cleanText(raw.hardConstraints?.mobility, 50),
            budget: cleanText(raw.hardConstraints?.budget, 50),
            transport: cleanText(raw.hardConstraints?.transport, 50),
            time: cleanText(raw.hardConstraints?.time, 50)
        },
        memoryUpdates: Array.isArray(raw.memoryUpdates) ? raw.memoryUpdates.slice(0, 8).map(item => ({
            keyword: cleanText(item.keyword, 24),
            preference: item.preference === 'avoid' ? 'avoid' : 'like'
        })).filter(item => item.keyword.length >= 2) : []
    };
}

function buildRecommendationPrompt() {
    return `你是严谨、懂取舍的个性化旅行顾问。你已经收到经过结构化理解的需求和真实候选地点，现在负责精排并解释。

排序原则（从高到低）：
1. 必须先满足 hardConstraints；与明确 avoids 冲突的地点原则上不得推荐。
2. 满足用户本次 likes 和 resolvedNeed。
3. 匹配高优先级 like 记忆，避开高优先级 avoid 记忆；收藏和画像偏好只作加权，不能覆盖本次明确要求。
4. 综合个性化预评分、距离与地点信息。不要只选最热门地点，要选最适合这个用户的地点。
5. 每个推荐都要说明“为什么适合这个用户”和一个真实取舍；资料不足时明确不确定性，不能编造票价、开放时间、实时客流或天气。
6. 地点名称只能原样取自 candidates，通常推荐 3 个、最多 5 个。普通闲聊可返回空 recommendations。
7. 回复要自然、具体，避免“综合匹配度高”这类空话。第一名必须明确说明为什么胜过第二名。
8. text 中提到的地点、数量和顺序必须与 recommendations 完全一致，不能在文字里推荐却漏掉卡片。
9. 只输出 JSON：
{"text":"先给明确结论，再用2-4句概括选择逻辑","recommendations":[{"name":"候选点原名","reason":"具体匹配理由","personalization":"命中了哪些本次需求或记忆","tradeoff":"需要注意的取舍","bestTime":"有依据时给建议，否则留空","confidence":0.0}]}`;
}

async function rankAndAnswer(input, understanding, candidates) {
    return requestDeepSeek({
        model: DEEPSEEK_MODEL,
        system: buildRecommendationPrompt(),
        payload: {
            mode: input.mode,
            understanding,
            prioritizedKeywordMemory: input.memory,
            userSignals: input.userSignals,
            location: input.location,
            candidates,
            recentConversation: input.history
        },
        maxTokens: 2200,
        temperature: 0.2
    });
}

function findCandidate(candidates, name) {
    const target = cleanText(name, 60).toLowerCase();
    return candidates.find(item => item.name.toLowerCase() === target)
        || candidates.find(item => item.name.toLowerCase().includes(target) || target.includes(item.name.toLowerCase()));
}

function normalizeModelResult(result, candidates, understanding) {
    let recommendations = Array.isArray(result.recommendations) ? result.recommendations.slice(0, 5).map(item => {
        const candidate = findCandidate(candidates, item.name);
        if (!candidate) return null;
        return {
            name: candidate.name,
            type: candidate.type,
            lat: candidate.lat,
            lng: candidate.lng,
            tags: candidate.tags,
            reason: cleanText(item.reason || candidate.description, 260),
            personalization: cleanText(item.personalization, 220),
            tradeoff: cleanText(item.tradeoff, 180),
            bestTime: cleanText(item.bestTime, 100),
            confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0.7)),
            distanceKm: candidate.distanceKm,
            matchedMemory: candidate.matchedMemory,
            source: candidate.source
        };
    }).filter(Boolean) : [];
    if (understanding.intent !== 'chat' && recommendations.length < 3) {
        const usedNames = new Set(recommendations.map(item => item.name));
        const resultText = cleanText(result.text, 1000);
        const suffixPattern = /(博物院|博物馆|纪念馆|森林公园|湿地公园|自然风景区|风景区|公园|城楼|大街|胡同|艺术中心|美术馆)$/;
        const mentionedCandidates = candidates.filter(candidate => {
            if (usedNames.has(candidate.name)) return false;
            const shortName = candidate.name.replace(suffixPattern, '');
            return resultText.includes(candidate.name) || (shortName.length >= 2 && resultText.includes(shortName));
        });
        const fallbackCandidates = [...mentionedCandidates, ...candidates]
            .filter((candidate, index, list) => !usedNames.has(candidate.name) && list.findIndex(item => item.name === candidate.name) === index)
            .slice(0, 3 - recommendations.length);
        recommendations.push(...fallbackCandidates.map(candidate => ({
            name: candidate.name,
            type: candidate.type,
            lat: candidate.lat,
            lng: candidate.lng,
            tags: candidate.tags,
            reason: candidate.description || '根据当前需求、记忆优先级与距离综合排序',
            personalization: candidate.matchedMemory.length ? `匹配记忆：${candidate.matchedMemory.join('、')}` : '主要匹配本次需求',
            tradeoff: candidate.conflicts.length ? `可能冲突：${candidate.conflicts.join('、')}` : '',
            bestTime: '',
            confidence: 0.55,
            distanceKm: candidate.distanceKm,
            matchedMemory: candidate.matchedMemory,
            source: candidate.source
        })));
    }
    return {
        text: cleanText(result.text || `我理解你想要的是：${understanding.resolvedNeed}。以下是更适合你的选择。`, 1000),
        keywords: understanding.memoryUpdates.map(item => item.keyword),
        memoryUpdates: understanding.memoryUpdates,
        understanding: {
            summary: understanding.resolvedNeed,
            likes: understanding.likes,
            avoids: understanding.avoids,
            hardConstraints: understanding.hardConstraints
        },
        recommendations
    };
}

async function handleRecommend(req, res) {
    try {
        const input = normalizeInput(await readJsonBody(req));
        if (!configuredKey('DEEPSEEK_API_KEY')) {
            const error = new Error('尚未配置 DEEPSEEK_API_KEY，已由前端切换到本地推荐');
            error.status = 503;
            throw error;
        }
        const understanding = await analyzeUserRequest(input);
        const mapCandidates = understanding.intent === 'chat' ? [] : await searchOpenStreetMap(input, understanding);
        const candidates = personalizeCandidates(input, understanding, mergeCandidates(input.localCandidates, mapCandidates));
        if (understanding.intent !== 'chat' && !candidates.length) {
            return json(res, 422, { message: '没有找到满足这些约束的地图候选点，请换个区域或放宽一个条件' });
        }
        const modelResult = await rankAndAnswer(input, understanding, candidates);
        json(res, 200, normalizeModelResult(modelResult, candidates, understanding));
    } catch (error) {
        const status = Number(error.status) || (/请求|输入|记忆库/.test(error.message) ? 400 : 500);
        console.error(`[recommend] ${error.message}`);
        json(res, status, { message: cleanText(error.message || '推荐服务暂不可用', 260) });
    }
}

/* ==================== 高德地图代理（Web 服务 Key 藏在后端） ==================== */
const AMAP_WEB_KEY = process.env.AMAP_WEB_KEY || '';
// 内存缓存：搜索配额仅 5000 次/月，相同请求短时间内直接返回缓存
const amapCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 小时

function cacheGet(key) {
    const item = amapCache.get(key);
    if (!item) return null;
    if (Date.now() - item.t > CACHE_TTL) { amapCache.delete(key); return null; }
    return item.v;
}
function cacheSet(key, val) { amapCache.set(key, { t: Date.now(), v: val }); }

async function proxyAmap(res, amapPath, params) {
    if (!AMAP_WEB_KEY) return json(res, 500, { message: '高德 Web 服务 Key 未配置，请在 .env 中设置 AMAP_WEB_KEY' });
    const qs = new URLSearchParams({ ...params, key: AMAP_WEB_KEY }).toString();
    const cacheKey = amapPath + '?' + qs;
    const cached = cacheGet(cacheKey);
    if (cached) return json(res, 200, cached);
    try {
        const r = await fetch(`https://restapi.amap.com${amapPath}?${qs}`, {
            headers: { 'User-Agent': 'Spatial-AI-Companion/2.0' }
        });
        const data = await r.json();
        if (data.status === '1' || data.infocode === '10000') cacheSet(cacheKey, data);
        json(res, 200, data);
    } catch (e) {
        console.error(`[amap] ${amapPath}: ${e.message}`);
        json(res, 502, { message: '高德接口请求失败', status: '0' });
    }
}

function handleAmap(req, res, url) {
    const p = url.pathname;
    const q = url.searchParams;
    if (p === '/api/amap/place/text') {
        return proxyAmap(res, '/v3/place/text', {
            keywords: q.get('keywords') || '',
            city: q.get('city') || '北京',
            citylimit: q.get('citylimit') || 'true',
            offset: q.get('offset') || '10',
            page: q.get('page') || '1'
        });
    }
    if (p === '/api/amap/place/around') {
        return proxyAmap(res, '/v3/place/around', {
            location: q.get('location') || '',
            radius: q.get('radius') || '3000',
            types: q.get('types') || '',
            offset: q.get('offset') || '20'
        });
    }
    if (p === '/api/amap/geocode') {
        return proxyAmap(res, '/v3/geocode/geo', {
            address: q.get('address') || '',
            city: q.get('city') || '北京'
        });
    }
    if (p === '/api/amap/direction/walking') {
        return proxyAmap(res, '/v3/direction/walking', {
            origin: q.get('origin') || '',
            destination: q.get('destination') || ''
        });
    }
    if (p === '/api/amap/direction/driving') {
        return proxyAmap(res, '/v3/direction/driving', {
            origin: q.get('origin') || '',
            destination: q.get('destination') || '',
            strategy: q.get('strategy') || '0'
        });
    }
    json(res, 404, { message: '未知的高德接口' });
}

/* ==================== 百度地图（第二信息源，双源核验） ==================== */
const BAIDU_MAP_AK = process.env.BAIDU_MAP_AK || '';

// BD-09 转 GCJ-02（百度坐标 → 高德坐标）
function bd09ToGcj02(bd_lng, bd_lat) {
    const x = bd_lng - 0.0065, y = bd_lat - 0.006;
    const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * Math.PI * 3000.0 / 180.0);
    const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * Math.PI * 3000.0 / 180.0);
    return [z * Math.cos(theta), z * Math.sin(theta)];
}

// 计算两点间距离（米，近似）
function haversine(lng1, lat1, lng2, lat2) {
    const R = 6371000, toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

async function proxyBaidu(res, baiduPath, params) {
    if (!BAIDU_MAP_AK) return json(res, 500, { message: '百度地图 AK 未配置，请在 .env 中设置 BAIDU_MAP_AK' });
    const qs = new URLSearchParams({ ...params, ak: BAIDU_MAP_AK, output: 'json' }).toString();
    try {
        const r = await fetch(`https://api.map.baidu.com${baiduPath}?${qs}`, {
            headers: { 'User-Agent': 'Spatial-AI-Companion/2.0' }
        });
        const data = await r.json();
        json(res, 200, data);
    } catch (e) {
        console.error(`[baidu] ${baiduPath}: ${e.message}`);
        json(res, 502, { message: '百度接口请求失败', status: 1 });
    }
}

function handleBaidu(req, res, url) {
    const p = url.pathname;
    const q = url.searchParams;
    if (p === '/api/baidu/place/search') {
        return proxyBaidu(res, '/place/v2/search', {
            query: q.get('query') || '',
            region: q.get('region') || '北京',
            page_size: q.get('page_size') || '10',
            page_num: q.get('page_num') || '0'
        });
    }
    if (p === '/api/baidu/place/detail') {
        return proxyBaidu(res, '/place/v2/detail', {
            uid: q.get('uid') || '',
            scope: q.get('scope') || '2'
        });
    }
    json(res, 404, { message: '未知的百度接口' });
}

// 双源对比：给定地点名称，同时调高德和百度，返回矛盾标记
async function handleCompare(req, res, url) {
    const name = url.searchParams.get('name') || '';
    const city = url.searchParams.get('city') || '北京';
    if (!name) return json(res, 400, { message: '缺少 name 参数' });
    if (!AMAP_WEB_KEY) return json(res, 500, { message: '高德 Key 未配置' });

    const result = { name, source: 'amap+baidu', conflicts: [], amap: null, baidu: null };

    // 高德搜索
    try {
        const amapQs = new URLSearchParams({ keywords: name, city, citylimit: 'true', offset: '1', key: AMAP_WEB_KEY }).toString();
        const ar = await fetch(`https://restapi.amap.com/v3/place/text?${amapQs}`);
        const ad = await ar.json();
        if (ad.pois && ad.pois.length) {
            const p = ad.pois[0];
            const [lng, lat] = p.location.split(',').map(Number);
            result.amap = {
                name: p.name, address: p.address || '',
                lng, lat, tel: p.tel || '', type: p.type || ''
            };
        }
    } catch (e) { result.conflicts.push({ type: 'amap_error', msg: '高德接口失败' }); }

    // 百度搜索（如果配置了 AK）
    if (BAIDU_MAP_AK) {
        try {
            const bdQs = new URLSearchParams({ query: name, region: city, page_size: '1', ak: BAIDU_MAP_AK, output: 'json' }).toString();
            const br = await fetch(`https://api.map.baidu.com/place/v2/search?${bdQs}`);
            const bd = await br.json();
            if (bd.results && bd.results.length) {
                const r = bd.results[0];
                const [gcjLng, gcjLat] = bd09ToGcj02(r.location.lng, r.location.lat);
                result.baidu = {
                    name: r.name, address: r.address || '',
                    lng: gcjLng, lat: gcjLat,
                    bdLng: r.location.lng, bdLat: r.location.lat,
                    telephone: r.telephone || '',
                    shopHours: r.detail_info?.shop_hours || ''
                };
            }
        } catch (e) { result.conflicts.push({ type: 'baidu_error', msg: '百度接口失败' }); }
    } else {
        result.conflicts.push({ type: 'no_baidu', msg: '百度 AK 未配置，仅返回高德数据' });
    }

    // 矛盾识别
    if (result.amap && result.baidu) {
        const dist = haversine(result.amap.lng, result.amap.lat, result.baidu.lng, result.baidu.lat);
        if (dist > 50) {
            result.conflicts.push({ type: 'location_mismatch', msg: `两源位置相差 ${Math.round(dist)} 米`, distance: Math.round(dist) });
        }
        const nameSim = similarity(result.amap.name, result.baidu.name);
        if (nameSim < 0.5) {
            result.conflicts.push({ type: 'name_mismatch', msg: `名称不一致：高德「${result.amap.name}」vs 百度「${result.baidu.name}」` });
        }
    }

    // 置信度
    let confidence = 'low';
    if (result.amap && result.baidu) {
        confidence = result.conflicts.length === 0 ? 'high' : 'medium';
    } else if (result.amap || result.baidu) {
        confidence = 'low';
    }
    result.confidence = confidence;
    result.fetched_at = new Date().toISOString();

    json(res, 200, result);
}

// 简单字符串相似度（Jaccard 系数）
function similarity(a, b) {
    if (!a || !b) return 0;
    const sa = new Set(a), sb = new Set(b);
    let inter = 0;
    sa.forEach(c => { if (sb.has(c)) inter++; });
    return inter / (sa.size + sb.size - inter);
}

/* ==================== OpenStreetMap Overpass（自然景观要素） ==================== */
// OSM 数据更新慢，缓存 24 小时；坐标按 0.01° 网格归并作为缓存键，减少重复请求
const osmCache = new Map();
const OSM_CACHE_TTL = 24 * 60 * 60 * 1000;
// 各节点独立限流：主节点快但偶发 504/429，mail.ru 慢但稳定，作为主兜底
const OVERPASS_ENDPOINTS = [
    { url: 'https://overpass-api.de/api/interpreter', retries: 2, timeoutMs: 25000 },
    { url: 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', retries: 2, timeoutMs: 45000 },
    { url: 'https://overpass.kumi.systems/api/interpreter', retries: 1, timeoutMs: 20000 },
    { url: 'https://overpass.private.coffee/api/interpreter', retries: 1, timeoutMs: 20000 }
];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function buildOverpassQL(lat, lng, radius) {
    const around = `around:${radius},${lat},${lng}`;
    return `[out:json][timeout:40];
(
  node(${around})[natural=peak];
  node(${around})[natural=spring];
  node(${around})[natural=water];
  way(${around})[natural=water];
  way(${around})[natural=wetland];
  way(${around})[natural=wood];
  way(${around})[landuse=forest];
  way(${around})[leisure=park];
  way(${around})[boundary=protected_area];
  way(${around})["waterway"~"stream|river|canal"];
  way(${around})["highway"~"path|track|footway"]["name"];
  way(${around})["highway"~"path|track"]["sac_scale"];
);
out geom tags 400;`;
}

async function queryOverpass(ql) {
    let lastErr = null;
    for (const ep of OVERPASS_ENDPOINTS) {
        for (let attempt = 1; attempt <= ep.retries; attempt++) {
            try {
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), ep.timeoutMs || 30000);
                const r = await fetch(ep.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                        'User-Agent': 'Spatial-AI-Companion/2.0 (university dachuang project)'
                    },
                    body: 'data=' + encodeURIComponent(ql),
                    signal: ctrl.signal
                });
                clearTimeout(timer);
                if (!r.ok) { lastErr = new Error(`${ep.url} HTTP ${r.status}`); throw lastErr; }
                const data = await r.json();
                // 200 也可能带 remark 错误（如 504 网关超时被包成 JSON），按失败重试
                if (data.remark && (!Array.isArray(data.elements) || data.elements.length === 0)) {
                    lastErr = new Error(data.remark);
                    throw lastErr;
                }
                return data;
            } catch (e) {
                lastErr = e;
                if (attempt < ep.retries) await sleep(1200 * attempt);
            }
        }
    }
    throw lastErr || new Error('所有 Overpass 节点均不可用');
}

async function handleOsmNature(req, res, url) {
    const lat = parseFloat(url.searchParams.get('lat'));
    const lng = parseFloat(url.searchParams.get('lng'));
    let radius = parseInt(url.searchParams.get('radius') || '3000', 10);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return json(res, 400, { message: '缺少有效的 lat/lng 参数' });
    }
    radius = Math.max(500, Math.min(6000, radius));

    // 缓存键：坐标归并到约 1km 网格
    const gridLat = Math.round(lat * 100) / 100;
    const gridLng = Math.round(lng * 100) / 100;
    const cacheKey = `${gridLat},${gridLng},${radius}`;
    const cached = osmCache.get(cacheKey);
    if (cached && Date.now() - cached.t < OSM_CACHE_TTL) {
        return json(res, 200, { ...cached.v, cached: true });
    }

    try {
        const data = await queryOverpass(buildOverpassQL(lat, lng, radius));
        const elements = data.elements || [];
        // 分类统计（对应验证任务 V4：山峰/水体/步道/保护区）
        const counts = { peak: 0, water: 0, woodland: 0, park: 0, protectedArea: 0, trail: 0, waterway: 0, wetland: 0, spring: 0 };
        for (const e of elements) {
            const t = e.tags || {};
            if (t.natural === 'peak') counts.peak++;
            else if (t.natural === 'water') counts.water++;
            else if (t.natural === 'wetland') counts.wetland++;
            else if (t.natural === 'wood' || t.landuse === 'forest') counts.woodland++;
            else if (t.leisure === 'park') counts.park++;
            else if (t.boundary === 'protected_area') counts.protectedArea++;
            else if (t.waterway) counts.waterway++;
            else if (t.highway) counts.trail++;
            else if (t.natural === 'spring') counts.spring++;
        }
        const payload = {
            source: 'OpenStreetMap via Overpass',
            center: { lat, lng }, radius,
            total: elements.length,
            counts,
            elements,
            fetched_at: new Date().toISOString()
        };
        if (elements.length > 0) osmCache.set(cacheKey, { t: Date.now(), v: payload });
        json(res, 200, payload);
    } catch (e) {
        console.error(`[osm] overpass: ${e.message}`);
        json(res, 502, { message: 'Overpass 请求失败（海外服务，可能需要稍后重试）', error: e.message });
    }
}

/* ==================== 和风天气 ==================== */
// 天气数据变化快，缓存 10 分钟；坐标按 0.05°（约 5km）网格归并，同一网格共享天气
const weatherCache = new Map();
const WEATHER_CACHE_TTL = 10 * 60 * 1000;
const QW_HOST = 'nd3tek87tx.re.qweatherapi.com'; // 项目专属 API 域名（控制台开发者信息页可查）

async function qwFetch(path) {
    const key = process.env.QWEATHER_KEY;
    const r = await fetch(`https://${QW_HOST}${path}${path.includes('?') ? '&' : '?'}key=${key}`, {
        signal: AbortSignal.timeout(10000)
    });
    const data = await r.json().catch(() => null);
    if (!r.ok || !data) throw new Error(`和风接口错误 HTTP ${r.status}`);
    if (data.code && data.code !== '200') throw new Error(`和风返回错误码 ${data.code}`);
    return data;
}

async function handleWeather(req, res, url) {
    const lat = parseFloat(url.searchParams.get('lat'));
    const lng = parseFloat(url.searchParams.get('lng'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return json(res, 400, { message: '缺少有效的 lat/lng 参数' });
    }
    if (!process.env.QWEATHER_KEY) {
        return json(res, 503, { message: '未配置 QWEATHER_KEY' });
    }
    const loc = `${lng.toFixed(2)},${lat.toFixed(2)}`; // 和风天气接口用 经度,纬度
    const cacheKey = `${Math.round(lat * 20) / 20},${Math.round(lng * 20) / 20}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.t < WEATHER_CACHE_TTL) {
        return json(res, 200, { ...cached.v, cached: true });
    }

    try {
        // 空气质量新接口用 /{lat}/{lon} 路径参数，和天气接口不同；失败时降级为 null 不阻塞天气主体
        const [now, hourly, air, indices] = await Promise.all([
            qwFetch(`/v7/weather/now?location=${loc}`),
            qwFetch(`/v7/weather/24h?location=${loc}`),
            qwFetch(`/airquality/v1/current/${lat.toFixed(2)}/${lng.toFixed(2)}`).catch(() => null),
            qwFetch(`/v7/indices/1d?type=5,8&location=${loc}`).catch(() => null)
        ]);
        const aqiIndex = air && Array.isArray(air.indexes)
            ? (air.indexes.find(i => i.code === 'cn-mee') || air.indexes[0])
            : null;
        const payload = {
            source: 'QWeather 和风天气',
            now: {
                temp: Number(now.now.temp),
                feelsLike: Number(now.now.feelsLike),
                text: now.now.text,
                icon: now.now.icon,
                humidity: Number(now.now.humidity),
                windDir: now.now.windDir,
                windScale: now.now.windScale,
                obsTime: now.now.obsTime
            },
            hourly: (hourly.hourly || []).slice(0, 8).map(h => ({
                time: h.fxTime,
                temp: Number(h.temp),
                text: h.text,
                icon: h.icon
            })),
            air: aqiIndex ? {
                aqi: aqiIndex.aqi,
                category: aqiIndex.category,
                primary: aqiIndex.primaryPollutant ? aqiIndex.primaryPollutant.name : ''
            } : null,
            indices: (indices && indices.daily ? indices.daily : []).map(d => ({
                type: d.type, name: d.name, category: d.category, text: d.text
            })),
            fetched_at: new Date().toISOString()
        };
        weatherCache.set(cacheKey, { t: Date.now(), v: payload });
        json(res, 200, payload);
    } catch (e) {
        console.error(`[weather] qweather: ${e.message}`);
        json(res, 502, { message: '天气服务暂时不可用', error: e.message });
    }
}

function serveStatic(req, res) {
    const requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
    if (relative.startsWith('.') || relative.split(/[\\/]/).some(part => part.startsWith('.'))) {
        res.writeHead(404); res.end('Not Found'); return;
    }
    const filePath = path.resolve(ROOT, relative);
    if (!filePath.startsWith(ROOT + path.sep) || !MIME_TYPES[path.extname(filePath).toLowerCase()]) {
        res.writeHead(404); res.end('Not Found'); return;
    }
    fs.stat(filePath, (error, stat) => {
        if (error || !stat.isFile()) { res.writeHead(404); res.end('Not Found'); return; }
        res.writeHead(200, {
            'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()],
            'Cache-Control': 'no-cache'
        });
        fs.createReadStream(filePath).pipe(res);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/api/health') {
        return json(res, 200, {
            ok: true,
            deepSeekConfigured: Boolean(configuredKey('DEEPSEEK_API_KEY')),
            model: DEEPSEEK_MODEL,
            analysisModel: DEEPSEEK_ANALYSIS_MODEL
        });
    }
    if (req.method === 'POST' && url.pathname === '/api/recommend') return handleRecommend(req, res);
    if (req.method === 'GET' && url.pathname.startsWith('/api/amap/')) return handleAmap(req, res, url);
    if (req.method === 'GET' && url.pathname.startsWith('/api/baidu/')) return handleBaidu(req, res, url);
    if (req.method === 'GET' && url.pathname === '/api/osm/nature') return handleOsmNature(req, res, url);
    if (req.method === 'GET' && url.pathname === '/api/weather') return handleWeather(req, res, url);
    if (req.method === 'GET' && url.pathname === '/api/compare') return handleCompare(req, res, url);
    if (req.method === 'GET' && url.pathname === '/api/config') {
        return json(res, 200, {
            tiandituKey: process.env.TIANDITU_KEY || '',
            supabaseUrl: process.env.SUPABASE_URL || '',
            supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
        });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405); res.end('Method Not Allowed'); return;
    }
    serveStatic(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Spatial AI Companion: http://127.0.0.1:${PORT}`);
    console.log(`DeepSeek: ${configuredKey('DEEPSEEK_API_KEY') ? `已配置（${DEEPSEEK_MODEL}）` : '未配置，将使用前端本地降级推荐'}`);
});
