/* ============================================================
   Spatial AI Companion - 登录注册功能
   ============================================================ */

/* -------- Feature 详情数据 -------- */
const FEATURE_DATA = {
    'remote-sensing': {
        icon: 'fa-satellite',
        iconBg: 'linear-gradient(135deg, #6366f1, #06b6d4)',
        title: '遥感环境感知',
        subtitle: 'Remote Sensing Perception',
        text: '利用多源卫星遥感数据，实时感知目标区域的植被覆盖（NDVI）、地表温度（LST）、水体分布、坡度坡向等关键环境指标。相比仅依赖 POI 标签，AI 能"看见"公园的真实绿度、湖泊的热岛效应强度，让推荐更精准。',
        metrics: [
            { value: 'NDVI', label: '植被指数' },
            { value: 'LST', label: '地表温度' },
            { value: 'DSM', label: '数字高程' }
        ],
        highlights: [
            'Landsat-8 / Sentinel-2 多光谱数据融合',
            '10m 分辨率下的植被精细分级',
            '热岛效应动态监测与温度反演',
            '北京市全域 45 个重点空间持续更新'
        ]
    },
    'multi-scene': {
        icon: 'fa-mountain-sun',
        iconBg: 'linear-gradient(135deg, #10b981, #06b6d4)',
        title: '多地理场景适配',
        subtitle: 'Multi-Geographic Scene Adaptation',
        text: '针对山地、湖泊、公园、胡同、商圈等不同空间类型，AI 自动切换匹配策略。香山的坡度权重更高，紫竹院的安静度是核心指标，玉渊潭的水体覆盖则决定推荐优先级——让每种空间都有专属评估体系。',
        metrics: [
            { value: '45+', label: '北京精选地点' },
            { value: '7', label: '地理场景类型' },
            { value: '20+', label: '特征维度' }
        ],
        highlights: [
            '山地场景：坡度 + 海拔 + 步道可通行性评估',
            '湖泊场景：水体占比 + 水岸线长度 + 热环境',
            '胡同/商圈：步行友好度 + 噪声级 + 人流密度',
            '统一评分引擎，场景间横向可比'
        ]
    },
    'personalized': {
        icon: 'fa-brain',
        iconBg: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
        title: '个性化空间推荐',
        subtitle: 'Personalized Spatial Recommendation',
        text: '系统会记住你的偏好——第一次你说"安静的绿地"，第二次你说"水边拍照"，AI 会综合两次偏好为你推荐两者兼具的地点。每次对话、每次收藏、每次点击，都会让 AI 更懂你。而且所有推荐都会附上理由，你能清楚知道为什么推荐这个地方。',
        metrics: [
            { value: '记忆', label: '偏好持续学习' },
            { value: '实时', label: '动态评分排序' },
            { value: '可解释', label: '推荐理由透明' }
        ],
        highlights: [
            '用户画像自动构建（性别/年龄/活动偏好）',
            'localStorage 本地持久化，跨会话保留记忆',
            '每次推荐附带：匹配维度 + 遥感指标 + 环境评分',
            '收藏地点同步更新偏好权重'
        ]
    }
};

let activeFeatureCard = null;

