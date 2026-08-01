/**
 * Interface for animation tracks that can be attached to animatable targets.
 * Each track owns its keyframes and handles capture, interpolation, and evaluation.
 */
interface AnimTrack {
    /** Array of frame numbers where keyframes exist */
    readonly keys: readonly number[];

    /**
     * Add a keyframe at the specified frame, capturing current state.
     * If a key already exists at this frame, it will be updated.
     * @returns true if the track was modified, false if the operation was a no-op.
     */
    addKey(frame: number): boolean;

    /**
     * Remove the keyframe at the specified frame.
     * @returns true if the track was modified, false if the operation was a no-op.
     */
    removeKey(frame: number): boolean;

    /**
     * Move a keyframe from one frame to another.
     * @returns true if the track was modified, false if the operation was a no-op.
     */
    moveKey(fromFrame: number, toFrame: number): boolean;

    /**
     * Copy a keyframe from one frame to another.
     * The original keyframe remains in place.
     * @returns true if the track was modified, false if the operation was a no-op.
     */
    copyKey(fromFrame: number, toFrame: number): boolean;

    /**
     * Clear all keyframes.
     */
    clear(): void;

    /**
     * Return a deep copy of the track's internal state (for undo snapshots).
     */
    snapshot(): unknown;

    /**
     * Replace the track's internal state with a previously captured snapshot
     * and fire appropriate change events.
     */
    restore(snapshot: unknown): void;

    /** Evaluate the track at an integer or fractional Global Timeline frame. */
    evaluate(frame: number): void;

    /** Rebuild any cached evaluation data after Global Timeline settings change. */
    timelineSettingsChanged(): void;

    /** Serialize only this track's type-specific key data. */
    serialize(): unknown;

    /** Replace this track's keys from type-specific serialized key data. */
    deserialize(data: unknown): void;

    /** Release target-specific listeners or resources when the target is removed. */
    dispose?(): void;
}

export { AnimTrack };
