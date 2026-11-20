import { jsContent } from '@/content/js';
import { nextjsContent } from '@/content/nextjs';
import { reactContent } from '@/content/react';
import { tsContent } from '@/content/ts';
import type {
  BuildProject,
  CodingExercise,
  DebugChallenge,
  Question,
  TopicNote,
  Track,
  TrackContent,
  TrackId,
  Unit,
} from '@/types/content';

/** All seed content, in track order. This is the offline question bank. */
export const allContent: TrackContent[] = [jsContent, tsContent, reactContent, nextjsContent].sort(
  (a, b) => a.track.order - b.track.order,
);

const byTrack = new Map<TrackId, TrackContent>(allContent.map((c) => [c.track.id, c]));
const units = allContent.flatMap((c) => c.units);
const notes = allContent.flatMap((c) => c.notes);
const exercises = allContent.flatMap((c) => c.exercises);
const debugChallenges = allContent.flatMap((c) => c.debugChallenges);
export const projects: BuildProject[] = allContent.map((c) => c.project);
const questions = allContent.flatMap((c) => c.questions);

export const tracks: Track[] = allContent.map((c) => c.track);

export function getTrackContent(id: string): TrackContent | undefined {
  return byTrack.get(id as TrackId);
}

export function getUnit(id: string): Unit | undefined {
  return units.find((u) => u.id === id);
}

/** The "Learn this" note for a topic, shown after a wrong answer. */
export function getNote(track: TrackId, topic: string): TopicNote | undefined {
  return notes.find((n) => n.track === track && n.topic === topic);
}

export function getQuestion(id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}

export function unitsForTrack(track: TrackId): Unit[] {
  return units.filter((u) => u.track === track).sort((a, b) => a.order - b.order);
}

export function questionsForUnit(unitId: string): Question[] {
  return questions.filter((q) => q.unitId === unitId && q.status === 'approved');
}

export function practiceCountsForUnit(unitId: string) {
  const content = allContent.find((c) => c.units.some((u) => u.id === unitId));
  return {
    questions: questionsForUnit(unitId).length,
    exercises: content?.exercises.filter((e) => e.unitId === unitId).length ?? 0,
    debugChallenges: content?.debugChallenges.filter((d) => d.unitId === unitId).length ?? 0,
  };
}

export function getExercise(id: string): CodingExercise | undefined {
  return exercises.find((e) => e.id === id);
}

export function getDebugChallenge(id: string): DebugChallenge | undefined {
  return debugChallenges.find((d) => d.id === id);
}

export function getProject(id: string): BuildProject | undefined {
  return projects.find((p) => p.id === id);
}

export function exercisesForUnit(unitId: string): CodingExercise[] {
  return exercises.filter((e) => e.unitId === unitId);
}

export function debugForUnit(unitId: string): DebugChallenge[] {
  return debugChallenges.filter((d) => d.unitId === unitId);
}

/** Every question with a "find the bug" or "what does this log?" shape, for the mini-games. */
export function allQuestions(): Question[] {
  return questions.filter((q) => q.status === 'approved');
}

export const allExercises = exercises;
export const allDebugChallenges = debugChallenges;
