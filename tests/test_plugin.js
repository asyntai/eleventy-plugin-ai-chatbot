/**
 * Offline tests for eleventy-plugin-ai-chatbot.
 *
 * These call the plugin the way Eleventy calls it: the plugin function with a
 * fake eleventyConfig, then the transform it registered. No Eleventy install
 * is needed, so a mistake in the option handling shows up in a second.
 *
 * Run: node plugins/eleventy/tests/test_plugin.js
 */

const assert = require('assert');
const plugin = require('../src/index.js');
const { validateOptions, injectIntoHtml, DEFAULT_SCRIPT_URL } = plugin;

const passed = [];
const failed = [];

function check(name, fn) {
  try {
    fn();
    passed.push(name);
    console.log('  PASS  ' + name);
  } catch (err) {
    failed.push(name);
    console.log('  FAIL  ' + name + '  -> ' + err.message);
  }
}

const PAGE = '<!doctype html><html><head><title>t</title></head><body><p>Hi</p></body></html>';

/** Runs the plugin and returns the transform it registered. */
function setup(options) {
  const transforms = [];
  plugin({ addTransform: (name, fn) => transforms.push({ name, fn }) }, options);
  return transforms;
}

/** Calls the transform the way Eleventy 3 does: outputPath on this.page. */
function run(transform, content, outputPath) {
  return transform.fn.call({ page: { outputPath } }, content);
}

function withRunMode(mode, fn) {
  const old = process.env.ELEVENTY_RUN_MODE;
  if (mode === undefined) delete process.env.ELEVENTY_RUN_MODE;
  else process.env.ELEVENTY_RUN_MODE = mode;
  try {
    return fn();
  } finally {
    if (old === undefined) delete process.env.ELEVENTY_RUN_MODE;
    else process.env.ELEVENTY_RUN_MODE = old;
  }
}

const ID = 'asyntai_1a2b3c4d5e6f';

console.log('\nOptions');

check('a valid widget ID is accepted', () => {
  assert.strictEqual(validateOptions({ widgetId: ID }).widgetId, ID);
});

check('surrounding spaces are trimmed', () => {
  assert.strictEqual(validateOptions({ widgetId: '  ' + ID + '  ' }).widgetId, ID);
});

