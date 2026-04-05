# Phaser React TypeScript Template

This is a Phaser 3 project template that uses the React framework and Vite for bundling. It includes a bridge for React to Phaser game communication, hot-reloading for quick development workflow and scripts to generate production-ready builds.

**[This Template is also available as a JavaScript version.](https://github.com/phaserjs/template-react)**

### Versions

This template has been updated for:

- [Phaser 3.90.0](https://github.com/phaserjs/phaser)
- [React 19.0.0](https://github.com/facebook/react)
- [Vite 6.3.1](https://github.com/vitejs/vite)
- [TypeScript 5.7.2](https://github.com/microsoft/TypeScript)

![screenshot](screenshot.png)

## Requirements

[Node.js](https://nodejs.org) is required to install dependencies and run scripts via `npm`.

## Available Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install project dependencies |
| `npm run dev` | Launch a development web server |
| `npm run build` | Create a production build in the `dist` folder |
| `npm run dev-nolog` | Launch a development web server without sending anonymous data (see "About log.js" below) |
| `npm run build-nolog` | Create a production build in the `dist` folder without sending anonymous data (see "About log.js" below) |

## Writing Code

After cloning the repo, run `npm install` from your project directory. Then, you can start the local development server by running `npm run dev`.

The local development server runs on `http://localhost:8080` by default. Please see the Vite documentation if you wish to change this, or add SSL support.

Once the server is running you can edit any of the files in the `src` folder. Vite will automatically recompile your code and then reload the browser.

## Template Project Structure

We have provided a default project structure to get you started. This is as follows:

| Path | Description |
|------|-------------|
| `index.html` | A basic HTML page to contain the game. |
| `src/` | Application source (React UI, Phaser game, shared state). |
| `src/main.tsx` | The main **React** entry point. This bootstraps the React application. |
| `src/App.tsx` | Top-level layout: mounts `PhaserGame` and `ReactApp`. |
| `src/phaser/PhaserGame.tsx` | Creates and destroys the Phaser `Game` instance; syncs with Zustand and `EventBus`. |
| `src/phaser/main.ts` | Phaser **game** config, scale, and scene registration. |
| `src/phaser/EventBus.ts` | Shared `EventEmitter` for React ↔ Phaser messages. |
| `src/phaser/scenes/` | Phaser scene classes (Boot, Preloader, MainMenu, Game, Trial, GameOver, …). |
| `src/react/` | React overlay UI (`ReactApp`, scene-specific screens, `ReactRoot`, hooks). |
| `src/react/index.css` | Global styles (Tailwind entry). |
| `src/store/gameStore.ts` | Zustand store; listens to `EventBus` for scene and game lifecycle. |
| `src/utils/` | Shared helpers (`constants.ts`, `gameManager.ts`). |
| `src/vite-env.d.ts` | Global TypeScript declarations for Vite. |
| `vite/config.dev.mjs` / `vite/config.prod.mjs` | Vite configuration (React, Tailwind, production chunking). |
| `public/assets` | Optional static assets for Phaser loader URLs such as `assets/...` (create if needed). |

## React Bridge

The `src/phaser/PhaserGame.tsx` component is the bridge between React and Phaser. It initializes the Phaser game and coordinates lifecycle with **Zustand** (`src/store/gameStore.ts`) and the **EventBus**.

To communicate between React and Phaser, use **`src/phaser/EventBus.ts`**. It is a simple event bus that allows you to emit and listen for events from both React and Phaser.

```ts
// In React (e.g. from a file under src/react/)
import { EventBus } from '../phaser/EventBus';

EventBus.emit('event-name', data);

// In Phaser (e.g. in a Scene under src/phaser/scenes/)
import { EventBus } from '../EventBus';

EventBus.on('event-name', (data) => {
    // Do something with the data
});
```

The Phaser `Game` instance and the current scene are also available through **`useGameStore`** in React, or **`GameManager`** / hooks in `src/react/hooks/useGame.ts` for imperative access.

## Phaser Scene Handling

In Phaser, the Scene is the lifeblood of your game. It is where you sprites, game logic and all of the Phaser systems live. You can also have multiple scenes running at the same time. This template provides a way to obtain the current active scene from React.

React receives the active scene via the Zustand store when a scene emits **`current-scene-ready`** on the `EventBus` (see `src/store/gameStore.ts`). Emit that event from the Phaser Scene class when the scene is ready for the UI to use. You can see this pattern in the scenes under `src/phaser/scenes/`.

**Important**: When you add a new Scene to your game, make sure you expose to React by emitting the `"current-scene-ready"` event via the `EventBus`, like this:


```ts
import { EventBus } from '../EventBus';

class MyScene extends Phaser.Scene
{
    constructor ()
    {
        super('MyScene');
    }

    create ()
    {
        // Your Game Objects and logic here

        // When React should treat this scene as active:
        EventBus.emit('current-scene-ready', this);
    }
}
```

You don't have to emit this event if you don't need to access the specific scene from React. Also, you don't have to emit it at the end of `create`, you can emit it at any point. For example, should your Scene be waiting for a network request or API call to complete, it could emit the event once that data is ready.

### React component example

Read reactive game state from the Zustand store (updated when scenes emit `current-scene-ready` on the `EventBus`):

```ts
import { useGameStore } from '../store/gameStore';

const ReactComponent = () => {
    const game = useGameStore((s) => s.game);
    const currentScene = useGameStore((s) => s.currentSceneInstance);
    const sceneKey = useGameStore((s) => s.currentScene);

    // Use game / currentScene / sceneKey as needed
    return null;
};
```

For helpers such as switching scenes or waiting until the game exists, see `src/utils/gameManager.ts` and `src/react/hooks/useGame.ts`.

## Handling Assets

Vite supports loading assets via JavaScript module `import` statements.

This template provides support for both embedding assets and also loading them from a static folder. To embed an asset, you can import it at the top of the JavaScript file you are using it in:

```js
import logoImg from './assets/logo.png'
```

To load static files such as audio files, videos, etc place them into the `public/assets` folder. Then you can use this path in the Loader calls within Phaser:

```js
preload ()
{
    //  This is an example of an imported bundled image.
    //  Remember to import it at the top of this file
    this.load.image('logo', logoImg);

    //  This is an example of loading a static image
    //  from the public/assets folder:
    this.load.image('background', 'assets/bg.png');
}
```

When you issue the `npm run build` command, all static assets are automatically copied to the `dist/assets` folder.

## Deploying to Production

After you run the `npm run build` command, your code will be built into a single bundle and saved to the `dist` folder, along with any other assets your project imported, or stored in the public assets folder.

In order to deploy your game, you will need to upload *all* of the contents of the `dist` folder to a public facing web server.

## Customizing the Template

### Vite

If you want to customize your build, such as adding plugin (i.e. for loading CSS or fonts), you can modify the `vite/config.*.mjs` file for cross-project changes, or you can modify and/or create new configuration files and target them in specific npm tasks inside of `package.json`. Please see the [Vite documentation](https://vitejs.dev/) for more information.

## About log.js

If you inspect our node scripts you will see there is a file called `log.js`. This file makes a single silent API call to a domain called `gryzor.co`. This domain is owned by Phaser Studio Inc. The domain name is a homage to one of our favorite retro games.

We send the following 3 pieces of data to this API: The name of the template being used (vue, react, etc). If the build was 'dev' or 'prod' and finally the version of Phaser being used.

At no point is any personal data collected or sent. We don't know about your project files, device, browser or anything else. Feel free to inspect the `log.js` file to confirm this.

Why do we do this? Because being open source means we have no visible metrics about which of our templates are being used. We work hard to maintain a large and diverse set of templates for Phaser developers and this is our small anonymous way to determine if that work is actually paying off, or not. In short, it helps us ensure we're building the tools for you.

However, if you don't want to send any data, you can use these commands instead:

Dev:

```bash
npm run dev-nolog
```

Build:

```bash
npm run build-nolog
```

Or, to disable the log entirely, simply delete the file `log.js` and remove the call to it in the `scripts` section of `package.json`:

Before:

```json
"scripts": {
    "dev": "node log.js dev & vite --config vite/config.dev.mjs",
    "build": "node log.js build & vite build --config vite/config.prod.mjs"
},
```

After:

```json
"scripts": {
    "dev": "vite --config vite/config.dev.mjs",
    "build": "vite build --config vite/config.prod.mjs"
},
```

Either of these will stop `log.js` from running. If you do decide to do this, please could you at least join our Discord and tell us which template you're using! Or send us a quick email. Either will be super-helpful, thank you.

## Join the Phaser Community!

We love to see what developers like you create with Phaser! It really motivates us to keep improving. So please join our community and show-off your work 😄

**Visit:** The [Phaser website](https://phaser.io) and follow on [Phaser Twitter](https://twitter.com/phaser_)<br />
**Play:** Some of the amazing games [#madewithphaser](https://twitter.com/search?q=%23madewithphaser&src=typed_query&f=live)<br />
**Learn:** [API Docs](https://newdocs.phaser.io), [Support Forum](https://phaser.discourse.group/) and [StackOverflow](https://stackoverflow.com/questions/tagged/phaser-framework)<br />
**Discord:** Join us on [Discord](https://discord.gg/phaser)<br />
**Code:** 2000+ [Examples](https://labs.phaser.io)<br />
**Read:** The [Phaser World](https://phaser.io/community/newsletter) Newsletter<br />

Created by [Phaser Studio](mailto:support@phaser.io). Powered by coffee, anime, pixels and love.

The Phaser logo and characters are &copy; 2011 - 2025 Phaser Studio Inc.

All rights reserved.
