import Fuse from "fuse.js";
import { Difficulty } from "./types";

export function stripSuffix(text: string): string {
  // Remove " - Remastered 2011", " (Remastered)", " - Live", " (Deluxe Edition)", etc.
  return text
    .replace(/\s*[-–]\s*(remaster(ed)?|re-?master(ed)?|live|mono|stereo|bonus track|deluxe|anniversary|edition).*$/i, "")
    .replace(/\s*\((remaster(ed)?|re-?master(ed)?|live|mono|stereo|bonus track|deluxe|anniversary|edition|single version|album version|radio edit|feat\.?[^)]*)\).*$/i, "")
    .trim();
}

function normalize(text: string): string {
  return stripSuffix(text)
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
  correctArtist: string,
  difficulty: Difficulty = "medium"
): boolean {
  const input = normalize(userInput);
  const title = normalize(correctTitle);

  if (!input || input.length < 2) return false;

  // Exact match after normalization always passes
  if (input === title) return true;

  // Hard mode: exact match only (after normalization)
  if (difficulty === "hard") return false;

  // Easy mode: more forgiving thresholds
  // Medium mode: tighter thresholds

  // Check if input contains the full title
  if (input.includes(title)) return true;

  // Check if the title contains the input (only if input is substantial)
  const containsRatio = difficulty === "easy" ? 0.8 : 0.9;
  if (title.includes(input) && input.length >= 4 && input.length / title.length >= containsRatio) return true;

  // Fuse.js fuzzy search
  const fuseThreshold = difficulty === "easy" ? 0.3 : 0.2;
  const scoreThreshold = difficulty === "easy" ? 0.3 : 0.2;

  const fuse = new Fuse([{ title, normalized: title }], {
    keys: ["title", "normalized"],
    threshold: fuseThreshold,
    includeScore: true,
    minMatchCharLength: 2,
  });

  const results = fuse.search(input);
  if (results.length > 0 && results[0].score !== undefined) {
    if (results[0].score <= scoreThreshold) return true;
  }

  // Token-based matching
  const titleWords = title.split(" ").filter((w) => w.length > 2);
  const inputWords = input.split(" ").filter((w) => w.length > 2);

  if (titleWords.length > 0 && inputWords.length > 0) {
    const matchedWords = titleWords.filter((tw) =>
      inputWords.some((iw) => {
        if (tw === iw) return true;
        if (difficulty === "easy" && Math.abs(tw.length - iw.length) <= 2) {
          let diff = 0;
          const maxLen = Math.max(tw.length, iw.length);
          for (let i = 0; i < maxLen; i++) {
            if (tw[i] !== iw[i]) diff++;
          }
          return diff <= 2;
        }
        if (difficulty === "medium" && Math.abs(tw.length - iw.length) <= 1) {
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

    const matchRatio = difficulty === "easy" ? 0.6 : 0.8;
    if (matchedWords.length / titleWords.length >= matchRatio && inputWords.length >= 2) return true;
  }

  // Make sure artist name alone doesn't match
  const artist = normalize(correctArtist);
  if (input === artist) return false;

  return false;
}
