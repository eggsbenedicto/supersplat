import { describe, expect, test } from 'vitest';

import { videoTimelineSamples } from '../src/video-sampling';

describe('offline animation sampling', () => {
    test('derives every fractional timeline time from an integer output-frame index', () => {
        const samples = videoTimelineSamples(0, 10, 30, 24);

        expect(samples).toHaveLength(9);
        expect(samples).toEqual([0, 1.25, 2.5, 3.75, 5, 6.25, 7.5, 8.75, 10]);
    });
});
