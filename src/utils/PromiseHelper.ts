export class PromiseHelper {
    static delay = (time: number, signal: AbortSignal): Promise<void> => {
        return new Promise((resolve, reject) => {
            PromiseHelper.timeout(resolve, time, signal);
            signal.addEventListener("abort", reject);
        });
    }

    static timeout = (func: () => void, time: number, signal: AbortSignal): void => {
        const start = new Date().getTime();

        const loop = () => {
            const delta = new Date().getTime() - start;

            if (delta >= time) {
                func();
            }

            PromiseHelper.abortableRequest(loop, signal);
        }
        PromiseHelper.abortableRequest(loop, signal);
    }

    static abortableRequest = (func: () => void, signal: AbortSignal): void => {
        const closure = { id: -1 };
        const abortSubscription = () => cancelAnimationFrame(closure.id);
        closure.id = requestAnimationFrame(() => {
            signal.removeEventListener("abort", abortSubscription);
            func();
        });
        signal.addEventListener("abort", abortSubscription);
    }
}