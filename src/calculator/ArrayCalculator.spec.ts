import { ArrayCalculator } from './ArrayCalculator';
import { withKey, extractKey } from './key';
import { PromiseHelper } from '../utils/PromiseHelper';

interface Root {
    array: Array<{
        a: number;
        b: string;
    }>
}


describe("ArrayCalculator", () => {
    it("schedule calculation for array item", done => {
        const calculator = new ArrayCalculator<Root>([{
            id: "array",
            path: x => x.array,
            itemRule: {
                depsProvider: x => [x.a],
                condition: x => true,
                func: (_, x) => Promise.resolve(x.a),
                effect: data => {
                    if(data === 10) {
                        done();
                    }
                }
            }
        }]);

        const item = withKey({ a: 10, b: "foo" });
        calculator.calc({ array: [item] });
        expect(calculator.loading).toBe(true);
        expect(calculator.loadingById("array")).toBe(true);
        expect(calculator.loadingById("array", extractKey(item))).toBe(true);
    });

    it("schedule calculation for array item that changed", async done => {
        const calculator = new ArrayCalculator<Root>([{
            id: "array",
            path: x => x.array,
            itemRule: {
                depsProvider: x => [x.a],
                condition: x => true,
                func: (_, x) => Promise.resolve(x.a),
                effect: data => {
                    if(data === 16) {
                        done();
                    }
                }
            }
        }]);

        const first = withKey({ a: 10, b: "foo" });
        let second = withKey({ a: 15, b: "bar" });
        calculator.calc({ array: [first, second] });
        await PromiseHelper.delay(1, PromiseHelper.noneSignal);

        second = withKey({ a: 16, b: "bar" }, second);
        calculator.calc({ array: [first, second] });

        expect(calculator.loading).toBe(true);
        expect(calculator.loadingById("array")).toBe(true);
        expect(calculator.loadingById("array", extractKey(first))).toBe(false);
        expect(calculator.loadingById("array", extractKey(second))).toBe(true);
    });

    it("don't stop calculation when deps are not changed", done => {
        const calculator = new ArrayCalculator<Root>([{
            id: "array",
            path: x => x.array,
            itemRule: {
                depsProvider: x => [x.a],
                condition: x => true,
                func: (_, x) => Promise.resolve(x.a),
                effect: data => {
                    if (data === 10) {
                        done();
                    }
                }
            }
        }]);

        let item = withKey({ a: 10, b: "foo" });
        calculator.calc({ array: [item] });

        item = withKey({a: 10, b: "bar"}, item);
        calculator.calc({array: [item]})
        expect(calculator.loading).toBe(true);
    });

    it("don't schedule calculation when condition false", () => {
        const calculator = new ArrayCalculator<Root>([{
            id: "array",
            path: x => x.array,
            itemRule: {
                depsProvider: x => [x.a],
                condition: x => false,
                func: (_, x) => Promise.resolve(x.a),
                effect: () => expect(false).toBe(true)
            }
        }]);

        let item = withKey({ a: 10, b: "foo" });
        calculator.calc({ array: [item] });
        expect(calculator.loading).toBe(false);
    });

    it("abort previous and don't schedule new when condition is false", () => {
        const calculator = new ArrayCalculator<Root>([{
            id: "array",
            path: x => x.array,
            itemRule: {
                depsProvider: x => [x.a],
                condition: x => x.a !== 10,
                func: (_, x) => Promise.resolve(x.a),
                effect: () => expect(false).toBe(true)
            }
        }]);

        let item = withKey({ a: 9, b: "foo" });
        calculator.calc({ array: [item] });
        expect(calculator.loading).toBe(true);

        item = withKey({ a: 10, b: "bar" }, item);
        calculator.calc({ array: [item] })
        expect(calculator.loading).toBe(false);
    });
})