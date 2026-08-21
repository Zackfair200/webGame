
export const Characters = {
  Warrior: "warrior",
  Mage: "mage",
  Archer: "archer",
  Druid: "druid",
};


export const characterEmojis = {
    warrior: "⚔",
    mage: "🧙‍♂️",
    archer: "🏹",
    druid: "🧝‍♂️",
  };

  export function getCharacterAsset(characterName) {
    return characterEmojis[characterName]
  }
