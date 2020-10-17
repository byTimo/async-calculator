import { shallowEquals } from "../utils/ArrayHelper";
import { PromiseHelper } from "../utils/PromiseHelper";
import { extractKey } from "./key";
import { ArrayRule, ArrayItemRule } from "./types/rules";
import { emptyState, State } from './types/state';

export class ArrayCalculator<T> {
    private arrayStates: Map<string, State>;
    private itemStates: Map<string, Map<string, State>>;

    private lol: Map<string, Set<string>> = new Map();

    constructor(private rules: ArrayRule<T, any, any>[]) {
        this.arrayStates = rules.reduce((a, c) => a.set(c.id, emptyState()), new Map());
        this.itemStates = rules.reduce((a, c) => a.set(c.id, new Map()), new Map());
    }

    public calc = (root: T) => {
        for (const rule of this.rules) {
            const array = rule.path(root);

            const state = this.arrayStates.get(rule.id)!;

            if (array === state.prevDeps) {
                continue;
            }

            state.prevDeps = array;

            const prevItemsState = this.itemStates.get(rule.id) || new Map<string, State>();
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
                    rule.id,
                    rule.itemRule,
                    nextState,
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

            this.itemStates.set(rule.id, nextItemsState);
        }
    }


    private scheduleCalculation = async <TItem, TData>(
        arrayRuleId: string,
        rule: ArrayItemRule<T, TItem, TData>,
        itemState: State,
        item: TItem,
        index: number,
        array: TItem[],
        root: T,
        signal: AbortSignal
    ): Promise<void> => {
        const key = extractKey(item);
        this.registerCalculation(arrayRuleId, key)
        try {
            const data = await rule.func(signal, item, index, array, root);
            this.unregisterCalculation(arrayRuleId, key);
            itemState.promise = null;
            itemState.abort = null;
            this.lol.get(arrayRuleId)!.delete(extractKey(item));
            PromiseHelper.abortableRequest(() => {
                rule.effect(data, item, index, array, root);
            }, signal);
        } catch (e) {
            if (e.type !== "abort") {
                throw e;
            }
        }
    }

    private registerCalculation = (id: string, key: string) => {
        if (!this.lol.has(id)) {
            this.lol.set(id, new Set());
        }
        this.lol.get(id)!.add(key);
    }

    private unregisterCalculation = (id: string, key: string) => {
        const set = this.lol.get(id)!;
        set.delete(key);
        if (set.size === 0) {
            this.lol.delete(id);
        }
    }

    public get loading(): boolean {
        return this.lol.size > 0;
    }

    public loadingById(id: string, key?: string): boolean {
        if (!this.lol.has(id)) {
            return false;
        }

        if (key == null) {
            return true;
        }

        return this.lol.get(id)!.has(key);
    }
}