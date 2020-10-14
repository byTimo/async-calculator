let counter = 0;

export const keySymbol = Symbol.for("unique_key");

export const keyNext = () => String(++counter);

export const withKey = <T>(data: T, source?: T): T => {
    (data as any)[keySymbol] = source === undefined
        ? (data as any)[keySymbol] || keyNext()
        : (source as any)[keySymbol] || keyNext();

    return data;
};

export const extractKey = (data: any): string => {
    return data != null && data.hasOwnProperty(keySymbol)
        ? data[keySymbol]
        : null;
};