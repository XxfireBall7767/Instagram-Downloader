# Instagram-Downloader

![icon](icons/icon128.png)

## How this work

With regex and some `ReactFiber` magic, I'm able to know which post you wanna download and fetch the api to download the photos for you.

## Browser compatibility

This extension should work fine on the following browsers with `fetch()` API and Chromium base browser, tested Browser:

- Google Chrome
- MS Edge
- FireFox

## Download and install

- Download [latest version](https://github.com/HOAIAN2/Instagram-Downloader/releases) and extract to a folder

### Chrome or other Chromium browsers

- Enable Chrome extensions developer mode
- Drag and drop extracted folder to `chrome://extensions/`

### Firefox (Development)

- Go to Add-ons Manager `about:addons`
- Click on Setting > Debug Add-ons
- Click on `Load Temporary Add-on...` and select the `manifest.json` file

## Settings

Everything is configured in one dialog. Open it from the **Downloader settings** entry that the extension adds to the left sidebar, right below your profile link.

The dialog has two sections, described below: **Download button style** and **File name templates**. Preferences are saved per-browser in `localStorage` and apply immediately, no reload needed.

The dialog follows Instagram's light/dark theme automatically. There is no theme option because the extension mirrors whatever Instagram is already using.

### Download button style

Controls which download controls the extension shows. Pick one of three modes:

| Mode                 | What you get                                                                       |
| -------------------- | ---------------------------------------------------------------------------------- |
| **Modern** (default) | Download buttons rendered directly on each post and on stories. No floating panel. |
| **Legacy**           | The classic floating `Download` button plus the media panel.                       |
| **Both**             | Modern and Legacy controls at the same time.                                       |

The mode applies instantly - the buttons and panel appear or disappear without a page reload.

### Modern (inline) buttons

- **Posts** - a download button appears in the post action bar, right after the `Share` button. On the home feed and on post permalinks (`/p/`, `/reel/`, `/reel/`, `/reels/`, `/tv/`).
- **Carousel posts** - a second button appears to download every slide as a single ZIP archive.
- **Stories and highlights** - a download button appears next to the play/pause control. A second button shows up when the story has more than one item, to save the whole set as a ZIP.

### Legacy media panel

The panel is the older interface, and it's what the keyboard shortcuts drive.

- Click `Download` (or press `D`) to open the media panel for the current post. Every photo and video in the post is listed as a thumbnail.
- Click any thumbnail to save that file.
- The panel is hidden automatically on DM pages (`/direct`) so it doesn't get in the way of conversations.
- While the panel is open, the extension keeps watching the page. On the home feed it detects the post under your cursor, so you don't have to open the comment modal first. Thanks to ReactFiber.

### Multi select

Multi select lives in the media panel, so you need the panel open - **Legacy** or **Both** mode, or press `D` in **Modern** mode.

- Click the `Media` title bar (or press `S`) to enter select mode. Each thumbnail gets a checkbox overlay.
- Click thumbnails to select them, or click and hold the `Media` title bar to select/deselect everything at once.
- In select mode the single `Download` button is replaced by two buttons, both of which act on the selection and stay disabled until at least one item is selected:
    - `Save as zip` - pack the selected files into a single archive.
    - `Save all` - save the selected files individually, without archiving.

## File name templates

The **File name templates** section controls how downloaded files are named. It's split into three independent scopes, because a story and a post don't have the same useful metadata:

- **Posts** - for photos, videos, reels and multi-slide posts.
- **Stories** - for a single story.
- **Highlights** - for a saved highlight.

Each scope has its own row of tokens, plus a live preview showing the resulting **Single file** name and **ZIP archive** name.

### Building a template

- Drag a variable from the palette into a row, or just click it to append to the currently active row.
- Drag a token already in a row to reorder it, or move it left/right across the boundary between tokens.
- Click the `×` on a token to remove it.
- `Reset` restores the default template for that scope only.
- Click a row to make it the active row. Clicking a palette variable adds it to the active row.

Underscores are inserted automatically between values, so you never have to type them. Tokens that have no value for a given download are skipped instead of leaving a blank or a stray underscore.

### Available variables

| Variable             | Value                                                          |
| -------------------- | -------------------------------------------------------------- |
| `#original_filename` | The filename Instagram reports for the media.                  |
| `#username`          | The account that posted it.                                    |
| `#date`              | Publication date, formatted with the date format chosen below. |
| `#title`             | Caption text, or the highlight name.                           |
| `#id`                | The post's shortcode.                                          |
| `#resolution`        | Pixel dimensions, e.g. `1080x1920`.                            |
| `#video_bitrate`     | Video bitrate, e.g. `4.2Mbps`.                                 |
| `#video_codec`       | Video codec, e.g. `VP9`.                                       |

**Single-file only.** `#original_filename`, `#resolution`, `#video_bitrate` and `#video_codec` describe one specific file, so they are used for individual media names but omitted from the ZIP archive name. A ZIP is named from the post, not from its files.

### Date format

Applies to `#date` in every scope. Uses Instagram's publication date in UTC.

| Option                 | Example        |
| ---------------------- | -------------- |
| `YYYY-MM-DD` (default) | `2026-09-17`   |
| `DD_MM_YYYY`           | `17_09_2026`   |
| `MM_DD_YYYY`           | `09_17_2026`   |
| `MMM DD, YYYY`         | `Sep 17, 2026` |

### Default templates

| Scope      | Default               |
| ---------- | --------------------- |
| Posts      | `#username_#id_#date` |
| Stories    | `#username_#id_#date` |
| Highlights | `#username_#title`    |

### Sanitizing

Names are cleaned up before they hit disk, so a caption or username can't produce an invalid file:

- `< > : " / \ | ? *` and control characters become `-`.
- Runs of whitespace collapse to a single space.
- Trailing dots and spaces are stripped (Windows requirement).
- Each variable is capped at 90 characters, the whole name at 180. If everything ends up empty, `instagram_download` is used.

## Features

- Download posts ✔
- Download reels ✔
- Download latest stories ✔
- Download highlight stories ✔
- Support high resolution ✔
- Download the highest-quality DASH video and audio and mux them locally without re-encoding (big thank to [XxfireBall7767](https://github.com/XxfireBall7767)) ✔
- Support download zip file ✔
- Configurable download UI: inline buttons, legacy panel, or both (big thank to [XxfireBall7767](https://github.com/XxfireBall7767)) ✔
- Configurable file names with live preview (big thank to [XxfireBall7767](https://github.com/XxfireBall7767)) ✔

## Customize

You can modify anything you want except some constants start with "IG\_" that definitely gonna break this extension.

Edit Hide / Show Transition effects

```css
.display-container.hide {
    transform-origin: 85% bottom;
    transform: scale(0);
    pointer-events: none;
    opacity: 0.6;
}
```

Panel and Legacy button geometry live in `src/style/style.css`:

```css
/* .display-container is the media panel */
width: calc(80vh / 5 * 3);
height: 75vh;
max-width: 480px;
max-height: 800px;
bottom: 140px;
inset-inline-end: 20px;

/* .download-button is the Legacy button */
width: 120px;
height: 30px;
bottom: 100px;
inset-inline-end: 34px;
```

Both use `inset-inline-end`, so they follow Instagram's layout direction automatically.

## Keyboard shortcut

Some keyboard shortcuts will not work if you use an external application for typing.

- Download: `D`
- Close: `esc` `C`
- Select all `S`
- Keyboard shortcut should work if you don't focus on special HTML Elements like `input` `textarea` or any element with `textbox` role (ex: comment, search, ...)

These shortcuts drive the Legacy panel.

`D` works in every mode. It clicks the `Download` button programmatically, so it still opens the panel in **Modern** mode even though the button itself is hidden there.

`esc`/`C` closes the panel, and `S` toggles select mode. Both are no-ops while the panel is closed, which is always the case in **Modern** mode until you press `D`.

Shortcuts are disabled on DM pages (`/direct`).

## Settings storage

Preferences live in `localStorage` under the `instagram.com` origin. Useful for scripting or resetting a broken preference:

| Key                                    | Value                                                       |
| -------------------------------------- | ----------------------------------------------------------- |
| `instagramDownloaderUiMode`            | `inline` (default), `panel`, or `both`                      |
| `instagramDownloaderFilenameTemplates` | JSON object keyed by scope: `post`, `stories`, `highlights` |
| `instagramDownloaderDateFormat`        | One of the four date formats above                          |

For example, to force the Legacy panel without opening the dialog:

```js
localStorage.setItem('instagramDownloaderUiMode', 'panel');
location.reload();
```

## Deprecated features

These features was deprecated for some reason.

- V5.1.0
    - Set fallback download to latest post from some user.

## Here is Demo

[Demo v6.0.0](https://github.com/user-attachments/assets/2be00cbf-58bb-4453-aa47-51b67d7967f0)
