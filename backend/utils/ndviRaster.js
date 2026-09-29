// backend/utils/ndviRaster.js

const GeoTIFF = require("geotiff");

/*
====================================================
CALCULATE MEAN VALUE FROM COPERNICUS RASTER
====================================================

This function is used for:
- NDVI raster
- NDWI raster

Copernicus returns the raster as a GeoTIFF Buffer.
We read all valid pixel values and calculate their mean.
*/

const calculateMeanNDVI = async (buffer) => {
  console.log("======================================");
  console.log("RASTER MEAN CALCULATION");
  console.log("======================================");

  try {
    // ---------------------------------------------
    // 1. Validate buffer
    // ---------------------------------------------
    if (!buffer) {
      throw new Error("Raster buffer is missing");
    }

    if (!Buffer.isBuffer(buffer)) {
      throw new Error(
        `Expected Buffer but received ${typeof buffer}`
      );
    }

    console.log("Raster type:", buffer.constructor.name);
    console.log("Raster length:", buffer.length);

    if (buffer.length === 0) {
      throw new Error("Raster buffer is empty");
    }

    // ---------------------------------------------
    // 2. Convert Node Buffer to ArrayBuffer
    // ---------------------------------------------
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );

    console.log("ArrayBuffer created successfully");

    // ---------------------------------------------
    // 3. Read GeoTIFF
    // ---------------------------------------------
    const tiff =
      await GeoTIFF.fromArrayBuffer(arrayBuffer);

    console.log("GeoTIFF loaded successfully");

    // ---------------------------------------------
    // 4. Get first image
    // ---------------------------------------------
    const image =
      await tiff.getImage();

    console.log(
      "Image width:",
      image.getWidth()
    );

    console.log(
      "Image height:",
      image.getHeight()
    );

    console.log(
      "Samples per pixel:",
      image.getSamplesPerPixel()
    );

    // ---------------------------------------------
    // 5. Read raster pixels
    // ---------------------------------------------
    const values =
      await image.readRasters({
        interleave: true,
      });

    console.log(
      "Raster pixels:",
      values.length
    );

    if (!values || values.length === 0) {
      throw new Error(
        "No raster pixel values found"
      );
    }

    // ---------------------------------------------
    // 6. Calculate mean
    // ---------------------------------------------
    let sum = 0;
    let count = 0;

    let min = Infinity;
    let max = -Infinity;

    let invalidCount = 0;

    // Show first few values for debugging
    console.log(
      "First raster values:",
      Array.from(values).slice(0, 10)
    );

    for (let i = 0; i < values.length; i++) {
      const value = Number(values[i]);

      /*
      NDVI / NDWI theoretical range:

      -1 to +1

      Ignore:
      - NaN
      - Infinity
      - NoData
      - invalid values outside range
      */

      if (
        Number.isFinite(value) &&
        value >= -1 &&
        value <= 1
      ) {
        sum += value;
        count++;

        if (value < min) {
          min = value;
        }

        if (value > max) {
          max = value;
        }
      } else {
        invalidCount++;
      }
    }

    console.log("Valid pixels:", count);
    console.log("Invalid pixels:", invalidCount);
    console.log("Minimum value:", min);
    console.log("Maximum value:", max);

    // ---------------------------------------------
    // 7. No valid pixels
    // ---------------------------------------------
    if (count === 0) {
      throw new Error(
        "No valid raster pixels found between -1 and 1"
      );
    }

    // ---------------------------------------------
    // 8. Calculate average
    // ---------------------------------------------
    const mean = sum / count;

    const roundedMean =
      Number(mean.toFixed(4));

    console.log(
      "Mean raster value:",
      roundedMean
    );

    console.log("======================================");

    return roundedMean;

  } catch (error) {
    console.error(
      "======================================"
    );

    console.error(
      "RASTER CALCULATION ERROR"
    );

    console.error(
      error.message
    );

    console.error(
      error.stack
    );

    console.error(
      "======================================"
    );

    throw error;
  }
};


/*
====================================================
EXPORT
====================================================
*/

module.exports = {
  calculateMeanNDVI,
};