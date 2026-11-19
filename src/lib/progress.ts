import { allContent, lessonsForUnit, unitsForTrack } from '@/content';
import type { Lesson, TrackId } from '@/types/content';

/** Share of a track's lessons the learner has completed, 0–1. */
export function trackLessonProgress(track: TrackId, completed: Record<string, string>) {
  const lessons = unitsForTrack(track).flatMap((u) => lessonsForUnit(u.id));
  if (lessons.length === 0) return { done: 0, total: 0, fraction: 0 };
  const done = lessons.filter((l) => completed[l.id]).length;
  return { done, total: lessons.length, fraction: done / lessons.length };
}

/** The first lesson not yet completed, walking tracks and units in order. */
export function nextLesson(completed: Record<string, string>): { lesson: Lesson; track: TrackId } | null {
  for (const content of allContent) {
    for (const unit of unitsForTrack(content.track.id)) {
      const lesson = lessonsForUnit(unit.id).find((l) => !completed[l.id]);
      if (lesson) return { lesson, track: content.track.id };
    }
  }
  return null;
}
