const dns = require("dns");
const https = require("https");
const axios = require("axios");
const uploadSatelliteImage = require("../utils/uploadSatelliteImage");
// ============================================================
// FORCE IPV4
// ============================================================

dns.setDefaultResultOrder("ipv4first");

const ipv4Agent = new https.Agent({
  family: 4,
  keepAlive: true,
});

// ============================================================
// UTILITIES
// ============================================================

const {
  classifyNDVI,
} = require("../utils/ndviCalculator");

const {
  calculateMeanNDVI,
} = require("../utils/ndviRaster");

// ============================================================
// COPERNICUS DATA SPACE CONFIG
// ============================================================

const COPERNICUS_TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

const COPERNICUS_PROCESS_URL =
  "https://sh.dataspace.copernicus.eu/process/v1";

const COPERNICUS_CRS =
  "http://www.opengis.net/def/crs/OGC/1.3/CRS84";

// ============================================================
// VALIDATE COORDINATES
// ============================================================

const validateCoordinates = (
  latitude,
  longitude
) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    throw new Error(
      "Latitude and longitude must be valid numbers."
    );
  }

  if (lat < -90 || lat > 90) {
    throw new Error(
      "Latitude must be between -90 and 90."
    );
  }

  if (lon < -180 || lon > 180) {
    throw new Error(
      "Longitude must be between -180 and 180."
    );
  }

  return true;
};

// ============================================================
// CREATE BOUNDING BOX
// ============================================================

const createBBox = (
  latitude,
  longitude,
  size = 0.002
) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  validateCoordinates(lat, lon);

  return [
    lon - size,
    lat - size,
    lon + size,
    lat + size,
  ];
};

// ============================================================
// CREATE DATE RANGE
//
// ±15 DAYS AROUND SELECTED DATE
// ============================================================

const createDateRange = (
  date
) => {
  const center =
    new Date(date);

  if (
    Number.isNaN(
      center.getTime()
    )
  ) {
    throw new Error(
      "Invalid satellite date."
    );
  }

  const from =
    new Date(
      center.getTime() -
        15 *
          24 *
          60 *
          60 *
          1000
    );

  const to =
    new Date(
      center.getTime() +
        15 *
          24 *
          60 *
          60 *
          1000
    );

  return {
    from:
      from.toISOString(),

    to:
      to.toISOString(),
  };
};

// ============================================================
// GET COPERNICUS ACCESS TOKEN
// ============================================================

const getAccessToken =
  async () => {
    try {
      console.log(
        "======================================"
      );

      console.log(
        "REQUESTING COPERNICUS ACCESS TOKEN"
      );

      console.log(
        "======================================"
      );

      if (
        !process.env.COPERNICUS_CLIENT_ID ||
        !process.env.COPERNICUS_CLIENT_SECRET
      ) {
        throw new Error(
          "COPERNICUS_CLIENT_ID or COPERNICUS_CLIENT_SECRET is missing from .env"
        );
      }

      const params =
        new URLSearchParams();

      params.append(
        "grant_type",
        "client_credentials"
      );

      params.append(
        "client_id",
        process.env.COPERNICUS_CLIENT_ID
      );

      params.append(
        "client_secret",
        process.env.COPERNICUS_CLIENT_SECRET
      );

      const response =
        await axios.post(
          COPERNICUS_TOKEN_URL,
          params.toString(),
          {
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded",

              Accept:
                "application/json",
            },

            timeout: 30000,

            httpsAgent:
              ipv4Agent,

            validateStatus:
              () => true,
          }
        );

      console.log(
        "Copernicus token HTTP status:",
        response.status
      );

      if (
        response.status < 200 ||
        response.status >= 300
      ) {
        console.error(
          "Copernicus token error:",
          response.data
        );

        throw new Error(
          `Copernicus authentication failed with status ${response.status}`
        );
      }

      if (
        !response.data?.access_token
      ) {
        throw new Error(
          "Copernicus response did not contain an access token."
        );
      }

      console.log(
        "Copernicus authentication successful."
      );

      return response.data.access_token;
    } catch (error) {
      console.error(
        "======================================"
      );

      console.error(
        "COPERNICUS AUTHENTICATION ERROR"
      );

      console.error(
        error.message
      );

      console.error(
        "======================================"
      );

      throw error;
    }
  };

// ============================================================
// NDVI EVALSCRIPT
//
// B04 = RED
// B08 = NIR
// ============================================================

