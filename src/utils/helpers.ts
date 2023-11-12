export const routeToWord = (word: string) => {
  return `/wort/${word}`;
};

export const randomElement = (elements) => {
  return elements[Math.floor(Math.random() * elements.length)];
};
