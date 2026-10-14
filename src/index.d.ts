export interface AsyntaiOptions {
  /** Your Asyntai widget ID, for example `asyntai_1a2b3c4d5e6f`. Required. */
  widgetId: string;
  /** Set to false to keep the widget off the site during `eleventy --serve`. */
  enableInDevelopment?: boolean;
  /** Advanced. Load the widget script from another URL. */
  scriptUrl?: string;
}

declare function eleventyPluginAiChatbot(eleventyConfig: any, options: AsyntaiOptions): void;

declare namespace eleventyPluginAiChatbot {
  function validateOptions(options: AsyntaiOptions): Required<AsyntaiOptions>;
  function buildLoader(widgetId: string, scriptUrl: string): string;
  function injectIntoHtml(html: string, tag: string): string;
  const DEFAULT_SCRIPT_URL: string;
}

export = eleventyPluginAiChatbot;
