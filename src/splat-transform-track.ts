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

    moveKey(_fromFrame: number, _toFrame: number): boolean {
        return false;
    }

    copyKey(_fromFrame: number, _toFrame: number): boolean {
        return false;
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
    }

    evaluate(_frame: number): void {
        if (this.data.length !== 1) return;
        const key = this.data[0];
        const entity = this.target.entity;
        if (entity.getLocalPosition().equals(key.position) &&
            entity.getLocalRotation().equals(key.rotation) &&
            entity.getLocalScale().equals(key.scale)) {
            return;
        }
        this.target.move(key.position, key.rotation, key.scale);
    }

    timelineSettingsChanged(): void {}
}

export { SplatTransformKey, SplatTransformTrack };
