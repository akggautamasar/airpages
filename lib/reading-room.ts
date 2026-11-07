import type { LibraryBook } from "./library";

// A small, bundled collection that can be read while the remote catalogue wakes.
const sonnets = [
  [18, "Shall I compare thee to a summer’s day?", `Thou art more lovely and more temperate:
Rough winds do shake the darling buds of May,
And summer’s lease hath all too short a date:
Sometime too hot the eye of heaven shines,
And often is his gold complexion dimm’d;
And every fair from fair sometime declines,
By chance or nature’s changing course untrimm’d;
But thy eternal summer shall not fade,
Nor lose possession of that fair thou ow’st;
Nor shall death brag thou wander’st in his shade,
When in eternal lines to time thou grow’st:
So long as men can breathe or eyes can see,
So long lives this, and this gives life to thee.`],
  [29, "When, in disgrace with fortune and men’s eyes,", `I all alone beweep my outcast state,
And trouble deaf heaven with my bootless cries,
And look upon myself and curse my fate,
Wishing me like to one more rich in hope,
Featured like him, like him with friends possess’d,
Desiring this man’s art and that man’s scope,
With what I most enjoy contented least;
Yet in these thoughts myself almost despising,
Haply I think on thee, and then my state,
Like to the lark at break of day arising
From sullen earth, sings hymns at heaven’s gate;
For thy sweet love remember’d such wealth brings
That then I scorn to change my state with kings.`],
  [73, "That time of year thou mayst in me behold", `When yellow leaves, or none, or few, do hang
Upon those boughs which shake against the cold,
Bare ruin’d choirs, where late the sweet birds sang.
In me thou see’st the twilight of such day
As after sunset fadeth in the west,
Which by and by black night doth take away,
Death’s second self, that seals up all in rest.
In me thou see’st the glowing of such fire
That on the ashes of his youth doth lie,
As the death-bed whereon it must expire,
Consumed with that which it was nourish’d by.
This thou perceiv’st, which makes thy love more strong,
To love that well which thou must leave ere long.`],
  [116, "Let me not to the marriage of true minds", `Admit impediments. Love is not love
Which alters when it alteration finds,
Or bends with the remover to remove:
O no! it is an ever-fixed mark
That looks on tempests and is never shaken;
It is the star to every wandering bark,
Whose worth’s unknown, although his height be taken.
Love’s not Time’s fool, though rosy lips and cheeks
Within his bending sickle’s compass come;
Love alters not with his brief hours and weeks,
But bears it out even to the edge of doom.
If this be error and upon me proved,
I never writ, nor no man ever loved.`],
] as const;

export const editions = sonnets.map(([number, first, rest]) => ({
  id: `airpages-sonnet-${number}`, title: `Sonnet ${number}`,
  author: "William Shakespeare", filename: "", tags: ["Poetry"],
  lines: [first, ...rest.split("\n")],
}));

export const readingRoom: LibraryBook[] = editions.map(({ lines, ...book }) => book);
