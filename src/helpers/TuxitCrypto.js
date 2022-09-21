import { number, hash, ec } from "starknet";
import BN  from 'bn.js';

class TuxitCrypto {

    static ALPHA = number.toBN(1);
    static BETA = number.toBN('3141592653589793238462643383279502884197169399375105820974944592307816406665');
    static FIELD_PRIME = number.toBN('3618502788666131213697322783095070105623107215331596699973092056135872020481');
    
    static #getYCoordinates(starkKey) {
        const red = BN.red(this.FIELD_PRIME);
        const x = number.toBN(starkKey, 'hex');
        const ySquared = x.mul(x).mul(x).add(this.ALPHA.mul(x)).add(this.BETA).mod(this.FIELD_PRIME);
        const redYSquared = ySquared.toRed(red);
        const y = redYSquared.redSqrt();
        const negY = y.redNeg();
        return { y, negY };
    };

    static getPublicKeys(starkKey) {
        starkKey = starkKey.substring(2);
        const { y, negY } = TuxitCrypto.#getYCoordinates(starkKey);
        
        const point1 = ec.ec.curve.pointFromJSON([starkKey, negY.toString(16)], false);
        const pubKey1 = '0x' + point1.encode('hex', true);

        const point2 = ec.ec.curve.pointFromJSON([starkKey, y.toString(16)], false);
        const pubKey2 = '0x' + point2.encode('hex', true);
        
        //Only one of these keys will verify messages. Don't knwow why
        return [pubKey1, pubKey2];
    }

    static #hashDataArray(dataArray) {
        if (!Array.isArray(dataArray) || dataArray.length == 0) { throw Error("No data to hash"); }

        let data = [...dataArray];

        for (let i=0; i<data.length; i++) {
            if (typeof data[i] == "bigint" || typeof data[i] == "number") {
                data[i] = number.toBN(data[i].toString());
            } else if (typeof data[i] == "string") {
                data[i] = number.toBN(data[i]);
            }
        };

        let _last = null;
        for (let i=0; i<data.length; i++) {
            if (_last == null) {
                _last = number.toBN(0);
            } else {
                _last = number.toBN(_last, "hex");
            }
            _last = (hash.pedersen([_last, data[i]])).substring(2);
        }

        return "0x" + _last;
    }

    static sign(data, keyPair) {
        const hashedData = TuxitCrypto.#hashDataArray(data);
        let signature = ec.sign(keyPair, hashedData);
        for (let s=0; s<signature.length; s++) {
            signature[s] = "0x" + BigInt(signature[s]).toString(16);
        }
        return { hashedData, signature };    
    }

    static verifySignature(data, signature, keyPairs, hash = null) {
        const hashedData = TuxitCrypto.#hashDataArray(data);
        let verified = false;
        if (hash != null) {
            if (hashedData != hash) { throw Error("Wrong hash"); }
        }

        //let decimalSignature = [];
        //signature.forEach((s) => { decimalSignature.push(BigInt(s).toString()); });

        if (Array.isArray(keyPairs)) {
            keyPairs.forEach(kp => {verified = verified || ec.verify(kp, hashedData, signature); })
        } else {
            verified = ec.verify(keyPairs, hashedData, signature);
        }
        return { hashedData, verified };
    }

    static FELT_LENGTH = 128;

    static toFelts(dataArray) {
        if (!Array.isArray(dataArray) || dataArray.length == 0) { throw Error("No data to convert to felts"); }
        let data = [...dataArray];

        let binaryData = [];
        let currentFelt = "";

        for (let i=0; i<data.length; i++) {
            if (typeof data[i] === 'object' && data[i] != null) {
                let bitLength = data[i].bits;

                if (Array.isArray(data[i].data)) {
                    let dataToAdd = [...data[i].data];
                    for (let j=0; j<dataToAdd.length; j++) {
                        if (typeof dataToAdd[j] == 'number') {
                            let bitsToAdd = dataToAdd[j].toString(2).padStart(bitLength,"0");
                            if ((currentFelt.length + bitLength) <= TuxitCrypto.FELT_LENGTH) {
                                currentFelt = bitsToAdd + currentFelt;
                            } else {
                                binaryData.push(currentFelt.padStart(TuxitCrypto.FELT_LENGTH, "0"));
                                currentFelt = bitsToAdd;
                            }
                        } else { throw Error("Wrong data format"); }
                    }
                } else if (typeof data[i].data == 'number' || typeof data[i].data == 'bigint') {
                    let bitsToAdd = data[i].data.toString(2).padStart(bitLength,"0");
                    if ((currentFelt.length + bitLength) <= TuxitCrypto.FELT_LENGTH) {
                        currentFelt = bitsToAdd + currentFelt;
                    } else {
                        binaryData.push(currentFelt.padStart(TuxitCrypto.FELT_LENGTH, "0"));
                        currentFelt = bitsToAdd;
                    }
                } else if (typeof data[i].data == 'string') {
                    let bitsToAdd = BigInt(data[i].data).toString(2).padStart(bitLength,"0");
                    if ((currentFelt.length + bitLength) <= TuxitCrypto.FELT_LENGTH) {
                        currentFelt = bitsToAdd + currentFelt;
                    } else {
                        binaryData.push(currentFelt.padStart(TuxitCrypto.FELT_LENGTH, "0"));
                        currentFelt = bitsToAdd;
                    }
                } else { throw Error("Wrong data format"); }
            } else { throw Error("Wrong data format"); }

            if ("forceNext" in data[i] && data[i].forceNext) {
                if (currentFelt.length > 0) {
                    binaryData.push(currentFelt.padStart(TuxitCrypto.FELT_LENGTH, "0"));
                    currentFelt = "";
                }
            }
        }

        if (currentFelt.length > 0) {
            binaryData.push(currentFelt.padStart(TuxitCrypto.FELT_LENGTH, "0"));
        }

        let hexData = [];
        for (let i=0; i<binaryData.length; i++) {
            hexData.push("0x" + BigInt(`0b${binaryData[i]}`).toString(16));
        }

        return hexData;
    }

    static fromFelts(feltsArray, dataFormat) {
        if (!Array.isArray(feltsArray) || feltsArray.length == 0) { throw Error("No felt Array"); }
        if (!Array.isArray(dataFormat) || dataFormat.length == 0) { throw Error("No data format Array"); }

        let felts = [...feltsArray];
        let format = [...dataFormat];
        
        let binaryFelts = [];
        for (let i=0; i<felts.length; i++) {
            let _binary = BigInt(felts[i]).toString(2).padStart(TuxitCrypto.FELT_LENGTH,"0");
            binaryFelts.push(_binary);
        }

        let result = {};
        let currentFormatIndex = 0;
        let lastBitLength = 0;
        let currentBitLength = format[currentFormatIndex].bits;
        let isCurrentFormatArray = ("length" in format[currentFormatIndex]);
        
        result[format[currentFormatIndex].name] = isCurrentFormatArray?[]:null;
        
        for (let i=0; i<binaryFelts.length; i++) {
            for (let j = binaryFelts[i].length; j >= currentBitLength; j -= lastBitLength) {

                let _binaryRead = binaryFelts[i].substring(j-currentBitLength, j);

                let resultType = ("type" in format[currentFormatIndex])?format[currentFormatIndex].type:'number';
                let _resultValue;
                if (resultType == 'number') {
                    _resultValue = parseInt(_binaryRead, 2);
                } else if (resultType == 'bigint') {
                    _resultValue = BigInt("0b" + _binaryRead);
                } else if (resultType == 'hex') {
                    _resultValue = "0x" + BigInt("0b" + _binaryRead).toString(16);
                } else if (resultType == 'bool') {
                    _resultValue = parseInt(_binaryRead, 2) > 0;
                }

                lastBitLength = currentBitLength;

                if (isCurrentFormatArray) {
                    result[format[currentFormatIndex].name].push(_resultValue);
                } else {
                    result[format[currentFormatIndex].name] = _resultValue;
                }
                
                let forceNext = false;

                if (!isCurrentFormatArray || result[format[currentFormatIndex].name].length == format[currentFormatIndex].length) {
                    while (true) {
                        if (!forceNext && "forceNext" in format[currentFormatIndex]) {
                            forceNext = format[currentFormatIndex].forceNext;
                        }
                        
                        currentFormatIndex++;
                        if (currentFormatIndex == format.length) { break; }
                        
                        currentBitLength = format[currentFormatIndex].bits;
                        isCurrentFormatArray = ("length" in format[currentFormatIndex]);
                        if (isCurrentFormatArray && format[currentFormatIndex].length == 'prev') {
                            format[currentFormatIndex].length = _resultValue;
                        }
                        result[format[currentFormatIndex].name] = isCurrentFormatArray?[]:null;

                        if (!isCurrentFormatArray) {break;}
                        if (isCurrentFormatArray && format[currentFormatIndex].length > 0) { break; }
                    }
                    if (currentFormatIndex == format.length) { break; }
                    if (forceNext) { break; }
                }
            }
            if (currentFormatIndex == format.length) { break; }
        }

        return result;
    }
}

export { TuxitCrypto }