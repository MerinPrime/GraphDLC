export function removeWithSwap<T>(array: T[], element: T): boolean {
    const index = array.indexOf(element);
    if (index === -1) return false;
    
    if (index !== array.length - 1)
        array[index] = array[array.length - 1];
    array.pop();
    return true;
}