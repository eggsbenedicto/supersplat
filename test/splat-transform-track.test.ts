import { Quat, Vec3 } from 'playcanvas';
import { describe, expect, test } from 'vitest';

import { Events } from '../src/events';
import { SplatTransformTrack } from '../src/splat-transform-track';

class TransformTarget {
    position = new Vec3();
    rotation = new Quat();
    scale = new Vec3(1, 1, 1);
    moves = 0;

    readonly entity = {
        getLocalPosition: () => this.position,
        getLocalRotation: () => this.rotation,
        getLocalScale: () => this.scale
    };

    move(position: Vec3, rotation: Quat, scale: Vec3) {
        this.position.copy(position);
        this.rotation.copy(rotation);
        this.scale.copy(scale);
        this.moves++;
    }
}

const createTrack = () => {
    const events = new Events();
    events.function('timeline.frames', () => 20);
    events.function('timeline.loop', () => false);
    const target = new TransformTarget();
    const track = new SplatTransformTrack('splat:1', target, events);
    return { target, track };
};

describe('SplatTransformTrack', () => {
    test('one timeline state holds its complete local transform at every frame', () => {
        const { target, track } = createTrack();
        target.position.set(1, 2, 3);
        target.rotation.setFromEulerAngles(10, 20, 30);
        target.scale.set(2, 3, 4);

        expect(track.addKey(7)).toBe(true);

        target.position.set(9, 9, 9);
        target.rotation.set(0, 0, 0, 1);
        target.scale.set(1, 1, 1);
        track.evaluate(2.5);

        expect(target.position.toArray()).toEqual([1, 2, 3]);
        expect(target.scale.toArray()).toEqual([2, 3, 4]);
        expect(target.rotation.length()).toBeCloseTo(1, 8);
    });

    test('fractional evaluation linearly interpolates position and scale and slerps rotation on the shortest path', () => {
        const { target, track } = createTrack();
        target.rotation.setFromEulerAngles(0, 170, 0);
        track.addKey(0);

        target.position.set(10, 20, 30);
        target.rotation.setFromEulerAngles(0, -170, 0);
        // q and -q represent the same endpoint; deserialization/capture must
        // not turn that sign choice into a long-path rotation.
        target.rotation.mulScalar(-1);
        target.scale.set(3, 5, 7);
        track.addKey(10);

        track.evaluate(5.5);

        expect(target.position.toArray()).toEqual([5.5, 11, 16.5]);
        target.scale.toArray().forEach((value, index) => {
            expect(value).toBeCloseTo([2.1, 3.2, 4.3][index], 8);
        });
        expect(target.rotation.length()).toBeCloseTo(1, 8);
        const forward = target.rotation.transformVector(Vec3.FORWARD);
        expect(forward.z).toBeGreaterThan(0.98);
    });
});
