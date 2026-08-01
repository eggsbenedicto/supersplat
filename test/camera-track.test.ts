import { Vec3 } from 'playcanvas';
import { describe, expect, test } from 'vitest';

import { CameraAnimTrack } from '../src/camera-poses';
import { Events } from '../src/events';

describe('legacy Camera animation characterization', () => {
    test('preserves the existing fractional cubic pose and FOV evaluation', () => {
        const events = new Events();
        events.function('timeline.frame', () => 0);
        events.function('timeline.frames', () => 20);
        events.function('timeline.smoothness', () => 0);
        events.function('timeline.loop', () => false);
        events.function('camera.fov', () => 60);
        let evaluated: any;
        events.on('camera.timelinePose', pose => {
            evaluated = pose;
        });
        const track = new CameraAnimTrack(events);
        track.addPose({
            name: 'camera_0', frame: 0,
            position: new Vec3(0, 0, 0), target: new Vec3(0, 0, -1), fov: 40
        });
        track.addPose({
            name: 'camera_1', frame: 10,
            position: new Vec3(10, 0, 0), target: new Vec3(10, 0, -1), fov: 60
        });

        track.evaluate(5.5);

        // Existing zero-smoothness Camera curves use zero-tangent cubic
        // Hermite interpolation: 3t² - 2t³ = 0.57475 at t = 0.55.
        expect(evaluated.position.x).toBeCloseTo(5.7475, 8);
        expect(evaluated.target.x).toBeCloseTo(5.7475, 8);
        expect(evaluated.fov).toBeCloseTo(51.495, 8);
    });
});
