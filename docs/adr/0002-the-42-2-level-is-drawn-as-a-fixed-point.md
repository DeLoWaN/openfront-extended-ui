# The 42.2% level is drawn as a fixed point, although the real peak moves

Regeneration peaks where `(10 + troops^0.73 / 4) x (1 - troops / maxTroops)` is largest. The familiar `0.73 / 1.73 = 42.2%` result drops the constant `10`. With that constant included, the true peak sits below 42.2% and creeps right as an army grows: 41.52% at 5,000 displayed troops, 42.17% at 500,000. The package draws the mark at a fixed 42.2% anyway, and reads the dot's height and the percentage off that same fixed curve.

## Consequences

The mark is wrong by up to 0.7 percentage points. That is about 2 px on a 300 px bar, which is thinner than the mark itself.

In exchange the landmark never moves during a match, and the picture and the number can never disagree with each other.

Do not correct this to the true peak without reading the reasoning on [issue #6](https://github.com/DeLoWaN/openfront-extended-ui/issues/6) first. It looks like a rounding bug and it is not one.
