export const RepoOwner = 'MerinPrime';
export const RepoName = 'GraphDLC';
export const Repository = `https://github.com/${RepoOwner}/${RepoName}`;
export const RepoLatestApiRelease = `https://api.github.com/repos/${RepoOwner}/${RepoName}/releases/latest`;
export const RepoLatestRelease =
    'https://github.com/MerinPrime/GraphDLC/releases/latest';

export async function fetchLatestVersion(): Promise<string> {
    const response = await fetch(RepoLatestApiRelease);

    if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}`);
    }

    const data: { tag_name: string } = await response.json();
    return data.tag_name;
}

export function compareVersions(a: string, b: string): number {
    const parse = (version: string) =>
        version.replace(/^v/, '').split('.').map(Number);

    const va = parse(a);
    const vb = parse(b);

    const length = Math.max(va.length, vb.length);

    for (let i = 0; i < length; i++) {
        const na = va[i] ?? 0;
        const nb = vb[i] ?? 0;

        if (na > nb) return 1;
        if (na < nb) return -1;
    }

    return 0;
}
