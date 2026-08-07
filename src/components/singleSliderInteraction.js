/**
 * PrimeReact emits onChange throughout pointer/touch dragging and follows it
 * with onSlideEnd. Keyboard changes only emit onChange, so those must commit
 * immediately while pointer changes remain previews until release.
 */
export const shouldCommitSingleSliderChange = event =>
    event?.originalEvent?.type === "keydown";
