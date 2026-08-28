const output = document.getElementById('output');
const status = document.getElementById('status');
const startButton = document.getElementById('start-gps');
const stopButton = document.getElementById('stop-gps');

let watchId = null;

function log(message) {
  const time = new Date().toLocaleTimeString();

  output.textContent += `[${time}] ${message}\n`;
  output.scrollTop = output.scrollHeight;
}

function setStatus(message) {
  status.textContent = message;
}

function startGPS() {
  if (!navigator.geolocation) {
    setStatus('Geolocation not supported');
    log('ERROR: navigator.geolocation is unavailable.');
    return;
  }

  if (watchId !== null) {
    log('GPS watch already running.');
    return;
  }

  setStatus('Acquiring location...');
  log('Starting GPS watch...');

  watchId = navigator.geolocation.watchPosition(
    position => {
      const {
        latitude,
        longitude,
        accuracy,
        altitude,
        altitudeAccuracy,
        heading,
        speed
      } = position.coords;

      log(
        JSON.stringify(
          {
            latitude,
            longitude,
            accuracy,
            altitude,
            altitudeAccuracy,
            heading,
            speed,
            timestamp: new Date(position.timestamp).toISOString()
          },
          null,
          2
        )
      );

      setStatus(`GPS active — ±${Math.round(accuracy)} m`);
    },

    error => {
      log(`GPS ERROR ${error.code}: ${error.message}`);

      setStatus('GPS error');
    },

    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    }
  );

  log(`Watch ID: ${watchId}`);
}

function stopGPS() {
  if (watchId === null) {
    log('GPS watch is not running.');
    return;
  }

  navigator.geolocation.clearWatch(watchId);

  log(`Stopped GPS watch ${watchId}.`);

  watchId = null;

  setStatus('GPS stopped');
}

startButton.addEventListener('click', startGPS);
stopButton.addEventListener('click', stopGPS);