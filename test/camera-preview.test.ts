import { Vec3 } from 'playcanvas';
import { describe, expect, test, vi } from 'vitest';

import { registerCameraPreviewEvents } from '../src/camera-preview';
import { Events } from '../src/events';

const pose = (x: number) => ({
    position: new Vec3(x, 0, 0),
    target: new Vec3(0, 0, -1),
    fov: 60
});

describe('Render Camera Preview', () => {
    test('keeps Edit View independent, locks navigation while pinned, and restores it when unpinned', () => {
        const events = new Events();
        let displayed = pose(2);
        events.function('camera.getPose', () => displayed);
        events.on('camera.setPose', (value) => {
            displayed = value;
        });
        const setNavigationEnabled = vi.fn();
        registerCameraPreviewEvents(events, setNavigationEnabled);

        events.fire('camera.timelinePose', pose(10));
        expect(displayed.position.x).toBe(2);

        events.fire('camera.setPreviewPinned', true);
        expect(displayed.position.x).toBe(10);
        expect(setNavigationEnabled).toHaveBeenLastCalledWith(false);

        events.fire('camera.timelinePose', pose(15));
        expect(displayed.position.x).toBe(15);

        events.fire('camera.setPreviewPinned', false);
        expect(displayed.position.x).toBe(2);
        expect(setNavigationEnabled).toHaveBeenLastCalledWith(true);
    });
});
