function replacer(_, value) {
    if (value instanceof Map) {
        return value.entries().reduce((acc, curr) => ({
            ...acc,
            [curr[0]]: curr[1]
        }), {})
    } else if (value instanceof Set) {
        return [...value.values()]
    }
    return value;
}

export const transform = (value) => JSON.parse(JSON.stringify(value, replacer));

export function normalize(value, domain) {
    if (!domain || domain.length < 2) return 0;
    return (value - domain[0]) / (domain[1] - domain[0]);
}

export function generateRange(start, end, step = 1) {
    const length = Math.ceil((end - start) / step);
    return Array.from({ length: length }, (_, index) => start + index * step);
}

import { color } from 'd3-color';

export function getScentColor(value, guidance, orientationScheme, colorDomain = "index") {
    if (!guidance || !guidance.aggregateData || !guidance.domain) return null;

    // Logic duplicated from Bars.js
    const data = guidance.aggregateData.get(value);
    if (!data) return null;

    const norm = normalize(
        data?.[colorDomain],
        guidance.domain.get(colorDomain)
    );

    return orientationScheme(norm);
}

export function getContrastColor(backgroundColor) {
    if (!backgroundColor) return 'black';
    const c = color(backgroundColor);
    if (!c) return 'black';

    // Calculate relative luminance
    // https://www.w3.org/TR/WCAG20/#relativeluminancedef
    const luminance = 0.2126 * (c.r / 255) + 0.7152 * (c.g / 255) + 0.0722 * (c.b / 255);

    // Threshold can be adjusted. 0.5 is standard middle grey perception.
    // Lower threshold means we tolerate darker colors before switching to white.
    return luminance < 0.5 ? 'white' : 'black';
}