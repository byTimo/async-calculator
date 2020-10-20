import React from 'react';
import { Calculator } from './calculator/Calculator';
import { withKey } from './calculator/key';
import { createArrayRule } from './calculator/RuleBuilder';
import { PromiseHelper } from './utils/PromiseHelper';

interface Props {

}

interface State {
    array: { a: number, b: number, c: number }[]
}

export class ArrayComp extends React.Component<Props, State> {
    state: State = {
        array: [],
    }

    calculator = new Calculator<State>([
        createArrayRule(
            "array",
            x => x.array,
            x => [x.a, x.b],
            () => true,
            (s, x) => PromiseHelper.delay(10, s).then(() => x.a + x.b),
            (data, x, i) => this.setState(state => ({array: state.array.map((y, j) => j === i ? {...x, c: data} : y)}))
        )
    ])

    render() {
        return (
            <div>
                <pre>
                    {JSON.stringify(this.state, null, 4)}
                </pre>

                <div>
                    <button onClick={this.handleEqualArray}>array equal</button>
                    {this.state.array.map((x, i) => (
                        <div key={i}>
                            {i} <button onClick={() => this.handleClick(i, "a")}>a</button> <button onClick={() => this.handleClick(i, "b")}>b</button> <button onClick={this.handleEqual}>equal</button>
                        </div>
                    ))}
                </div>
                <button onClick={this.handleAdd}>add</button>
            </div>
        )
    }

    private handleClick = (index: number, field: "a" | "b") => {
        this.setState(state => ({
            array: state.array.map((x, i) => i === index ? withKey({ ...x, [field]: x[field] + 1 }, x) : x)
        }), () => this.calculator.calc(this.state))
    }

    private handleEqualArray = () => {
        this.calculator.calc(this.state);
    }

    private handleEqual = () => {
        this.setState(prev => ({array: prev.array.map(x => x)}), () => this.calculator.calc(this.state));
    }

    private handleAdd = () => {
        this.setState(state => ({ array: [...state.array, withKey({ a: 5, b: 1, c: 0 })] }), () => this.calculator.calc(this.state));
    }
}