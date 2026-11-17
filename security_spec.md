# Security Specification — AUTEUR Studio Firestore Rules

## 1. Data Invariants
1. A `UserProfile` at `/users/{userId}` contains PII (`email`) and may only be read or written by the verified owner (`request.auth.uid == userId`), with `role == 'director'` immutable.
2. A `StudioProject` at `/users/{userId}/projects/{projectId}` requires `ownerId == userId == request.auth.uid` and valid ID format (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
3. A `ProjectSequence` at `/users/{userId}/projects/{projectId}/sequences/{sequenceId}` requires parent project existence (`exists(...)`), `ownerId == userId == request.auth.uid`, `projectId == projectId`, and **terminal state locking**: once `versionStatus == 'final'`, it cannot be mutated or downgraded back to `'draft'`.
4. A `LearningLesson` at `/users/{userId}/learning_memory/{lessonId}` belongs strictly to `ownerId == userId == request.auth.uid` with rating bounded `1..5`.
5. All `createdAt` and `updatedAt` timestamps must match `request.time`, and `createdAt` + `ownerId` + `id` are immutable on update.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read/write on `/users/u1/projects/p1`.
2. Unverified email write (`email_verified: false`) on `/users/u1/projects/p1`.
3. Cross-user PII read: user `u2` attempting `get` on `/users/u1`.
4. Self-assigned privilege escalation on `/users/u1`: `{ role: 'admin', ... }`.
5. Shadow field injection on project create: `{ ..., isPro: true }`.
6. Owner spoofing on project create: user `u2` creating `/users/u2/projects/p1` with `ownerId: 'u1'`.
7. Oversized document ID (`150` characters) or invalid characters (`../hack`).
8. Backdated/forged timestamp: `createdAt: '2020-01-01T00:00:00Z'` instead of `request.time`.
9. Orphaned sequence create referencing non-existent parent `/users/u1/projects/missing/sequences/s1`.
10. Terminal state bypass: updating a `ProjectSequence` whose existing `versionStatus == 'final'` back to `'draft'`.
11. Out-of-bounds rating on `LearningLesson`: `{ rating: 99 }`.
12. Cross-user `list` query on `/users/u1/projects` by `u2`.
