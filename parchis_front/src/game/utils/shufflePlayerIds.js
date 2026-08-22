export function shufflePlayerIds(playerIds, random = Math.random) {
  const shuffled = [...playerIds];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const value = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = value;
  }

  return shuffled;
}

export default shufflePlayerIds;
