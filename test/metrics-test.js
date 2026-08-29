const $ = (id) => document.getElementById(id);

let watchId = null;
let updateCount = 0;
let latestPosition = null;
let battery = null;
let motionListening = false;

const cities = [
  {
    name: "Victoria, BC",
    lat: 48.4284,
    lon: -123.3656,
  },
  {
    name: "Vancouver, BC",
    lat: 49.2827,
    lon: -123.1207,
  },
  {
    name: "Calgary, AB",
    lat: 51.0447,
    lon: -114.0719,
  },
  {
    name: "Edmonton, AB",
    lat: 53.5461,
    lon: -113.4938,
  },
  {
    name: "Winnipeg, MB",
    lat: 49.8951,
    lon: -97.1384,
  },
  {
    name: "Toronto, ON",
    lat: 43.6532,
    lon: -79.3832,
  },
  {
    name: "Ottawa, ON",
    lat: 45.4215,
    lon: -75.6972,
  },
  {
    name: "Montreal, QC",
    lat: 45.5017,
    lon: -73.5673,
  },
  {
    name: "Quebec City, QC",
    lat: 46.8139,
    lon: -71.208,
  },
  {
    name: "Halifax, NS",
    lat: 44.6488,
    lon: -63.5752,
  },
  {
    name: "St. John's, NL",
    lat: 47.5615,
    lon: -52.7126,
  },
];

function setStatus(text, state = "") {
  $("status-text").textContent = text;
  $("status").className = `status ${state}`;
}

function value(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return `${value}${suffix}`;
}

function formatCoordinate(number, positive, negative) {
  if (number === null || number === undefined) {
    return "—";
  }

  return `${Math.abs(number).toFixed(6)}° ${number >= 0 ? positive : negative}`;
}

function metersToKmH(mps) {
  if (mps === null || mps === undefined || Number.isNaN(mps)) {
    return null;
  }

  return mps * 3.6;
}

function compassDirection(degrees) {
  if (degrees === null || degrees === undefined || Number.isNaN(degrees)) {
    return null;
  }

  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];

  return directions[Math.round(degrees / 22.5) % 16];
}

function accuracyRating(accuracy) {
  if (accuracy === null || accuracy === undefined) {
    return {
      label: "UNKNOWN",
      className: "muted",
    };
  }

  if (accuracy <= 5) {
    return {
      label: "EXCELLENT",
      className: "good",
    };
  }

  if (accuracy <= 15) {
    return {
      label: "GOOD",
      className: "good",
    };
  }

  if (accuracy <= 50) {
    return {
      label: "FAIR",
      className: "warning",
    };
  }

  return {
    label: "POOR",
    className: "bad",
  };
}

