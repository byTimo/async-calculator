import { PromiseHelper } from '../utils/PromiseHelper';
import { extractKey } from './key';

export interface RootRule<T, TData> {
    depsProvider: (root: T) => any[];
    condition: (root: T) => boolean;
    func: (signal: AbortSignal, root: T) => Promise<TData>;
    effect: (data: TData, root: T) => void;
}

export interface ArrayItemRule<T, TItem, TData> {
    depsProvider: (item: TItem, index: number, array: TItem[], root: T) => any[];
    condition: (item: TItem, index: number, array: TItem[], root: T) => boolean;
    func: (signal: AbortSignal, item: TItem, index: number, array: TItem[], root: T) => Promise<TData>;
    effect: (data: TData, item: TItem, index: number, array: TItem[], root: T) => void;
}

export interface ArrayRule<T, TItem, TData> {
    path: (root: T) => TItem[];
    rule: ArrayItemRule<T, TItem, TData>
}

type Rule<T> = RootRule<T, any> | ArrayRule<T, any, any>

export interface State {
    promise: Promise<any> | null;
    abort: AbortController | null;
    prevDeps: any[];
}

function isArrayRule<T>(rule: Rule<T>): rule is ArrayRule<T, any, any> {
    return "path" in rule;
}

type ArrayStateIndex<T> = Map<ArrayRule<T, any, any>, Map<string, State>>;

export class Calculator<T> {
    private rootRules: Rule<T>[];
    private rootState: Map<Rule<T>, State>;
    private arrayState: ArrayStateIndex<T>;


    constructor(rules: Rule<T>[]) {
        this.rootRules = rules;
        this.rootState = rules.reduce(
            (a, c) => a.set(c, { promise: null, abort: null, prevDeps: [] })
            , new Map<Rule<T>, State>()
        );

        this.arrayState = rules.filter(isArrayRule).reduce((a, c) => a.set(c, new Map()), new Map() as ArrayStateIndex<T>)
    }

    public calc(root: T) {
        for (const rule of this.rootRules) {
            if (isArrayRule(rule)) {
                this.calcArrayRule(rule, root);
            } else {
                this.calcRootRule(rule, root);
            }
        }
    }

    private calcRootRule = (rule: RootRule<T, any>, root: T) => {
        const state = this.rootState.get(rule)!;
        const deps = rule.depsProvider(root);

        if (shallowEquals(deps, state.prevDeps)) {
            return;
        }

        state.prevDeps = deps;

        if (state.promise != null) {
            state.abort!.abort();
        }

        if (!rule.condition(root)) {
            state.abort = null;
            state.promise = null;
            return;
        }

        state.abort = new AbortController();
        state.promise = this.registerCalculation(rule, root, state.abort.signal);
    }

    private registerCalculation = async (rule: RootRule<T, any>, root: T, signal: AbortSignal): Promise<void> => {
        const response = await rule.func(signal, root);
        PromiseHelper.abortableRequest(() => {
            rule.effect(response, root)
        }, signal);
    }

    private calcArrayRule = (rule: ArrayRule<T, any, any>, root: T) => {
        const array = rule.path(root);
        const arrayState = this.rootState.get(rule)!;
        if (array === arrayState.prevDeps) {
            return;
        }

        arrayState.prevDeps = array;

        const prevItemsState = this.arrayState.get(rule) || new Map<string, State>();
        const nextItemsState = new Map<string, State>();

        array.forEach((item, index, array) => {
            const key = extractKey(item);
            const itemState = prevItemsState.get(key);

            const deps = rule.rule.depsProvider(item, index, array, root);
            if (itemState != null && shallowEquals(deps, itemState.prevDeps)) {
                return;
            }

            const nextState = itemState || { abort: null, promise: null, prevDeps: [] }

            nextState.prevDeps = deps;

            if (nextState.abort != null) {
                nextState.abort.abort();
            }

            if (!rule.rule.condition(item, index, array, root)) {
                nextState.abort = null;
                nextState.promise = null;
                return;
            }

            nextState.abort = new AbortController();
            nextState.promise = this.start(rule.rule, item, index, array, root, nextState.abort.signal);

            nextItemsState.set(key, nextState);
            if (prevItemsState.has(key)) {
                prevItemsState.delete(key);
            }
        })

        prevItemsState.forEach((state) => {
            if (state.abort != null) {
                state.abort.abort();
            }
        })

    }

    private start = async <TItem, TData>(
        rule: ArrayItemRule<T, TItem, TData>,
        item: TItem,
        index: number,
        array: TItem[],
        root: T,
        signal: AbortSignal
    ): Promise<void> => {
        const data = await rule.func(signal, item, index, array, root);
        PromiseHelper.abortableRequest(() => {
            rule.effect(data, item, index, array, root);
        }, signal);
    }
}

function shallowEquals(a: any[], b: any[]): boolean {
    if (a.length !== b.length) {
        return false;
    }

    return a.every((x, i) => x === b[i]);
}


