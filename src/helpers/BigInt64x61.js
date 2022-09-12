class BigInt64x61 {
    static INT_PART = new BigInt64x61(2n ** 64n);
    static FRACT_PART = new BigInt64x61(2n ** 61n);
    static BOUND = new BigInt64x61(2n ** 125n);
    static ONE = new BigInt64x61(1n * this.FRACT_PART.value);
    static E = new BigInt64x61(BigInt("6267931151224907085"));
    static PI = new BigInt64x61(BigInt("7244019458077122842"));
    static HALF_PI = new BigInt64x61(BigInt("3622009729038561421"));
    static SQRT_2 = new BigInt64x61(BigInt("3260954456333195553"));

    value = BigInt(0);

    constructor(x) {
        if (typeof x != "bigint") { throw Error("Wrong Input"); }
        this.value = x;
    }

    static #assert64x61(x) {
        if (typeof x != "bigint") { throw Error("Wrong Input"); }
        if (x > -this.BOUND.value && x < this.BOUND.value) { return true; }
        return false;
    }

    static fromFloat(x) {
        if (typeof x != "number") { throw Error("Not a Number") }

        let x_parts = x.toString().split(".");
        let big_x = BigInt(x_parts[0]);
        if (big_x > this.INT_PART || big_x < -this.INT_PART) { throw Error("Out of Bounds"); }

        if (x_parts.length == 1) {
            return new BigInt64x61(big_x * this.FRACT_PART.value);
        } else {           
            let decimals_string = (x_parts[1]).toString().replace("0.","");
            let decimals_big = BigInt(decimals_string) * this.FRACT_PART.value;
            let final_decimals_big = decimals_big / (10n ** BigInt(decimals_string.length));
            return new BigInt64x61((big_x * this.FRACT_PART.value) + final_decimals_big);
        }
    }

    static sign(x) {
        if (!(x instanceof BigInt64x61)) { throw Error("Wrong Input"); }
        if (x.value < 0n) { return -1n; }
        if (x.value == 0n) { return 0n; }
        return 1n;
    }

    static abs(x) {
        if (!(x instanceof BigInt64x61)) { throw Error("Wrong Input"); }
        if (x.value < 0n) { return new BigInt64x61(-x.value);}
        return x;
    }

    static min(x, y) {
        if (!(x instanceof BigInt64x61) || !(y instanceof BigInt64x61)) { throw Error("Wrong Input"); }
        if (x.value < y.value) { return x;}
        return y;
    }

    static max(x, y) {
        if (!(x instanceof BigInt64x61) || !(y instanceof BigInt64x61)) { throw Error("Wrong Input"); }
        if (x.value > y.value) { return x;}
        return y;
    }

    static floor(x) {
        if (!(x instanceof BigInt64x61)) { throw Error("Wrong Input"); }
        return new BigInt64x61((x.value / BigInt64x61.ONE.value) * BigInt64x61.ONE.value);
    }

    static ceil(x) {
        if (!(x instanceof BigInt64x61)) { throw Error("Wrong Input"); }
        let floor = ((x.value / BigInt64x61.ONE.value) * BigInt64x61.ONE.value);
        return new BigInt64x61(floor + BigInt64x61.ONE.value);
    }

    static add(x, y) {
        if (!(x instanceof BigInt64x61 && y instanceof BigInt64x61)) { throw Error("Wrong Input"); }
        let res = new BigInt64x61(x.value + y.value);
        if (!BigInt64x61.#assert64x61(res.value)) { throw Error("Out of Bounds"); }
        return res;
    }

    static sub(x, y) {
        if (!(x instanceof BigInt64x61 && y instanceof BigInt64x61)) { throw Error("Wrong Input"); }
        let res = new BigInt64x61(x.value - y.value);
        if (!BigInt64x61.#assert64x61(res.value)) { throw Error("Out of Bounds"); }
        return res;
    }

    static mul(x, y) {
        if (!(x instanceof BigInt64x61 && y instanceof BigInt64x61)) { throw Error("Wrong Input"); }
        let res = new BigInt64x61((x.value * y.value) >> 61n);
        if (!BigInt64x61.#assert64x61(res.value)) { throw Error("Out of Bounds"); }
        return res;
    }

    static pow(x, y) {
        if (!(x instanceof BigInt64x61) || typeof y != "number") { throw Error("Wrong Input"); }
        if (x.value == 0n) { return new BigInt64x61(0n); }
        let mult = x.value;
        for (let i=1; i<y; i++) {
            mult = mult * x.value;
        }
        let res = new BigInt64x61(mult >> (BigInt(y-1) * 61n));
        if (!BigInt64x61.#assert64x61(res.value)) { throw Error("Out of Bounds"); }
        return res;
    }

    static div(x, y) {
        if (!(x instanceof BigInt64x61 && y instanceof BigInt64x61)) { throw Error("Wrong Input"); }
        let mult = new BigInt64x61(x.value * BigInt64x61.FRACT_PART.value);
        let res = new BigInt64x61(mult.value / y.value);
        if (!BigInt64x61.#assert64x61(res.value)) { throw Error("Out of Bounds"); }
        return res;
    }

    static mod(x, y) {
        if (!(x instanceof BigInt64x61 && y instanceof BigInt64x61)) { throw Error("Wrong Input"); }
        let res = new BigInt64x61(x.value % y.value);
        if (!BigInt64x61.#assert64x61(res.value)) { throw Error("Out of Bounds"); }
        return res;
    }

    static #smootherstep(x) {
        if (!(x instanceof BigInt64x61)) { throw Error("Wrong Input"); }
        let part_one = BigInt64x61.mul(BigInt64x61.fromFloat(6), BigInt64x61.pow(x, 5));
        let part_two = BigInt64x61.mul(BigInt64x61.fromFloat(15), BigInt64x61.pow(x, 4));
        let part_three = BigInt64x61.mul(BigInt64x61.fromFloat(10), BigInt64x61.pow(x, 3));
        return BigInt64x61.add(BigInt64x61.sub(part_one, part_two), part_three);
    }

    static interpolate(x, a, b) {
        if (!(x instanceof BigInt64x61 && a instanceof BigInt64x61 && b instanceof BigInt64x61)) { throw Error("Wrong Input"); }
        return BigInt64x61.add(a, BigInt64x61.mul(BigInt64x61.#smootherstep(x), BigInt64x61.sub(b,a)));
    }

    static sin(x) {
        if (!(x instanceof BigInt64x61)) { throw Error("Wrong Input"); }

        let _sign1 = BigInt64x61.sign(x); //1n
        let abs1 = BigInt64x61.abs(x); //1.5959..n

        let x1 = BigInt64x61.mod(abs1, new BigInt64x61(2n * BigInt64x61.PI.value));
        let x2 = BigInt64x61.mod(x1, BigInt64x61.PI);
        let rem = BigInt64x61.floor(BigInt64x61.div(x1, BigInt64x61.PI));

        let _sign2 = 1n - (2n * rem.toBigInt());
        let acc = BigInt64x61.#sin_loop(x2, 6n, BigInt64x61.ONE)
        let res2 = BigInt64x61.mul(x2, acc);

        return new BigInt64x61(res2.value * _sign1 * _sign2);
    }

    static cos(x) {
        if (!(x instanceof BigInt64x61)) { throw Error("Wrong Input"); }
        let shifted = BigInt64x61.sub(BigInt64x61.HALF_PI, x);
        return BigInt64x61.sin(shifted);
    }

    static #sin_loop(x, i, acc) {
        if (!(x instanceof BigInt64x61) || !(acc instanceof BigInt64x61) || typeof i != "bigint") { throw Error("Wrong Input"); }

        if (i == -1n) { return acc; }

        let num = BigInt64x61.mul(x, x);
        let div = new BigInt64x61((2n * i + 2n) * (2n * i + 3n) * BigInt64x61.FRACT_PART.value);
        let t = BigInt64x61.div(num, div);
        let t_acc = BigInt64x61.mul(t, acc)

        let next = BigInt64x61.#sin_loop(x, i - 1n, BigInt64x61.sub(BigInt64x61.ONE, t_acc));
        return (next)
    }

    toBigInt() {
        let res = this.value / BigInt64x61.FRACT_PART.value;
        return(res);
    }

    toFloat() {
        let floor_number = parseInt((this.value / BigInt64x61.ONE.value).toString());
        let number_binary = this.value.toString(2);
        let decimals_binary = number_binary.substring(Math.max(0, number_binary.length-61), number_binary.length);
        let padded_decimals_binary = decimals_binary.padStart(61,"0");
        let decimals_float = BigInt64x61.#parseFloatRadix("0." + padded_decimals_binary, 2);
        return(floor_number + decimals_float);
    }

    static #parseFloatRadix(num, radix) {
        return parseInt(num.replace('.', ''), radix) /
            Math.pow(radix, (num.split('.')[1] || '').length);
    }
}

export { BigInt64x61 }