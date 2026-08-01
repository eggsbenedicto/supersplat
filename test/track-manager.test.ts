import { Quat, Vec3 } from 'playcanvas';
import { describe, expect, test, vi } from 'vitest';

import { AnimTrack } from '../src/anim-track';
import { ElementType } from '../src/element';
import { Events } from '../src/events';
import { registerTrackManagerEvents, TimelineTarget } from '../src/track-manager';

const fakeTrack = (): AnimTrack => ({
    keys: [],
    addKey: () => false,
    removeKey: () => false,
    moveKey: () => false,
    copyKey: () => false,
    clear: () => {},
    snapshot: () => [],
    restore: () => {},
    evaluate: vi.fn(),
    timelineSettingsChanged: vi.fn()
});

const fakeSplat = (uid: number, name: string) => {
    const position = new Vec3();
    const rotation = new Quat();
    const scale = new Vec3(1, 1, 1);
    return {
        uid,
        name,
        type: ElementType.splat,
        visible: true,
        entity: {
            getLocalPosition: () => position,
            getLocalRotation: () => rotation,
            getLocalScale: () => scale
        },
        move: vi.fn(),
        position
    };
};

describe('timeline target registry', () => {
    test('keeps Camera active during automatic loading, synchronizes deliberate selection, and evaluates every target', () => {
        const events = new Events();
        const cameraTrack = fakeTrack();
        events.function('camera.animTrack', () => cameraTrack);
        events.function('timeline.frame', () => 0);
        events.function('timeline.frames', () => 20);
        events.function('timeline.loop', () => false);
        events.on('edit.add', () => {});
        registerTrackManagerEvents(events);

        const first = fakeSplat(7, 'First');
        const second = fakeSplat(9, 'Second');
        events.fire('scene.elementAdded', first);
        events.fire('scene.elementAdded', second);
        events.fire('selection.changed', first, null, 'automatic');

        const targets = events.invoke('track.targets') as TimelineTarget[];
        expect(targets.map(target => target.id)).toEqual(['camera', 'splat:7', 'splat:9']);
        expect(events.invoke('track.activeTarget').id).toBe('camera');

        events.fire('selection.changed', second, first, 'user');
        expect(events.invoke('track.activeTarget').id).toBe('splat:9');
        events.fire('track.addKey', 0);
        second.position.x = 10;

        events.fire('timeline.time', 4.5);
        expect(cameraTrack.evaluate).toHaveBeenCalledWith(4.5);
        expect(second.move).toHaveBeenCalledTimes(1);
    });
});
