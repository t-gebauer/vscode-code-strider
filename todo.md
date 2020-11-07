AST preview pane
- with marked selection

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