function showFeatureDetail(elem) {
    const key = elem.dataset.feature;
    const data = FEATURE_DATA[key];
    const card = document.getElementById('feature-detail-card');

    // 如果点击已激活的，折叠
    if (activeFeatureCard === key) {
        card.classList.remove('show');
        elem.classList.remove('active');
        activeFeatureCard = null;
        return;
    }

    // 先隐藏旧的
    card.classList.remove('show');
    document.querySelectorAll('.feature-item').forEach(e => e.classList.remove('active'));

    // 构建新内容
    setTimeout(() => {
        // 把卡片 DOM 移到当前 item 后面，实现"贴着展开"
        elem.parentNode.insertBefore(card, elem.nextSibling);

        card.innerHTML = `
        <div class="feature-detail-inner">
            <button class="feature-close-detail" onclick="closeFeatureDetail()"><i class="fas fa-times"></i></button>
            <div class="feature-detail-header">
                <div class="feature-detail-icon" style="background:${data.iconBg}"><i class="fas ${data.icon}"></i></div>
                <div>
                    <div class="feature-detail-title">${data.title}</div>
                    <div class="feature-detail-desc">${data.subtitle}</div>
                </div>
            </div>
            <div class="feature-detail-body">
                <div class="feature-detail-text">${data.text}</div>
                <div class="feature-detail-metrics">
                    ${data.metrics.map(m => `<div class="feature-metric">
                        <div class="feature-metric-value">${m.value}</div>
                        <div class="feature-metric-label">${m.label}</div>
                    </div>`).join('')}
                </div>
                <div class="feature-detail-highlights">
                    ${data.highlights.map(h => `<div class="feature-highlight"><i class="fas fa-check-circle"></i> ${h}</div>`).join('')}
                </div>
            </div>
        </div>`;
        card.classList.add('show');
        elem.classList.add('active');
        activeFeatureCard = key;
    }, 200);
}

function closeFeatureDetail() {
    document.getElementById('feature-detail-card').classList.remove('show');
    document.querySelectorAll('.feature-item').forEach(e => e.classList.remove('active'));
    activeFeatureCard = null;
}

/* -------- Toast 提示 -------- */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* -------- 用户数据存储（localStorage 模拟） -------- */
const UserDB = {
    getUsers() {
        return JSON.parse(localStorage.getItem('sac_users') || '[]');
    },
    saveUsers(users) {
        localStorage.setItem('sac_users', JSON.stringify(users));
    },
    findByPhone(phone) {
        return this.getUsers().find(u => u.phone === phone);
    },
    findByAccount(account) {
        return this.getUsers().find(u =>
            u.phone === account || u.username === account || u.id === account
        );
    },
    addUser(user) {
        const users = this.getUsers();
        users.push(user);
        this.saveUsers(users);
    },
    isUsernameTaken(username) {
        return this.getUsers().some(u => u.username === username);
    },
    isPhoneTaken(phone) {
        return this.getUsers().some(u => u.phone === phone);
    }
};

/* 生成用户 ID 格式：SAC + 年份后两位 + 随机6位 */
function generateUserId() {
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(100000 + Math.random() * 900000);
    return `SAC${year}${random}`;
}

/* 生成验证码 */
function generateSmsCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/* 手机号脱敏显示 */
function maskPhone(phone) {
    if (phone.length !== 11) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(7);
}

/* -------- Tab 切换 -------- */
const tabBtns = document.querySelectorAll('.tab-btn');
const tabHeader = document.querySelector('.tab-header');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabHeader.dataset.active = tab;
        loginForm.classList.toggle('active', tab === 'login');
        registerForm.classList.toggle('active', tab === 'register');
    });
});

/* -------- 登录方式切换 -------- */
const methodBtns = document.querySelectorAll('.method-btn');
const pwdFields = document.querySelector('.login-password-fields');
const smsFields = document.querySelector('.login-sms-fields');

methodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const method = btn.dataset.method;
        methodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        pwdFields.classList.toggle('active', method === 'password');
        smsFields.classList.toggle('active', method === 'sms');
    });
});

/* -------- 密码可见切换 -------- */
document.querySelectorAll('.toggle-pwd').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
});

/* -------- 验证码发送倒计时 -------- */
function startCountdown(btn, seconds = 60) {
    let count = seconds;
    btn.disabled = true;
    btn.textContent = `重新发送(${count}s)`;
    const timer = setInterval(() => {
        count--;
        if (count <= 0) {
            clearInterval(timer);
            btn.disabled = false;
            btn.textContent = '获取验证码';
        } else {
            btn.textContent = `重新发送(${count}s)`;
        }
    }, 1000);
    return timer;
}

/* 存储当前验证码（演示用） */
let currentSmsCode = null;
let loginSmsCode = null;

