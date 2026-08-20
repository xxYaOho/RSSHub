import type { Handler } from 'hono';

import type { NamespacesType } from '@/registry-helpers';
import Dashboard from '@/views/dashboard';

/**
 * /dashboard 页面 handler 工厂。
 * 由 registry.ts 注入 namespaces 访问器，避免 routes → registry 的循环依赖。
 */
export const createDashboardHandler = (getNamespaces: () => NamespacesType, ensureLoaded: () => Promise<void>): Handler => {
    const handler: Handler = async (ctx) => {
        await ensureLoaded();
        ctx.header('Cache-Control', 'no-cache');
        return ctx.html(<Dashboard namespaces={getNamespaces()} initialTab={ctx.req.query('tab')} />);
    };
    return handler;
};
