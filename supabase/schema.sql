-- 在 Supabase SQL Editor 里整段执行。幂等，可重复运行。
-- 作者：周梓润
--
-- ============================================================
-- 【执行顺序很重要】
-- 先在控制台开启匿名登录（Authentication → Sign In / Up → Anonymous sign-ins），
-- 确认前端已更新到匿名登录版并刷新过页面，最后执行本脚本。
-- 执行后旧机制立即失效；若前端未就绪，云端读写会被拒并自动降级 localStorage。
-- ============================================================
--
-- 安全模型（匿名登录方案）：
--   前端通过 supabaseClient.auth.signInAnonymously() 获得真实 JWT，
--   RLS 策略用 auth.uid() 做行级隔离，身份由 Supabase Auth 签发，不可伪造。
--   前提：控制台 Authentication → Sign In / Up → 开启 Anonymous sign-ins。
--   注意：本脚本执行后，旧 x-sac-uid 请求头方案即刻失效。

create table if not exists public.profiles (
    user_id text primary key,
    username text,
    avatar text,
    age int,
    gender text,
    activity_tags text[] default '{}',
    location_label text,
    updated_at timestamptz default now()
);

create table if not exists public.favorites (
    user_id text not null,
    place_name text not null,
    place_lat double precision,
    place_lng double precision,
    place_type text,
    source text,
    fetched_at timestamptz default now(),
    primary key (user_id, place_name)
);

create table if not exists public.search_memories (
    user_id text not null,
    keyword text not null,
    priority int default 2,
    count int default 1,
    preference text default 'like',
    last_used timestamptz default now(),
    primary key (user_id, keyword)
);

alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.search_memories enable row level security;

-- 清掉全部旧策略（放开式 + 请求头式）
drop policy if exists profiles_anon_all on public.profiles;
drop policy if exists favorites_anon_all on public.favorites;
drop policy if exists memories_anon_all on public.search_memories;
drop policy if exists profiles_owner on public.profiles;
drop policy if exists favorites_owner on public.favorites;
drop policy if exists memories_owner on public.search_memories;
drop function if exists public.sac_uid();

-- JWT 行级隔离：只能读写 auth.uid() 对应的行；未登录（无 JWT）一律拒绝
create policy profiles_owner on public.profiles
    for all to anon, authenticated
    using (user_id = auth.uid()::text)
    with check (user_id = auth.uid()::text);

create policy favorites_owner on public.favorites
    for all to anon, authenticated
    using (user_id = auth.uid()::text)
    with check (user_id = auth.uid()::text);

create policy memories_owner on public.search_memories
    for all to anon, authenticated
    using (user_id = auth.uid()::text)
    with check (user_id = auth.uid()::text);

-- 历史遗留的 SAC_GUEST 与随机访客 ID 行在新策略下无人可访问（自动封存）。
-- 确认前端跑通后可清理：
--   delete from public.profiles where user_id not in (select id::text from auth.users);
--   delete from public.favorites where user_id not in (select id::text from auth.users);
--   delete from public.search_memories where user_id not in (select id::text from auth.users);
