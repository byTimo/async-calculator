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
                    if (data === 10) {
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
                    if (data === 16) {
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
                condition: () => true,
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

        item = withKey({ a: 10, b: "bar" }, item);
        calculator.calc({ array: [item] })
        expect(calculator.loading).toBe(true);
    });

    it("don't schedule calculation when condition false", () => {
        const calculator = new ArrayCalculator<Root>([{
            id: "array",
            path: x => x.array,
            itemRule: {
                depsProvider: x => [x.a],
                condition: () => false,
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
                func: () => Promise.resolve(10),
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

    it("schedule debounced calculation", async done => {
        const calculator = new ArrayCalculator<Root>([{
            id: "array",
            path: x => x.array,
            itemRule: {
                depsProvider: x => [x.a],
                condition: () => true,
                func: (_, x) => {
                    expect(x.a).toBe(10);
                    return Promise.resolve(10);
                },
                effect: data => {
                    expect(data).toBe(10);
                    done();
                },
                options: {
                    debounce: 50
                }
            }
        }]);

        let item = withKey({ a: 8, b: "foo" });
        calculator.calc({ array: [item] });
        await PromiseHelper.delay(10, PromiseHelper.noneSignal);

        item = withKey({ a: 9, b: "bar" }, item);
        calculator.calc({ array: [item] })

        await PromiseHelper.delay(10, PromiseHelper.noneSignal)
        item = withKey({ a: 10, b: "bar" }, item);
        calculator.calc({ array: [item] })
    });

    it("should init rules", async () => {
        const calculator = new ArrayCalculator<Root>([{
            id: "a",
            path: x => x.array,
            itemRule: {
                depsProvider: x => [x.a],
                condition: () => true,
                func: (signal, x) => PromiseHelper.delay(10, signal).then(() => x.a),
                effect: d => expect(d).toBe(100),
                options: {
                    calcInitTime: true,
                }
            }
        }, {
            id: "b",
            path: x => x.array,
            itemRule: {
                depsProvider: x => [x.a],
                condition: () => true,
                func: (signal, x) => PromiseHelper.delay(10, signal).then(() => x.a),
                effect: () => expect(true).toBe(false),
            }
        }]);

        await calculator.init({ array: [withKey({ a: 100, b: "lol" })] })
    });

    it("doesn't recalculate inited rules when deps are changed", async () => {
        const calculator = new ArrayCalculator<Root>([{
            id: "a",
            path: x => x.array,
            itemRule: {
                depsProvider: x => [x.a],
                condition: () => true,
                func: (signal, x) => PromiseHelper.delay(10, signal).then(() => x.a),
                effect: d => expect(d).toBe(100),
                options: {
                    calcInitTime: true,
                }
            }
        }]);

        let item = withKey({ a: 100, b: "lol" });
        await calculator.init({ array: [item] });
        item = withKey({ a: 100, b: "bar" }, item);
        calculator.calc({ array: [item] });
        expect(calculator.loading).toBe(false);
    });

    it("doesn't init rules when condition is false", async () => {
        let count = 0;

        const calculator = new ArrayCalculator<Root>([{
            id: "a",
            path: x => x.array,
            itemRule: {
                depsProvider: x => [x.a],
                condition: () => false,
                func: () => Promise.resolve(10),
                effect: () => count = 100,
                options: {
                    calcInitTime: true,
                }
            }
        }]);

        let item = withKey({ a: 100, b: "lol" });
        await calculator.init({ array: [item] });
        expect(count).toBe(0);
    });

    it("run calculation for new item", async () => {
        let count = 0;

        const calculator = new ArrayCalculator<Root>([{
            id: "a",
            path: x => x.array,
            itemRule: {
                depsProvider: x => [x.a],
                condition: () => true,
                func: () => Promise.resolve(10),
                effect: () => count = count + 1,
            }
        }]);

        let item1 = withKey({ a: 100, b: "lol" });
        calculator.calc({ array: [item1] });

        let item2 = withKey({ a: 15, b: "bar" });
        calculator.calc({ array: [item1, item2] });
        await PromiseHelper.delay(100, PromiseHelper.noneSignal);
        expect(count).toBe(2);
    });

    it("stop calculation for item that was deleted", async () => {
        let count = 0;

        const calculator = new ArrayCalculator<Root>([{
            id: "a",
            path: x => x.array,
            itemRule: {
                depsProvider: x => [x.a],
                condition: () => true,
                func: (signal) => PromiseHelper.delay(1, signal).then(() => 5),
                effect: () => count = count + 1,
            }
        }]);

        let item1 = withKey({ a: 100, b: "lol" });
        let item2 = withKey({a: 15, b: "bar"})
        calculator.calc({ array: [item1, item2] });
        expect(calculator.loadingById("a", extractKey(item1))).toBe(true);

        calculator.calc({ array: [item2] });
        await PromiseHelper.delay(100, PromiseHelper.noneSignal);
        expect(count).toBe(1);
    });
})