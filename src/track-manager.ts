import { AnimTrack } from './anim-track';
import { AnimTrackEditOp } from './edit-ops';
import { Element, ElementType } from './element';
import { Events } from './events';
import { Splat } from './splat';
import { SplatTransformTrack } from './splat-transform-track';

type TimelineTargetKind = 'camera' | 'splat';

type TimelineTarget = {
    id: string;
    kind: TimelineTargetKind;
    label: string;
    element: Element | null;
    track: AnimTrack;
};

const registerTrackManagerEvents = (events: Events) => {
    const cameraTrack = events.invoke('camera.animTrack') as AnimTrack;
    const targets: TimelineTarget[] = [{
        id: 'camera',
        kind: 'camera',
        label: 'Camera',
        element: null,
        track: cameraTrack
    }];
    let activeTarget = targets[0];

    const setActiveTarget = (target: TimelineTarget, syncSelection = true) => {
        if (!target || target === activeTarget) return;
        activeTarget = target;
        events.fire('track.activeChanged', activeTarget);
        if (syncSelection) {
            events.fire('selection', target.kind === 'splat' ? target.element : null, 'timeline');
        }
    };

    const findTarget = (id: string) => targets.find(target => target.id === id);

    events.function('track.targets', () => targets);
    events.function('track.activeTarget', () => activeTarget);
    events.function('track.target', (id: string) => findTarget(id));
    events.function('track.keys', () => activeTarget?.track.keys ?? []);

    events.on('track.setActive', (id: string) => {
        setActiveTarget(findTarget(id));
    });

    events.on('scene.elementAdded', (element: Element) => {
        if (element.type !== ElementType.splat) return;
        const splat = element as Splat;
        targets.push({
            id: `splat:${element.uid}`,
            kind: 'splat',
            label: splat.name,
            element,
            track: new SplatTransformTrack(`splat:${element.uid}`, splat, events)
        });
        events.fire('track.targetsChanged', targets);
    });

    events.on('scene.elementRemoved', (element: Element) => {
        const index = targets.findIndex(target => target.element === element);
        if (index === -1) return;
        const [removed] = targets.splice(index, 1);
        removed.track.dispose?.();
        if (removed === activeTarget) {
            setActiveTarget(targets[0]);
        }
        events.fire('track.targetsChanged', targets);
    });

    events.on('splat.name', (splat: Splat) => {
        const target = targets.find(candidate => candidate.element === splat);
        if (target && target.label !== splat.name) {
            target.label = splat.name;
            events.fire('track.targetsChanged', targets);
        }
    });

    events.on('splat.visibility', () => {
        events.fire('track.targetsChanged', targets);
    });

    events.on('selection.changed', (selection: Splat, _previous: Splat, source = 'user') => {
        if (source === 'automatic') return;
        const target = selection ? targets.find(candidate => candidate.element === selection) : targets[0];
        if (target) setActiveTarget(target, false);
    });

    const evaluateAll = (frame: number) => {
        targets.forEach(target => target.track.evaluate(frame));
    };
    events.on('timeline.frame', evaluateAll);
    events.on('timeline.time', evaluateAll);

    const timelineSettingsChanged = () => {
        targets.forEach(target => target.track.timelineSettingsChanged());
    };
    events.on('timeline.frames', timelineSettingsChanged);
    events.on('timeline.smoothness', timelineSettingsChanged);
    events.on('timeline.loop', timelineSettingsChanged);

    const trackEdit = (name: string, edit: (track: AnimTrack) => boolean) => {
        const track = activeTarget?.track;
        if (!track) return;
        const before = track.snapshot();
        if (!edit(track)) return;
        const after = track.snapshot();
        events.fire('edit.add', new AnimTrackEditOp(name, track, before, after), true);
    };

    events.on('track.addKey', (frame?: number) => {
        trackEdit('addKey', track => track.addKey(frame ?? events.invoke('timeline.frame')));
    });
    events.on('track.removeKey', (frame?: number) => {
        trackEdit('removeKey', track => track.removeKey(frame ?? events.invoke('timeline.frame')));
    });
    events.on('track.moveKey', (fromFrame: number, toFrame: number) => {
        trackEdit('moveKey', track => track.moveKey(fromFrame, toFrame));
    });
    events.on('track.copyKey', (fromFrame: number, toFrame: number) => {
        trackEdit('copyKey', track => track.copyKey(fromFrame, toFrame));
    });

    events.on('scene.clear', () => {
        activeTarget = targets[0];
        events.fire('track.activeChanged', activeTarget);
    });
};

export { registerTrackManagerEvents, TimelineTarget, TimelineTargetKind };
