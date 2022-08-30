class Noise {
    static noiseGrid(output_size, internal_grid_size, seed) {

        //This loops calculates all the constant vectors of the squares inside the internal grid
        let internal_grid = [];
        let nextSeed = seed;
        for (let i=0; i<((internal_grid_size+1)*(internal_grid_size+1)); i++) {
            let vec = DRNG.nextVector_64x61(nextSeed);
            nextSeed = vec.newSeed;
            internal_grid.push(vec.vector);
        }
        
        let NOISE = [];

        //Now that all internal grid vectors are calculated, we loop through every pixel and calculate its value
        for (let i=0; i<(output_size*output_size); i++) {

            //the pixel x, y coordinates
            let y = Math.floor(i/output_size);
            let x = i % output_size;
            
            //the pixels as points in the internal grid
            let internal_multiplier = internal_grid_size/output_size;
            let internal_y = y * internal_multiplier;
            let internal_x = x * internal_multiplier;
  
            //the internal grid square the point belongs to
            let internal_square_x = Math.floor(internal_x);
            let internal_square_y = Math.floor(internal_y);
  
            //the previous variables in 64x61 form
            let internal_multiplier_64x61 = BigInt64x61.div(BigInt64x61.fromFloat(internal_grid_size), BigInt64x61.fromFloat(output_size));
            let internal_y_64x61 = BigInt64x61.mul(BigInt64x61.fromFloat(y), internal_multiplier_64x61);
            let internal_x_64x61 = BigInt64x61.mul(BigInt64x61.fromFloat(x), internal_multiplier_64x61);
            let internal_square_y_64x61 = BigInt64x61.floor(internal_y_64x61);
            let internal_square_x_64x61 = BigInt64x61.floor(internal_x_64x61);
  
            //the directional vectors to the point from each of the internal square corners
            let directional_topLeft = [BigInt64x61.sub(internal_x_64x61, internal_square_x_64x61), BigInt64x61.sub(internal_y_64x61, internal_square_y_64x61)];
            let directional_topRight = [BigInt64x61.sub(internal_x_64x61, BigInt64x61.add(internal_square_x_64x61, BigInt64x61.ONE)), BigInt64x61.sub(internal_y_64x61, internal_square_y_64x61)];
            let directional_bottomLeft = [BigInt64x61.sub(internal_x_64x61, internal_square_x_64x61), BigInt64x61.sub(internal_y_64x61, BigInt64x61.add(internal_square_y_64x61, BigInt64x61.ONE))];
            let directional_bottomRight = [BigInt64x61.sub(internal_x_64x61, BigInt64x61.add(internal_square_x_64x61, BigInt64x61.ONE)), BigInt64x61.sub(internal_y_64x61, BigInt64x61.add(internal_square_y_64x61, BigInt64x61.ONE))];

            //the constant, pre-calculated vectors of the internal square corners
            let constant_topLeft = internal_grid[((internal_grid_size+1)*internal_square_y) + internal_square_x];
            let constant_topRight = internal_grid[((internal_grid_size+1)*internal_square_y) + internal_square_x + 1];
            let constant_bottomLeft = internal_grid[((internal_grid_size+1)*(internal_square_y +1)) + internal_square_x];
            let constant_bottomRight = internal_grid[((internal_grid_size+1)*(internal_square_y +1)) + internal_square_x + 1];

            //the dot product between the directional vectors and the constant vectors
            let dot_topLeft = BigInt64x61.add(BigInt64x61.mul(directional_topLeft[0], constant_topLeft[0]), BigInt64x61.mul(directional_topLeft[1], constant_topLeft[1]));
            let dot_topRight = BigInt64x61.add(BigInt64x61.mul(directional_topRight[0], constant_topRight[0]), BigInt64x61.mul(directional_topRight[1], constant_topRight[1]));
            let dot_bottomLeft = BigInt64x61.add(BigInt64x61.mul(directional_bottomLeft[0], constant_bottomLeft[0]), BigInt64x61.mul(directional_bottomLeft[1], constant_bottomLeft[1]));
            let dot_bottomRight = BigInt64x61.add(BigInt64x61.mul(directional_bottomRight[0], constant_bottomRight[0]), BigInt64x61.mul(directional_bottomRight[1], constant_bottomRight[1]));

            //Interpolation
            let xt = BigInt64x61.interpolate(BigInt64x61.sub(internal_x_64x61, internal_square_x_64x61), dot_topLeft, dot_topRight);
            let xb = BigInt64x61.interpolate(BigInt64x61.sub(internal_x_64x61, internal_square_x_64x61), dot_bottomLeft, dot_bottomRight);
            let result = BigInt64x61.interpolate(BigInt64x61.sub(internal_y_64x61, internal_square_y_64x61), xt, xb);

            let result_plus_one = BigInt64x61.add(result, BigInt64x61.ONE);
            let result_div_two = BigInt64x61.div(result_plus_one, BigInt64x61.fromFloat(2));

            NOISE.push(result_div_two);
        }

        return { grid: NOISE, newSeed: nextSeed };
    }

    static shapeGrid(output_size, type) {
        let SHAPE = [];

        for (let i=0; i<(output_size*output_size); i++) {
            //the pixel x, y coordinates
            let y = Math.floor(i/output_size);
            let x = i % output_size;

            //Coordinates from -1 to 1
            let y_mul2_64x61 = BigInt64x61.fromFloat(y*2);
            let x_mul2_64x61 = BigInt64x61.fromFloat(x*2);
            let output_size_min1_64x61 = BigInt64x61.fromFloat(output_size-1);
            let nx_64x61 = BigInt64x61.sub(BigInt64x61.div(x_mul2_64x61, output_size_min1_64x61), BigInt64x61.ONE);
            let ny_64x61 = BigInt64x61.sub(BigInt64x61.div(y_mul2_64x61, output_size_min1_64x61), BigInt64x61.ONE);

            //Shape function
            let return_64x61 = new BigInt64x61(BigInt(0));
            if (type == 0) { //Square Bump
                return_64x61 = BigInt64x61.mul(BigInt64x61.sub(BigInt64x61.ONE, BigInt64x61.pow(nx_64x61, 2)), BigInt64x61.sub(BigInt64x61.ONE, BigInt64x61.pow(ny_64x61, 2)));
            } else if (type == 1) {
                return_64x61 = BigInt64x61.sub(BigInt64x61.ONE, BigInt64x61.min(BigInt64x61.ONE, BigInt64x61.div(BigInt64x61.add(BigInt64x61.pow(nx_64x61,2), BigInt64x61.pow(ny_64x61, 2)), BigInt64x61.SQRT_2)));
            }

            SHAPE.push(return_64x61);
        }

        return SHAPE;
    }

    static contrast(grid, min, max) {
        let RESULT = [];
        let min_64x61 = BigInt64x61.fromFloat(min);
        let max_64x61 = BigInt64x61.fromFloat(max);
        for (let i=0; i<grid.length; i++) {
            let result = new BigInt64x61(BigInt(0));
            if (grid[i].value > min_64x61.value) {
                if (grid[i].value >= max_64x61.value) {
                    result = BigInt64x61.ONE;
                } else {
                    result = BigInt64x61.div(BigInt64x61.sub(grid[i], min_64x61), BigInt64x61.sub(max_64x61, min_64x61));
                    if (result.value > BigInt64x61.ONE.value) { result.value = BigInt64x61.ONE.value; }
                }
            }
            RESULT.push(result);
        }
        return RESULT;
    }

    static addGrids(gridA, gridB, multiplier) {
        if (gridA.length != gridB.length) { throw Error("Cannot add grids with different size"); }
        let ADD = [];
        for (let i=0; i<gridA.length; i++) {
            let multiplier_64x61 = BigInt64x61.fromFloat(multiplier);
            let sumValue_64x61 = BigInt64x61.add(gridA[i], BigInt64x61.mul(gridB[i], multiplier_64x61));
            if (sumValue_64x61.value > BigInt64x61.ONE.value) { sumValue_64x61.value = BigInt64x61.ONE.value; }
            ADD.push(sumValue_64x61);
        }
        return ADD;
    }

    static addConstant(gridA, constant) {
        let ADD = [];
        for (let i=0; i<gridA.length; i++) {
            let constant_64x61 = BigInt64x61.fromFloat(constant);
            let sumValue_64x61 = BigInt64x61.add(gridA[i], constant_64x61);
            if (sumValue_64x61.value > BigInt64x61.ONE.value) { sumValue_64x61.value = BigInt64x61.ONE.value; }
            ADD.push(sumValue_64x61);
        }
        return ADD;
    }

    static multiplyGrids(gridA, gridB) {
        if (gridA.length != gridB.length) { throw Error("Cannot multiply grids with different size"); }
        let MULT = [];
        for (let i=0; i<gridA.length; i++) {
            let mulValue_64x61 = BigInt64x61.mul(gridA[i], gridB[i]);
            if (mulValue_64x61.value > BigInt64x61.ONE.value) { mulValue_64x61.value = BigInt64x61.ONE.value; }
            MULT.push(mulValue_64x61);
        }
        return MULT;
    }
}