import { shallowEquals } from '../utils/ArrayHelper';
import { PromiseHelper } from '../utils/PromiseHelper';
import { RootRule } from './types/rules';
import { State, emptyState } from './types/state';

export class ObjCalculator<T> {
    private scheduledRules: Set<string> = new Set();
    private state: Map<string, State>;

    constructor(private rules: RootRule<T, any>[]) {
        this.state = rules.reduce((a, c) => a.set(c.id, emptyState()), new Map());
    }

    public init = (root: T): Promise<void[]> => {
        const initRules = this.rules.filter(x => x.options != null && x.options.calcInitTime);

        const promises = initRules.map(rule => {
            const state = this.state.get(rule.id)!;
            state.prevDeps = rule.depsProvider(root);
            return rule.condition(root)
                ? this.runCalculation(rule, root)
                : Promise.resolve()
        })

        return Promise.all(promises);
    }

    private runCalculation = async (rule: RootRule<T, any>, root: T): Promise<void> => {
        const data = await rule.func(PromiseHelper.noneSignal, root);
        rule.effect(data, root);
    }

    public calc = (root: T) => {
        for (const rule of this.rules) {
            const state = this.state.get(rule.id);
            if (state == null) {
                throw new Error("Can't find state for rule");
            }

            const deps = rule.depsProvider(root);

            if (shallowEquals(deps, state.prevDeps)) {
                return;
            }

            state.prevDeps = deps;

            if (state.promise != null) {
                state.abort!.abort();
                this.scheduledRules.delete(rule.id);
            }

            if (!rule.condition(root)) {
                state.abort = null;
                state.promise = null;
                return;
            }

            state.abort = new AbortController();
            state.promise = this.scheduleCalculation(rule, state, root, state.abort.signal);
        }
    }

    private scheduleCalculation = async (rule: RootRule<T, any>, state: State, root: T, signal: AbortSignal): Promise<void> => {
        const debounce = rule.options != null ? rule.options.debounce : null;
        this.scheduledRules.add(rule.id);
        try {
            if (debounce != null) {
                await PromiseHelper.delay(debounce, signal);
            }
            const response = await rule.func(signal, root);
            if (signal.aborted) {
                return;
            }

            this.scheduledRules.delete(rule.id);
            state.promise = null;
            state.abort = null;

            PromiseHelper.abortableRequest(() => {
                rule.effect(response, root)
            }, signal);
        } catch (error) {
            if (error == null || error.type !== "abort") {
                throw error;
            }
        }
    }

    public get loading(): boolean {
        return this.scheduledRules.size > 0;
    }

    public loadingById(id: string): boolean {
        return this.scheduledRules.has(id);
    }
}