const NDVI_EVALSCRIPT = `
//VERSION=3

function setup() {

  return {

    input: [
      {
        bands: ["B04", "B08"],
        units: "REFLECTANCE"
      }
    ],

    output: {
      id: "default",
      bands: 1,
      sampleType: "FLOAT32"
    }

  };

}

function evaluatePixel(sample) {

  const red = sample.B04;
  const nir = sample.B08;

  const denominator = nir + red;

  if (denominator === 0) {
    return [0];
  }

  return [
    (nir - red) / denominator
  ];

}
`;

// ============================================================
// NDWI EVALSCRIPT
//
// B03 = GREEN
// B08 = NIR
// ============================================================

const NDWI_EVALSCRIPT = `
//VERSION=3

function setup() {

  return {

    input: [
      {
        bands: ["B03", "B08"],
        units: "REFLECTANCE"
      }
    ],

    output: {
      id: "default",
      bands: 1,
      sampleType: "FLOAT32"
    }

  };

}

function evaluatePixel(sample) {

  const green = sample.B03;
  const nir = sample.B08;

  const denominator = green + nir;

  if (denominator === 0) {
    return [0];
  }

  return [
    (green - nir) / denominator
  ];

}
`;

// ============================================================
// TRUE COLOR EVALSCRIPT
//
// B02 = BLUE
// B03 = GREEN
// B04 = RED
// ============================================================

const TRUE_COLOR_EVALSCRIPT = `
//VERSION=3

function setup() {

  return {

    input: [
      {
        bands: [
          "B02",
          "B03",
          "B04"
        ],
        units: "REFLECTANCE"
      }
    ],

    output: {
      bands: 3,
      sampleType: "AUTO"
    }

  };

}

function evaluatePixel(sample) {

  return [
    2.5 * sample.B04,
    2.5 * sample.B03,
    2.5 * sample.B02
  ];

}
`;

// ============================================================
// BUILD INDEX REQUEST
// ============================================================

const buildIndexRequest = ({
  bbox,
  from,
  to,
  evalscript,
  width = 100,
  height = 100,
}) => {
  return {
    input: {
      bounds: {
        bbox,

        properties: {
          crs:
            COPERNICUS_CRS,
        },
      },

      data: [
        {
          type:
            "sentinel-2-l2a",

          dataFilter: {
            timeRange: {
              from,
              to,
            },

            mosaickingOrder:
              "leastCC",
          },

          processing: {
            harmonizeValues:
              true,
          },
        },
      ],
    },

    output: {
      width,

      height,

      responses: [
        {
          identifier:
            "default",

          format: {
            type:
              "image/tiff",
          },
        },
      ],
    },

    evalscript,
  };
};

// ============================================================
// BUILD SATELLITE IMAGE REQUEST
// ============================================================

const buildImageRequest = ({
  bbox,
  from,
  to,
}) => {
  return {
    input: {
      bounds: {
        bbox,

        properties: {
          crs:
            COPERNICUS_CRS,
        },
      },

      data: [
        {
          type:
            "sentinel-2-l2a",

          dataFilter: {
            timeRange: {
              from,
              to,
            },

            mosaickingOrder:
              "leastCC",
          },

          processing: {
            harmonizeValues:
              true,
          },
        },
      ],
    },

    output: {
      width: 600,

      height: 600,

      responses: [
        {
          identifier:
            "default",

          format: {
            type:
              "image/png",
          },
        },
      ],
    },

    evalscript:
      TRUE_COLOR_EVALSCRIPT,
  };
};

// ============================================================
// REQUEST COPERNICUS PROCESS API
// ============================================================

const requestCopernicus =
  async ({
    token,
    body,
    responseType = "arraybuffer",
  }) => {
    try {
      const response =
        await axios.post(
          COPERNICUS_PROCESS_URL,
          body,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",

              Accept:
                body
                  ?.output
                  ?.responses?.[0]
                  ?.format?.type ||
                "*/*",
            },

            responseType,

            timeout: 120000,

            httpsAgent:
              ipv4Agent,

            validateStatus:
              () => true,
          }
        );

      if (
        response.status < 200 ||
        response.status >= 300
      ) {
        let errorMessage =
          "Unknown Copernicus error.";

        if (
          response.data &&
          Buffer.isBuffer(
            response.data
          )
        ) {
          errorMessage =
            response.data.toString(
              "utf8"
            );
        } else if (
          typeof response.data ===
          "string"
        ) {
          errorMessage =
            response.data;
        } else if (
          response.data
        ) {
          errorMessage =
            JSON.stringify(
              response.data
            );
        }

        console.error(
          "Copernicus Process API error:",
          response.status,
          errorMessage
        );

        throw new Error(
          `Copernicus Process API failed with status ${response.status}: ${errorMessage}`
        );
      }

      return response.data;
    } catch (error) {
      console.error(
        "======================================"
      );

      console.error(
        "COPERNICUS PROCESS REQUEST ERROR"
      );

      console.error(
        error.message
      );

      console.error(
        "======================================"
      );

      throw error;
    }
  };

