


export const characterEmojis = {
    warrior: "⚔",
    mage: "🧙‍♂️",
    archer: "🏹",
    druid: "🧝‍♂️",
  };

  export function getCharacterAsset(characterName) {
    return characterEmojis[characterName]
  }