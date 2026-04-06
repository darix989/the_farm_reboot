# Plan

We need to implement a dialogue based game, where the player needs to assemble their statement by following a certain workflow.

Main reference: 
- https://debateexperts.com/debate-structure-key-components-and-formats/

## Entities and notions

Before explaining the workflow, here are the following entities:

- *Debate*: a debate has 2 sides, each side bringing their *Opening Statements*. A debate has also a *Debate Introduction* which will be a brief description about the core of upcoming debate, it's like a summary. The player will represent one side (*proposition* or *opposition*). The objective of the debate is to have the Jury to decide whether the *proposition* is accepted or not. The debate will have an exchange of rounds between the 2 sides (described below), the output of each round will be a "Statement" (see definition below).
- *Side*: there are always 2 sides in a debate, and they will always be *proposition* and *opposition*.
- *Statement*: a statement is an array of sentences (see definition below). Defined with a unique ID; a speaker ID; and an ordered array of sentences (see below).
- *Sentence*: a sentence is defined with a unique id; a string; an array of logical fallacies (see below), whose lenght can also be zero.
- *Opening Statement*: An Opening Statement can be 1) *affirmative* (also said *proposition*) or 2) *negative* (also said *opposition*). It has the same data of a regular *Statement*.
- *Logical Fallacy*: defined with a label; description; and a unique ID.
- *Fact*: it's a type statement, except its sentences cannot contain logical fallacies (because fact are just an objective description of reality).
- *Round*: a *debate* is split into several rounds, during a round there is an active side and an optional re-active side (in case of a *crossfire*, see below).
- *Constructive Round*: a side assembles a statement in order to solidify their proposition/opposition. See below about *Assembling a Constructive*.
- *Crossfire Round*: a side assembles a question in order to weaken the other side's proposition/opposition. See below about *Assembling a question*.
- *Rebuttal Round*: very similar to *Constructive Round*. Also here, a side assembles a statement in order to solidify their proposition/opposition. See below about *Assembling a Rebuttal*.
- *Target*: while doing an *Crossfire* or *Rebuttal*, it's essential to select the main target. A target can be of different types: 1) a sentence from a statement (any, from the *Opening Statement*, from previous *Rebuttal Rounds* or from a *Fact*); 2) a side (yourself or the other side's speaker). Selecting a side as target is usually done when also using a logical fallacy.
- *Evidence*: it can be of different types: 1) a sentence (any, from the *Opening Statement*, from previous *Rebuttal Rounds* or from a *Fact*); 2) a logical fallacy.
- *Assembling a Constructive*: this is the first speech, so you will be presented with 3 ready options. The quality of these options varies based on the current character (more details TBD).
- *Assembling a Rebuttal*: when assembling a rebuttal, you need first to select a *Target* and then select up to 3 *Evidences*.
- *Assembling a Crossfire*: when assembling a crossfire, you need first to select a *Target* and then select up to 3 *Evidences*.
- *Winning conditions*: each side has % of winning, the sum of the 2 sides make 100. These % starts both at 50. Each round contributes to change these values. 

## UI

## Mechanics

There is a UI rectangular container (100% width, 30% height, placed at the bottom) which will contain the selectable options. In the first 30% of the width, there will be a question related to what the user needs to select. The remaining 70% will layout the options.

The