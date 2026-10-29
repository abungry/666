// 作者：周梓润
// PM2 进程守护配置：云服务器上用 `pm2 start ecosystem.config.js` 启动
module.exports = {
    apps: [{
        name: 'spatial-ai-companion',
        script: 'server.js',
        // 必须单进程：server.js 用内存 Map 缓存高德/OSM/天气结果，
        // cluster 多进程会让缓存分裂，且成倍消耗高德 5000 次/月配额
        instances: 1,
        exec_mode: 'fork',
        autorestart: true,
        max_memory_restart: '512M',
        env: {
            NODE_ENV: 'production'
        },
        out_file: './logs/out.log',
        error_file: './logs/error.log',
        merge_logs: true,
        time: true
    }]
};