// ============================================================
// CALCULATE RASTER INDEX
// ============================================================

const calculateIndexResult =
  async (raster) => {
    try {
      console.log(
        "======================================"
      );

      console.log(
        "CALCULATING RASTER MEAN"
      );

      console.log(
        "Raster exists:",
        !!raster
      );

      console.log(
        "Raster type:",
        raster?.constructor?.name
      );

      console.log(
        "Raster length:",
        raster?.length
      );

      console.log(
        "======================================"
      );

      const value =
        await calculateMeanNDVI(
          raster
        );

      console.log(
        "Calculated raster mean:",
        value
      );

      if (
        !Number.isFinite(value)
      ) {
        throw new Error(
          `Invalid raster mean: ${value}`
        );
      }

      return Number(value);
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
        "======================================"
      );

      throw error;
    }
  };

// ============================================================
// CALCULATE NDVI RESULT
// ============================================================

const calculateNDVIResult =
  async (raster) => {
    const ndvi =
      await calculateIndexResult(
        raster
      );

    return {
      ndvi,

      classification:
        classifyNDVI(ndvi),
    };
  };

// ============================================================
// NORMALIZE INDEX
//
// -1 -> 0
//  0 -> 50
// +1 -> 100
// ============================================================

const normalizeIndex = (
  value
) => {
  if (
    !Number.isFinite(value)
  ) {
    return 50;
  }

  const normalized =
    ((value + 1) / 2) * 100;

  return Math.max(
    0,
    Math.min(
      100,
      Number(
        normalized.toFixed(2)
      )
    )
  );
};

// ============================================================
// CALCULATE SATELLITE INDICATORS
// ============================================================

const calculateSatelliteIndicators =
  ({
    ndvi,
    ndwi,
  }) => {
    const vegetation =
      normalizeIndex(ndvi);

    const waterAvailability =
      normalizeIndex(ndwi);

    const waterRetention =
      normalizeIndex(ndwi);

    /*
     * NDVI is only an environmental proxy here.
     * It does NOT directly measure physical structures.
     */
    const structureCondition =
      normalizeIndex(ndvi);

    /*
     * NDWI is only an environmental proxy here.
     * It does NOT directly measure maintenance.
     */
    const maintenance =
      normalizeIndex(ndwi);

    const overall =
      (
        vegetation +
        waterAvailability +
        waterRetention +
        structureCondition +
        maintenance
      ) / 5;

    return {
      vegetation:
        Number(
          vegetation.toFixed(2)
        ),

      waterAvailability:
        Number(
          waterAvailability.toFixed(2)
        ),

      waterRetention:
        Number(
          waterRetention.toFixed(2)
        ),

      structureCondition:
        Number(
          structureCondition.toFixed(2)
        ),

      maintenance:
        Number(
          maintenance.toFixed(2)
        ),

      overall:
        Number(
          overall.toFixed(2)
        ),
    };
  };

// ============================================================
// FETCH NDVI
// ============================================================

const fetchNDVI =
  async ({
    latitude,
    longitude,
    from,
    to,
    token,
  }) => {
    const bbox =
      createBBox(
        latitude,
        longitude
      );

    console.log(
      "======================================"
    );

    console.log(
      "SATELLITE NDVI REQUEST"
    );

    console.log(
      "Latitude:",
      latitude
    );

    console.log(
      "Longitude:",
      longitude
    );

    console.log(
      "From:",
      from
    );

    console.log(
      "To:",
      to
    );

    console.log(
      "Bounding box:",
      bbox
    );

    console.log(
      "======================================"
    );

    const body =
      buildIndexRequest({
        bbox,

        from,

        to,

        evalscript:
          NDVI_EVALSCRIPT,

        width: 100,

        height: 100,
      });

    return requestCopernicus({
      token,

      body,

      responseType:
        "arraybuffer",
    });
  };

// ============================================================
// FETCH NDWI
// ============================================================

