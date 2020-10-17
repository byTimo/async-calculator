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
})