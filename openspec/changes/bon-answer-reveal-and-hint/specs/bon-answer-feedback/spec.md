## ADDED Requirements

### Requirement: Meaning revealed after a correct answer
When a player answers a card correctly and the card is a real Berlinerisch word that
has a translation, the game SHALL reveal the word's meaning (its translation) to the
player.

#### Scenario: Correct answer on a real word with a translation
- **WHEN** the player correctly identifies a real Berlinerisch word that has a translation
- **THEN** the game shows the word together with its translation (e.g. `„Aas" = fauler Mensch`)

#### Scenario: Correct answer on a fake word
- **WHEN** the player correctly identifies an invented/fake word
- **THEN** no meaning is shown (fakes have no meaning), and the answer is still counted correct

### Requirement: Meaning revealed after a wrong answer
When a player answers a card incorrectly, the game SHALL reveal the correct verdict AND,
for a real word that has a translation, also reveal the word's meaning — matching the
information a correct answer would have surfaced, so the player learns from the mistake.

#### Scenario: Wrong answer on a real word (player guessed "fake")
- **WHEN** the player judges a real Berlinerisch word as invented
- **THEN** the feedback states it was real AND shows the word's translation (e.g. `War echtes Berlinerisch! — „Aas" = fauler Mensch`)

#### Scenario: Wrong answer on a fake word (player guessed "real")
- **WHEN** the player judges an invented word as real
- **THEN** the feedback states it was invented ("War erfunden!") and shows no meaning, because a fake word has none

#### Scenario: Wrong answer on a real word that has no translation
- **WHEN** the player judges a real word wrong but that word carries no translation
- **THEN** the feedback states it was real without an empty or malformed meaning fragment

#### Scenario: Wrong answer that ends the game (last life lost)
- **WHEN** a wrong answer reduces the player's lives to zero
- **THEN** the meaning reveal is still shown to the player before the game transitions to the result screen

### Requirement: Reveal is readable and accessible
The wrong-answer meaning reveal SHALL remain visible long enough to be read and SHALL be
announced to assistive technology.

#### Scenario: Reveal stays visible long enough to read
- **WHEN** a wrong-answer reveal includes a word meaning
- **THEN** it remains visible longer than a bare verdict would, so the meaning can be read before the next card

#### Scenario: Reveal announced to screen readers
- **WHEN** the wrong-answer reveal (verdict plus meaning) is displayed
- **THEN** it is announced once via the card's existing alert/live region without breaking existing screen-reader flow

### Requirement: Idle-screen hint about non-literal words
The game's idle/start screen SHALL display a short, general instructional hint informing
players that some Berlinerisch words are abbreviations for or derived from idioms and are
not always literal.

#### Scenario: Hint shown on the start screen
- **WHEN** the player is on the game's idle/start screen
- **THEN** a short hint is visible explaining that some Berlinerisch words are abbreviations for idioms (Redewendungen) and not always literal

#### Scenario: Hint is general, not per-word
- **WHEN** the game presents cards during play
- **THEN** no per-word explanation is fetched or shown from the word database — the hint is a single general instruction, independent of the current card