/* 登录页发送验证码 */
document.getElementById('login-send-code').addEventListener('click', () => {
    const phone = document.getElementById('login-phone-sms').value.trim();
    if (!/^1[3-9]\d{9}$/.test(phone)) {
        showToast('请输入正确的手机号', 'warning');
        return;
    }
    const user = UserDB.findByPhone(phone);
    if (!user) {
        showToast('该手机号尚未注册', 'error');
        return;
    }
    loginSmsCode = generateSmsCode();
    showToast(`【演示】验证码：${loginSmsCode}`, 'info');
    startCountdown(document.getElementById('login-send-code'));
});

/* -------- 登录提交 -------- */
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const method = document.querySelector('.method-btn.active').dataset.method;

    if (method === 'password') {
        // 密码登录
        const account = document.getElementById('login-account').value.trim();
        const password = document.getElementById('login-password').value;
        if (!account) { showToast('请输入账号', 'warning'); return; }
        if (!password) { showToast('请输入密码', 'warning'); return; }

        const user = UserDB.findByAccount(account);
        if (!user) {
            showToast('账号不存在，请先注册', 'error');
            return;
        }
        if (user.password !== password) {
            showToast('密码错误', 'error');
            return;
        }
        loginSuccess(user);
    } else {
        // 验证码登录
        const phone = document.getElementById('login-phone-sms').value.trim();
        const code = document.getElementById('login-sms-code').value.trim();
        if (!/^1[3-9]\d{9}$/.test(phone)) { showToast('请输入正确的手机号', 'warning'); return; }
        if (!code) { showToast('请输入验证码', 'warning'); return; }
        if (code !== loginSmsCode) { showToast('验证码错误或已过期', 'error'); return; }

        const user = UserDB.findByPhone(phone);
        if (!user) { showToast('该手机号尚未注册', 'error'); return; }
        loginSuccess(user);
    }
});

function loginSuccess(user) {
    localStorage.setItem('sac_current_user', JSON.stringify(user));
    showToast(`欢迎回来，${user.username}！`, 'success');

    // 检查该账号是否已完成引导
    let onboardingDone = {};
    try { onboardingDone = JSON.parse(localStorage.getItem('sac_onboarding_done') || '{}'); } catch {}
    const target = onboardingDone[user.id] ? 'main.html' : 'welcome.html';

    setTimeout(() => {
        showToast(onboardingDone[user.id] ? '登录成功，进入主界面...' : '登录成功，即将引导你设置...', 'success');
    }, 800);
    setTimeout(() => {
        window.location.href = target;
    }, 2000);
}

/* ============================================================
   注册流程
   ============================================================ */

/* 注册临时数据 */
const regData = {
    phone: '',
    code: '',
    password: '',
    username: '',
    captchaPassed: false
};

/* 步骤切换 */
function goToStep(step) {
    document.querySelectorAll('.register-step').forEach(s => s.classList.remove('active'));
    document.querySelector(`.register-step[data-step="${step}"]`).classList.add('active');

    // 更新进度指示
    document.querySelectorAll('.step-item').forEach((item, idx) => {
        const itemStep = parseInt(item.dataset.step);
        item.classList.remove('active', 'completed');
        if (itemStep < step) {
            item.classList.add('completed');
        } else if (itemStep === step) {
            item.classList.add('active');
        }
    });
    // 更新连接线
    document.querySelectorAll('.step-line').forEach((line, idx) => {
        line.classList.toggle('active', idx < step - 1);
    });
}

/* -------- Step 1: 手机号 + 人机验证 -------- */
const regPhoneInput = document.getElementById('reg-phone');

/* ============ 拼图人机验证 ============ */
const puzzleCanvas = document.getElementById('puzzle-canvas');
const pctx = puzzleCanvas.getContext('2d');
const puzzleHandle = document.getElementById('puzzle-handle');
const puzzleCaptchaBox = document.getElementById('puzzle-captcha');
const puzzleProgress = puzzleCaptchaBox.querySelector('.puzzle-progress');
const puzzleTrack = puzzleCaptchaBox.querySelector('.puzzle-track');
const puzzleTip = document.getElementById('puzzle-tip');
const puzzleRefresh = document.getElementById('puzzle-refresh');

