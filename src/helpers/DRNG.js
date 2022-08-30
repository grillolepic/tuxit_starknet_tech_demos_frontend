class DRNG {
    static seed(s) {
        let s0 = DRNG.#splitMix64(s);
        let s1 = DRNG.#splitMix64(s0);
        return [s0, s1];
    }

    static #splitMix64(x) {
        let z = BigInt.asUintN(64, BigInt(x) + BigInt("11400714819323198485"));
        z = BigInt.asUintN(64,(z ^ (z >> BigInt(30))) * BigInt("13787848793156543929"));
        z = BigInt.asUintN(64, (z ^ (z >> BigInt(27))) * BigInt("10723151780598845931"));
        return BigInt.asUintN(64, z ^ (z >> BigInt(31)));
    }

    static #rotl(x, k) { return BigInt.asUintN(64, ((x << k) | (x >> (BigInt(64) - k)))); }

    static next(seed) {
        seed[0] = BigInt(seed[0]);
        seed[1] = BigInt(seed[1]);

        let result = BigInt.asUintN(64, DRNG.#rotl(BigInt(seed[0]) * BigInt(5), BigInt(7)) * BigInt(9));

        seed[1] ^= seed[0];
        let new0 = BigInt.asUintN(64, DRNG.#rotl(seed[0], BigInt(24)) ^ seed[1] ^ (seed[1] << BigInt(16)));
        let new1 = DRNG.#rotl(seed[1], BigInt(37));

        let newSeed = [new0,new1];
        return { result, newSeed };
    }

    static nextVector_64x61(seed) {
        let nxt = DRNG.next(seed);
        let newSeed = nxt.newSeed;

        let rnd_64x61 = new BigInt64x61((nxt.result >> 3n) + 1n);
        let twice_pi_64x61 = new BigInt64x61(2n * BigInt64x61.PI.value);
        let result_angle = BigInt64x61.mul(rnd_64x61, twice_pi_64x61);

        let cos_64x61 = BigInt64x61.cos(result_angle);
        let sin_64x61 = BigInt64x61.sin(result_angle);

        let vector = [cos_64x61, sin_64x61];

        return { newSeed, vector };
    }
}