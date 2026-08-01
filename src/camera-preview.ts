import { Vec3 } from 'playcanvas';

import { Events } from './events';

type CameraPose = {
    position: Vec3;
    target: Vec3;
    fov?: number;
};

const clonePose = (pose: CameraPose): CameraPose => ({
    position: new Vec3(pose.position.x, pose.position.y, pose.position.z),
    target: new Vec3(pose.target.x, pose.target.y, pose.target.z),
    fov: pose.fov
});

const registerCameraPreviewEvents = (events: Events, setNavigationEnabled: (enabled: boolean) => void) => {
    let pinned = false;
    let rendering = false;
    let editPose: CameraPose | null = null;
    let renderPose: CameraPose | null = null;

    const currentPose = () => clonePose(events.invoke('camera.getPose'));
    const apply = (pose: CameraPose | null) => {
        if (pose) events.fire('camera.setPose', clonePose(pose), 0);
    };

    const setPinned = (value: boolean) => {
        if (value === pinned) return;
        if (value) {
            editPose = currentPose();
            renderPose ??= clonePose(editPose);
            pinned = true;
            setNavigationEnabled(false);
            apply(renderPose);
        } else {
            pinned = false;
            setNavigationEnabled(true);
            apply(editPose);
        }
        events.fire('camera.previewPinned', pinned);
    };

    events.function('camera.previewPinned', () => pinned);
    events.function('camera.renderEvaluation', () => rendering);
    events.function('camera.renderPose', () => (renderPose ? clonePose(renderPose) : null));

    events.on('camera.setPreviewPinned', setPinned);
    events.on('camera.timelinePose', (pose: CameraPose) => {
        renderPose = clonePose(pose);
        if (pinned || rendering) apply(renderPose);
    });
    events.on('camera.timelineCleared', () => {
        renderPose = null;
        if (pinned) {
            editPose = currentPose();
            setPinned(false);
        }
    });
    events.on('camera.previewReset', () => {
        if (pinned) setPinned(false);
        setNavigationEnabled(true);
        const cameraTrack = events.invoke('camera.animTrack');
        if (cameraTrack?.keys?.length && renderPose) {
            apply(renderPose);
        }
        editPose = currentPose();
        events.fire('camera.previewPinned', false);
    });
    events.on('camera.setRenderEvaluation', (value: boolean) => {
        if (value === rendering) return;
        if (value) {
            if (!pinned) editPose = currentPose();
            rendering = true;
            apply(renderPose);
        } else {
            rendering = false;
            apply(pinned ? renderPose : editPose);
        }
    });
};

export { CameraPose, registerCameraPreviewEvents };
