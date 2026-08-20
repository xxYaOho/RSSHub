import type { FC, PropsWithChildren } from 'hono/jsx';

import { locallyModifiedNamespaces, selfDevelopedNamespaces } from '@/custom-namespaces';
import type { NamespacesType } from '@/registry-helpers';
import type { Route } from '@/types';
import { Layout } from '@/views/layout';

const Badge: FC<{ label: string; tone?: 'warn' | 'ok' }> = ({ label, tone = 'ok' }) => (
    <span
        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
            tone === 'warn' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        }`}
    >
        {label}
    </span>
);

const FeatureBadges: FC<{ route: Route }> = ({ route }) => {
    const f = route.features;
    if (!f) {
        return null;
    }
    const badges: Array<{ label: string; tone: 'warn' | 'ok' }> = [];
    if (f.requireConfig && f.requireConfig.length > 0) {
        badges.push({ label: `需要配置 ${f.requireConfig.map((c) => c.name).join(', ')}`, tone: 'warn' });
    }
    if (f.requirePuppeteer) {
        badges.push({ label: '需要 Puppeteer', tone: 'warn' });
    }
    if (f.antiCrawler) {
        badges.push({ label: '反爬严格', tone: 'warn' });
    }
    if (f.supportRadar) {
        badges.push({ label: '支持 Radar', tone: 'ok' });
    }
    if (f.supportBT) {
        badges.push({ label: '支持 BT', tone: 'ok' });
    }
    if (f.supportPodcast) {
        badges.push({ label: '支持播客', tone: 'ok' });
    }
    if (f.supportScihub) {
        badges.push({ label: '支持 Sci-Hub', tone: 'ok' });
    }
    if (badges.length === 0) {
        return null;
    }
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {badges.map((b) => (
                <Badge label={b.label} tone={b.tone} />
            ))}
        </div>
    );
};

const ParametersTable: FC<{ route: Route }> = ({ route }) => {
    if (!route.parameters || Object.keys(route.parameters).length === 0) {
        return null;
    }
    return (
        <div className="mt-3">
            <p className="text-sm font-bold mb-1">参数</p>
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700 text-left text-zinc-500 dark:text-zinc-400">
                        <th className="py-1 pr-4 font-medium w-32">名称</th>
                        <th className="py-1 font-medium">说明</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(route.parameters).map(([key, value]) => {
                        const detail = typeof value === 'string' ? { description: value } : value;
                        return (
                            <tr className="border-b border-zinc-100 dark:border-zinc-800 align-top">
                                <td className="py-1.5 pr-4">
                                    <code className="text-[#F5712C]">{key}</code>
                                </td>
                                <td className="py-1.5">
                                    {detail.description}
                                    {detail.default !== undefined && <span className="text-zinc-500 dark:text-zinc-400">，默认 {detail.default}</span>}
                                    {detail.options && detail.options.length > 0 && <span className="text-zinc-500 dark:text-zinc-400">，可选：{detail.options.map((o) => `${o.value}（${o.label}）`).join('、')}</span>}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const RadarRules: FC<{ route: Route }> = ({ route }) => {
    const rules = (route.radar ?? []).filter((r) => typeof r.target === 'string' || r.target === undefined);
    if (rules.length === 0) {
        return null;
    }
    return (
        <div className="mt-3 text-sm">
            <p className="font-bold mb-1">Radar 规则</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-600 dark:text-zinc-300">
                {rules.map((r) => (
                    <li>
                        {r.title ? `${r.title}：` : ''}
                        <code>{r.source.join(', ')}</code>
                        {typeof r.target === 'string' && (
                            <>
                                {' → '}
                                <code>{r.target}</code>
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

const RouteCard: FC<{ namespace: string; path: string; route: Route }> = ({ namespace, path, route }) => {
    const fullPath = `/${namespace}${path}`;
    const example = route.example ?? fullPath;
    return (
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800/50">
            <div className="flex flex-wrap items-baseline gap-x-3">
                <h3 className="text-lg font-bold">{route.name}</h3>
                <code className="text-sm text-[#F5712C]">{fullPath}</code>
            </div>
            <FeatureBadges route={route} />
            <ParametersTable route={route} />
            {route.description && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{route.description}</p>}
            <RadarRules route={route} />
            <p className="mt-3 text-sm">
                举例：
                <a className="text-[#F5712C] underline break-all" href={example} target="_blank">
                    {example}
                </a>
            </p>
        </div>
    );
};

const FeatureCard: FC<PropsWithChildren<{ title: string; badge?: string }>> = ({ title, badge, children }) => (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800/50">
        <div className="flex flex-wrap items-baseline gap-x-3">
            <h3 className="text-lg font-bold">{title}</h3>
            {badge && <code className="text-sm text-[#F5712C]">{badge}</code>}
        </div>
        {children}
    </div>
);

const translateParams: Array<{ param: string; name: string; note: string; env?: string }> = [
    {
        param: '?autots',
        name: '智能切换（推荐）',
        note: '优先本地模型 Hy-MT2（仅 cn），失败回退 chatgpt。语言代码：cn/zh（默认，简体中文）、jp/ja、en、ko、fr、de，如 ?autots=jp。',
        env: '依赖 chatgpt 与 Hy-MT2 的配置',
    },
    {
        param: '?chatgpt',
        name: 'DeepSeek / OpenAI',
        note: '整篇一次性翻译，速度快。',
        env: 'OPENAI_API_ENDPOINT / OPENAI_API_KEY / OPENAI_MODEL，回退：OPENAI_FALLBACK_*',
    },
    {
        param: '?translategemma',
        name: 'TranslateGemma-12b（LM Studio）',
        note: '按段落/标题/列表分段翻译，保留 HTML 结构；默认英译中，=jp 等指定目标语言。',
        env: 'TRANSLATE_GEMMA_*（endpoint 必须带 /v1 后缀）',
    },
    {
        param: '?translatehymt',
        name: 'Hy-MT2（LM Studio）',
        note: '固定译中文。',
        env: 'TRANSLATE_HYMT_*',
    },
    {
        param: '?llmgemma',
        name: '通用 LLM',
        note: '整篇翻译，=jp 等指定目标语言。',
    },
];

const Dashboard: FC<{ namespaces: NamespacesType; initialTab?: string }> = ({ namespaces, initialTab }) => {
    const sections = selfDevelopedNamespaces.map((ns) => ({ key: ns, data: namespaces[ns] })).filter((s) => s.data);
    const routeCount = sections.reduce((n, s) => n + Object.keys(s.data!.routes ?? {}).length, 0);
    const featureCount = 1 + locallyModifiedNamespaces.length;
    const showFeatures = initialTab === 'features';
    const chipActive = 'bg-[#F5712C] text-white';
    const chipInactive = 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300';

    return (
        <Layout title="RSSHub Dashboard - 自定义路由与功能">
            <div className="w-full max-w-6xl mx-auto px-6 py-8 grow">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold">
                        自定义路由与功能 <span className="text-[#F5712C]">Dashboard</span>
                    </h1>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">本实例自开发的内容。官方文档（上游路由）请访问 docs.rsshub.app。</p>
                </header>

                <nav className="flex gap-2 mb-8">
                    <button data-chip="routes" className={`dashboard-chip text-sm font-medium px-4 py-1.5 rounded-full transition-colors ${showFeatures ? chipInactive : chipActive}`}>
                        路由 · {routeCount}
                    </button>
                    <button data-chip="features" className={`dashboard-chip text-sm font-medium px-4 py-1.5 rounded-full transition-colors ${showFeatures ? chipActive : chipInactive}`}>
                        功能 · {featureCount}
                    </button>
                </nav>

                <div id="panel-routes" className={`flex gap-8 items-start ${showFeatures ? 'hidden' : ''}`}>
                    <aside className="hidden lg:block w-52 shrink-0 sticky top-8 text-sm space-y-1">
                        <p className="font-bold mb-2 text-zinc-500 dark:text-zinc-400">命名空间</p>
                        {sections.map((s) => (
                            <a href={`#ns-${s.key}`} className="block py-0.5 text-zinc-600 dark:text-zinc-300 hover:text-[#F5712C]">
                                {s.data!.name} <span className="text-zinc-400 dark:text-zinc-500">/{s.key}</span>
                            </a>
                        ))}
                    </aside>
                    <main className="grow min-w-0 space-y-10">
                        {sections.map((s) => (
                            <section id={`ns-${s.key}`}>
                                <h2 className="text-2xl font-bold border-b border-zinc-200 dark:border-zinc-700 pb-2 mb-1">
                                    {s.data!.name} <code className="text-base text-[#F5712C]">/{s.key}</code>
                                </h2>
                                {s.data!.url && (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                                        来源：
                                        <a className="underline" href={`https://${s.data!.url}`} target="_blank">
                                            {s.data!.url}
                                        </a>
                                    </p>
                                )}
                                {s.data!.description && <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap mb-2">{s.data!.description}</p>}
                                <div className="space-y-4 mt-4">
                                    {Object.entries(s.data!.routes ?? {}).map(([path, route]) => (
                                        <RouteCard namespace={s.key} path={path} route={route} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </main>
                </div>

                <div id="panel-features" className={`${showFeatures ? '' : 'hidden'} flex gap-8 items-start`}>
                    <aside className="hidden lg:block w-52 shrink-0 sticky top-8 text-sm space-y-1">
                        <p className="font-bold mb-2 text-zinc-500 dark:text-zinc-400">功能</p>
                        <a href="#feat-translation" className="block py-0.5 text-zinc-600 dark:text-zinc-300 hover:text-[#F5712C]">
                            双语翻译
                        </a>
                        {locallyModifiedNamespaces.map((m) => (
                            <a href={`#feat-mod-${m.namespace}`} className="block py-0.5 text-zinc-600 dark:text-zinc-300 hover:text-[#F5712C]">
                                本地修改 <span className="text-zinc-400 dark:text-zinc-500">/{m.namespace}</span>
                            </a>
                        ))}
                    </aside>
                    <main className="grow min-w-0 space-y-10">
                        <section id="feat-translation">
                            <h2 className="text-2xl font-bold border-b border-zinc-200 dark:border-zinc-700 pb-2 mb-1">
                                双语翻译 <code className="text-base text-[#F5712C]">?autots 等查询参数</code>
                            </h2>
                            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-2">
                                为任意路由追加查询参数即可启用翻译，常配合 <code>/proxy/rss</code>（外部 RSS 透传）使用。首次翻译结果会缓存，后续请求直接命中；翻译期间同一 path 的无参请求最多阻塞 60 秒，建议配 <code>limit=1</code>{' '}
                                减少翻译量。
                            </p>
                            <div className="space-y-4 mt-4">
                                {translateParams.map((t) => (
                                    <FeatureCard title={t.name} badge={t.param}>
                                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{t.note}</p>
                                        {t.env && (
                                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                环境变量：<code>{t.env}</code>
                                            </p>
                                        )}
                                        <p className="mt-3 text-sm">
                                            举例：
                                            <a className="text-[#F5712C] underline break-all" href={`/chatgpt/changelog${t.param}`} target="_blank">
                                                /chatgpt/changelog{t.param}
                                            </a>
                                        </p>
                                    </FeatureCard>
                                ))}
                            </div>
                        </section>

                        {locallyModifiedNamespaces.map((m) => (
                            <section id={`feat-mod-${m.namespace}`}>
                                <h2 className="text-2xl font-bold border-b border-zinc-200 dark:border-zinc-700 pb-2 mb-1">
                                    上游路由本地修改 <code className="text-base text-[#F5712C]">/{m.namespace}</code>
                                </h2>
                                <div className="space-y-4 mt-4">
                                    <FeatureCard title={`/${m.namespace} 改动说明`}>
                                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{m.note}</p>
                                    </FeatureCard>
                                </div>
                            </section>
                        ))}
                    </main>
                </div>
            </div>
            <script
                dangerouslySetInnerHTML={{
                    __html: `
document.querySelectorAll('.dashboard-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
        var target = chip.getAttribute('data-chip');
        document.getElementById('panel-routes').classList.toggle('hidden', target !== 'routes');
        document.getElementById('panel-features').classList.toggle('hidden', target !== 'features');
        document.querySelectorAll('.dashboard-chip').forEach(function (c) {
            var active = c.getAttribute('data-chip') === target;
            c.classList.toggle('bg-[#F5712C]', active);
            c.classList.toggle('text-white', active);
            c.classList.toggle('bg-zinc-200', !active);
            c.classList.toggle('text-zinc-600', !active);
            c.classList.toggle('dark:bg-zinc-700', !active);
            c.classList.toggle('dark:text-zinc-300', !active);
        });
    });
});
`,
                }}
            />
        </Layout>
    );
};

export default Dashboard;
