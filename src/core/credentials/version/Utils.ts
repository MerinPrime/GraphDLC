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
    const parse = (version: string) => {
        const match = version.match(/^(\d+(?:\.\d+)*)(?:-test(\d+))?$/i);

        if (!match) {
            throw new Error(`Invalid version: ${version}`);
        }

        return {
            parts: match[1].split('.').map(Number),
            test: match[2] === undefined ? null : Number(match[2]),
        };
    };

    const left = parse(a);
    const right = parse(b);

    const length = Math.max(left.parts.length, right.parts.length);

    for (let i = 0; i < length; i++) {
        const leftPart = left.parts[i] ?? 0;
        const rightPart = right.parts[i] ?? 0;

        if (leftPart !== rightPart) {
            return leftPart - rightPart;
        }
    }

    if (left.test === null && right.test === null) {
        return 0;
    }

    if (left.test === null) {
        return 1;
    }

    if (right.test === null) {
        return -1;
    }

    return left.test - right.test;
}
