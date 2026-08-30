# The package never changes a real player colour to carry information

The **alliance view mode** greys the whole map and leaves one player and their alliance partners in their own colours. That player is the **subject**: whoever the cursor last reached. It is the only feature that draws on the map rather than in the HUD.

Keeping each player's real colour is the thing that makes the mode read. A player is known on the map by their colour. The mode exists to say which players are in the web, so the answer is worth nothing if the colour it points at has stopped being theirs.

That closes a channel the mode would otherwise use. The mode also has to say how long each alliance has left, and brightness is the obvious way to carry it.

## The rule

Where the package keeps a real player colour, it adds information by position and by text. It never changes that colour.

A colour of our own is not covered by this. The package may do what it likes with violet, because violet already means "we computed this".

## What it decided

The **fade** made an ally's brightness carry the time left on their alliance. A fresh alliance drew bright and a lapsing one drew dark. It was built, put on screen and turned down: a darkened territory stops reading as its owner and starts reading as somebody else. That is worse than showing no time at all, because it gives a wrong answer rather than none.

The **subject carries no mark** setting it apart from its allies. Any mark would have to sit over a real colour.

## Consequences

The clock carries the time on its own. It is text, at the ally's own name anchor, so it takes a position rather than a colour.

The subject is still never ambiguous, which is why the missing mark costs nothing. An ally carries a clock and the subject does not. A subject with no alliances at all is the only coloured player on the map.

A later scheme that paints allies a colour of ours may darken that colour freely. The fade is the right answer there, and the throwaway records how it worked. It is simply not the answer under a scheme that keeps real colours, and the package ships no other scheme, so the fade is not built.

The cost is that one channel is closed. Anything more the map has to say needs a new position or new text, and both cost more than a colour change would.

Settled on [issue #13](https://github.com/DeLoWaN/openfront-extended-ui/issues/13). The fade was built and judged on branch `prototype/issue-14-alliance-view`.
