# A (complete?) list of all events

## External events
triggered by the user directly (or indirectly by the editor (vs code))

---

E: mode change commands to insert
- update status bar [window]
E: mode change commands to structural selection
- update selected node [window]

E: active editor change
- update selected node in active editor
- update AST view (close and open new?)

E: toggle AST view
- update AST view (open, close)

E: moving in structure mode
- update current selection
- update AST view

E: text document change event = insertion
- update parse tree

E: text editor text selection change
- update node selection


## Internal intermediate events

update selected node (always) [editor]
- update decorations [editor]

update selected node (in current editor) [window]
- update status bar [window]
- update AST view [window]

update parse tree (structural edit) [document]
- update selected node [editor]

---

There is only one [window]. Many [document]s, with one or multiple [editor]s.

This list also assumes that there is always only one AST view open, linked to the active editor, but it might be better to treat the AST view as a separate entity, linked only to a document, using its parse tree.

---

# Commands

## Mode change
- to insert mode
  - with cursor before current node
  - with cursor after current node
  - with curser before, but inside current node (e.g. inside of a selected block `[1, 2, 3]`, selecting three elements `1, 2, 3`)
  - with cursor after, but inside (see above)
- to structural selection mode (exit insert mode)

## Structural selection
- move AST parent, first child, last child, next sibling, previous sibling
- move "planar", up, down, left, right

## Structural reordering
- move selected node(s) around
- same as selection commands [maybe just use the same commands/keys inside of a mode?]

### Slurpage, barfage?
- slurp before
- slurp after
- barf before
- barf after