const PIECE = 42;   // 拼图块边长
const PIECE_R = 9;  // 凸起半径
const TOLERANCE = 6; // 对齐容差（画布像素）

const puzzle = {
    targetX: 0, targetY: 0,
    pieceX: 0, maxX: 0,
    failCount: 0, bg: null
};

/* 绘制 GIS 地理主题背景（等高线 + 网格 + 地形 + 水体） */
function drawPuzzleBackground(ctx, w, h) {
    // 天地渐变
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1e3a8a');
    g.addColorStop(0.42, '#0e7490');
    g.addColorStop(0.68, '#047857');
    g.addColorStop(1, '#064e3b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // 经纬网格
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 26) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += 26) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // 等高线
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const baseY = 15 + Math.random() * (h - 30);
        const phase = Math.random() * Math.PI * 2;
        ctx.moveTo(-10, baseY);
        for (let x = -10; x <= w + 10; x += 8) {
            const y = baseY
                + Math.sin(x * 0.025 + phase) * (10 + Math.random() * 4)
                + Math.cos(x * 0.013 + i) * 7;
            ctx.lineTo(x, y);
        }
        const cc = [125, 211, 252];
        ctx.strokeStyle = `rgba(${cc[0]},${cc[1]},${cc[2]},${0.28 + Math.random() * 0.25})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
    }

    // 水体斑块
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(
            Math.random() * w, h * 0.6 + Math.random() * h * 0.35,
            18 + Math.random() * 28, 7 + Math.random() * 10,
            Math.random() * Math.PI, 0, Math.PI * 2
        );
        ctx.fillStyle = 'rgba(56,189,248,0.32)';
        ctx.fill();
    }

    // 地形高光点（植被/聚落实感）
    for (let i = 0; i < 50; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 0.8 + Math.random() * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(134,239,172,${0.15 + Math.random() * 0.4})`;
        ctx.fill();
    }
}

/* 拼图块路径（顶/底凸起，左/右凹进） */
function puzzlePath(ctx, x, y, size, r) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    // 顶边凸起
    ctx.lineTo(x + size / 2 - r, y);
    ctx.arc(x + size / 2, y, r, Math.PI, 0, false);
    ctx.lineTo(x + size, y);
    // 右边凹进
    ctx.lineTo(x + size, y + size / 2 - r);
    ctx.arc(x + size, y + size / 2, r, -Math.PI / 2, Math.PI / 2, true);
    ctx.lineTo(x + size, y + size);
    // 底边凸起
    ctx.lineTo(x + size / 2 + r, y + size);
    ctx.arc(x + size / 2, y + size, r, 0, Math.PI, false);
    ctx.lineTo(x, y + size);
    // 左边凹进
    ctx.lineTo(x, y + size / 2 + r);
    ctx.arc(x, y + size / 2, r, Math.PI / 2, -Math.PI / 2, true);
    ctx.closePath();
}

/* 生成一局新拼图 */
function generatePuzzle() {
    const w = puzzleCanvas.width, h = puzzleCanvas.height;
    puzzle.targetX = Math.floor(w * 0.55 + Math.random() * w * 0.3);
    puzzle.targetY = Math.floor(PIECE + Math.random() * (h - PIECE * 2 - PIECE_R));
    puzzle.pieceX = 0;
    puzzle.maxX = w - PIECE - PIECE_R - 2;

    const bg = document.createElement('canvas');
    bg.width = w; bg.height = h;
    drawPuzzleBackground(bg.getContext('2d'), w, h);
    puzzle.bg = bg;
    renderPuzzle();
}

