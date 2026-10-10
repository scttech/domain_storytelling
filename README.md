# Domain Storytelling

A browser-based editor for [Domain Storytelling](https://domainstorytelling.org) diagrams. You write the story as plain text; the diagram is drawn live and can be rearranged by dragging. Built with: HTML5, CSS, ES modules and D3.js, with **no build step, no npm, and every third-party library vendored**.

```
title Ordering a Pizza

actor Customer [user]
actor Cashier [user-circle]
actor Cook [chef-hat]
object Pizza [pizza]

Customer orders Pizza from Cashier
Cashier passes Pizza to Cook
Cook bakes Pizza
Cook serves Pizza to Customer
```

## Features

- Text-first: sentences read like English and are numbered automatically (`3a`, `3b` for parallel steps).
- Drag actors, objects and notes; positions are written back into the text (`@ x,y`).
- Auto layout (left to right) and a live force-directed layout.
- Play-through mode that reveals the story one sentence at a time.
- Groups, notes, ~130 vendored icons (pick by name, so share links stay small).
- Undo/redo, autosave in localStorage, share links (`#story=…`, deflate-compressed), export to text, SVG and PNG.
- Built-in help, icon browser and step-by-step tutorials.

## Running

ES modules do not load from `file://`, so serve the folder with any static server, for example the VS Code **Live Server** extension, or:

```
python -m http.server 8000
```

Open `http://localhost:8000/` for the app and `http://localhost:8000/tests/` for the QUnit tests. 

## Live demo

Check it out [here](https://scttech.github.io/domain_storytelling/index.html)