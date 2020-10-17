export interface RootRule<T, TData> {
    id: string;
    depsProvider: (root: T) => any[];
    condition: (root: T) => boolean;
    func: (signal: AbortSignal, root: T) => Promise<TData>;
    effect: (data: TData, root: T) => void;
}

export interface ArrayRule<T, TItem, TData> {
    id: string;
    path: (root: T) => TItem[];
    itemRule: ArrayItemRule<T, TItem, TData>
}

export interface ArrayItemRule<T, TItem, TData> {
    depsProvider: (item: TItem, index: number, array: TItem[], root: T) => any[];
    condition: (item: TItem, index: number, array: TItem[], root: T) => boolean;
    func: (signal: AbortSignal, item: TItem, index: number, array: TItem[], root: T) => Promise<TData>;
    effect: (data: TData, item: TItem, index: number, array: TItem[], root: T) => void;
}

export type Rule<T> = RootRule<T, any> | ArrayRule<T, any, any>

export function isArrayRule<T>(rule: Rule<T>): rule is ArrayRule<T, any, any> {
    return "path" in rule;
}