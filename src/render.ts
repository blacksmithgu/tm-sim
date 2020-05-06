import { TMState, Tape } from "./tm";

/** Size of an entry in the SVG tape, in pixels (assuming a height of 100px for the node). */
const SVG_TAPE_ENTRY_WIDTH = 30;
/** Padding on either side of the tape in the SVG. */
const SVG_TAPE_PADDING = 8;
/** Height of the SVG image. */
const SVG_HEIGHT = 100;

/** Render state as an SVG, given a desired number of visible nodes. */
export function renderSvg(state: string, start: number, tape: string[], head: number): string {
    // Compute the locations of the seperating lines and tape values first.
    let tapeContent = "";

    // Add the bounding rectangle.
    tapeContent += `<rect x="${SVG_TAPE_PADDING}" width="${SVG_TAPE_ENTRY_WIDTH * tape.length}" y="60%" height="30%" class="tape" fill="#ffffff"/>`;

    // Add the dividing lines.
    for (let i = 0; i < tape.length - 1; i++) {
        let x = SVG_TAPE_PADDING + (i + 1) * SVG_TAPE_ENTRY_WIDTH;
        tapeContent += `<line x1="${x}" x2="${x}" y1="60%" y2="90%" class="tape"/>`;
    }

    // Add a rectangle marking the head position
    if (head >= start && head < tape.length) {
        let x = SVG_TAPE_PADDING + head * SVG_TAPE_ENTRY_WIDTH;
        tapeContent += `<rect x="${x}" width="${SVG_TAPE_ENTRY_WIDTH}" y="60%" height="30%" class="head" fill="#ffffff"/>`;
    }

    // Add the actual tape values.
    for (let i = 0; i < tape.length; i++) {
        let xCenter = SVG_TAPE_PADDING + (i + 0.5) * SVG_TAPE_ENTRY_WIDTH;
        tapeContent += `<text x="${xCenter}" y="75%" class="light">${tape[i]}</text>`;
    }

    // Add the guide indices.
    if (tape.length == 1) {
        let xCenter = SVG_TAPE_PADDING + 0.5 * SVG_TAPE_ENTRY_WIDTH;
        tapeContent += `<text x="${xCenter}" y="50%" class="light">${start}</text>`;
    } else {
        let leftCenter = SVG_TAPE_PADDING + 0.5 * SVG_TAPE_ENTRY_WIDTH;
        let rightCenter = SVG_TAPE_PADDING + (tape.length - 0.5) * SVG_TAPE_ENTRY_WIDTH;
        tapeContent += `<text x="${leftCenter}" y="50%" class="light">${start}</text>`;
        tapeContent += `<text x="${rightCenter}" y="50%" class="light">${start + tape.length - 1}</text>`;
    }

    // Then assemble everything together.
    let totalWidth = SVG_TAPE_ENTRY_WIDTH * tape.length + 2 * SVG_TAPE_PADDING;
    return `
<svg width="${totalWidth}" height="${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .heavy {
        font: bold 20px sans-serif;
        fill: #ffffff;
        text-anchor: middle;
        dominant-baseline: middle;
    }

    .light {
      font: 12px sans-serif;
      fill: #ffffff;
      text-anchor: middle;
      dominant-baseline: middle;
    }
    
    .tape {
      stroke: #fff;
      stroke-width: 2;
      fill: none;
    }
    
    .head {
      stroke: darkred;
      stroke-width: 2;
      fill: none;
    }
  </style>
  <text x="50%" y="30%" class="heavy">${state}</text>
  ${tapeContent}
</svg>`;
}

/** Converts a map-based tape into a contiguous array; includes a start index in the result. */
export function tapeAsArray(tape: Tape): [string[], number] {
    // Find the minimum index.
    let minIndex = 999999999;
    let maxIndex = -9999999999;
    for (let [key, _] of tape.data) {
        minIndex = Math.min(minIndex, key);
        maxIndex = Math.max(maxIndex, key);
    }

    if (tape.data.size == 0) {
        minIndex = 0;
        maxIndex = -1;
    }

    let result: string[] = [];
    for (let index = minIndex; index <= maxIndex; index++)
        result.push(tape.symbolAt(index));

    return [result, minIndex];
}

/** Render a state as an SVG image.  */
export function stateUrl(state: TMState): string {
    const realState = (state.terminated) ? "HALT" : state.state;
    let [tape, minIndex] = tapeAsArray(state.tape);
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(renderSvg(realState, minIndex, tape, state.tape.head));
}

/** Render tape contents as a simple HTML table. */
export function tapeTable(tape: Tape): string {
    let [array, minIndex] = tapeAsArray(tape);
    let result: string[] = [];
    result.push("<table>");
    result.push("<tr>");
    for (let index = minIndex; index < minIndex + array.length; index++)
        result.push("<td>", index.toString(), "</td>");
    result.push("</tr>");
    result.push("<tr>");
    for (let index = minIndex; index < minIndex + array.length; index++)
        result.push("<td>", tape.symbolAt(index), "</td>");
    result.push("</tr>");
    result.push("</table>");

    return result.join("");
}