# eleventy-plugin-ai-chatbot

Add the [Asyntai](https://asyntai.com) AI chat assistant to your Eleventy (11ty)
site. It answers visitor questions from your own content, in more than 80
languages.

## Install

```bash
npm install eleventy-plugin-ai-chatbot
```

Then add the plugin in your Eleventy configuration.

`eleventy.config.js` (Eleventy 3, ESM):

```js
import aiChatbot from 'eleventy-plugin-ai-chatbot';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(aiChatbot, { widgetId: 'asyntai_1a2b3c4d5e6f' });
}
```

`.eleventy.js` (Eleventy 1, 2 or 3, CommonJS):

```js
const aiChatbot = require('eleventy-plugin-ai-chatbot');

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(aiChatbot, { widgetId: 'asyntai_1a2b3c4d5e6f' });
};
```

Build the site. The chat bubble is on every page.

## Where the widget ID comes from

Open the Install page in your [Asyntai dashboard](https://asyntai.com/dashboard).
The widget ID is the value of `data-asyntai-id` in the snippet shown there. It
starts with `asyntai_`.

Creating an account is free, and the Free plan is enough to try the widget.

## Options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `widgetId` | string | required | Your Asyntai widget ID |
| `enableInDevelopment` | boolean | `true` | Set to `false` to keep the widget off the site during `eleventy --serve` and `--watch` |
| `scriptUrl` | string | the Asyntai CDN | Advanced. Load the widget from another URL |

A missing or malformed `widgetId` stops the build with a message that says how
to fix it.

## What the plugin does

- It adds the Asyntai loader to every HTML page, just before `</body>`.
- The loader waits for the page's `load` event, so your own content always
  renders first.
- Feeds, sitemaps, JSON and CSS files stay as they are.
- A page that already has the Asyntai snippet keeps it and gets no second one.

It works with every template language: Nunjucks, Liquid, Markdown, WebC and the
rest.

## Answering from your content

Asyntai reads your published pages. Add your site URL in the dashboard, and the
assistant answers from the same pages the widget sits on. You can also add extra
documents and question and answer pairs.

## Removing it

Delete the `addPlugin` line and build again. The widget is gone.

## Support

Email [hello@asyntai.com](mailto:hello@asyntai.com), or read the
[Eleventy guide](https://asyntai.com/documentation/integrations/eleventy/).

## Licence

MIT. See [LICENSE](LICENSE).
