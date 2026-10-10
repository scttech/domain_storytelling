# Domain Story syntax

A story is plain text, one statement per line. Lines starting with `//` are comments. Keywords are case-insensitive; **names are case-sensitive and must be unique**.

## Title

```
title Ordering a Pizza
```

## Actors and work objects

Declare everything that appears in the story. Declarations can go anywhere in the text; sentences may use them before or after.

```
actor Customer [user] @ 80,200
actors Kitchen Staff [users]
system POS [device-desktop]
object Pizza [pizza]
```

| Keyword | Meaning | Default icon |
|---|---|---|
| `actor` | A person or role | `user` |
| `actors` | A group of people | `users` |
| `system` | Software or a machine | `device-desktop` |
| `object` | A work object (document, thing, data) | `file-text` |

- `[icon]` is optional and picks one of the built-in icons (see the **Icons** tab).
- `@ x,y` is optional. Dragging a node writes it for you. Anything without a position is placed automatically.

## Sentences

A sentence says **who does what** and numbers the step. The first name is the sender; the verb phrase becomes the arrow label.

```
Customer orders Pizza from Cashier
Cashier enters Order into POS
Cook bakes Pizza
Customer pays Cashier
```

Three shapes are understood:

1. `Actor verb Object preposition Actor` — the arrow goes from the first actor to the last, and the **work object is drawn on the arrow**. Prepositions: `to`, `from`, `with`, `for`, `at`, `in`, `into`, `on`, `by`, `using`, `via`, `of`, `and`.
2. `Actor verb Object` — the arrow goes from the actor to the object node (the actor works on the object).
3. `Actor verb Actor` — a plain arrow between two actors.

Use quotes when the verb contains a word that is also a name: `Cashier "adds to" Orders List`.

### Numbering

Steps are numbered automatically in the order they are written. To control the number, start the line with it:

```
1. Customer places Order
2. Shop checks stock
3a. Shop reserves items
3b. Shop notifies Warehouse
4. Clerk packs Parcel
```

Parallel steps use letters (`3a`, `3b`). Numbering continues after an explicit number.

## Groups

Draw a box around related names, for example a department or a system boundary:

```
group Kitchen: Cook, Oven
```

## Notes

Annotations. Optionally point them at a name:

```
note Peak hours only @ 200,60 -> Cashier
```

## Assumptions and comments

Separate from notes, these two lists are shown in a side panel (not on the diagram) and each can be shown or hidden with the **Assumptions** and **Comments** buttons. Items start with `- `; a following line without a dash continues the previous item. Click an item to jump to it in the editor.

```
assumptions {
- Customers always pay before the pizza is baked
- The POS is available at all times
}

comments {
- Check whether delivery is in scope
- Ask the cashier how refunds work
}
```

SVG and PNG exports include whichever of the two lists is currently shown, drawn to the right of the diagram.

Use a `note` to annotate one spot on the diagram; use these blocks for statements about the story as a whole.

## Display options

By default the work object of a sentence is drawn as an icon beside its arrow. If that feels cluttered, turn the icons off; the object then appears as italic text on the arrow instead (`orders Pizza`).

```
arrow-icons off
```

Use `arrow-icons on` (the default) to bring them back. The line can go anywhere in the story. Actors and standalone objects keep their icons either way.

## Layout

- **Drag** any actor, object or note to move it; the editor text updates.
- **Auto layout** places everything left-to-right in story order and clears stored positions.
- **Force layout** lets the picture arrange itself like a physical model; drag a node to pull the others along.
- **Play** steps through the story one sentence at a time.
