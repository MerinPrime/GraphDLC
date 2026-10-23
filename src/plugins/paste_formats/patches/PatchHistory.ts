import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from 'src/plugins/Patcher';

export const PatchHistory: IPatcher = (
    _patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(
        window.history,
    );

    let savedQuery = window.location.search;

    const mergeWithCurrentQuery = (
        url?: string | URL | null,
    ): string | URL | null | undefined => {
        if (url === null || url === undefined) {
            return url;
        }

        try {
            const urlStr = url.toString();
            const targetUrl = new URL(urlStr, window.location.href);

            const isMapRoute =
                targetUrl.pathname.startsWith('/map-') ||
                urlStr.startsWith('map-');

            if (!isMapRoute) {
                return url;
            }

            if (window.location.search) {
                savedQuery = window.location.search;
            }

            if (!savedQuery) {
                return url;
            }

            if (!targetUrl.search) {
                const query = savedQuery.startsWith('?')
                    ? savedQuery
                    : `?${savedQuery}`;
                return targetUrl.pathname + query + targetUrl.hash;
            }

            const newParams = new URLSearchParams(targetUrl.search);
            const oldParams = new URLSearchParams(savedQuery);
            const handledKeys = new Set<string>();

            oldParams.forEach((_, key) => {
                if (handledKeys.has(key)) return;
                handledKeys.add(key);

                if (!newParams.has(key)) {
                    for (const val of oldParams.getAll(key)) {
                        newParams.append(key, val);
                    }
                }
            });

            const finalSearch = `?${newParams.toString().replace(/%3A/gi, ':')}`;
            return targetUrl.pathname + finalSearch + targetUrl.hash;
        } catch {
            return url;
        }
    };

    window.history.pushState = (
        data: any,
        unused: string,
        url?: string | URL | null,
    ) => originalPushState(data, unused, mergeWithCurrentQuery(url));

    window.history.replaceState = (
        data: any,
        unused: string,
        url?: string | URL | null,
    ) => originalReplaceState(data, unused, mergeWithCurrentQuery(url));
};