const fetchNDWI =
  async ({
    latitude,
    longitude,
    from,
    to,
    token,
  }) => {
    const bbox =
      createBBox(
        latitude,
        longitude
      );

    console.log(
      "======================================"
    );

    console.log(
      "SATELLITE NDWI REQUEST"
    );

    console.log(
      "Latitude:",
      latitude
    );

    console.log(
      "Longitude:",
      longitude
    );

    console.log(
      "From:",
      from
    );

    console.log(
      "To:",
      to
    );

    console.log(
      "Bounding box:",
      bbox
    );

    console.log(
      "======================================"
    );

    const body =
      buildIndexRequest({
        bbox,

        from,

        to,

        evalscript:
          NDWI_EVALSCRIPT,

        width: 100,

        height: 100,
      });

    return requestCopernicus({
      token,

      body,

      responseType:
        "arraybuffer",
    });
  };

// ============================================================
// FETCH TRUE COLOR SATELLITE IMAGE
// ============================================================

const fetchSatelliteImage =
  async ({
    latitude,
    longitude,
    from,
    to,
    token,
  }) => {
    const bbox =
      createBBox(
        latitude,
        longitude
      );

    console.log(
      "======================================"
    );

    console.log(
      "SATELLITE IMAGE REQUEST"
    );

    console.log(
      "Latitude:",
      latitude
    );

    console.log(
      "Longitude:",
      longitude
    );

    console.log(
      "From:",
      from
    );

    console.log(
      "To:",
      to
    );

    console.log(
      "Bounding box:",
      bbox
    );

    console.log(
      "======================================"
    );

    const body =
      buildImageRequest({
        bbox,

        from,

        to,
      });

    return requestCopernicus({
      token,

      body,

      responseType:
        "arraybuffer",
    });
  };

// ============================================================
// BUFFER -> DATA URL
// ============================================================

const bufferToDataUrl = (
  buffer,
  mimeType = "image/png"
) => {
  if (!buffer) {
    return null;
  }

  if (!Buffer.isBuffer(buffer)) {
    throw new Error(
      "Expected Buffer while converting satellite image."
    );
  }

  if (buffer.length === 0) {
    return null;
  }

  return `data:${mimeType};base64,${buffer.toString(
    "base64"
  )}`;
};

// ============================================================
// GET SATELLITE NDVI
// ============================================================

const getSatelliteNDVI =
  async ({
    latitude,
    longitude,
    date,
    dateFrom,
    dateTo,
  }) => {
    validateCoordinates(
      latitude,
      longitude
    );

    let from;
    let to;

    // ==================================================
    // CUSTOM RANGE
    // ==================================================

    if (
      dateFrom &&
      dateTo
    ) {
      from =
        new Date(dateFrom);

      to =
        new Date(dateTo);
    }

    // ==================================================
    // SINGLE DATE
    // ==================================================

    else if (date) {
      const range =
        createDateRange(date);

      from =
        new Date(range.from);

      to =
        new Date(range.to);
    }

    // ==================================================
    // DEFAULT RANGE
    // ==================================================

    else {
      const range =
        createDateRange(
          new Date().toISOString()
        );

      from =
        new Date(range.from);

      to =
        new Date(range.to);
    }

    // ==================================================
    // DATE VALIDATION
    // ==================================================

    if (
      Number.isNaN(
        from.getTime()
      ) ||
      Number.isNaN(
        to.getTime()
      )
    ) {
      throw new Error(
        "Invalid satellite date range."
      );
    }

    if (to <= from) {
      throw new Error(
        "Satellite dateTo must be later than dateFrom."
      );
    }

    console.log(
      "======================================"
    );

    console.log(
      "SATELLITE NDVI REQUEST"
    );

    console.log(
      "Latitude:",
      latitude
    );

    console.log(
      "Longitude:",
      longitude
    );

    console.log(
      "Date From:",
      from.toISOString()
    );

    console.log(
      "Date To:",
      to.toISOString()
    );

    const token =
      await getAccessToken();

    const raster =
      await fetchNDVI({
        latitude,

        longitude,

        from:
          from.toISOString(),

        to:
          to.toISOString(),

        token,
      });

    const result =
      await calculateNDVIResult(
        raster
      );

    console.log(
      "NDVI:",
      result.ndvi
    );

    console.log(
      "Classification:",
      result.classification
    );

    console.log(
      "======================================"
    );

    return {
      ndvi:
        result.ndvi,

      classification:
        result.classification,

      dateFrom:
        from,

      dateTo:
        to,

      source:
        "Copernicus Sentinel-2 L2A",
    };
  };

