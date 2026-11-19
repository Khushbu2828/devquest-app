import { jsContent } from '@/content/js';
import { nextjsContent } from '@/content/nextjs';
import { reactContent } from '@/content/react';
import { tsContent } from '@/content/ts';
import type { Lesson, Question, Track, TrackContent, TrackId, Unit } from '@/types/content';

/** All seed content, in track order. This is the offline question bank. */
export const allContent: TrackContent[] = [jsContent, tsContent, reactContent, nextjsContent].sort(
  (a, b) => a.track.order - b.track.order,
);

const byTrack = new Map<TrackId, TrackContent>(allContent.map((c) => [c.track.id, c]));
const units = allContent.flatMap((c) => c.units);
const lessons = allContent.flatMap((c) => c.lessons);
const questions = allContent.flatMap((c) => c.questions);

export const tracks: Track[] = allContent.map((c) => c.track);

export function getTrackContent(id: string): TrackContent | undefined {
  return byTrack.get(id as TrackId);
}

export function getUnit(id: string): Unit | undefined {
  return units.find((u) => u.id === id);
}

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}

export function unitsForTrack(track: TrackId): Unit[] {
  return units.filter((u) => u.track === track).sort((a, b) => a.order - b.order);
}

export function lessonsForUnit(unitId: string): Lesson[] {
  return lessons.filter((l) => l.unitId === unitId).sort((a, b) => a.order - b.order);
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
