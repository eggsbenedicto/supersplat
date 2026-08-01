import { Quat, Vec3 } from 'playcanvas';
import { describe, expect, test, vi } from 'vitest';

import { registerCameraPosesEvents } from '../src/camera-poses';
import { ElementType } from '../src/element';
import { Events } from '../src/events';
import { registerTrackManagerEvents, TimelineTarget } from '../src/track-manager';

const createRuntime = () => {
    const events = new Events();
    events.function('timeline.frame', () => 3);
    events.function('timeline.frames', () => 20);
    events.function('timeline.frameRate', () => 30);
    events.function('timeline.smoothness', () => 0);
    events.function('timeline.loop', () => false);
    events.function('camera.fov', () => 60);
    events.function('camera.getPose', () => ({
        position: new Vec3(),
        target: new Vec3(0, 0, -1),
        fov: 60
    }));
    events.on('camera.setPose', () => {});
    events.on('edit.add', () => {});
    registerCameraPosesEvents(events);
    registerTrackManagerEvents(events);
    return events;
};

const addSplat = (events: Events, uid: number) => {
    const position = new Vec3(1, 2, 3);
    const rotation = new Quat();
    const scale = new Vec3(2, 3, 4);
    const splat = {
        uid,
        name: `Splat ${uid}`,
        type: ElementType.splat,
        visible: true,
        entity: {
            getLocalPosition: () => position,
            getLocalRotation: () => rotation,
            getLocalScale: () => scale
        },
        move: vi.fn()
    };
    events.fire('scene.elementAdded', splat);
    return splat;
};

describe('versioned project animation data', () => {
    test('round-trips Camera and independently indexed splat transform tracks while ignoring unknown tracks', () => {
        const source = createRuntime();
        source.fire('camera.addPose', {
            name: 'camera_0',
            frame: 0,
            position: new Vec3(4, 5, 6),
            target: new Vec3(),
            fov: 50
        });
        const sourceSplat = addSplat(source, 7);
        source.fire('selection.changed', sourceSplat, null, 'user');
        source.fire('track.addKey', 3);

        const serialized = source.invoke('docSerialize.animations');
        expect(serialized).toMatchObject({
            version: 1,
            tracks: [
                { target: { type: 'camera' }, type: 'cameraPose' },
                { target: { type: 'splat', index: 0 }, type: 'transform' }
            ]
        });

        const destination = createRuntime();
        addSplat(destination, 99);
        serialized.tracks.splice(1, 0, { target: { type: 'missing' }, type: 'futureTrack', keys: [] });
        destination.invoke('docDeserialize.animations', serialized);

        const targets = destination.invoke('track.targets') as TimelineTarget[];
        expect(targets[0].track.keys).toEqual([0]);
        expect(targets[1].track.keys).toEqual([3]);
    });

    test('retains legacy poseSets as a Camera compatibility representation', () => {
        const source = createRuntime();
        source.fire('camera.addPose', {
            name: 'legacy', frame: 6,
            position: new Vec3(1, 2, 3), target: new Vec3(4, 5, 6), fov: 55
        });
        const poseSets = source.invoke('docSerialize.poseSets');

        const destination = createRuntime();
        destination.invoke('docDeserialize.poseSets', poseSets, 60);

        expect(destination.invoke('docSerialize.poseSets')).toEqual(poseSets);
    });
});