check('a missing widget ID stops the build', () => {
  assert.throws(() => setup({}), /widgetId" is required/);
});

check('no options at all stops the build', () => {
  assert.throws(() => setup(), /widgetId" is required/);
});

check('an empty widget ID stops the build', () => {
  assert.throws(() => setup({ widgetId: '   ' }), /widgetId" is required/);
});

check('a widget ID without the prefix stops the build', () => {
  assert.throws(() => setup({ widgetId: '1a2b3c4d5e6f' }), /does not look like a widget ID/);
});

check('a widget ID with a quote in it stops the build', () => {
  assert.throws(() => setup({ widgetId: 'asyntai_a"b' }), /does not look like a widget ID/);
});

check('the default script URL is the Asyntai CDN', () => {
  assert.strictEqual(validateOptions({ widgetId: ID }).scriptUrl, DEFAULT_SCRIPT_URL);
  assert.strictEqual(DEFAULT_SCRIPT_URL, 'https://widget.asyntai.com/static/js/chat-widget.js');
});

check('a custom script URL is kept', () => {
  const v = validateOptions({ widgetId: ID, scriptUrl: 'https://example.com/w.js' });
  assert.strictEqual(v.scriptUrl, 'https://example.com/w.js');
});

console.log('\nPlugin shape');

check('the plugin registers exactly one transform', () => {
  assert.strictEqual(setup({ widgetId: ID }).length, 1);
});

console.log('\nInjected code');

check('the loader goes just before </body>', () => {
  const [t] = setup({ widgetId: ID });
  const out = run(t, PAGE, '_site/index.html');
  assert.ok(/<script data-asyntai-loader>[^]*<\/script><\/body>/.test(out));
  assert.strictEqual(out.replace(/<script data-asyntai-loader>[^]*?<\/script>/, ''), PAGE);
});

check('the widget ID and script URL are in the loader', () => {
  const out = run(setup({ widgetId: ID })[0], PAGE, '_site/index.html');
  assert.ok(out.includes('"' + ID + '"'));
  assert.ok(out.includes(DEFAULT_SCRIPT_URL));
});

check('the loader waits for the load event', () => {
  const out = run(setup({ widgetId: ID })[0], PAGE, '_site/index.html');
  assert.ok(out.includes('window.addEventListener("load"'));
  assert.ok(out.includes('document.readyState==="complete"'));
});

check('the loader is valid JavaScript', () => {
  const out = run(setup({ widgetId: ID })[0], PAGE, '_site/index.html');
  const code = out.match(/<script data-asyntai-loader>([^]*?)<\/script>/)[1];
  new Function(code);
});

check('a script URL with </script> cannot break out of the tag', () => {
  const out = run(
    setup({ widgetId: ID, scriptUrl: 'https://e.com/</script><b>x' })[0],
    PAGE,
    '_site/index.html',
  );
  assert.strictEqual(out.split('</script>').length - 1, 1);
  assert.ok(!out.includes('<b>x'));
});

check('upper-case </BODY> is found', () => {
  const page = '<HTML><BODY>x</BODY></HTML>';
  const out = run(setup({ widgetId: ID })[0], page, '_site/a.html');
  assert.ok(out.endsWith('</script></BODY></HTML>'));
});

check('the last </body> is used when a comment holds another one', () => {
  const page = '<html><body><!-- </body> -->x</body></html>';
  const out = run(setup({ widgetId: ID })[0], page, '_site/a.html');
  assert.ok(out.startsWith('<html><body><!-- </body> -->x<script'));
});

check('a page with no body tag gets it before </html>', () => {
  const out = injectIntoHtml('<html>x</html>', '<s></s>');
  assert.strictEqual(out, '<html>x<s></s></html>');
});

check('a fragment with no body or html tag is left alone', () => {
  const out = run(setup({ widgetId: ID })[0], '<p>part</p>', '_site/part.html');
  assert.strictEqual(out, '<p>part</p>');
});

check('a page that already has an Asyntai snippet is left alone', () => {
  const page = '<html><body><script src="x" data-asyntai-id="asyntai_x"></script></body></html>';
  assert.strictEqual(run(setup({ widgetId: ID })[0], page, '_site/a.html'), page);
});

check('running the transform twice adds only one loader', () => {
  const t = setup({ widgetId: ID })[0];
  const once = run(t, PAGE, '_site/index.html');
  assert.strictEqual(run(t, once, '_site/index.html'), once);
});

console.log('\nWhich files');

check('non-HTML output is left alone', () => {
  const t = setup({ widgetId: ID })[0];
  for (const p of ['_site/feed.xml', '_site/data.json', '_site/style.css', '_site/sitemap.xml']) {
    assert.strictEqual(run(t, PAGE, p), PAGE, p);
  }
});

check('permalink: false (no output path) is left alone', () => {
  assert.strictEqual(run(setup({ widgetId: ID })[0], PAGE, false), PAGE);
});

check('an .HTML path in capitals still gets the widget', () => {
  assert.ok(run(setup({ widgetId: ID })[0], PAGE, '_site/A.HTML').includes('data-asyntai-loader'));
});

check('Eleventy 2 style (this.outputPath) works', () => {
  const out = setup({ widgetId: ID })[0].fn.call({ outputPath: '_site/index.html' }, PAGE);
  assert.ok(out.includes('data-asyntai-loader'));
});

check('Eleventy 1 style (outputPath argument) works', () => {
  const out = setup({ widgetId: ID })[0].fn.call({}, PAGE, '_site/index.html');
  assert.ok(out.includes('data-asyntai-loader'));
});

console.log('\nDevelopment mode');

check('the widget is on during --serve by default', () => {
  withRunMode('serve', () => {
    assert.ok(run(setup({ widgetId: ID })[0], PAGE, '_site/index.html').includes('data-asyntai-loader'));
  });
});

check('enableInDevelopment false keeps it off during --serve', () => {
  withRunMode('serve', () => {
    const t = setup({ widgetId: ID, enableInDevelopment: false })[0];
    assert.strictEqual(run(t, PAGE, '_site/index.html'), PAGE);
  });
});

check('enableInDevelopment false keeps it off during --watch', () => {
  withRunMode('watch', () => {
    const t = setup({ widgetId: ID, enableInDevelopment: false })[0];
    assert.strictEqual(run(t, PAGE, '_site/index.html'), PAGE);
  });
});

check('enableInDevelopment false still adds it in a normal build', () => {
  withRunMode('build', () => {
    const t = setup({ widgetId: ID, enableInDevelopment: false })[0];
    assert.ok(run(t, PAGE, '_site/index.html').includes('data-asyntai-loader'));
  });
});

console.log('\n' + passed.length + ' passed, ' + failed.length + ' failed');
process.exit(failed.length ? 1 : 0);
