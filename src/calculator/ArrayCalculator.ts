import { shallowEquals } from "../utils/ArrayHelper";
import { PromiseHelper } from "../utils/PromiseHelper";
import { extractKey } from "./key";
import { ArrayRule, ArrayItemRule } from "./types/rules";
import { emptyState, State } from './types/state';

export class ArrayCalculator<T> {
    private arrayStates: Map<ArrayRule<T, any, any>, State>;
    private itemStates: Map<ArrayRule<T, any, any>, Map<string, State>>;

    constructor(private rules: ArrayRule<T, any, any>[]) {
        this.arrayStates = rules.reduce((a, c) => a.set(c, emptyState()), new Map())
        this.itemStates = rules.reduce((a, c) => a.set(c, new Map()), new Map())
    }

    public calc = (root: T) => {
        for (const rule of this.rules) {
            const array = rule.path(root);

            const state = this.arrayStates.get(rule)!;

            if (array === state.prevDeps) {
                continue;
            }

            state.prevDeps = array;

            const prevItemsState = this.itemStates.get(rule) || new Map<string, State>();
            const nextItemsState = new Map<string, State>();


            array.forEach((item, index, array) => {
                const key = extractKey(item);
                const state = prevItemsState.get(key);

                const deps = rule.itemRule.depsProvider(item, index, array, root);
                if (state != null && shallowEquals(deps, state.prevDeps)) {
                    return;
                }

                const nextState = state || emptyState();

                nextState.prevDeps = deps;

                if (nextState.abort != null) {
                    nextState.abort.abort();
                }

                if (!rule.itemRule.condition(item, index, array, root)) {
                    nextState.abort = null;
                    nextState.promise = null;
                    return;
                }

                nextState.abort = new AbortController();
                nextState.promise = this.scheduleCalculation(
                    rule.itemRule,
                    item,
                    index,
                    array,
                    root,
                    nextState.abort.signal
                );

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

            this.itemStates.set(rule, nextItemsState);
        }
    }


    private scheduleCalculation = async <TItem, TData>(
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