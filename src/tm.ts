/** Turing Machine simulation model which includes the spec for a turing machine, parsing, and
    simulation/"unsimulation". */

/** The directions that a turing machine can move. */
export enum Direction {
    Left = -1,
    Center = 0,
    Right = 1
}

export namespace Direction {
    /** Obtain the direction opposite of the given direction. */
    export function opposite(dir: Direction): Direction {
        switch (dir) {
            case Direction.Left: return Direction.Right;
            case Direction.Center: return Direction.Center;
            case Direction.Right: return Direction.Left;
        }
    }

    /** Attempt to parse a 'L', 'R', 'C' or '/' string into a direction. */
    export function parse(str: string): Direction | null {
        switch (str.toUpperCase()) {
            case "L": return Direction.Left;
            case "C": case "/": return Direction.Center;
            case "R": return Direction.Right;
            default: return null;
        }
    }
}

/** An immutable Turing machine tape. */
export class Tape {
    /** The internal data stored in the tape. */
    public readonly data: Map<number, string>;
    /** The default symbol for this tape; will be returned if the tape has no value at a given location. */
    public readonly defaultSymbol: string;
    /** The index of the head in the tape (i.e., where we are in the tape). */
    public readonly head: number;

    /** Attempt to parse the input comma separated list as a tape. On failure, returns a string error. */
    static parse(input: string, defaultSym: string, head: number): Tape {
        let parts = input.trim().split(",");
        let result = new Map<number, string>();
        for (let [index, value] of parts.entries()) {
            if (value != defaultSym) result.set(index, value);
        }

        return new Tape(result, defaultSym, head);
    }

    constructor(data: Map<number, string>, defaultSymbol: string, head: number) {
        this.data = data;
        this.defaultSymbol = defaultSymbol;
        this.head = head;
    }

    /** Write a symbol at the current head, then move the head in the given direction. Returns a new Tape object. */
    writeAndMove(symbol: string, dir: Direction): Tape {
        let newData = new Map(this.data);

        // Update the symbol at the head.
        if (symbol == this.defaultSymbol) newData.delete(this.head);
        else newData.set(this.head, symbol);

        // And then return a new tape with the moved head.
        return new Tape(newData, this.defaultSymbol, this.head + dir);
    }

    /** Move the head in the given direction, and then write the symbol at the new head. Returns a new Tape object.*/
    moveAndWrite(dir: Direction, symbol: string): Tape {
        let newData = new Map(this.data);
        let newHead = this.head + dir;

        if (symbol == this.defaultSymbol) newData.delete(newHead);
        else newData.set(newHead, symbol);

        return new Tape(newData, this.defaultSymbol, newHead);
    }

    /** Get the symbol at the given tape index. */
    symbolAt(index: number): string {
        if (this.data.has(index)) return this.data.get(index);
        else return this.defaultSymbol;
    }

    /** Get the symbol at the head. */
    symbolAtHead(): string {
        return this.symbolAt(this.head);
    }

    /** Determines if the two tapes are structurally equal (i.e., they represent the same data semantically). */
    equals(other: Tape): boolean {
        if (this.defaultSymbol != other.defaultSymbol || this.head != other.head) return false;

        // Check that the two data arrays agree with each other.
        for (let [key, val] of this.data)
            if (other.data.get(key) != val) return false;
        for (let [key, val] of other.data)
            if (this.data.get(key) != val) return false;

        return true;
    }
}

/** A state that a turing machine is currently in. */
export class TMState {
    /** The tape for this state. */
    public readonly tape: Tape;
    /** The state we are currently in. */
    public readonly state: string;
    /** Whether or not this is a terminal state. */
    public readonly terminated: boolean;

    constructor(tape: Tape, state: string, terminated: boolean) {
        this.tape = tape;
        this.state = state;
        this.terminated = terminated;
    }

    /** Determines if the two states are structurally equal (i.e., they represent the same state semantically). */
    equals(other: TMState): boolean {
        return this.tape.equals(other.tape) && this.state == other.state && this.terminated == other.terminated;
    }
}

/** A (state, symbol) pair used as a trigger for a rule. */
export interface StateSymbol {
    /** The state in the pair. */
    state: string;
    /** The symbol in the pair. */
    symbol: string;
}