/* 渲染拼图画面 */
function renderPuzzle() {
    const w = puzzleCanvas.width, h = puzzleCanvas.height;
    pctx.clearRect(0, 0, w, h);
    pctx.drawImage(puzzle.bg, 0, 0);

    // 缺口（阴影 + 亮边）
    pctx.save();
    puzzlePath(pctx, puzzle.targetX, puzzle.targetY, PIECE, PIECE_R);
    pctx.fillStyle = 'rgba(0,0,0,0.55)';
    pctx.fill();
    pctx.strokeStyle = 'rgba(255,255,255,0.75)';
    pctx.lineWidth = 1.5;
    pctx.stroke();
    pctx.restore();

    // 拼图块（从缺口位置切出的图像）
    pctx.save();
    puzzlePath(pctx, puzzle.pieceX, puzzle.targetY, PIECE, PIECE_R);
    pctx.shadowColor = 'rgba(0,0,0,0.5)';
    pctx.shadowBlur = 8;
    pctx.clip();
    pctx.drawImage(puzzle.bg, puzzle.pieceX - puzzle.targetX, 0);
    pctx.restore();

    pctx.save();
    puzzlePath(pctx, puzzle.pieceX, puzzle.targetY, PIECE, PIECE_R);
    pctx.strokeStyle = 'rgba(255,255,255,0.95)';
    pctx.lineWidth = 1.5;
    pctx.stroke();
    pctx.restore();
}

/* 拖动逻辑 */
let puzzleDragging = false;
let puzzleStartX = 0;
let puzzleHandleX = 0;

const puzzleTrackMax = () => puzzleTrack.offsetWidth - puzzleHandle.offsetWidth;

puzzleHandle.addEventListener('mousedown', puzzleStartDrag);
puzzleHandle.addEventListener('touchstart', puzzleStartDrag, { passive: false });
puzzleRefresh.addEventListener('click', () => {
    if (regData.captchaPassed) return;
    resetPuzzle();
    generatePuzzle();
});

function puzzleStartDrag(e) {
    if (regData.captchaPassed) return;
    e.preventDefault();
    puzzleDragging = true;
    puzzleStartX = (e.touches ? e.touches[0].clientX : e.clientX) - puzzleHandleX;
    document.addEventListener('mousemove', puzzleOnDrag);
    document.addEventListener('mouseup', puzzleEndDrag);
    document.addEventListener('touchmove', puzzleOnDrag, { passive: false });
    document.addEventListener('touchend', puzzleEndDrag);
}

function puzzleOnDrag(e) {
    if (!puzzleDragging) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    puzzleHandleX = Math.max(0, Math.min(puzzleTrackMax(), clientX - puzzleStartX));
    puzzleHandle.style.left = puzzleHandleX + 'px';
    puzzleProgress.style.width = (puzzleHandleX + puzzleHandle.offsetWidth) + 'px';
    puzzle.pieceX = (puzzleHandleX / puzzleTrackMax()) * puzzle.maxX;
    renderPuzzle();
}

function puzzleEndDrag() {
    if (!puzzleDragging) return;
    puzzleDragging = false;
    document.removeEventListener('mousemove', puzzleOnDrag);
    document.removeEventListener('mouseup', puzzleEndDrag);
    document.removeEventListener('touchmove', puzzleOnDrag);
    document.removeEventListener('touchend', puzzleEndDrag);
    if (regData.captchaPassed) return;

    const diff = Math.abs(puzzle.pieceX - puzzle.targetX);
    if (diff <= TOLERANCE) {
        // 对齐成功，吸附
        puzzleHandleX = (puzzle.targetX / puzzle.maxX) * puzzleTrackMax();
        puzzle.pieceX = puzzle.targetX;
        puzzleHandle.style.left = puzzleHandleX + 'px';
        puzzleProgress.style.width = (puzzleHandleX + puzzleHandle.offsetWidth) + 'px';
        renderPuzzle();
        puzzleSuccess();
    } else {
        puzzle.failCount++;
        puzzleTip.textContent = puzzle.failCount >= 3
            ? '未对齐，已自动换一张'
            : `拼图未对齐（偏差 ${Math.round(diff)}px），再试一次`;
        puzzleCaptchaBox.classList.add('fail');
        setTimeout(() => {
            puzzleCaptchaBox.classList.remove('fail');
            if (puzzle.failCount >= 3) {
                puzzle.failCount = 0;
                resetPuzzle();
                generatePuzzle();
            } else {
                springBack();
            }
        }, 450);
    }
}

