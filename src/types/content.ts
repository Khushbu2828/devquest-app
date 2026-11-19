/**
 * Content model for DevQuest.
 *
 * Questions are a discriminated union on `type`, so each question kind carries
 * exactly the fields it needs and the quiz renderer can switch on it safely.
 * The same shapes are used for hand-written seed content and (later) for
 * AI-generated questions, which arrive with `source: 'ai'` and go through
 * validation and review before `status` becomes 'approved'.
 */

export type TrackId = 'js' | 'ts' | 'react' | 'nextjs';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type CodeLanguage = 'js' | 'ts' | 'jsx' | 'tsx';

export interface Track {
  id: TrackId;
  title: string;
  tagline: string;
  /** Tracks unlock in order; `order` drives the skill-tree layout. */
  order: number;
}

export interface Unit {
  id: string;
  track: TrackId;
  level: Level;
  order: number;
  title: string;
  summary: string;
  /** Topics covered; questions are tagged with these for adaptive serving. */
  topics: string[];
}

export type LessonBlock =
  | { kind: 'text'; text: string }
  | { kind: 'code'; code: string; language: CodeLanguage; caption?: string }
  | { kind: 'tip'; text: string };

export interface Lesson {
  id: string;
  unitId: string;
  order: number;
  title: string;
  minutes: number;
  blocks: LessonBlock[];
}

// ---------------------------------------------------------------- Questions

export type QuestionSource = 'seed' | 'ai';
export type QuestionStatus = 'pending' | 'approved' | 'rejected';

interface QuestionBase {
  id: string;
  track: TrackId;
  unitId: string;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  /** Code shown with the prompt (required for output / bug_find / fill_blank). */
  code?: string;
  language?: CodeLanguage;
  explanation: string;
  hints: string[];
  tags: string[];
  source: QuestionSource;
  status: QuestionStatus;
}

export interface McqQuestion extends QuestionBase {
  type: 'mcq';
  options: string[];
  /** Index into `options`. */
  answer: number;
}

export interface MultiSelectQuestion extends QuestionBase {
  type: 'multi';
  options: string[];
  /** Indexes into `options`; order does not matter. */
  answers: number[];
}

export interface TrueFalseQuestion extends QuestionBase {
  type: 'true_false';
  answer: boolean;
}

/** "What does this log?" The answer is every console.log line joined by "\n". */
export interface OutputQuestion extends QuestionBase {
  type: 'output';
  code: string;
  language: 'js' | 'ts';
  /** Multiple-choice distractors shown alongside the real output. */
  options: string[];
  answer: number;
}

/** `code` contains exactly one `___` placeholder the learner fills in. */
export interface FillBlankQuestion extends QuestionBase {
  type: 'fill_blank';
  code: string;
  answer: string;
  /** Other accepted spellings (compared after trimming). */
  accept?: string[];
}

/** Learner drags shuffled `lines` back into this (correct) order. */
export interface OrderQuestion extends QuestionBase {
  type: 'order';
  lines: string[];
}

export interface MatchQuestion extends QuestionBase {
  type: 'match';
  pairs: { left: string; right: string }[];
}

/** Learner taps the buggy line in `code`. */
export interface BugFindQuestion extends QuestionBase {
  type: 'bug_find';
  code: string;
  /** 1-based line number of the bug. */
  bugLine: number;
}

export type Question =
  | McqQuestion
  | MultiSelectQuestion
  | TrueFalseQuestion
  | OutputQuestion
  | FillBlankQuestion
  | OrderQuestion
  | MatchQuestion
  | BugFindQuestion;

export type QuestionType = Question['type'];

// ---------------------------------------------------------------- Practice

/**
 * A test is an assertion expression evaluated after the learner's code, with a
 * tiny `expect()` in scope, e.g. `expect(sum(1, 2)).toBe(3)`.
 */
export interface CodeTest {
  name: string;
  code: string;
}

export interface CodingExercise {
  id: string;
  track: TrackId;
  unitId: string;
  title: string;
  prompt: string;
  kind: 'write_function' | 'fix_tests' | 'refactor' | 'add_types';
  language: CodeLanguage;
  starterCode: string;
  /** Reference solution; used by the seed verifier, never shown before solving. */
  solution: string;
  tests: CodeTest[];
  /** Exactly three: nudge → approach → partial code. */
  hints: [string, string, string];
  xp: number;
}

export type BugCategory = 'syntax' | 'logic' | 'type' | 'async' | 'react' | 'hydration' | 'nextjs';

export interface DebugChallenge {
  id: string;
  track: TrackId;
  unitId: string;
  title: string;
  prompt: string;
  language: CodeLanguage;
  buggyCode: string;
  fixedCode: string;
  /** 1-based lines that contain a bug. */
  bugLines: number[];
  category: BugCategory;
  /** Realistic console / framework error shown for "read the stack trace" challenges. */
  errorOutput?: string;
  /** Present when the bug is observable in plain JS: fixed passes, buggy fails. */
  tests?: CodeTest[];
  explanation: string;
  xp: number;
}

export interface ProjectCheckpoint {
  id: string;
  title: string;
  instructions: string;
  starterCode: string;
  solution: string;
  tests: CodeTest[];
}

export interface BuildProject {
  id: string;
  track: TrackId;
  title: string;
  description: string;
  language: CodeLanguage;
  checkpoints: ProjectCheckpoint[];
  xp: number;
}

/** Everything that ships for one track. */
export interface TrackContent {
  track: Track;
  units: Unit[];
  lessons: Lesson[];
  questions: Question[];
  exercises: CodingExercise[];
  debugChallenges: DebugChallenge[];
  project: BuildProject;
}
