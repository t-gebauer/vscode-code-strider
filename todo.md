# Prioritized
- automatically skip nodes which take the same space
- generally don't select empty nodes? (*looking at html*)
- directional movement (nearly the same as selection update?)
- improve javascript outwards movement
- add Python
- add HTML rules
- slurping
- barfing
- move node around (a minor mode?)

# Bugs
- Movement gets trapped inside nodes which take the same place? (Clojure)
- AST view highlights wrong nodes, when multiple nodes take the same place. (eg. Clojure: (boolean (true)))
- AST view will crash the extension if it does not load fast enough:
    > Uncaught RuntimeError: abort(Error: Could NOT open editor for "code-strider-ast:/home/maybe/projects/ba-private/test-files/core.clj.2729.ast" because another editor opened in the meantime.).
- Slow editing performance for large files (core.clj 8000 lines)

# More
- undo complete edits
- Toggle extension on/off
- Select node(s) in AST view
- add YAML
- add TypeScript
- add Kotlin
- add CSS

# Details

directional movement
key right-arrow -> select something which is right of the current selection

navigation vs change vs insert mode
navigation: move around
change: edit the selected structure in a predefined way
insert: normal text insertion

## Html

Don't select "empty" text nodes.
Don't select start and end tags.

# Feedback

Navigation has to be in the expected direction.

It has to be possible to insert text "normally". Structure might just get in the way.






### Do not do everything

It's hard enough to build a solution that works for one language. Yes, sure, tree walking is possible in every language, but you knew that already. The navigation has to feel smooth and useful. This will only be possible with manual -- per language -- intervention.
