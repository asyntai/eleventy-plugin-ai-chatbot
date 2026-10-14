/**
 * Asyntai AI chatbot for Eleventy (11ty).
 *
 * Adds the Asyntai chat widget to every HTML page the site builds. Eleventy has
 * no API for scripts, so the plugin is an HTML transform: it puts the ordinary
 * embed loader just before </body> and changes nothing else about the page.
 *
 * CommonJS on purpose: Eleventy 1 and 2 load plugins with require(), and
 * Eleventy 3 loads CommonJS plugins as well.
 */

const DEFAULT_SCRIPT_URL = 'https://widget.asyntai.com/static/js/chat-widget.js';
const WIDGET_ID_PATTERN = /^asyntai_[A-Za-z0-9]+$/;
const NAME = 'eleventy-plugin-ai-chatbot';

/**
 * Eleventy runs the plugin before it builds anything, so a wrong option stops
 * the build with a clear message instead of producing a site with no chat.
 */
function validateOptions(options) {
  const opts = options || {};
  const widgetId = typeof opts.widgetId === 'string' ? opts.widgetId.trim() : '';

  if (!widgetId) {
    throw new Error(
      NAME +
        ': "widgetId" is required. Copy it from the Install page of your ' +
        'Asyntai dashboard, for example asyntai_1a2b3c4d5e6f.',
    );
  }
  if (!WIDGET_ID_PATTERN.test(widgetId)) {
    throw new Error(
      NAME +
        ': "' +
        widgetId +
        '" does not look like a widget ID. It starts with asyntai_, for ' +
        'example asyntai_1a2b3c4d5e6f.',
    );
  }

  const scriptUrl =
    typeof opts.scriptUrl === 'string' && opts.scriptUrl.trim()
      ? opts.scriptUrl.trim()
      : DEFAULT_SCRIPT_URL;

  return {
    widgetId,
    scriptUrl,
    // Set to false to keep the widget off the site during `eleventy --serve`.
    enableInDevelopment: opts.enableInDevelopment !== false,
  };
}

/** JSON.stringify, safe inside an HTML <script> element. */
function jsString(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * The loader waits for the page's load event before it fetches the widget.
 * An ordinary `<script async src>` holds the load event open until its own
 * fetch finishes, so an unreachable server would delay the host page. This
 * pattern cannot.
 */
function buildLoader(widgetId, scriptUrl) {
  return (
    '(function(){var l=function(){' +
    'if(document.querySelector("script[data-asyntai-id]"))return;' +
    'var s=document.createElement("script");' +
    's.src=' +
    jsString(scriptUrl) +
    ';s.async=true;' +
    's.setAttribute("data-asyntai-id",' +
    jsString(widgetId) +
    ');' +
    'document.head.appendChild(s)};' +
    'if(document.readyState==="complete"){l()}' +
    'else{window.addEventListener("load",l)}})();'
  );
}

/**
 * Puts the tag before the last </body>, or before </html> when the page has no
 * body tag. A fragment with neither is left alone: it is not a whole page.
 * A page that already carries an Asyntai snippet is left alone too.
 */
function injectIntoHtml(html, tag) {
  if (typeof html !== 'string' || html.includes('data-asyntai-id')) {
    return html;
  }
  const lower = html.toLowerCase();
  let at = lower.lastIndexOf('</body>');
  if (at === -1) {
    at = lower.lastIndexOf('</html>');
  }
  if (at === -1) {
    return html;
  }
  return html.slice(0, at) + tag + html.slice(at);
}

function isDevelopment() {
  const mode = process.env.ELEVENTY_RUN_MODE;
  return mode === 'serve' || mode === 'watch';
}

function eleventyPluginAiChatbot(eleventyConfig, options) {
  const settings = validateOptions(options);
  const tag =
    '<script data-asyntai-loader>' +
    buildLoader(settings.widgetId, settings.scriptUrl) +
    '</script>';

  eleventyConfig.addTransform('asyntai-ai-chatbot', function (content, legacyOutputPath) {
    if (!settings.enableInDevelopment && isDevelopment()) {
      return content;
    }
    // Eleventy 3 has this.page.outputPath; Eleventy 1 passes it as an argument.
    const outputPath =
      (this && this.page && this.page.outputPath) ||
      (this && this.outputPath) ||
      legacyOutputPath;
    if (typeof outputPath !== 'string' || !outputPath.toLowerCase().endsWith('.html')) {
      return content;
    }
    return injectIntoHtml(content, tag);
  });
}

module.exports = eleventyPluginAiChatbot;
module.exports.validateOptions = validateOptions;
module.exports.buildLoader = buildLoader;
module.exports.injectIntoHtml = injectIntoHtml;
module.exports.DEFAULT_SCRIPT_URL = DEFAULT_SCRIPT_URL;
