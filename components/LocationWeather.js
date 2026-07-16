'use client';

import { useEffect, useState } from 'react';

const CONDITION_LABEL = {
  hot: 'Hot',
  cold: 'Cold',
  mild: 'Mild',
  rain: 'Rainy',
  snow: 'Snowy',
};

const CONDITION_SUGGESTION = {
  hot: 'Gear for beating the heat',
  cold: 'Gear to stay warm out there',
  mild: 'Perfect conditions to get outside',
  rain: 'Rain-ready gear',
  snow: 'Winter-ready picks',
};

export default function LocationWeather({ onCondition }) {
  const [status, setStatus] = useState('locating'); // locating | denied | loading-weather | ready | error
  const [place, setPlace] = useState(null);
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setStatus('loading-weather');

        try {
          const [weatherRes, placeRes] = await Promise.all([
            fetch(`/api/weather?lat=${latitude}&lon=${longitude}`).then((r) => r.json()),
            fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
              .then((r) => r.json())
              .catch(() => null),
          ]);

          if (weatherRes.ok) {
            setWeather(weatherRes);
            onCondition?.(weatherRes.condition);
          }
          if (placeRes) {
            setPlace(placeRes.city || placeRes.locality || placeRes.principalSubdivision || null);
          }
          setStatus('ready');
        } catch {
          setStatus('error');
        }
      },
      () => setStatus('denied'),
      { timeout: 8000 }
    );
  }, [onCondition]);

  if (status === 'locating' || status === 'loading-weather') {
    return (
      <div className="glass weather-widget mono">
        <span className="dot pulsing" /> Finding your conditions…
      </div>
    );
  }

  if (status === 'denied' || status === 'error') {
    return (
      <div className="glass weather-widget mono">
        <span className="dot" /> Enable location for local recommendations
      </div>
    );
  }

  return (
    <div className="glass weather-widget">
      <div className="weather-temp">{Math.round(weather.tempC)}°C</div>
      <div className="weather-meta">
        <div className="mono weather-place">{place || 'Your location'}</div>
        <div className="weather-condition">{CONDITION_SUGGESTION[weather.condition]}</div>
      </div>
    </div>
  );
}
