import { Element, ElementType } from './element';
import { Events } from './events';
import { Scene } from './scene';
import { Splat } from './splat';

const registerSelectionEvents = (events: Events, scene: Scene) => {
    let selection: Splat = null;

    const setSelection = (splat: Splat, source = 'user') => {
        if (splat !== selection) {
            const prev = selection;
            selection = splat;
            events.fire('selection.changed', selection, prev, source);
        }
    };

    events.on('selection', (splat: Splat, source = 'user') => {
        setSelection(splat, source);
    });

    events.function('selection', () => {
        return selection;
    });

    events.on('selection.next', () => {
        const splats = scene.getElementsByType(ElementType.splat) as Splat[];
        if (splats.length > 1) {
            const idx = splats.indexOf(selection);
            setSelection(splats[(idx + 1) % splats.length], 'user');
        }
    });

    events.on('scene.elementAdded', (element: Element) => {
        if (element.type === ElementType.splat) {
            setSelection(element as Splat, 'automatic');
        }
    });

    events.on('scene.elementRemoved', (element: Element) => {
        if (element === selection) {
            const splats = scene.getElementsByType(ElementType.splat) as Splat[];
            setSelection(splats.length === 1 ? null : splats.find(v => v !== element), 'automatic');
        }
    });

    events.on('camera.focalPointPicked', (details: { splat: Splat }) => {
        setSelection(details.splat, 'user');
    });
};

export { registerSelectionEvents };