function haversine(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function formatDistance(km) {
  if (km < 1) {
    return `${(km * 1000).toFixed(0)} m`;
  }

  if (km < 100) {
    return `${km.toFixed(1)} km`;
  }

  return `${Math.round(km).toLocaleString()} km`;
}

function updatePosition(position) {
  latestPosition = position;
  updateCount++;

  const {
    latitude,
    longitude,
    accuracy,
    altitude,
    altitudeAccuracy,
    heading,
    speed,
  } = position.coords;

  $("latitude").textContent = formatCoordinate(latitude, "N", "S");

  $("latitude-raw").textContent = `${latitude.toFixed(8)}°`;

  $("longitude").textContent = formatCoordinate(longitude, "E", "W");

  $("longitude-raw").textContent = `${longitude.toFixed(8)}°`;

  $("accuracy").textContent = value(accuracy, " m");

  const quality = accuracyRating(accuracy);

  $("accuracy-quality").textContent = quality.label;

  $("accuracy-quality").className = `metric-sub ${quality.className}`;

  $("position-quality").textContent = quality.label;

  $("position-quality").className = quality.className;

  $("altitude").textContent =
    altitude === null ? "NOT AVAILABLE" : `${altitude.toFixed(1)} m`;

  $("altitude-accuracy").textContent =
    altitudeAccuracy === null
      ? "Vertical accuracy unavailable"
      : `±${altitudeAccuracy.toFixed(1)} m`;

  const kmh = metersToKmH(speed);

  $("speed").textContent =
    kmh === null ? "NOT AVAILABLE" : `${kmh.toFixed(1)} km/h`;

  $("speed-ms").textContent =
    speed === null ? "Velocity unavailable" : `${speed.toFixed(2)} m/s`;

  const direction = compassDirection(heading);

  $("heading").textContent =
    heading === null ? "NOT AVAILABLE" : `${Math.round(heading)}° ${direction}`;

  $("heading-degrees").textContent =
    heading === null ? "Heading unavailable" : "True north reference";

  $("update-count").textContent = updateCount.toLocaleString();

  $("position-age").textContent = "0 s";

  updateCityDistances(latitude, longitude);

  const snapshot = {
    timestamp: new Date(position.timestamp).toISOString(),

    raw: {
      latitude,
      longitude,
      accuracy,
      altitude,
      altitudeAccuracy,
      heading,
      speed,
    },

    converted: {
      latitude: formatCoordinate(latitude, "N", "S"),

      longitude: formatCoordinate(longitude, "E", "W"),

      speedKmh: kmh,

      headingDirection: direction,
    },
  };

  $("raw-output").textContent = JSON.stringify(snapshot, null, 2);

  setStatus("GPS ACTIVE", "active");
}

function updateCityDistances(latitude, longitude) {
  const results = cities
    .map((city) => ({
      ...city,

      distance: haversine(latitude, longitude, city.lat, city.lon),
    }))
    .sort((a, b) => a.distance - b.distance);

  const nearest = results[0];

  $("nearest-city-name").textContent = nearest.name;

  $("nearest-city-distance").textContent = formatDistance(nearest.distance);

  $("city-list").innerHTML = results
    .map(
      (city) => `
          <div class="city-row">
            <span>${city.name}</span>
            <span class="city-distance">
              ${formatDistance(city.distance)}
            </span>
          </div>
        `,
    )
    .join("");
}

function startGPS() {
  if (!navigator.geolocation) {
    setStatus("GEOLOCATION UNAVAILABLE", "error");

    return;
  }

  if (watchId !== null) {
    return;
  }

  updateCount = 0;

  setStatus("ACQUIRING GPS...", "");

  watchId = navigator.geolocation.watchPosition(
    updatePosition,
    handleGPSerror,
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    },
  );

  $("start-gps").disabled = true;
  $("stop-gps").disabled = false;
}

function stopGPS() {
  if (watchId === null) {
    return;
  }

  navigator.geolocation.clearWatch(watchId);

  watchId = null;

  $("start-gps").disabled = false;
  $("stop-gps").disabled = true;

  setStatus("GPS STOPPED", "");
}

function handleGPSerror(error) {
  let message = "GPS ERROR";

  switch (error.code) {
    case error.PERMISSION_DENIED:
      message = "LOCATION PERMISSION DENIED";
      break;

    case error.POSITION_UNAVAILABLE:
      message = "POSITION UNAVAILABLE";
      break;

    case error.TIMEOUT:
      message = "GPS TIMEOUT";
      break;
  }

  setStatus(message, "error");
}

async function acquireMetrics() {
  setStatus("ACQUIRING METRICS...", "");

  await Promise.allSettled([
    acquireGPS(),
    acquireBattery(),
    acquireDeviceInfo(),
    acquireNetworkInfo(),
    acquireCapabilities(),
  ]);

  startMotionSensors();

  setStatus(
    latestPosition ? "DIAGNOSTIC READY" : "PARTIAL DATA",
    latestPosition ? "active" : "",
  );
}

function acquireGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updatePosition(position);
        resolve();
      },

      (error) => {
        handleGPSerror(error);
        resolve();
      },

      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      },
    );
  });
}

async function acquireBattery() {
  if (!navigator.getBattery) {
    $("battery").textContent = "NOT AVAILABLE";

    $("battery-state").textContent = "Battery API unsupported";

    return;
  }

  try {
    battery = await navigator.getBattery();

    updateBattery();

    battery.addEventListener("levelchange", updateBattery);

    battery.addEventListener("chargingchange", updateBattery);
  } catch {
    $("battery").textContent = "UNAVAILABLE";
  }
}

function updateBattery() {
  if (!battery) {
    return;
  }

  $("battery").textContent = `${Math.round(battery.level * 100)}%`;

  $("battery-state").textContent = battery.charging ? "Charging" : "On battery";
}

