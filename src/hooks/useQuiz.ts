import { useState } from 'react';
import { distance } from 'fastest-levenshtein';

interface QuizResult {
  success: boolean;
  nearMatch: boolean;
  message: string;
}

export function useQuiz(correctBrandName: string) {
  const [userGuess, setUserGuess] = useState('');

  const submitGuess = (guess: string): QuizResult => {
    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedCorrect = correctBrandName.trim().toLowerCase();
    
    if (normalizedGuess === normalizedCorrect) {
      return { success: true, nearMatch: false, message: 'Perfect Match!' };
    }

    const levDistance = distance(normalizedGuess, normalizedCorrect);

    // If user input is within a 2-character distance of the correct brand name, return success: true with a 'Near Match' flag.
    if (levDistance > 0 && levDistance <= 2) {
      return { success: true, nearMatch: true, message: 'Near Match! You got it right.' };
    }

    return { success: false, nearMatch: false, message: 'Incorrect. Try again!' };
  };

  return {
    userGuess,
    setUserGuess,
    submitGuess
  };
}
