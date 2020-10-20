import React from 'react';
import { Calculator } from './calculator/Calculator';
import { PromiseHelper } from './utils/PromiseHelper';
import { createRule } from './calculator/RuleBuilder';

export interface Props {

}

export interface State {
    a: number;
    b: number;
    c: number;
}


export class Simple extends React.Component<Props, State> {
    state: State = {
        a: 10,
        b: 20,
        c: 30
    }

    calculator = new Calculator<State>([
        createRule(
            "simple",
            x => [x.a, x.b],
            x => x.b % 2 === 0,
            async (signal, x) => {
                await PromiseHelper.delay(500, signal);
                return x.a + x.b;
            },
            data => this.setState({ c: data })
        ),
    ])

    render() {
        return (
            <div>
                <pre>
                    {JSON.stringify(this.state, null, 4)}
                </pre>
                <button onClick={() => this.handleClick("a")}>a</button>
                <button onClick={() => this.handleClick("b")}>b</button>
            </div>
        )
    }

    private handleClick = (field: keyof State) => {
        this.setState(state => ({ [field]: state[field] + 1 } as any), () => {
            this.calculator.calc(this.state);
        })
    }
}