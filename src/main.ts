import { DataSet, Network } from "vis-network/standalone";
import { TMState, TMSpec, Rule, Direction, Tape } from "./tm";

/** Size of an entry in the SVG tape, in pixels (assuming a height of 100px for the node). */
const SVG_TAPE_ENTRY_WIDTH = 30;
/** Padding on either side of the tape in the SVG. */
const SVG_TAPE_PADDING = 8;
/** Height of the SVG image. */
const SVG_HEIGHT = 100;

/** Render state as an SVG, given a desired number of visible nodes. */
function renderSvg(state: string, start: number, tape: string[], head: number): string {
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

/** Render  */
function stateUrl(state: TMState): string {
    const realState = (state.terminated) ? "HALT" : state.state;
    // Find the minimum index.
    let minIndex = 999999999;
    let maxIndex = -9999999999;
    for (let [key, _] of state.tape.data) {
        minIndex = Math.min(minIndex, key);
        maxIndex = Math.max(maxIndex, key);
    }

    if (state.tape.data.size == 0) {
        minIndex = 0;
        maxIndex = -1;
    }

    let tape: string[] = [];
    for (let index = minIndex; index <= maxIndex; index++)
        tape.push(state.tape.symbolAt(index));

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(renderSvg(realState, minIndex, tape, state.tape.head));
}

const spec = new TMSpec(["a"], ["_", "0", "1"], [
    Rule.create("a", "0", "0", Direction.Right, "a"),
    Rule.create("a", "1", "0", Direction.Right, "a")
]);

const terminalState = new TMState(new Tape(new Map([[0, "0"], [1, "0"], [2, "0"], [3, "0"], [4, "0"], [5, "0"]]), "_", 6), "a", true);

let nodes = new DataSet([]);
nodes.add([
    { id: 1, image: stateUrl(terminalState), shape: "image", state: terminalState, expanded: false },
]);

let edges = new DataSet([]);

let currentId = 6;

let data = { nodes: nodes, edges: edges };
let options = {
    layout: {
        hierarchical: {
            direction: "RL",
            sortMethod: "directed",
            shakeTowards: "roots",
            levelSeparation: 400,
            nodeSpacing: 200
        }
    },
    physics: { enabled: false },
    edges: {
        arrows: {
            from: { enabled: true, scaleFactor: 1, type: "arrow" }
        }
    },
    nodes: {
        borderWidth: 2,
        size: 60,
        color: {
            border: "#efefef",
            background: "#333333"
        },
        shapeProperties: {
            useBorderWithImage: true
        }
    }
};

const container = document.getElementById("graph");
let network = new Network(container, data, options);

/** Set up handlers for interacting with the graph. */
network.on("doubleClick", function(params) {
    if (params.nodes.length == 0) return;

    // Figure out the current node which we lcicked on.
    let node = <number> params.nodes[0];

    // Check if the node has already been expanded; if so, don't expand again.
    let meta = nodes.get(node);
    if (meta.expanded) return;

    nodes.updateOnly({ id: node, expanded: true, color: { border: "green" } });

    for (let prev of spec.previous(meta.state)) {
        nodes.add([{ id: currentId, image: stateUrl(prev), shape: "image", state: prev, expanded: false }]);
        edges.add([{ id: currentId, from: node, to: currentId }]);
        currentId += 1;
    }
});