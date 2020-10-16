import { Rule, isArrayRule, ArrayRule, RootRule } from './types/rules';
import { ObjCalculator } from './ObjCalculator';
import { ArrayCalculator } from './ArrayCalculator';
import { parttion } from "../utils/ArrayHelper";

export class Calculator<T> {
    private objCalculator: ObjCalculator<T>;
    private arrayCalculator: ArrayCalculator<T>;

    constructor(rules: Rule<T>[]) {
        const [arrayRules, objRules] = parttion<ArrayRule<T, any, any>, RootRule<T, any>>(rules, isArrayRule);
        this.objCalculator = new ObjCalculator(objRules);
        this.arrayCalculator = new ArrayCalculator(arrayRules);
    }

    public calc(root: T) {
        this.objCalculator.calc(root);
        this.arrayCalculator.calc(root);
    }
}