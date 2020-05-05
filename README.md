# Reversible TM Simulator

A simple visual simulator for reversible Turing Machines which, given the specification for a TM, visually shows the
state graph (i.e., the graph of states and what states they can come from). Also capable of some limited analysis (like
determining if a set of TM rules are actually reversible).

## Build Instructions

This project uses `npm`, `browserify`/`tsify`, and `gulp`. For initial setup:

```
npm install 
npm run build
```

and for subsequent builds:

```
npm run build
```

The output files are in `dist/`; just open `dist/index.html`.

## Testing Instructions

We use Jest for testing; tests are located in `test/`; just run

```
npm test
```

to run the test suite using the jest runner.