function springBack() {
    puzzleHandleX = 0;
    puzzle.pieceX = 0;
    puzzleHandle.style.transition = 'left 0.3s ease';
    puzzleProgress.style.transition = 'width 0.3s ease';
    puzzleHandle.style.left = '0';
    puzzleProgress.style.width = '0';
    renderPuzzle();
    setTimeout(() => {
        puzzleHandle.style.transition = '';
        puzzleProgress.style.transition = '';
    }, 300);
}

function puzzleSuccess() {
    regData.captchaPassed = true;
    puzzleCaptchaBox.classList.add('success');
    puzzleHandle.innerHTML = '<i class="fas fa-check"></i>';
    puzzleTip.textContent = '验证通过';
    showToast('拼图验证通过', 'success');
}

function resetPuzzle() {
    puzzle.failCount = 0;
    puzzleHandleX = 0;
    puzzle.pieceX = 0;
    puzzleHandle.style.left = '0';
    puzzleProgress.style.width = '0';
    puzzleCaptchaBox.classList.remove('success', 'fail');
    puzzleHandle.innerHTML = '<i class="fas fa-puzzle-piece"></i>';
    puzzleTip.textContent = '拖动下方滑块，将拼图对齐缺口';
}

generatePuzzle();

/* Step 1 下一步 */
document.querySelector('[data-next="2"]').addEventListener('click', () => {
    const phone = regPhoneInput.value.trim();
    if (!/^1[3-9]\d{9}$/.test(phone)) {
        showToast('请输入正确的手机号', 'warning');
        return;
    }
    if (UserDB.isPhoneTaken(phone)) {
        showToast('该手机号已注册', 'error');
        return;
    }
    if (!regData.captchaPassed) {
        showToast('请先完成人机验证', 'warning');
        return;
    }
    regData.phone = phone;
    document.getElementById('phone-display').textContent = maskPhone(phone);

    // 发送验证码
    regData.code = generateSmsCode();
    showToast(`【演示】验证码：${regData.code}`, 'info');
    const sendBtn = document.getElementById('reg-send-code');
    startCountdown(sendBtn);
    goToStep(2);
});

/* -------- Step 2: 验证码 -------- */
document.querySelector('[data-back="1"]').addEventListener('click', () => goToStep(1));

document.querySelector('[data-next="3"]').addEventListener('click', () => {
    const code = document.getElementById('reg-code').value.trim();
    if (!code) { showToast('请输入验证码', 'warning'); return; }
    if (code !== regData.code) { showToast('验证码错误', 'error'); return; }
    goToStep(3);
});

/* 重发验证码 */
document.getElementById('reg-send-code').addEventListener('click', function() {
    if (this.disabled) return;
    regData.code = generateSmsCode();
    showToast(`【演示】验证码：${regData.code}`, 'info');
    startCountdown(this);
});

/* -------- Step 3: 设置密码 -------- */
document.querySelector('[data-back="2"]').addEventListener('click', () => goToStep(2));

const regPassword = document.getElementById('reg-password');
const regPasswordConfirm = document.getElementById('reg-password-confirm');
const strengthBars = document.querySelectorAll('.strength-bars .bar');
const strengthText = document.querySelector('.strength-text');
const pwdRules = document.querySelectorAll('.pwd-rules p');

/* 密码强度检测 */
function checkStrength(pwd) {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Za-z]/.test(pwd) && /\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
}

