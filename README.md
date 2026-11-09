# Visual Convos

A conversation between two people, painted as living pictures while it happens. It shows pictures only, no words or graphs.

**Live page:** https://wakeupsilver.github.io/Visual-convos/

## What you see

- **Two sides, two people.** ☀️ is the left side and 🌙 is the right. Tap a side or press **space** to pass the voice. 🎭 tries to tell the two voices apart by pitch instead (experimental).
- **Words become glowing pictures.** Anything that can be pictured flies in as an emoji from the speaker's side. Saying it again makes it grow, and dotted lines trace each person's train of thought.
- **Shared ideas join.** When both people bring up the same thing (synonyms count, so "work" and "job" are both 💼), the two pictures fly together, burst, and fall as a seed that grows in the garden at the bottom.
- **The sky follows the mood.** Violet twilight when neutral, rain and lightning when it gets heavy, fireflies, petals and dawn when it's warm. The louder you speak, the more your side glows.
- **Forgotten things become stars** that drift up into the sky.

### Controls

| | |
|---|---|
| 🎙️ | Listen through the microphone |
| ⌨️ | Type what was said instead (each line passes the turn) |
| ☀️ / 🌙 | Who is speaking (or tap a side / press space) |
| 🎭 | Detect the speaker by voice pitch (experimental) |
| 🖌️ | Let an AI repaint the sky from the conversation. **Off by default; sends keywords to [pollinations.ai](https://pollinations.ai).** |
| ▶ | Watch a scripted two-person conversation |
| 📷 | Save the current dream as a PNG |

## Running it

There's no build step. It's plain HTML and JavaScript.

- **On the web:** turn on GitHub Pages (Settings → Pages, branch `main`, folder `/ (root)`) and open the link above in Chrome.
- **On your computer:** open `index.html` in Chrome, or run `npm start` and visit the address it prints.

Live speech uses Chrome's built-in speech recognition, so it needs **Chrome on a computer**. That service sends the audio to Google. The microphone won't work when the page is embedded in a frame that doesn't allow it, such as an artifact preview. There the page explains this and offers typing instead.

## How it works

- `dream/lexicon.js` turns words into pictures and feelings. It maps about 500 words to emoji and holds small lists of positive and negative words. It favours objects, places and nature over people, to keep image stereotypes out of the dream. Like any fixed list, it will be wrong in some contexts.
- `dream/dream.js` holds the speech recognition, voice level and pitch, the physics of the pictures, the weather, the garden and all the drawing (a single 2D canvas).
- From the browser console you can try `dream.hear('a whale under the stars', true, 1)`.

## Credits

This project was inspired by [Amos Blanton's speech2wordcloud](https://gitlab.com/Lightnin/speech2wordcloud) and by Murilo Polese's speech-to-word-cloud experiment, which `wakeupsilver/wordcloud` is a fork of. It doesn't include code from either.

## License

Copyright © 2026 wakeupsilver. All rights reserved.

No license is granted. You may view the code, but you may not copy, modify or redistribute it without written permission.
