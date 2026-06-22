import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { read, samples } from './common';

async function run() {
  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    const window = new Window();
    const windowAny = window as any;
    Object.assign(globalThis, {
      window,
      document: window.document,
      DOMParser: window.DOMParser,
      indexedDB: windowAny.indexedDB,
      IDBKeyRange: windowAny.IDBKeyRange,
      Blob: window.Blob,
      File: window.File,
      FileReader: window.FileReader,
      HTMLElement: window.HTMLElement,
    });

    const { parseCgiDataNew } = await import('#shared/utils/html');
    const { renderExportHtmlFromCgiDataNew, renderMarkdownFromCgiDataNew } = await import('#shared/utils/renderer');

    const contentSamples = samples.filter(group => group.hasContent);
    const sampleGroup = contentSamples.find(group => group.name === '普通图文') ?? contentSamples[0];
    const samplePath = sampleGroup.samples[0];
    const rawHtml = read(samplePath);
    const cgiData = await parseCgiDataNew(rawHtml);

    assert.ok(cgiData, 'should parse cgiData from sample html');

    const markdown = await renderMarkdownFromCgiDataNew(cgiData);
    assert.ok(markdown.trim().length > 0, 'markdown should not be empty');
    assert.ok(!markdown.includes('<style>'), 'markdown should not include style tags');
    assert.ok(!markdown.includes('margin: 0; padding: 0; outline: 0;'), 'markdown should not include css');

    const html = await renderExportHtmlFromCgiDataNew(cgiData);
    assert.ok(html.includes(cgiData.title), 'html should keep title');
    assert.ok(!html.includes('js_base_container'), 'html should not be the unreadable shell');
    assert.ok(html.includes('class="title"') || html.includes('class="text_content"'), 'html should contain readable article content');

    console.log('export rendering regression passed');
  } finally {
    console.warn = originalWarn;
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