regPassword.addEventListener('input', () => {
    const pwd = regPassword.value;
    const score = checkStrength(pwd);
    const levels = ['弱', '一般', '较强', '强'];
    const colors = ['weak', 'medium', 'strong', 'strong'];

    strengthBars.forEach((bar, idx) => {
        bar.className = 'bar';
        if (idx < score) bar.classList.add('active', colors[score - 1]);
    });

    if (pwd.length === 0) {
        strengthText.textContent = '密码强度：弱';
    } else {
        strengthText.textContent = `密码强度：${levels[score - 1] || '弱'}`;
    }

    // 校验规则
    pwdRules[0].classList.toggle('valid', pwd.length >= 8);
    pwdRules[1].classList.toggle('valid', /[A-Za-z]/.test(pwd) && /\d/.test(pwd));
});

document.querySelector('[data-next="4"]').addEventListener('click', () => {
    const pwd = regPassword.value;
    const confirm = regPasswordConfirm.value;
    if (pwd.length < 8) { showToast('密码至少需要 8 位字符', 'warning'); return; }
    if (pwd !== confirm) { showToast('两次输入的密码不一致', 'error'); return; }
    regData.password = pwd;
    goToStep(4);
});

/* -------- Step 4: 设置用户名 -------- */
document.querySelector('[data-back="3"]').addEventListener('click', () => goToStep(3));

const regUsername = document.getElementById('reg-username');
const avatarLetter = document.getElementById('avatar-letter');
const previewName = document.getElementById('preview-name');

regUsername.addEventListener('input', () => {
    const name = regUsername.value.trim();
    avatarLetter.textContent = name.charAt(0).toUpperCase() || 'U';
    previewName.textContent = name || '用户名';
});

document.getElementById('finish-register').addEventListener('click', () => {
    const username = regUsername.value.trim();
    if (username.length < 2 || username.length > 16) {
        showToast('用户名长度需为 2-16 位', 'warning');
        return;
    }
    if (!/^[A-Za-z0-9_\u4e00-\u9fa5]+$/.test(username)) {
        showToast('用户名只能包含字母、数字、下划线和中文', 'warning');
        return;
    }
    if (UserDB.isUsernameTaken(username)) {
        showToast('该用户名已被使用', 'error');
        return;
    }
    regData.username = username;

    // 创建用户
    const userId = generateUserId();
    const newUser = {
        id: userId,
        username: regData.username,
        phone: regData.phone,
        password: regData.password,
        createdAt: new Date().toISOString()
    };
    UserDB.addUser(newUser);

    // 显示完成页
    document.getElementById('final-username').textContent = regData.username;
    document.getElementById('final-id').textContent = userId;
    document.getElementById('final-phone').textContent = maskPhone(regData.phone);
    document.getElementById('final-avatar').textContent = regData.username.charAt(0).toUpperCase();

    goToStep(5);
    showToast('注册成功！', 'success');
});

/* -------- Step 5: 前往登录 -------- */
document.querySelector('.go-login-btn').addEventListener('click', () => {
    // 切换到登录 Tab
    tabBtns[0].click();
    // 自动填入手机号
    document.getElementById('login-account').value = regData.phone;
    // 重置注册表单
    resetRegisterForm();
});

function resetRegisterForm() {
    goToStep(1);
    regData.phone = '';
    regData.code = '';
    regData.password = '';
    regData.username = '';
    regData.captchaPassed = false;
    document.getElementById('reg-phone').value = '';
    document.getElementById('reg-code').value = '';
    document.getElementById('reg-password').value = '';
    document.getElementById('reg-password-confirm').value = '';
    document.getElementById('reg-username').value = '';
    avatarLetter.textContent = 'U';
    previewName.textContent = '用户名';
    // 重置拼图验证
    resetPuzzle();
    generatePuzzle();
    // 重置密码强度
    strengthBars.forEach(b => b.className = 'bar');
    strengthText.textContent = '密码强度：弱';
    pwdRules.forEach(r => r.classList.remove('valid'));
}

/* -------- 初始化 -------- */
document.getElementById('login-account').value = '';