// ============================================================
// MAIN SATELLITE ANALYSIS
// ============================================================

// ============================================================
// MAIN SATELLITE ANALYSIS
// ============================================================

const performSatelliteAnalysis = async ({
  latitude,
  longitude,
  beforeFrom,
  beforeTo,
  afterFrom,
  afterTo,
  beforeDate,
  afterDate,
}) => {
  console.log("======================================");
  console.log("STARTING SATELLITE ANALYSIS");
  console.log("Latitude:", latitude);
  console.log("Longitude:", longitude);
  console.log("======================================");

  // ==========================================================
  // VALIDATE COORDINATES
  // ==========================================================

  validateCoordinates(latitude, longitude);

  // ==========================================================
  // VALIDATE DATE RANGES
  // ==========================================================

  const beforeFromDate = new Date(beforeFrom);
  const beforeToDate = new Date(beforeTo);

  const afterFromDate = new Date(afterFrom);
  const afterToDate = new Date(afterTo);

  if (
    Number.isNaN(beforeFromDate.getTime()) ||
    Number.isNaN(beforeToDate.getTime())
  ) {
    throw new Error("Invalid BEFORE satellite date range.");
  }

  if (
    Number.isNaN(afterFromDate.getTime()) ||
    Number.isNaN(afterToDate.getTime())
  ) {
    throw new Error("Invalid AFTER satellite date range.");
  }

  if (beforeToDate <= beforeFromDate) {
    throw new Error(
      "BEFORE satellite dateTo must be later than dateFrom."
    );
  }

  if (afterToDate <= afterFromDate) {
    throw new Error(
      "AFTER satellite dateTo must be later than dateFrom."
    );
  }

  // ==========================================================
  // TOKEN
  // ==========================================================

  const token = await getAccessToken();

  // ==========================================================
  // BEFORE SATELLITE DATA
  // ==========================================================

  console.log("======================================");
  console.log("FETCHING BEFORE SATELLITE DATA");
  console.log("From:", beforeFromDate.toISOString());
  console.log("To:", beforeToDate.toISOString());
  console.log("======================================");

  const beforeNDVIRaster = await fetchNDVI({
    latitude,
    longitude,
    from: beforeFromDate.toISOString(),
    to: beforeToDate.toISOString(),
    token,
  });

  const beforeNDWIRaster = await fetchNDWI({
    latitude,
    longitude,
    from: beforeFromDate.toISOString(),
    to: beforeToDate.toISOString(),
    token,
  });

  // ==========================================================
  // BEFORE TRUE-COLOR IMAGE
  // IMPORTANT:
  // Keep this variable immediately after the fetch.
  // ==========================================================

  const beforeImageBuffer = await fetchSatelliteImage({
    latitude,
    longitude,
    from: beforeFromDate.toISOString(),
    to: beforeToDate.toISOString(),
    token,
  });

  console.log(
    "BEFORE IMAGE BUFFER:",
    beforeImageBuffer
      ? `${beforeImageBuffer.length} bytes`
      : "MISSING"
  );

  // ==========================================================
  // BEFORE IMAGE DATA URL
  // ==========================================================

  const beforeImageDataUrl = bufferToDataUrl(
    beforeImageBuffer,
    "image/png"
  );

  console.log(
    "BEFORE IMAGE DATA URL AVAILABLE:",
    !!beforeImageDataUrl
  );

  // ==========================================================
  // BEFORE CALCULATIONS
  // ==========================================================

  const beforeNDVI = await calculateNDVIResult(
    beforeNDVIRaster
  );

  const beforeNDWI = await calculateIndexResult(
    beforeNDWIRaster
  );
const beforeSatelliteDate =
  beforeNDVIRaster?.satelliteDate ||
  beforeNDWIRaster?.satelliteDate ||
  null;
  console.log("BEFORE NDVI:", beforeNDVI.ndvi);
  console.log("BEFORE NDVI CLASS:", beforeNDVI.classification);
  console.log("BEFORE NDWI:", beforeNDWI);

  // ==========================================================
  // AFTER SATELLITE DATA
  // ==========================================================

  console.log("======================================");
  console.log("FETCHING AFTER SATELLITE DATA");
  console.log("From:", afterFromDate.toISOString());
  console.log("To:", afterToDate.toISOString());
  console.log("======================================");

  const afterNDVIRaster = await fetchNDVI({
    latitude,
    longitude,
    from: afterFromDate.toISOString(),
    to: afterToDate.toISOString(),
    token,
  });

  const afterNDWIRaster = await fetchNDWI({
    latitude,
    longitude,
    from: afterFromDate.toISOString(),
    to: afterToDate.toISOString(),
    token,
  });
const afterNDVIRasterResult =
  await calculateNDVIResult(afterNDVIRaster);

const afterNDWI =
  await calculateIndexResult(afterNDWIRaster);

const afterSatelliteDate =
  afterNDVIRaster?.satelliteDate ||
  afterNDWIRaster?.satelliteDate ||
  null;
  // ==========================================================
  // AFTER TRUE-COLOR IMAGE
  // ==========================================================

  const afterImageBuffer = await fetchSatelliteImage({
    latitude,
    longitude,
    from: afterFromDate.toISOString(),
    to: afterToDate.toISOString(),
    token,
  });

  console.log(
    "AFTER IMAGE BUFFER:",
    afterImageBuffer
      ? `${afterImageBuffer.length} bytes`
      : "MISSING"
  );

  // ==========================================================
  // AFTER IMAGE DATA URL
  // ==========================================================

  const afterImageDataUrl = bufferToDataUrl(
    afterImageBuffer,
    "image/png"
  );

  console.log(
    "AFTER IMAGE DATA URL AVAILABLE:",
    !!afterImageDataUrl
  );

  // ==========================================================
  // AFTER CALCULATIONS
  // ==========================================================

  const afterNDVI = await calculateNDVIResult(
    afterNDVIRaster
  );

 

  console.log("AFTER NDVI:", afterNDVI.ndvi);
  console.log("AFTER NDVI CLASS:", afterNDVI.classification);
  console.log("AFTER NDWI:", afterNDWI);

  // ==========================================================
  // SATELLITE INDICATORS
  // ==========================================================

  const beforeIndicators =
    calculateSatelliteIndicators({
      ndvi: beforeNDVI.ndvi,
      ndwi: beforeNDWI,
    });

  const afterIndicators =
    calculateSatelliteIndicators({
      ndvi: afterNDVI.ndvi,
      ndwi: afterNDWI,
    });

  // ==========================================================
  // CHANGES
  // ==========================================================

  const ndviChange = Number(
    (
      afterNDVI.ndvi -
      beforeNDVI.ndvi
    ).toFixed(4)
  );

  const ndwiChange = Number(
    (
      afterNDWI -
      beforeNDWI
    ).toFixed(4)
  );

  const overallChange = Number(
    (
      afterIndicators.overall -
      beforeIndicators.overall
    ).toFixed(2)
  );

  // ==========================================================
  // NDVI PERCENTAGE CHANGE
  // ==========================================================

  const ndviPercentageChange =
    beforeNDVI.ndvi === 0
      ? 0
      : Number(
          (
            (ndviChange /
              Math.abs(beforeNDVI.ndvi)) *
            100
          ).toFixed(2)
        );

  // ==========================================================
  // CHANGE DIRECTION
  // ==========================================================

  let direction = "No significant change";

  if (ndviChange > 0) {
    direction = "Vegetation increased";
  } else if (ndviChange < 0) {
    direction = "Vegetation decreased";
  }

  // ==========================================================
  // FINAL IMAGE VARIABLES
  //
  // IMPORTANT:
  // We intentionally use different names from the old
  // beforeImage / afterImage variables.
  // ==========================================================

  const beforeImageUrl =
    beforeImageDataUrl || null;

  const afterImageUrl =
    afterImageDataUrl || null;

  console.log("======================================");
  console.log("SATELLITE IMAGE STATUS");
  console.log(
    "Before image available:",
    !!beforeImageUrl
  );
  console.log(
    "After image available:",
    !!afterImageUrl
  );
  console.log("======================================");

  // ==========================================================
  // RESULT
  // ==========================================================

  const result = {
    projectArea: {
      latitude: Number(latitude),
      longitude: Number(longitude),

      bbox: createBBox(
        latitude,
        longitude
      ),
    },

    // ========================================================
    // BEFORE
    // ========================================================

    before: {
      selectedDate:
        beforeDate ||
        beforeFromDate.toISOString(),

      date:
        beforeDate ||
        beforeFromDate.toISOString(),

      dateFrom:
        beforeFromDate.toISOString(),

      dateTo:
        beforeToDate.toISOString(),

      // Main image field
      imageUrl: beforeImageUrl,

      // Compatibility field
      image: beforeImageUrl,

      ndvi: beforeNDVI.ndvi,

      classification:
        beforeNDVI.classification,

      ndviClassification:
        beforeNDVI.classification,

      ndwi: Number(
        beforeNDWI.toFixed(4)
      ),

      satelliteIndicators:
        beforeIndicators,

      indicators:
        beforeIndicators,

      source:
        "Copernicus Sentinel-2 L2A",
    },

    // ========================================================
    // AFTER
    // ========================================================

    after: {
      selectedDate:
        afterDate ||
        afterFromDate.toISOString(),

      date:
        afterDate ||
        afterFromDate.toISOString(),

      dateFrom:
        afterFromDate.toISOString(),

      dateTo:
        afterToDate.toISOString(),

      // Main image field
      imageUrl: afterImageUrl,

      // Compatibility field
      image: afterImageUrl,

      ndvi: afterNDVI.ndvi,

      classification:
        afterNDVI.classification,

      ndviClassification:
        afterNDVI.classification,

      ndwi: Number(
        afterNDWI.toFixed(4)
      ),

      satelliteIndicators:
        afterIndicators,

      indicators:
        afterIndicators,

      source:
        "Copernicus Sentinel-2 L2A",
    },

    // ========================================================
    // CHANGE
    // ========================================================

    change: {
      ndviChange,

      ndvi: ndviChange,

      ndwiChange,

      ndwi: ndwiChange,

      percentageChange:
        ndviPercentageChange,

      direction,

      overallChange,

      overall:
        overallChange,
    },

    // ========================================================
    // INDICATOR COMPARISON
    // ========================================================

    satelliteIndicators: {
      before: beforeIndicators,

      after: afterIndicators,

      change: {
        vegetation: Number(
          (
            afterIndicators.vegetation -
            beforeIndicators.vegetation
          ).toFixed(2)
        ),

        waterAvailability: Number(
          (
            afterIndicators.waterAvailability -
            beforeIndicators.waterAvailability
          ).toFixed(2)
        ),

        waterRetention: Number(
          (
            afterIndicators.waterRetention -
            beforeIndicators.waterRetention
          ).toFixed(2)
        ),

        overall: overallChange,
      },
    },

    // ========================================================
    // METHODOLOGY
    // ========================================================

    indicatorMethod:
      "Satellite-derived NDVI and NDWI are used as environmental proxies. Physical structure condition and maintenance cannot be directly verified from satellite imagery alone and should be validated using geo-tagged field surveys.",

    source:
      "Copernicus Sentinel-2 L2A",

    generatedAt:
      new Date().toISOString(),
  };

  // ==========================================================
  // FINAL LOG
  // ==========================================================

  console.log("======================================");
  console.log("SATELLITE ANALYSIS COMPLETE");
  console.log("======================================");

  console.log(
    "BEFORE DATE:",
    result.before.selectedDate
  );

  console.log(
    "AFTER DATE:",
    result.after.selectedDate
  );

  console.log(
    "BEFORE IMAGE:",
    result.before.imageUrl
      ? "AVAILABLE"
      : "MISSING"
  );

  console.log(
    "AFTER IMAGE:",
    result.after.imageUrl
      ? "AVAILABLE"
      : "MISSING"
  );

  console.log(
    "BEFORE NDVI:",
    result.before.ndvi
  );

  console.log(
    "AFTER NDVI:",
    result.after.ndvi
  );

  console.log(
    "NDVI CHANGE:",
    result.change.ndviChange
  );

  console.log(
    "NDVI PERCENTAGE:",
    result.change.percentageChange,
    "%"
  );

  console.log(
    "BEFORE NDWI:",
    result.before.ndwi
  );

  console.log(
    "AFTER NDWI:",
    result.after.ndwi
  );

  console.log(
    "NDWI CHANGE:",
    result.change.ndwiChange
  );

  console.log("======================================");

  return result;
};

