import { Quat, Vec3 } from 'playcanvas';

import { AnimTrack } from './anim-track';
import { Events } from './events';

type TransformTarget = {
    entity: {
        getLocalPosition(): Vec3;
        getLocalRotation(): Quat;
        getLocalScale(): Vec3;
    };
    move(position: Vec3, rotation: Quat, scale: Vec3): void;
};

type SplatTransformKey = {
    frame: number;
    position: Vec3;
    rotation: Quat;
    scale: Vec3;
};

const cloneKey = (key: SplatTransformKey): SplatTransformKey => ({
    frame: key.frame,
    position: key.position.clone(),
    rotation: key.rotation.clone().normalize(),
    scale: key.scale.clone()
});

class SplatTransformTrack implements AnimTrack {
    private data: SplatTransformKey[] = [];
    private resultPosition = new Vec3();
    private resultRotation = new Quat();
    private resultScale = new Vec3();
    private slerpEnd = new Quat();

    constructor(
        readonly targetId: string,
        private target: TransformTarget,
        private events: Events
    ) {}

    get keys(): readonly number[] {
        return this.data.map(key => key.frame);
    }

    addKey(frame: number): boolean {
        const entity = this.target.entity;
        const key = cloneKey({
            frame,
            position: entity.getLocalPosition(),
            rotation: entity.getLocalRotation(),
            scale: entity.getLocalScale()
        });
        const index = this.data.findIndex(candidate => candidate.frame === frame);
        if (index === -1) {
            this.data.push(key);
        } else {
            this.data[index] = key;
        }
        this.data.sort((a, b) => a.frame - b.frame);
        this.events.fire(index === -1 ? 'track.keyAdded' : 'track.keyUpdated', this.targetId, frame);
        return true;
    }

    removeKey(frame: number): boolean {
        const index = this.data.findIndex(key => key.frame === frame);
        if (index === -1) return false;
        this.data.splice(index, 1);
        this.events.fire('track.keyRemoved', this.targetId, frame);
        return true;
    }

    moveKey(fromFrame: number, toFrame: number): boolean {
        if (fromFrame === toFrame) return false;
        const source = this.data.find(key => key.frame === fromFrame);
        if (!source) return false;
        const moved = cloneKey(source);
        moved.frame = toFrame;
        this.data = this.data.filter(key => key.frame !== fromFrame && key.frame !== toFrame);
        this.data.push(moved);
        this.data.sort((a, b) => a.frame - b.frame);
        this.events.fire('track.keyMoved', this.targetId, fromFrame, toFrame);
        return true;
    }

    copyKey(fromFrame: number, toFrame: number): boolean {
        if (fromFrame === toFrame) return false;
        const source = this.data.find(key => key.frame === fromFrame);
        if (!source) return false;
        const copied = cloneKey(source);
        copied.frame = toFrame;
        this.data = this.data.filter(key => key.frame !== toFrame);
        this.data.push(copied);
        this.data.sort((a, b) => a.frame - b.frame);
        this.events.fire('track.keyAdded', this.targetId, toFrame);
        return true;
    }

    clear(): void {
        if (this.data.length === 0) return;
        this.data.length = 0;
        this.events.fire('track.keysCleared', this.targetId);
    }

    snapshot(): SplatTransformKey[] {
        return this.data.map(cloneKey);
    }

    restore(snapshot: unknown): void {
        this.data = (snapshot as SplatTransformKey[]).map(cloneKey);
        this.events.fire('track.keysLoaded', this.targetId);
        this.evaluate(this.events.invoke('timeline.frame'));
    }

    serialize() {
        return this.data.map(key => ({
            frame: key.frame,
            position: key.position.toArray(),
            rotation: key.rotation.toArray(),
            scale: key.scale.toArray()
        }));
    }

    deserialize(data: unknown): void {
        const validVector = (value: unknown, length: number) => Array.isArray(value) &&
            value.length === length && value.every(component => typeof component === 'number' && Number.isFinite(component));
        const loaded = (Array.isArray(data) ? data : []).flatMap((value: any) => {
            if (!Number.isFinite(value?.frame) ||
                !validVector(value.position, 3) ||
                !validVector(value.rotation, 4) ||
                !validVector(value.scale, 3)) {
                return [];
            }
            return [{
                frame: value.frame,
                position: new Vec3(value.position),
                rotation: new Quat(value.rotation).normalize(),
                scale: new Vec3(value.scale)
            }];
        });
        this.data = [...new Map(loaded.map(key => [key.frame, key])).values()].sort((a, b) => a.frame - b.frame);
        this.events.fire('track.keysLoaded', this.targetId);
    }

    evaluate(frame: number): void {
        const duration = this.events.invoke('timeline.frames') as number;
        const keys = this.data.filter(key => key.frame < duration);
        if (keys.length === 0) return;

        let position: Vec3;
        let rotation: Quat;
        let scale: Vec3;

        if (keys.length === 1) {
            ({ position, rotation, scale } = keys[0]);
        } else {
            const rightIndex = keys.findIndex(key => key.frame >= frame);
            const looping = this.events.invoke('timeline.loop') as boolean;
            let a: SplatTransformKey;
            let b: SplatTransformKey;
            let sample = frame;
            let endFrame: number;

            if (looping && (rightIndex === 0 || rightIndex === -1)) {
                a = keys[keys.length - 1];
                b = keys[0];
                if (rightIndex === 0) sample += duration;
                endFrame = b.frame + duration;
            } else {
                a = rightIndex <= 0 ? keys[0] : keys[rightIndex - 1];
                b = rightIndex === -1 ? keys[keys.length - 1] : keys[rightIndex];
                endFrame = b.frame;
            }

            const t = a === b ? 0 : Math.max(0, Math.min(1, (sample - a.frame) / (endFrame - a.frame)));

            position = this.resultPosition.lerp(a.position, b.position, t);
            scale = this.resultScale.lerp(a.scale, b.scale, t);
            const end = a.rotation.dot(b.rotation) < 0 ? this.slerpEnd.copy(b.rotation).mulScalar(-1) : b.rotation;
            rotation = this.resultRotation.slerp(a.rotation, end, t).normalize();
        }

        const entity = this.target.entity;
        if (entity.getLocalPosition().equals(position) &&
            entity.getLocalRotation().equals(rotation) &&
            entity.getLocalScale().equals(scale)) {
            return;
        }
        this.target.move(position, rotation, scale);
    }

    timelineSettingsChanged(): void {
        this.evaluate(this.events.invoke('timeline.frame'));
    }
}

export { SplatTransformKey, SplatTransformTrack };
