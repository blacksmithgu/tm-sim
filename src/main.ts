import { DataSet, Network } from "vis-network/standalone";
import { TMState, TMSpec, Rule, Direction, Tape } from "./tm";
import { stateUrl, tapeTable } from "./render";

/** Utility methods */
function isString(value: any): value is string {
    return typeof value == 'string' || value instanceof String;
}

/** Actual implementation stuff. */
let spec = new TMSpec(new Set(["a", "b"]), new Set(["_", "0", "1"]), [
    Rule.io("a", "0", "0", "b"),
    Rule.io("a", "1", "0", "b"),
    Rule.move("b", Direction.Right, "a")
]);
const terminalState = new TMState(new Tape(new Map([[0, "1"], [1, "1"], [2, "1"], [3, "0"], [4, "1"], [5, "0"]]), "_", 0), "a", false);

let nodes = new DataSet([]);
let edges = new DataSet([]);

let currentId = 2;

nodes.add([
    { id: 1, image: stateUrl(terminalState), shape: "image", state: terminalState, expanded: false, color: { border: "blue"} },
]);

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
    interaction: { multiselect: true },
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
const nodeMenu = document.getElementById("node-menu");
const nodeTape = document.getElementById("node-tape");
let network = new Network(container, data, options);

/** Reversibly expand a node the given number of times recursively; marks the node as expanded. */
function reverseNode(id: number | string, times: number) {
    // Base case of the recursion.
    if (times == 0) return;
    // Exit early if a node with the given ID doesn't exist.
    if (!nodes.get(id)) return;

    let state = nodes.get(id).state;

    // Find the nodes connected to this node and compare them to the actual reversed states.
    let existingNodeIds = edges.get({
        filter: function(item) { return (item.from == id); }
    }).map(obj => obj.to);

    let existingStates = nodes.get(existingNodeIds).map(obj => obj.state);
    let allStates = spec.previous(state);

    // Create new nodes for every state that doesn't already exist.
    outer: for (let newState of allStates) {
        // Don't make a new node if it already exists.
        for (let existing of existingStates) if (newState.equals(existing)) continue outer;

        nodes.add([{ id: currentId, image: stateUrl(newState), shape: "image", state: newState, expanded: false}]);
        edges.add([{ id: currentId, from: id, to: currentId }]);
        existingNodeIds.push(currentId);
        currentId += 1;
    }

    // Update the current node as being expanded...
    nodes.update({ id: id, expanded: true, color: { border: "green" }});

    // And then recursively expand all the created nodes.
    for (let newId of existingNodeIds) reverseNode(newId, times - 1);
}

/** Forward-expand a node by simulation the given number of times. */
function simulateNode(id: string | number, times: number) {
    while (times > 0) {
        // Quit early if some wierd error causes us to get an invalid ID.
        if (!nodes.get(id)) return;

        times--;

        let existingNodeId = edges.get({
            filter: function(item) { return (item.to == id); }
        }).map(obj => obj.from);

        if (existingNodeId.length > 0) {
            id = existingNodeId[0];
            continue;
        } else {
            let state = nodes.get(id).state;
            let next = spec.next(state);
            if (next == null) return;

            nodes.add([{ id: currentId, image: stateUrl(next), shape: "image", state: next, expanded: false }]);
            edges.add([{ id: currentId, from: currentId, to: id }]);
            id = currentId;
            currentId += 1;
        }
    }
}

/** Set up handlers for interacting with the graph. */
network.on("doubleClick", function(params) {
    if (params.nodes.length == 0) return;

    // Figure out the current node which we clicked on.
    let node = <number> params.nodes[0];
    reverseNode(node, 1);
});

network.on("select", function(params) {
    // If no nodes are selected, clear the selection menu.
    if (params.nodes.length == 0) {
        nodeMenu.style.display = "none";
        return;
    }

    // Otherwise, ensure the menu is visible.
    nodeMenu.style.display = "initial";

    if (params.nodes.length == 1) {
        let state = nodes.get(<number | string> params.nodes[0]).state;

        // And update the node table showing the tape values.
        nodeTape.innerHTML = `<div class="center">${tapeTable(state.tape)}</div>`;
    } else {
        nodeTape.innerHTML = `<p class="center">There are ${params.nodes.length} selected nodes</p>`;
    }
});

/** Set up handlers for node interactions. */
for (let reverseNum of [1, 2, 3, 4, 5, 8]) {
    document.getElementById("reverse" + reverseNum).addEventListener("click", ev => {
        let selection = network.getSelectedNodes();
        for (let id of selection) reverseNode(id, reverseNum);
    });
}

for (let simNum of [1, 5, 10, 25, 100]) {
    document.getElementById("simulate" + simNum).addEventListener("click", ev => {
        let selection = network.getSelectedNodes();
        for (let id of selection) simulateNode(id, simNum);
    });
}

/** Set up the handler for parsing the TM spec and initializing the singleton state. */
const initStateInput = <HTMLInputElement> document.getElementById("tm-state-input");
const initHeadInput = <HTMLInputElement> document.getElementById("tm-head-input");
const initTapeInput = <HTMLInputElement> document.getElementById("tm-tape-input");
const defSymbolInput = <HTMLInputElement> document.getElementById("tm-spec-default-input");
const ruleInput = <HTMLTextAreaElement> document.getElementById("tm-spec-rules-input");
const errorOutput = document.getElementById("tm-spec-error");

document.getElementById("tm-spec-update").addEventListener("click", ev => {
    // Lots of ugly parsing we need to do; if we encounter errors at any point, we quit.
    let initState = initStateInput.value.trim();
    let defaultSymbol = defSymbolInput.value.trim();
    let initHead = parseInt(initHeadInput.value.trim());
    if (isNaN(initHead)) {
        errorOutput.innerText = "Invalid head location: " + initHeadInput.value;
        return;
    }

    let initTape = Tape.parse(initTapeInput.value, defaultSymbol, initHead);
    if (isString(initTapeInput)) {
        errorOutput.innerText = "Invalid tape: " + initTapeInput;
        return;
    }

    // TODO: Allow for terminated states. MB.
    let newState = new TMState(initTape, initState, false);

    let pspec = TMSpec.parse(ruleInput.value, defaultSymbol);
    if (isString(pspec)) {
        errorOutput.innerText = pspec;
        return;
    }

    if (!pspec.states.has(initState)) {
        errorOutput.innerText = "Unrecognized initial state: " + initState + " (valid options are " + Array.from(pspec.states).join(",") + ")";
        return;
    }

    // If we parsed everything successfuly, reset the simulation.
    spec = pspec;
    currentId = 2;

    nodes.clear();
    edges.clear();

    nodes.add([
        { id: 1, image: stateUrl(newState), shape: "image", state: newState, expanded: false, color: { border: "blue"} },
    ]);

    network.focus(1, { locked: false });
});

/** Set up handler for toggling the configuration menu. */
let configDiv = document.getElementById("tm-menu");
document.getElementById("config-toggle").addEventListener("click", ev => {
    if (configDiv.style.display == "none") configDiv.style.display = "flex";
    else configDiv.style.display = "none";
});

/** Set up handler for expanding every visible node by 1 level. */
document.getElementById("tm-reverse-all").addEventListener("click", ev => {
    let nodeIds = nodes.get().map(obj => obj.id);
    for (let node of nodeIds) reverseNode(node, 1);
});