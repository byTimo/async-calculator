export function shallowEquals<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) {
        return false;
    }

    return a.every((x, i) => x === b[i]);
}

export function parttion<T, F>(source: Array<T | F>, partSelector: (item: T | F) => item is T): [T[], F[]];
export function parttion<T>(source: T[], partSelector: (item: T) => boolean): [T[], T[]] {
    const trueResult: T[] = [];
    const falseResult: T[] = [];
    for (const item of source) {
        if (partSelector(item)) {
            trueResult.push(item);
        } else {
            falseResult.push(item);
        }
    }
    return [trueResult, falseResult];
}

export function some<T>(source: Iterable<T>, checker: (item: T) => boolean): boolean {
    for(const item of source) {
        if(!checker(item)) {
            return false;
        }
    }
    return true;
}