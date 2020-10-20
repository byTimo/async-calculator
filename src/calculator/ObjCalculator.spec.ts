import { ObjCalculator } from './ObjCalculator';
import { PromiseHelper } from '../utils/PromiseHelper';

interface Simple {
    a: number;
    b: number;
}

describe("ObjCalculator", () => {
    it("call effect when calc first time", done => {
        const calculator = new ObjCalculator<Simple>([{
            id: "1",
            depsProvider: x => [x.a],
            condition: () => true,
            func: () => Promise.resolve(),
            effect: () => done()
        }]);

        calculator.calc({ a: 10, b: 10 });
        expect(calculator.loading).toBe(true);
    });

    it("don't schedule calculation when deps not change", async () => {
        const calculator = new ObjCalculator<Simple>([{
            id: "1",
            depsProvider: x => [x.a],
            condition: () => true,
            func: () => Promise.resolve(15),
            effect: data => undefined
        }]);

        calculator.calc({ a: 10, b: 10 });
        await PromiseHelper.delay(1, PromiseHelper.noneSignal);
        calculator.calc({ a: 10, b: 15 });
        expect(calculator.loading).toBe(false);
    });

    it("don't stop calculation when deps are not changed", done => {
        const calculator = new ObjCalculator<Simple>([{
            id: "1",
            depsProvider: x => [x.a],
            condition: () => true,
            func: (signal, x) => PromiseHelper.delay(5, signal).then(() => x.b),
            effect: data => {
                expect(data).toBe(10);
                done();
            }
        }]);

        calculator.calc({ a: 10, b: 10 });
        calculator.calc({ a: 10, b: 15 });
        expect(calculator.loading).toBe(true);
    })

    it("don't schedule calculation when condition is false", () => {
        const calculator = new ObjCalculator<Simple>([{
            id: "1",
            depsProvider: x => [x.a],
            condition: () => false,
            func: () => Promise.resolve(15),
            effect: data => undefined
        }]);

        calculator.calc({ a: 10, b: 10 });
        expect(calculator.loading).toBe(false);
    });

    it("abort previous calculation when new calculation scheduled", done => {
        const calculator = new ObjCalculator<Simple>([{
            id: "1",
            depsProvider: x => [x.a],
            condition: () => true,
            func: (signal, x) => PromiseHelper.delay(5, signal).then(() => x.b),
            effect: data => {
                expect(data).toBe(7);
                expect(calculator.loading).toBe(false);
                done();
            }
        }]);

        calculator.calc({ a: 10, b: 10 });
        expect(calculator.loading).toBe(true);
        calculator.calc({ a: 7, b: 7 });
    });

    it("abort previous calculation and don't schedule new when condition is false", () => {
        const calculator = new ObjCalculator<Simple>([{
            id: "1",
            depsProvider: x => [x.a],
            condition: x => x.a === 2,
            func: (signal, x) => PromiseHelper.delay(5, signal).then(() => x.b),
            effect: () => expect(false).toBe(true)
        }]);

        calculator.calc({ a: 2, b: 2 });
        calculator.calc({ a: 1, b: 7 });
        expect(calculator.loading).toBe(false);
    });

    it("schedule one rule by deps", async () => {
        const calculator = new ObjCalculator<Simple>([{
            id: "1",
            depsProvider: x => [x.a],
            condition: x => true,
            func: (signal, x) => Promise.resolve(5),
            effect: () => { }
        }, {
            id: "2",
            depsProvider: x => [x.b],
            condition: x => true,
            func: (signal, x) => Promise.resolve(5),
            effect: () => { }
        }]);

        calculator.calc({ a: 2, b: 2 });
        await PromiseHelper.delay(1, PromiseHelper.noneSignal);
        calculator.calc({ a: 1, b: 2 });
        expect(calculator.loading).toBe(true);
        expect(calculator.loadingById("1")).toBe(true);
        expect(calculator.loadingById("2")).toBe(false);
    });

    it("schedule debounced calculation", async done => {
        const calculator = new ObjCalculator<Simple>([{
            id: "1",
            depsProvider: x => [x.a],
            condition: () => true,
            func: (signal, x) => Promise.resolve(x.a),
            effect: data => {
                expect(data).toBe(10);
                done();
            },
            options: {
                debounce: 50
            }
        }]);


        calculator.calc({ a: 2, b: 2 });
        await PromiseHelper.delay(10, PromiseHelper.noneSignal);
        calculator.calc({ a: 5, b: 7 });
        await PromiseHelper.delay(10, PromiseHelper.noneSignal);
        calculator.calc({ a: 10, b: 7 });
    });

    it("init rules", async () => {
        const calculator = new ObjCalculator<Simple>([{
            id: "1",
            depsProvider: x => [x.a],
            condition: () => true,
            func: (signal, x) => PromiseHelper.delay(10, signal).then(() => x.a),
            effect: data => expect(data).toBe(47),
            options: {
                calcInitTime: true,
            }
        }, {
            id: "2",
            depsProvider: x => [x.a],
            condition: () => true,
            func: (signal, x) => PromiseHelper.delay(10, signal).then(() => x.a),
            effect: data => expect(false).toBe(true),
        }]);

        await calculator.init({ a: 47, b: 20 });
    });

    it("don't recalculate inited when deps are not changed", async () => {
        const calculator = new ObjCalculator<Simple>([{
            id: "1",
            depsProvider: x => [x.a],
            condition: () => true,
            func: (signal, x) => PromiseHelper.delay(10, signal).then(() => x.a),
            effect: data => expect(data).toBe(47),
            options: {
                calcInitTime: true,
            }
        }]);

        await calculator.init({ a: 47, b: 20 });
        calculator.calc({ a: 47, b: 20 });
        expect(calculator.loading).toBe(false);
    });

    it("don't calculate rule when condition is false in init", async () => {
        let counter = 0;

        const calculator = new ObjCalculator<Simple>([{
            id: "1",
            depsProvider: x => [x.a],
            condition: () => false,
            func: (signal, x) => PromiseHelper.delay(10, signal).then(() => x.a),
            effect: data => counter = data,
            options: {
                calcInitTime: true,
            }
        }]);

        await calculator.init({ a: 47, b: 20 });
        expect(counter).toBe(0);
    })
})