// ============================================================
// LIVE SATELLITE COMPARISON
// ============================================================

const getSatelliteComparison =
  async ({
    latitude,
    longitude,
    beforeDate,
    afterDate,
  }) => {
    validateCoordinates(
      latitude,
      longitude
    );

    if (!beforeDate) {
      throw new Error(
        "beforeDate is required."
      );
    }

    if (!afterDate) {
      throw new Error(
        "afterDate is required."
      );
    }

    const beforeSelected =
      new Date(beforeDate);

    const afterSelected =
      new Date(afterDate);

    if (
      Number.isNaN(
        beforeSelected.getTime()
      )
    ) {
      throw new Error(
        "Invalid beforeDate."
      );
    }

    if (
      Number.isNaN(
        afterSelected.getTime()
      )
    ) {
      throw new Error(
        "Invalid afterDate."
      );
    }

    if (
      afterSelected <=
      beforeSelected
    ) {
      throw new Error(
        "After date must be later than before date."
      );
    }

    // ==================================================
    // CREATE ±15 DAY SEARCH WINDOWS
    // ==================================================

    const beforeRange =
      createDateRange(
        beforeDate
      );

    const afterRange =
      createDateRange(
        afterDate
      );

    console.log(
      "======================================"
    );

    console.log(
      "SATELLITE COMPARISON DATE WINDOWS"
    );

    console.log(
      "BEFORE:",
      beforeRange
    );

    console.log(
      "AFTER:",
      afterRange
    );

    console.log(
      "======================================"
    );

    return performSatelliteAnalysis({
      latitude,

      longitude,

      beforeFrom:
        beforeRange.from,

      beforeTo:
        beforeRange.to,

      afterFrom:
        afterRange.from,

      afterTo:
        afterRange.to,

      beforeDate:
        beforeSelected.toISOString(),

      afterDate:
        afterSelected.toISOString(),
    });
  };

