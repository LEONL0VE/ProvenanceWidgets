import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getBarFillRatio,
    getBarLabelColor,
    shouldRenderBarLabelOverlay,
} from '../src/components/utils.js';

const provenanceWith = (record) => ({
    aggregateData: new Map([['option', record]]),
    domain: new Map([
        ['interactions', [0, 2]],
        ['index', [0, 3]],
    ]),
});

test('uses black when no provenance bar is rendered', () => {
    const provenance = provenanceWith({
        interactions: 0,
        index: 3,
    });

    assert.equal(
        getBarLabelColor('option', provenance, () => '#3b0a00'),
        'black'
    );
});

test('uses the scent contrast color when the provenance bar is visible', () => {
    const provenance = provenanceWith({
        interactions: 1,
        index: 3,
    });

    assert.equal(
        getBarLabelColor('option', provenance, () => '#3b0a00'),
        'white'
    );
});

test('uses black when an option has no aggregate record', () => {
    const provenance = {
        aggregateData: new Map(),
        domain: new Map([
            ['interactions', [0, 0]],
            ['index', [0, 0]],
        ]),
    };

    assert.equal(
        getBarLabelColor('option', provenance, () => '#3b0a00'),
        'black'
    );
});

test('calculates the visible bar ratio used to clip a two-color label', () => {
    const provenance = provenanceWith({
        interactions: 1,
        index: 3,
    });

    assert.equal(getBarFillRatio('option', provenance), 0.5);
});

test('clamps invalid or out-of-domain bar ratios', () => {
    const aboveDomain = provenanceWith({
        interactions: 5,
        index: 3,
    });
    const zeroWidthDomain = {
        aggregateData: new Map([
            ['option', { interactions: 1, index: 1 }],
        ]),
        domain: new Map([
            ['interactions', [0, 0]],
            ['index', [0, 1]],
        ]),
    };

    assert.equal(getBarFillRatio('option', aboveDomain), 1);
    assert.equal(getBarFillRatio('option', zeroWidthDomain), 0);
});

test('does not render a white overlay when provenance is hidden or absent', () => {
    const base = {
        showTimeline: false,
        barLabelColor: 'white',
        whiteOverlayWidth: 50,
    };

    assert.equal(
        shouldRenderBarLabelOverlay({
            ...base,
            disableOverlay: true,
        }),
        false
    );
    assert.equal(
        shouldRenderBarLabelOverlay({
            ...base,
            disableOverlay: false,
        }),
        true
    );
});