function acquireDeviceInfo() {
  $("memory").textContent = navigator.deviceMemory
    ? `${navigator.deviceMemory} GB`
    : "NOT AVAILABLE";

  $("cpu").textContent = navigator.hardwareConcurrency
    ? `${navigator.hardwareConcurrency} logical cores`
    : "NOT AVAILABLE";

  $("screen").textContent = `${screen.width} × ${screen.height}`;

  $("pixel-ratio").textContent = `${window.devicePixelRatio || 1}×`;

  updateOrientation();

  window.addEventListener("resize", updateOrientation);
}

function updateOrientation() {
  let orientation = "Unknown";

  if (screen.orientation) {
    orientation = screen.orientation.type;
  } else {
    orientation =
      window.innerWidth > window.innerHeight ? "landscape" : "portrait";
  }

  $("orientation").textContent = orientation;
}

function acquireNetworkInfo() {
  $("online").textContent = navigator.onLine ? "ONLINE" : "OFFLINE";

  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  if (!connection) {
    $("connection-type").textContent = "NOT AVAILABLE";

    $("effective-type").textContent = "NOT AVAILABLE";

    $("downlink").textContent = "NOT AVAILABLE";

    $("rtt").textContent = "NOT AVAILABLE";

    return;
  }

  $("connection-type").textContent = connection.type || "Unknown";

  $("effective-type").textContent = connection.effectiveType || "Unknown";

  $("downlink").textContent = connection.downlink
    ? `${connection.downlink} Mbps`
    : "—";

  $("rtt").textContent =
    connection.rtt !== undefined ? `${connection.rtt} ms` : "—";
}

function startMotionSensors() {
  if (motionListening) {
    return;
  }
  if (!("DeviceMotionEvent" in window)) {
    return;
  }
  motionListening = true;
  window.addEventListener("devicemotion", (event) => {
    const acceleration =
      event.acceleration || event.accelerationIncludingGravity;
    if (!acceleration) {
      return;
    }
    $("accel-x").textContent = value(acceleration.x, " m/s²");
    $("accel-y").textContent = value(acceleration.y, " m/s²");
    $("accel-z").textContent = value(acceleration.z, " m/s²");
  });

  if ("DeviceOrientationEvent" in window) {
    window.addEventListener("deviceorientation", (event) => {
      $("rotation-alpha").textContent = value(event.alpha, "°");

      $("rotation-beta").textContent = value(event.beta, "°");

      $("rotation-gamma").textContent = value(event.gamma, "°");
    });
  }
}

function acquireCapabilities() {
  const capabilities = [
    ["Geolocation", "geolocation" in navigator],
    ["Battery Status", "getBattery" in navigator],
    ["Device Motion", "DeviceMotionEvent" in window],
    ["Device Orientation", "DeviceOrientationEvent" in window],
    [
      "Network Information",
      !!(
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection
      ),
    ],
    ["Device Memory", "deviceMemory" in navigator],
    ["Hardware Concurrency", "hardwareConcurrency" in navigator],
    ["Service Worker", "serviceWorker" in navigator],
    ["Web Share", "share" in navigator],
    ["Vibration", "vibrate" in navigator],
    ["Wake Lock", "wakeLock" in navigator],
    ["Web Bluetooth", "bluetooth" in navigator],
    ["Web USB", "usb" in navigator],
    ["Web NFC", "NDEFReader" in window],
    ["Web Serial", "serial" in navigator],
  ];

  $("capabilities").innerHTML = capabilities
    .map(
      ([name, supported]) =>
        `<div class="capability">
        <span>${name}</span>
        <span class="capability-state ${supported ? "good" : "muted"}">
            ${supported ? "Available" : "Unavailable"}
        </span>
    </div>`,
    )
    .join("");
}

$("acquire").addEventListener("click", acquireMetrics);
$("start-gps").addEventListener("click", startGPS);
$("stop-gps").addEventListener("click", stopGPS);

window.addEventListener("online", () => ($("online").textContent = "ONLINE"));

window.addEventListener("offline", () => ($("online").textContent = "OFFLINE"));

setStatus("READY");

acquireCapabilities();
acquireDeviceInfo();
acquireNetworkInfo();