// ============================================================
// COMPATIBILITY GET NDVI RASTER
// ============================================================

const getNDVIRaster =
  async ({
    latitude,
    longitude,
    dateFrom,
    dateTo,
  }) => {
    validateCoordinates(
      latitude,
      longitude
    );

    const from =
      new Date(dateFrom);

    const to =
      new Date(dateTo);

    if (
      Number.isNaN(
        from.getTime()
      ) ||
      Number.isNaN(
        to.getTime()
      )
    ) {
      throw new Error(
        "Invalid satellite date range."
      );
    }

    if (to <= from) {
      throw new Error(
        "dateTo must be later than dateFrom."
      );
    }

    const token =
      await getAccessToken();

    return fetchNDVI({
      latitude,

      longitude,

      from:
        from.toISOString(),

      to:
        to.toISOString(),

      token,
    });
  };

// ============================================================
// COMPATIBILITY GET NDWI RASTER
// ============================================================

const getNDWIRaster =
  async ({
    latitude,
    longitude,
    dateFrom,
    dateTo,
  }) => {
    validateCoordinates(
      latitude,
      longitude
    );

    const from =
      new Date(dateFrom);

    const to =
      new Date(dateTo);

    if (
      Number.isNaN(
        from.getTime()
      ) ||
      Number.isNaN(
        to.getTime()
      )
    ) {
      throw new Error(
        "Invalid satellite date range."
      );
    }

    if (to <= from) {
      throw new Error(
        "dateTo must be later than dateFrom."
      );
    }

    const token =
      await getAccessToken();

    return fetchNDWI({
      latitude,

      longitude,

      from:
        from.toISOString(),

      to:
        to.toISOString(),

      token,
    });
  };

