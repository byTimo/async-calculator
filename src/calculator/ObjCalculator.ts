import { shallowEquals } from '../utils/ArrayHelper';
import { PromiseHelper } from '../utils/PromiseHelper';
import { RootRule } from './types/rules';
import { State, emptyState } from './types/state';

export class ObjCalculator<T> {
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
            }

            if (!rule.condition(root)) {
                state.abort = null;
                state.promise = null;
                return;
            }

            state.abort = new AbortController();
            state.promise = this.scheduleCalculation(rule, root, state.abort.signal);
        }
    }

    private scheduleCalculation = async (rule: RootRule<T, any>, root: T, signal: AbortSignal): Promise<void> => {
        const response = await rule.func(signal, root);
        PromiseHelper.abortableRequest(() => {
            rule.effect(response, root)
        }, signal);
    }
}