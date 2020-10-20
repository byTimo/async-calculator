import { RootRule, Options, ArrayRule } from './types/rules';

export function createRule<T, TData>(
    id: string,
    depsProvider: (root: T) => any[],
    condition: (root: T) => boolean,
    func: (signal: AbortSignal, root: T) => Promise<TData>,
    effect: (data: TData, root: T) => void,
    options?: Options,
): RootRule<T, TData> {
    return {
        id,
        depsProvider,
        condition,
        func,
        effect,
        options
    }
}

export function createArrayRule<T, TItem, TData>(
    id: string,
    path: (root: T) => TItem[],
    depsProvider: (item: TItem, index: number, array: TItem[], root: T) => any[],
    condition: (item: TItem, index: number, array: TItem[], root: T) => boolean,
    func: (signal: AbortSignal, item: TItem, index: number, array: TItem[], root: T) => Promise<TData>,
    effect: (data: TData, item: TItem, index: number, array: TItem[], root: T) => void,
    options?: Options,
): ArrayRule<T, TItem, TData> {
    return {
        id,
        path,
        itemRule: {
            depsProvider,
            condition,
            func,
            effect,
            options
        }
    }
}