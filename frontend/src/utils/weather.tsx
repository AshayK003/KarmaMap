export interface WeatherForecast {
  date: string;
  weathercode: number;
  tempMax: number;
  tempMin: number;
  isGigDay: boolean;
}

export function WeatherIcon({ code }: { code: number }) {
  if (code === 0 || code === 1) {
    return (
      <svg
        className="h-8 w-8 text-amber-500 animate-spin"
        style={{ animationDuration: '10s' }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="5" fill="#f59e0b" fillOpacity="0.2" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M18.364 18.364l-1.414-1.414M7.05 7.05L5.636 5.636"
        />
      </svg>
    );
  }
  if (code === 2) {
    return (
      <svg
        className="h-8 w-8 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.02 0l-.707-.707M6.343 6.343l-.707-.707"
          className="text-amber-500"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="#cbd5e1"
          fillOpacity="0.2"
          d="M19.4 15a1.65 1.65 0 00.33-1.82 2.2 2.2 0 00-2.5-1.28A4.4 4.4 0 008.5 13a3.85 3.85 0 00-.7 7.6h11.6a1.65 1.65 0 001.65-1.65 1.65 1.65 0 00-1.65-1.65v-2.3z"
        />
      </svg>
    );
  }
  if (code === 3 || code === 45 || code === 48) {
    return (
      <svg
        className="h-8 w-8 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="#cbd5e1"
          fillOpacity="0.3"
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.97 4 4 0 00-7.9 0A4 4 0 003 15z"
        />
      </svg>
    );
  }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return (
      <svg
        className="h-8 w-8 text-blue-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="#93c5fd"
          fillOpacity="0.2"
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.97 4 4 0 00-7.9 0A4 4 0 003 15z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-1 2m4-2l-1 2m4-2l-1 2" />
      </svg>
    );
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return (
      <svg
        className="h-8 w-8 text-sky-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="#bae6fd"
          fillOpacity="0.2"
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.97 4 4 0 00-7.9 0A4 4 0 003 15z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 22h.01M12 22h.01M16 22h.01" />
      </svg>
    );
  }
  if (code >= 95) {
    return (
      <svg
        className="h-8 w-8 fill-none text-violet-500"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="#c084fc"
          fillOpacity="0.2"
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.97 4 4 0 00-7.9 0A4 4 0 003 15z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 18l-3 4v-4H8l4-5v3h3l-2 2"
          className="text-amber-500 stroke-[2.5]"
        />
      </svg>
    );
  }
  return (
    <svg
      className="h-8 w-8 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="#cbd5e1"
        fillOpacity="0.2"
        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.97 4 4 0 00-7.9 0A4 4 0 003 15z"
      />
    </svg>
  );
}

export function getWeatherDescription(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Foggy';
  if ([51, 53, 55].includes(code)) return 'Light Drizzle';
  if ([61, 63, 65].includes(code)) return 'Rainy';
  if ([71, 73, 75, 77].includes(code)) return 'Snowy';
  if ([80, 81, 82].includes(code)) return 'Rain Showers';
  if ([85, 86].includes(code)) return 'Snow Showers';
  if (code >= 95) return 'Thunderstorms';
  return 'Cloudy';
}

export function getWeatherAdvisory(weather: WeatherForecast | null): {
  emoji: string;
  bg: string;
  title: string;
  description: string;
} | null {
  if (!weather) return null;
  const code = weather.weathercode;
  const tempMax = weather.tempMax;

  if (code >= 95 || [63, 65, 81, 82].includes(code)) {
    return {
      emoji: '⛈️',
      bg: 'bg-rose-50/70 border-rose-200/50 text-rose-800 shadow-rose-950/2 dark:bg-rose-900/30 dark:border-slate-700 dark:text-rose-300 dark:shadow-none',
      title: 'Severe Outdoor Advisory',
      description:
        'Heavy rain, storms, or severe weather is forecast. We highly recommend bringing fully waterproof rainwear, an umbrella, and sturdy, slip-resistant footwear.',
    };
  }
  if ([51, 53, 55, 61, 80].includes(code)) {
    return {
      emoji: '☔',
      bg: 'bg-blue-50/70 border-blue-200/50 text-blue-800 shadow-blue-950/2 dark:bg-blue-900/30 dark:border-slate-700 dark:text-blue-200 dark:shadow-none',
      title: 'Wet Weather Preparedness',
      description:
        'Light to moderate rain is expected. Consider bringing an umbrella or a rain jacket for outdoor activities.',
    };
  }
  if (tempMax > 35) {
    return {
      emoji: '☀️',
      bg: 'bg-amber-50/70 border-amber-200/50 text-amber-900 shadow-amber-950/2 dark:bg-amber-900/30 dark:border-slate-700 dark:text-amber-200 dark:shadow-none',
      title: 'Extreme Heat Advisory',
      description:
        'Temperatures are forecast to exceed 35°C. Stay highly hydrated, wear a wide-brimmed hat, apply high-SPF sunscreen, and take breaks in shaded areas.',
    };
  }
  if (tempMax < 8) {
    return {
      emoji: '❄️',
      bg: 'bg-sky-50/70 border-sky-200/50 text-sky-900 shadow-sky-950/2 dark:bg-sky-900/30 dark:border-slate-700 dark:text-sky-200 dark:shadow-none',
      title: 'Low Temperature Advisory',
      description:
        'Temperatures are forecast to be quite cold. We recommend dressing in warm, insulated layers and drinking warm fluids to stay safe outdoors.',
    };
  }
  if (code === 0 || code === 1) {
    return {
      emoji: '✨',
      bg: 'bg-emerald-50/70 border-emerald-200/50 text-emerald-800 shadow-emerald-950/2 dark:bg-emerald-900/20 dark:border-slate-700 dark:text-slate-100 dark:shadow-none',
      title: 'Perfect Outdoor Weather',
      description:
        'Beautiful clear skies are forecast! A wonderful day to head outdoors and make a positive impact in the community.',
    };
  }
  return null;
}