// ============================================================
// COMPATIBILITY GET SATELLITE IMAGE
// ============================================================

const getSatelliteImage =
  async ({
    latitude,
    longitude,
    dateFrom,
    dateTo,
  }) => {
    validateCoordinates(
      latitude,
      longitude
    );

    const from =
      new Date(dateFrom);

    const to =
      new Date(dateTo);

    if (
      Number.isNaN(
        from.getTime()
      ) ||
      Number.isNaN(
        to.getTime()
      )
    ) {
      throw new Error(
        "Invalid satellite date range."
      );
    }

    if (to <= from) {
      throw new Error(
        "dateTo must be later than dateFrom."
      );
    }

    const token =
      await getAccessToken();

    return fetchSatelliteImage({
      latitude,

      longitude,

      from:
        from.toISOString(),

      to:
        to.toISOString(),

      token,
    });
  };

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Authentication
  getAccessToken,

  // Helpers
  createBBox,
  createDateRange,

  // Raster functions
  getNDVIRaster,
  getNDWIRaster,
  getSatelliteImage,

  // Direct NDVI
  getSatelliteNDVI,

  // Calculations
  calculateIndexResult,
  calculateNDVIResult,
  calculateSatelliteIndicators,

  // Comparison
  getSatelliteComparison,
  performSatelliteAnalysis,

  // Raw fetch
  fetchNDVI,
  fetchNDWI,
  fetchSatelliteImage,

  // Image conversion
  bufferToDataUrl,
};