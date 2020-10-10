import { PromiseHelper } from '../utils/PromiseHelper';
type ObjProvider<T> = () => T;

export interface Rule<TObj, TResponce> {
    id: string;
    depsProvider: (provider: ObjProvider<TObj>) => any[];
    needStart: (provider: ObjProvider<TObj>) => boolean;
    func: (provider: ObjProvider<TObj>, signal: AbortSignal) => Promise<TResponce>;
    effect: (response: TResponce, provider: ObjProvider<TObj>) => void;
}

export interface State {
    id: string;
    promise: Promise<any> | null;
    abort: AbortController | null;
    prevDeps: any[];
}

export class Calculator<T> {
    private rules: Map<string, Rule<T, any>>;
    private states: Map<string, State>;


    constructor(rules: Rule<T, any>[]) {
        this.rules = rules.reduce((a, c) => a.set(c.id, c), new Map());
        this.states = rules.reduce((a, c) => a.set(c.id, {
            id: c.id,
            promise: null,
            abort: null,
            prevDeps: []
        }),
            new Map<string, State>());
    }

    public calc(obj: T) {
        this.rules.forEach((rule, id) => {
            const provider = () => obj;
            const state = this.states.get(id)!;
            const deps = rule.depsProvider(provider);

            if (shallowEquals(deps, state.prevDeps)) {
                return;
            }

            state.prevDeps = deps;

            if (state.promise != null) {
                state.abort!.abort();
            }

            if (!rule.needStart(provider)) {
                state.abort = null;
                state.promise = null;
                return;
            }

            state.abort = new AbortController();
            state.promise = this.registerCalculation(rule, provider, state.abort.signal);
        });
    }

    private registerCalculation = async (rule: Rule<T, any>, provider: ObjProvider<T>, signal: AbortSignal): Promise<void> => {
        const response = await rule.func(provider, signal);
        PromiseHelper.abortableRequest(() => {
            rule.effect(response, provider)
        }, signal);
    }
}

function shallowEquals(a: any[], b: any[]): boolean {
    if (a.length !== b.length) {
        return false;
    }

    return a.every((x, i) => x === b[i]);
}