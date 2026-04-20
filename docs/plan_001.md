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

### High level

Having as context @src/types/debateEntities.ts , we need to implement the basic UI for the gameplay to happen.

Use React and Tailwind to create a UI that is loaded when @src/phaser/scenes/Trial.ts scene is loaded.

The UI has the following specs:
- it occupies all the screen, except the top left quarter. 
- the bottom half is split into 2 parts, the left one takes 1/3 of total width; and the right one takes 2/3.
- the top part can be drawn only to the 2/3 to the right. This will show a summary of the current selection. We can call this "Feedback Area".
- the bottom left part states what the user is supposed to do or select. We can call this "Wizard area".
- the bottom right part lists the options that can be selected, and it's interactable. We can call this "Interactive area".

## Round Workflow

Let's describe a "Round Workflow". It proceeds like this:

1. The "Wizard area" asks to select one option between 'Crossfire' and 'Rebuttal' (shown in the "Interactive area").
2. Once this is selected, a visual feedback is shown on the "Feedback Area". Then the "Wizard area" will change and it will asks for a "target". The "interactive area" will populate with these options "Proposition"; "Opposition". When the user clicks on one of them, it will open another selection, which have anything related to that voice. For example, if the user selected the "proposition", it will list the "proposition opening statement", and every past proposition statement. Once clicked on one of them, the actual statement will show up in the "interactive area", and it will be split into its sentences. The user needs to click one. Once this is done, the target is selected, and this proceeds to the "evidence" selection. 
3. When entering in the "evidence selection", the "feedback area" updates, and now it will contain also the selected target. Now the "wizard area" will ask to select for one or more evidences. The "interactive area" will populate similarly to the previous point, but on top of that it will also have other 2 entries: Facts and Logical Fallacies. If the user selected Proposition or Opposition, the selection flow will work like described above. If the user picked Fact, it will behave like the previous ones. If the user picked Logical Fallacies, the "interactive area" will populate with a list of logical fallacies and once the user clicks on one, that counts as selected evidence. Every time an evidence is selected, the "feedback area" will update. Once at least one evidence is selected, a submit button will be interactible.
4. Once the user submits from the previous step, it will be presented 3 statement, and one needs to be choosen. Choosing a statement will end this round.

Notes: an undo button shall be available all the time in the "interactive area", this will bring the user back by one step.
    
Use placeholder data in order to implement this first draft.