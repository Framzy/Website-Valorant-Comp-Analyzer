/**
 * Role pattern -> playstyle category.
 * Mirrors PLAYSTYLE_MAP in production/backend/constants.py.
 * Used for the derived seed columns; the live analysis runs in Python.
 */
export const PLAYSTYLE_MAP: Record<string, string> = {
  "1D-2I-1C-1S": "STANDARD",
  "1D-1I-2C-1S": "CONTROL",
  "1D-2I-2C-0S": "CONTROL",
  "2D-1I-2C-0S": "CONTROL",
  "2D-1I-1C-1S": "AGGRESSIVE",
  "2D-2I-1C-0S": "AGGRESSIVE",
  "1D-1I-1C-2S": "UTILITY_HEAVY",
  "0D-2I-2C-1S": "UTILITY_HEAVY",
  "0D-2I-1C-2S": "UTILITY_HEAVY",
};
