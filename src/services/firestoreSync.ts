import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../firebase';
import type {
  LearningLesson,
  ProductionProject,
  ProductionSequence,
} from '../types/studio';
import { OperationType, handleFirestoreError } from '../utils/firestoreErrors';

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  return cleaned || `id-${Date.now().toString(36)}`;
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string' && val.trim()) {
    return val;
  }
  return new Date().toISOString();
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

const inFlightProfileSync = new Map<string, Promise<void>>();

export async function ensureUserProfileInFirestore(user: User): Promise<void> {
  if (!user.emailVerified) return;
  const userId = sanitizeId(user.uid);
  const existing = inFlightProfileSync.get(userId);
  if (existing) {
    return existing;
  }

  const run = (async () => {
    const userPath = `users/${userId}`;
    const ref = doc(db, 'users', userId);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const rawName =
          user.displayName?.trim() ||
          user.email?.split('@')[0]?.trim() ||
          'Director LumenReel';
        const displayName = rawName.slice(0, 120) || 'Director LumenReel';
        const rawEmail = user.email?.trim() || 'director@auteur.studio';
        const email = (rawEmail.length >= 3 ? rawEmail : 'director@auteur.studio').slice(0, 200);
        await setDoc(ref, {
          uid: userId,
          displayName,
          email,
          role: 'director',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    } finally {
      inFlightProfileSync.delete(userId);
    }
  })();

  inFlightProfileSync.set(userId, run);
  return run;
}

export async function saveProjectToFirestore(
  userId: string,
  project: ProductionProject
): Promise<void> {
  const uid = sanitizeId(userId);
  const pid = sanitizeId(project.id);
  const projPath = `users/${uid}/projects/${pid}`;
  const projRef = doc(db, 'users', uid, 'projects', pid);

  try {
    const existingSnap = await getDoc(projRef);
    const title = project.title.trim().slice(0, 180) || 'Producción sin título';
    const genreStyle = project.genreStyle.trim().slice(0, 180) || 'Épica Monumental IMAX';
    const continuityBible = (project.continuityBible || '').slice(0, 20000);
    const sequencesCount = Math.min(1000, Math.max(0, project.sequences.length));
    const assetsCount = Math.min(5000, Math.max(0, project.assets?.length || 0));

    if (!existingSnap.exists()) {
      await setDoc(projRef, {
        id: pid,
        ownerId: uid,
        title,
        genreStyle,
        defaultSourceType: project.defaultSourceType,
        continuityBible,
        sequencesCount,
        assetsCount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(projRef, {
        sequencesCount,
        assetsCount,
        continuityBible,
        updatedAt: serverTimestamp(),
      });
    }

    for (const seq of project.sequences) {
      await saveSequenceToFirestore(uid, pid, seq);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, projPath);
  }
}

export async function saveSequenceToFirestore(
  userId: string,
  projectId: string,
  sequence: ProductionSequence
): Promise<void> {
  const uid = sanitizeId(userId);
  const pid = sanitizeId(projectId);
  const sid = sanitizeId(sequence.id);
  const seqPath = `users/${uid}/projects/${pid}/sequences/${sid}`;
  const seqRef = doc(db, 'users', uid, 'projects', pid, 'sequences', sid);

  try {
    const snap = await getDoc(seqRef);
    const sequenceData = stripUndefined({
      sourceFilename: sequence.sourceFilename || null,
      cameraSystem: sequence.cameraSystem,
      lensPackage: sequence.lensPackage,
      filmStockOrLut: sequence.filmStockOrLut,
      colorPalette: sequence.colorPalette,
      lighting: sequence.lighting,
      shotList: sequence.shotList,
      soundDesign: sequence.soundDesign,
      audioAnalysis: sequence.audioAnalysis || null,
      vfx: sequence.vfx,
      screenplay: sequence.screenplay,
      storyboardFrames: sequence.storyboardFrames,
    });

    if (!snap.exists()) {
      await setDoc(seqRef, {
        id: sid,
        projectId: pid,
        ownerId: uid,
        title: sequence.title.trim().slice(0, 200) || 'Secuencia',
        versionStatus: sequence.versionStatus === 'final' ? 'final' : 'draft',
        sourceType: sequence.sourceType,
        directorStyle: (sequence.directorStyle || '').slice(0, 180),
        aspectRatio: (sequence.aspectRatio || '2.39:1').slice(0, 24),
        logline: (sequence.logline || '').slice(0, 1200),
        directorVision: (sequence.directorVision || '').slice(0, 6000),
        continuitySummary: (sequence.continuitySummary || '').slice(0, 3000),
        sequenceData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingData = snap.data();
      if (existingData.versionStatus === 'final') {
        // Final sequences are immutable per security rules
        return;
      }
      if (sequence.versionStatus === 'final') {
        await updateDoc(seqRef, {
          versionStatus: 'final',
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(seqRef, {
          title: sequence.title.trim().slice(0, 200) || 'Secuencia',
          logline: (sequence.logline || '').slice(0, 1200),
          directorVision: (sequence.directorVision || '').slice(0, 6000),
          continuitySummary: (sequence.continuitySummary || '').slice(0, 3000),
          sequenceData,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, seqPath);
  }
}

export async function finalizeSequenceInFirestore(
  userId: string,
  projectId: string,
  sequenceId: string
): Promise<void> {
  const uid = sanitizeId(userId);
  const pid = sanitizeId(projectId);
  const sid = sanitizeId(sequenceId);
  const seqPath = `users/${uid}/projects/${pid}/sequences/${sid}`;
  const seqRef = doc(db, 'users', uid, 'projects', pid, 'sequences', sid);

  try {
    const snap = await getDoc(seqRef);
    if (!snap.exists()) return;
    if (snap.data().versionStatus === 'final') return;
    await updateDoc(seqRef, {
      versionStatus: 'final',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, seqPath);
  }
}

export async function updateProjectContinuityInFirestore(
  userId: string,
  projectId: string,
  continuityBible: string
): Promise<void> {
  const uid = sanitizeId(userId);
  const pid = sanitizeId(projectId);
  const projPath = `users/${uid}/projects/${pid}`;
  const projRef = doc(db, 'users', uid, 'projects', pid);

  try {
    const snap = await getDoc(projRef);
    if (!snap.exists()) return;
    const data = snap.data();
    await updateDoc(projRef, {
      sequencesCount: Number(data.sequencesCount || 0),
      assetsCount: Number(data.assetsCount || 0),
      continuityBible: continuityBible.slice(0, 20000),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, projPath);
  }
}

export async function loadUserProjectsFromFirestore(
  userId: string
): Promise<ProductionProject[]> {
  const uid = sanitizeId(userId);
  const projectsPath = `users/${uid}/projects`;
  try {
    const projectsSnap = await getDocs(
      query(collection(db, 'users', uid, 'projects'), where('ownerId', '==', uid))
    );
    const result: ProductionProject[] = [];

    for (const pDoc of projectsSnap.docs) {
      const p = pDoc.data();
      const seqSnap = await getDocs(
        query(
          collection(db, 'users', uid, 'projects', pDoc.id, 'sequences'),
          where('ownerId', '==', uid)
        )
      );
      const sequences: ProductionSequence[] = seqSnap.docs.map((sDoc) => {
        const s = sDoc.data();
        const data = (s.sequenceData || {}) as Record<string, unknown>;
        return {
          id: String(s.id || sDoc.id),
          title: String(s.title || 'Secuencia'),
          versionStatus: s.versionStatus === 'final' ? 'final' : 'draft',
          sourceType: s.sourceType || 'book',
          sourceFilename: (data.sourceFilename as string | undefined) || undefined,
          directorStyle: String(s.directorStyle || ''),
          aspectRatio: String(s.aspectRatio || '2.39:1'),
          cameraSystem: String(data.cameraSystem || 'ARRI Alexa 65'),
          lensPackage: String(data.lensPackage || 'Cooke Anamorphic'),
          filmStockOrLut: String(data.filmStockOrLut || 'Kodak 2383 Print LUT'),
          logline: String(s.logline || ''),
          directorVision: String(s.directorVision || ''),
          colorPalette: (data.colorPalette as ProductionSequence['colorPalette']) || [],
          lighting: data.lighting as ProductionSequence['lighting'],
          shotList: (data.shotList as ProductionSequence['shotList']) || [],
          soundDesign: data.soundDesign as ProductionSequence['soundDesign'],
          audioAnalysis: (data.audioAnalysis as ProductionSequence['audioAnalysis']) || undefined,
          vfx: data.vfx as ProductionSequence['vfx'],
          screenplay: (data.screenplay as ProductionSequence['screenplay']) || [],
          storyboardFrames:
            (data.storyboardFrames as ProductionSequence['storyboardFrames']) || [],
          continuitySummary: String(s.continuitySummary || ''),
          createdAt: toIsoString(s.createdAt),
          updatedAt: toIsoString(s.updatedAt),
        };
      });

      sequences.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      result.push({
        id: String(p.id || pDoc.id),
        title: String(p.title || 'Proyecto'),
        genreStyle: String(p.genreStyle || ''),
        defaultSourceType: p.defaultSourceType || 'book',
        continuityBible: String(p.continuityBible || ''),
        createdAt: toIsoString(p.createdAt),
        updatedAt: toIsoString(p.updatedAt),
        sequences,
      });
    }

    result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, projectsPath);
  }
}

export async function addLessonToFirestore(
  userId: string,
  lesson: LearningLesson
): Promise<void> {
  const uid = sanitizeId(userId);
  const lid = sanitizeId(lesson.id);
  const lessonPath = `users/${uid}/learning_memory/${lid}`;
  try {
    await setDoc(doc(db, 'users', uid, 'learning_memory', lid), {
      id: lid,
      ownerId: uid,
      category: lesson.category,
      insight: lesson.insight.trim().slice(0, 1000),
      rating: Math.min(5, Math.max(1, Math.round(lesson.rating))),
      sourceProjectTitle: lesson.sourceProjectTitle.trim().slice(0, 180),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, lessonPath);
  }
}

export async function deleteLessonFromFirestore(
  userId: string,
  lessonId: string
): Promise<void> {
  const uid = sanitizeId(userId);
  const lid = sanitizeId(lessonId);
  const lessonPath = `users/${uid}/learning_memory/${lid}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'learning_memory', lid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, lessonPath);
  }
}

export function subscribeLessonsFromFirestore(
  userId: string,
  onLessons: (lessons: LearningLesson[]) => void
): Unsubscribe {
  const uid = sanitizeId(userId);
  const lessonPath = `users/${uid}/learning_memory`;
  const q = query(
    collection(db, 'users', uid, 'learning_memory'),
    where('ownerId', '==', uid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: LearningLesson[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: String(data.id || d.id),
            category: data.category,
            insight: String(data.insight || ''),
            rating: Number(data.rating || 5),
            sourceProjectTitle: String(data.sourceProjectTitle || 'LumenReel Studio'),
            createdAt: toIsoString(data.createdAt),
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onLessons(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, lessonPath);
    }
  );
}
