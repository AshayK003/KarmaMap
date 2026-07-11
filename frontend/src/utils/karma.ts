export function getKarmaLevel(points: number) {
  if (points >= 1000)
    return { title: 'Legendary Leader', color: 'from-purple-600 to-indigo-600', max: 5000 };
  if (points >= 500)
    return { title: 'Community Champion', color: 'from-violet-500 to-fuchsia-500', max: 1000 };
  if (points >= 100)
    return { title: 'Impact Hero', color: 'from-blue-500 to-cyan-500', max: 500 };
  return { title: 'Karma Novice', color: 'from-emerald-500 to-teal-500', max: 100 };
}
