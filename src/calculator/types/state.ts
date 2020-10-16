export interface State {
    promise: Promise<any> | null;
    abort: AbortController | null;
    prevDeps: any[];
}

export function emptyState(): State {
    return {
        promise: null,
        abort: null,
        prevDeps: []
    }
}