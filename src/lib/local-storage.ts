import type { AnalyzedProblem } from '@/types/problem';

const HISTORY_KEY = 'examAceHistory';

export const getHistory = (): AnalyzedProblem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const rawHistory = localStorage.getItem(HISTORY_KEY);
    if (rawHistory) {
      const parsedHistory = JSON.parse(rawHistory);
      // Basic validation: check if it's an array
      return Array.isArray(parsedHistory) ? parsedHistory : [];
    }
    return [];
  } catch (error) {
    console.error("Failed to parse history from localStorage", error);
    return [];
  }
};

export const addProblemToHistory = (problem: AnalyzedProblem): AnalyzedProblem[] => {
  if (typeof window === 'undefined') return [];
  const history = getHistory();
  const updatedHistory = [problem, ...history];
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    return updatedHistory;
  } catch (error) {
    console.error("Failed to save history to localStorage", error);
    // Potentially handle quota exceeded error
    return history; // Return old history if save failed
  }
};

export const clearHistoryStorage = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
};
