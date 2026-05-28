export function replaceBy<T>(array: T[], toReplace: T, element: T): boolean {
    const index = array.indexOf(toReplace);
    if (index === -1) return false;
    
    array[index] = element;
    return true;
}