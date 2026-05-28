export function toPowerOfTwo(n: number): number {
    if (n <= 0) return 1;
    const exp = Math.ceil(Math.log2(n));
    return 2 ** exp;
}