/** A (state, direction, symbol) triple used as the result of a rule. */
export interface RuleResult {
    /** The state in the triple. */
    state: string;
    /** The direction in the triple. */
    direction: Direction;
    /** The symbol in the triple. */
    symbol: string;
}

/** A rule in the Turing Machine. */
export interface Rule {
    /** The triggering state and symbol. */
    trigger: StateSymbol;
    /** The resulting state, direction to move in, and symbol to write. */
    result: RuleResult;
}

export namespace Rule {
    /** Shorthand function for creating a rule. */
    export function create(trigState: string, trigSymbol: string, resultSymbol: string, resultDir: Direction, resultState: string): Rule {
        return {
            trigger: { state: trigState, symbol: trigSymbol },
            result: { state: resultState, direction: resultDir, symbol: resultSymbol }
        }
    }
}

/** A turing machine specification, consisting of a number of rules, symbols, and states. */
export class TMSpec {
    /** The list of possible states that this TM can take on. */
    public readonly states: Set<string>;
    /** The list of possible symbols that this TM can take on. */
    public readonly symbols: Set<string>;
    /** The list of rules in this specification. */
    public readonly rules: Rule[];

    static RULE_REGEX = /(\w+)\s*,\s*(\w+)\s*->\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)/;

    /**
     * Attempt to parse a newline-delimited input (where each line is a rule of the form
     * state, symbol -> symbol, direction, state) into a TM specification. Return a string on failure.
     * */
    static parse(input: string, defaultSym: string): TMSpec | string {
        // TODO: Consider using a javascript set to speed this up.
        let symbols: Set<string> = new Set([defaultSym]);
        let states: Set<string> = new Set();
        let rules: Rule[] = [];

        for (let line of input.split("\n")) {
            if (!line || line.trim().length == 0) continue;

            let match = line.trim().match(this.RULE_REGEX);
            if (!match) return "Invalid rule format: " + line;

            let trigState = match[1], trigSym = match[2];
            let resultSym = match[3], resultDir = match[4], resultState = match[5];

            // Add the symbols to the result state.
            symbols.add(trigSym); symbols.add(resultSym);
            states.add(trigState); states.add(resultState);

            let dir = Direction.parse(resultDir);
            if (!dir) return "Invalid direction: " + dir;

            rules.push(Rule.create(trigState, trigSym, resultSym, dir, resultState));
        }

        return new TMSpec(states, symbols, rules);
    }

    constructor(states: Set<string>, symbols: Set<string>, rules: Rule[]) {
        this.states = states;
        this.symbols = symbols;
        this.rules = rules;
    }

    /** Steps forward a Turing Machine state using the rules in this specification. */
    next(curr: TMState): TMState | null {
        // Terminated states cannot be stepped forward, there is nothing to do.
        if (curr.terminated) return null;

        let state = curr.state;
        let symbol = curr.tape.symbolAtHead();

        for (let rule of this.rules) {
            // If we find a matching rule, then apply it immediately.
            if (rule.trigger.state == state && rule.trigger.symbol == symbol)
                return new TMState(curr.tape.writeAndMove(rule.result.symbol, rule.result.direction), rule.result.state, false);
        }

        // No applicable rule, terminate.
        return new TMState(curr.tape, curr.state, true);
    }

    /** Returns a list of all of the possible states that could have generated the current state (via local update rules). */
    previous(curr: TMState): TMState[] {
        // If terminated, return the previous 'unterminated' state.
        if (curr.terminated) return [new TMState(curr.tape, curr.state, false)];

        // Iterate through all of the rules and see if they are applicable to the current state.
        let result: TMState[] = [];
        for (let rule of this.rules) {
            if (rule.result.state != curr.state) continue;

            let oppDirection = Direction.opposite(rule.result.direction);
            let ruleSymbol = curr.tape.symbolAt(curr.tape.head + oppDirection);
            if (rule.result.symbol != ruleSymbol) continue;

            result.push(new TMState(curr.tape.moveAndWrite(oppDirection, rule.trigger.symbol), rule.trigger.state, false));
        }

        return result;
    }
}