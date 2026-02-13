import Fuse from "fuse.js";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\b(the|a|an)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function checkAnswer(
  userInput: string,
  correctTitle: string,
  correctArtist: string
): boolean {
  const input = normalize(userInput);
  const title = normalize(correctTitle);

  if (!input || input.length < 2) return false;

  // Exact match after normalization
  if (input === title) return true;

  // Check if input contains the title or vice versa
  if (title.includes(input) && input.length / title.length >= 0.6) return true;
  if (input.includes(title)) return true;

  // Fuse.js fuzzy search
  const fuse = new Fuse([{ title, normalized: title }], {
    keys: ["title", "normalized"],
    threshold: 0.3, // Lower threshold = stricter matching (fuse uses distance, not similarity)
    includeScore: true,
    minMatchCharLength: 2,
  });

  const results = fuse.search(input);
  if (results.length > 0 && results[0].score !== undefined) {
    // Fuse score: 0 = perfect match, 1 = no match
    // We want 80% similarity = score <= 0.2
    if (results[0].score <= 0.35) return true;
  }

  // Token-based matching: check if key words from the title are present
  const titleWords = title.split(" ").filter((w) => w.length > 2);
  const inputWords = input.split(" ").filter((w) => w.length > 2);

  if (titleWords.length > 0 && inputWords.length > 0) {
    const matchedWords = titleWords.filter((tw) =>
      inputWords.some((iw) => {
        if (tw === iw) return true;
        // Simple Levenshtein-like check for close words
        if (Math.abs(tw.length - iw.length) <= 1) {
          let diff = 0;
          const maxLen = Math.max(tw.length, iw.length);
          for (let i = 0; i < maxLen; i++) {
            if (tw[i] !== iw[i]) diff++;
          }
          return diff <= 1;
        }
        return false;
      })
    );

    const matchRatio = matchedWords.length / titleWords.length;
    if (matchRatio >= 0.7 && inputWords.length >= 2) return true;
  }

  // Make sure artist name alone doesn't match
  const artist = normalize(correctArtist);
  if (input === artist) return false;

  return false;
}
