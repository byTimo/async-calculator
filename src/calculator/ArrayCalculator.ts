import { shallowEquals } from "../utils/ArrayHelper";
import { PromiseHelper } from "../utils/PromiseHelper";
import { extractKey } from "./key";
import { ArrayRule, ArrayItemRule } from "./types/rules";
import { emptyState, State } from './types/state';

export class ArrayCalculator<T> {
    private arrayStates: Map<string, State>;
    private itemStates: Map<string, Map<string, State>>;

    private scheduledRules: Map<string, Set<string>> = new Map();

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

            const prevStates = this.itemStates.get(rule.id) || new Map<string, State>();
            const nextStates = new Map<string, State>();


            array.forEach((item, index, array) => {
                const key = extractKey(item);
                const state = prevStates.get(key) || emptyState();

                nextStates.set(key, state);
                if (prevStates.has(key)) {
                    prevStates.delete(key);
                }

                const deps = rule.itemRule.depsProvider(item, index, array, root);
                if (shallowEquals(deps, state.prevDeps)) {
                    return;
                }

                state.prevDeps = deps;

                if (state.abort != null) {
                    state.abort.abort();
                    this.unregisterCalculation(rule.id, key);
                }

                if (!rule.itemRule.condition(item, index, array, root)) {
                    state.abort = null;
                    state.promise = null;
                    return;
                }

                state.abort = new AbortController();
                state.promise = this.scheduleCalculation(
                    rule.id,
                    rule.itemRule,
                    state,
                    item,
                    index,
                    array,
                    root,
                    state.abort.signal
                );
            })

            prevStates.forEach((state, key) => {
                if (state.abort != null) {
                    state.abort.abort();
                    this.unregisterCalculation(rule.id, key);
                }
            })

            this.itemStates.set(rule.id, nextStates);
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
        const debounce = rule.options != null ? rule.options.debounce : null;
        try {
            if (debounce != null) {
                await PromiseHelper.delay(debounce, signal);
            }
            const data = await rule.func(signal, item, index, array, root);

            //В func передали signal, а func его не использует
            if (signal.aborted) {
                return;
            }

            this.unregisterCalculation(arrayRuleId, key);
            itemState.promise = null;
            itemState.abort = null;

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
        if (!this.scheduledRules.has(id)) {
            this.scheduledRules.set(id, new Set());
        }
        this.scheduledRules.get(id)!.add(key);
    }

    private unregisterCalculation = (id: string, key: string) => {
        const set = this.scheduledRules.get(id)!;
        set.delete(key);
        if (set.size === 0) {
            this.scheduledRules.delete(id);
        }
    }

    public get loading(): boolean {
        return this.scheduledRules.size > 0;
    }

    public loadingById(id: string, key?: string): boolean {
        if (!this.scheduledRules.has(id)) {
            return false;
        }

        if (key == null) {
            return true;
        }

        return this.scheduledRules.get(id)!.has(key);
    }
}