const videoTimelineSamples = (
    startFrame: number,
    endFrame: number,
    timelineFrameRate: number,
    outputFrameRate: number
) => {
    const duration = (endFrame - startFrame) / timelineFrameRate;
    const count = Math.floor(duration * outputFrameRate) + 1;
    return Array.from({ length: count }, (_, outputFrame) =>
        startFrame + outputFrame * timelineFrameRate / outputFrameRate);
};

export { videoTimelineSamples };
