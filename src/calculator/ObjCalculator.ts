import { shallowEquals } from '../utils/ArrayHelper';
import { PromiseHelper } from '../utils/PromiseHelper';
import { RootRule } from './types/rules';
import { State, emptyState } from './types/state';

export class ObjCalculator<T> {
    private scheduledRules: Set<RootRule<T, any>> = new Set();
    private state: Map<RootRule<T, any>, State>;

    constructor(private rules: RootRule<T, any>[]) {
        this.state = rules.reduce((a, c) => a.set(c, emptyState()), new Map());
    }

    public calc = (root: T) => {
        for (const rule of this.rules) {
            const state = this.state.get(rule);
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
                this.scheduledRules.delete(rule);
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
        this.scheduledRules.add(rule);
        try {
            const response = await rule.func(signal, root);
            this.scheduledRules.delete(rule);
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
}