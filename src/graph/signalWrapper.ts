export class SignalWrapper extends Number {
    constructor(
        public readonly astIndex: number | undefined,
        public readonly cycleID: number = 0,
        public readonly cycleIndex: number = 0,
    ) {
        super();
    }
}
