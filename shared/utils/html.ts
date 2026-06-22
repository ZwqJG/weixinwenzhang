import * as cheerio from 'cheerio';
import { EXTERNAL_API_SERVICE } from '~/config';
import { extractCommentId } from '~/utils/comment';

/**
 * 从原始 HTML 中提取 window.cgiDataNew 对象（新模板 JS 渲染的数据）
 * @param rawHTML 公众号文章的原始 html
 * @returns 解析后的 cgiDataNew 对象，失败返回 null
 */
function parseCgiDataFromHtml(rawHTML: string): any | null {
  const code = extractCgiScript(rawHTML);
  if (!code) return null;

  try {
    const sandbox: any = { window: {} };
    sandbox.window = sandbox;
    const func = new Function('window', code);
    func(sandbox.window);
    return sandbox.cgiDataNew || null;
  } catch (e) {
    console.error('parseCgiDataFromHtml 失败:', e);
    return null;
  }
}

/**
 * 从 cgiDataNew 数据构建文章内容的 HTML 字符串
 */
function buildArticleHtmlFromData(data: any): string {
  const parts: string[] = [];

  // 标题
  if (data.title) {
    parts.push(`<h1 class="title">${escapeHtml(data.title)}</h1>`);
  }

  // 元信息（作者、时间）
  const metaParts: string[] = [];
  if (data.nick_name) {
    metaParts.push(`<span class="nick_name">${escapeHtml(data.nick_name)}</span>`);
  }
  if (data.create_time) {
    metaParts.push(`<span class="create_time">${escapeHtml(data.create_time)}</span>`);
  }
  if (data.signature) {
    metaParts.push(`<span class="signature">${escapeHtml(data.signature)}</span>`);
  }
  if (metaParts.length > 0) {
    parts.push(`<div class="__meta__">${metaParts.join(' · ')}</div>`);
  }

  // 原文链接
  if (data.link) {
    parts.push(`<blockquote class="source">原文地址: <a href="${escapeHtml(data.link)}" target="_blank">${escapeHtml(data.link)}</a></blockquote>`);
  }

  // 判断文章类型
  const itemShowType = Number(data.item_show_type) || 0;

  // 图片型文章（item_show_type = 8）：图片列表
  if (itemShowType === 8 && Array.isArray(data.picture_page_info_list) && data.picture_page_info_list.length > 0) {
    parts.push('<div class="picture_content">');
    data.picture_page_info_list.forEach((pic: any, i: number) => {
      const imgUrl = pic.cdn_url || '';
      if (imgUrl) {
        parts.push(`<div class="picture_item">`);
        parts.push(`  <img src="${escapeHtml(imgUrl)}" alt="图${i + 1}" />`);
        parts.push(`  <div class="picture_item_label">图${i + 1}</div>`);
        parts.push(`</div>`);
      }
    });
    parts.push('</div>');
  }

  // 文字内容（content_noencode / desc）
  const textContent = data.content_noencode || data.desc || '';
  if (textContent) {
    // 将换行符转为 <br>
    const textHtml = escapeHtml(textContent).replace(/\\x0a/g, '\n').replace(/\n/g, '<br>');
    parts.push(`<div class="text_content">${textHtml}</div>`);
  }

  return parts.join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 处理文章的 html 内容
 * @description 采用 cheerio 库解析并修改 html 内容
 * @param rawHTML 公众号文章的原始 html
 * @param format 要处理的格式(默认html)
 * @remarks 服务端工具函数
 */
export function normalizeHtml(rawHTML: string, format: 'html' | 'text' = 'html'): string {
  const $ = cheerio.load(rawHTML);
  const $jsArticleContent = $('#js_article');

  // 检查是否为旧模板（#js_content 存在）
  const hasJsContent = $jsArticleContent.find('#js_content').length > 0;

  if (hasJsContent) {
    // 旧模板：#js_content 默认是不可见的(通过js修改为可见)，移除该样式
    $jsArticleContent.find('#js_content').removeAttr('style');
  } else {
    // 新模板：#js_content 不存在，尝试从 window.cgiDataNew 提取内容
    try {
      const cgiData = parseCgiDataFromHtml(rawHTML);
      if (cgiData) {
        const articleHtml = buildArticleHtmlFromData(cgiData);
        // 将构建的内容插入到 #js_article 中
        $jsArticleContent.append(`<div id="js_content" class="wx_rich_media_content">${articleHtml}</div>`);
      }
    } catch (e) {
      console.error('normalizeHtml: 从 cgiDataNew 提取内容失败', e);
    }
  }

  // 删除无用dom元素
  $jsArticleContent.find('#js_top_ad_area').remove();
  $jsArticleContent.find('#js_tags_preview_toast').remove();
  $jsArticleContent.find('#content_bottom_area').remove();

  // 删除所有 script 标签（在 #js_article 上下文中）
  $jsArticleContent.find('script').remove();

  $jsArticleContent.find('#js_pc_qr_code').remove();
  $jsArticleContent.find('#wx_stream_article_slide_tip').remove();

  // 处理图片懒加载（全局处理所有 img）
  $('img').each((i, el) => {
    const $img = $(el);
    const imgUrl = $img.attr('src') || $img.attr('data-src');
    if (imgUrl) {
      $img.attr('src', imgUrl);
    }
  });

  if (format === 'text') {
    // 获取纯文本内容
    const text = $jsArticleContent.text().trim().replace(/\n+/g, '\n').replace(/ +/g, ' ');
    // 分割成行
    const lines = text.split('\n');
    // 过滤掉全空白行（^\s*$ 表示行首到行尾全是空白字符）
    const filteredLines = lines.filter(line => !/^\s*$/.test(line));

    // 重新连接行
    return filteredLines.join('\n');
  } else if (format === 'html') {
    // 获取修改后的 HTML
    let bodyCls = $('body').attr('class');
    const pageContentHTML = $('<div>').append($jsArticleContent.clone()).html();
    return `<!DOCTYPE html>
  <html lang="zh_CN">
  <head>
      <meta charset="utf-8">
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0,viewport-fit=cover">
      <meta name="referrer" content="no-referrer">
      <style>
          #js_row_immersive_stream_wrap {
              max-width: 667px;
              margin: 0 auto;
          }
          #js_row_immersive_stream_wrap .wx_follow_avatar_pic {
            display: block;
            margin: 0 auto;
          }
          #page-content,
          #js_article_bottom_bar,
          .__page_content__ {
              max-width: 667px;
              margin: 0 auto;
          }
          img {
              max-width: 100%;
          }
          .sns_opr_btn::before {
              width: 16px;
              height: 16px;
              margin-right: 3px;
          }
          .title { font-size: 22px; line-height: 1.4; margin-bottom: 14px; font-weight: 500; }
          .__meta__ { color: rgba(0,0,0,0.3); font-size: 15px; margin-bottom: 50px; }
          .__meta__ .nick_name { color: #576B95; }
          blockquote.source { padding: 10px; margin: 30px 0; border-left: 5px solid #ccc; color: #333; font-style: italic; }
          .text_content { margin-bottom: 50px; font-size: 17px; white-space: pre-wrap; word-wrap: break-word; line-height: 28px; }
          .picture_content .picture_item { margin-bottom: 30px; text-align: center; }
          .picture_content .picture_item .picture_item_label { text-align: center; font-size: 14px; color: rgba(0,0,0,0.3); margin-top: 8px; }
      </style>
  </head>
  <body class="${bodyCls}">
  ${pageContentHTML}
  </body>
  </html>
    `;
  } else {
    throw new Error(`format not supported: ${format}`);
  }
}

/**
 * 验证文章的 html 内容是否下载成功，以及提取出 commentID
 * @param html
 * @return [状态，commentID/msg] 二元组
 */
export function validateHTMLContent(html: string): ['Success' | 'Deleted' | 'Exception' | 'Error', string | null] {
  const $ = cheerio.load(html);
  const $jsArticle = $('#js_article');
  const $weuiMsg = $('.weui-msg');
  const $msgBlock = $('.mesg-block');

  if ($jsArticle.length === 1) {
    // 成功
    const commentID = extractCommentId(html);
    return ['Success', commentID];
  } else if ($weuiMsg.length === 1) {
    // 失败，需要进一步判断失败类型
    const msg = $('.weui-msg .weui-msg__title').text().trim().replace(/\n+/g, '').replace(/ +/g, ' ');
    if (msg && ['The content has been deleted by the author.', '该内容已被发布者删除'].includes(msg)) {
      return ['Deleted', null];
    } else {
      return ['Exception', msg];
    }
  } else if ($msgBlock.length === 1) {
    const msg = $msgBlock.text().trim().replace(/\n+/g, '').replace(/ +/g, ' ');
    return ['Exception', msg];
  } else {
    return ['Error', null];
  }
}

/**
 * 提取 window.cgiDataNew 所在脚本的代码
 * @param html 文章的完整 html 内容
 * @return 脚本代码 (纯代码，不含 <script> 标签)
 * @remarks 内部使用 cheerio 库进行解析，可运行在浏览器端和服务器端。
 */
function extractCgiScript(html: string) {
  const $ = cheerio.load(html);

  const scriptEl = $('script[type="text/javascript"][h5only]').filter((i, el) => {
    const content = $(el).html() || '';
    return content.includes('window.cgiDataNew = {');
  });

  if (scriptEl.length !== 1) {
    console.warn('未找到包含 cgiDataNew 的目标 script');
    return null;
  }

  return scriptEl.html()?.trim() || null;
}

/**
 * 从 html 中提取 cgiDataNew 对象
 * @param html 文章的完整 html 内容
 * @return window.cgiDataNew 对象，解析失败时返回 null
 */
function parseCgiDataNewOnClient(html: string): Promise<any> {
  const code = extractCgiScript(html);
  if (!code) {
    return Promise.resolve(null);
  }

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.srcdoc = `<script type="text/javascript">${code}</script>`;
  document.body.appendChild(iframe);

  return new Promise((resolve, reject) => {
    iframe.onload = function () {
      // @ts-ignore
      const data = iframe.contentWindow.cgiDataNew;

      // 用完后清理
      document.body.removeChild(iframe);
      resolve(data);
    };
    iframe.onerror = function (e) {
      reject(e);
    };
  });
}

/**
 * 从 html 中提取 cgiDataNew 对象
 * @deprecated Cloudflare 平台禁止任何动态执行脚本，故本方法在 CF 平台无效
 * @param html 文章的完整 html 内容
 * @return window.cgiDataNew 对象，解析失败时返回 null
 */
function parseCgiDataNewOnServerDeprecated(html: string): Promise<any> {
  const code = extractCgiScript(html);
  if (!code) {
    return Promise.resolve(null);
  }

  // 1. 创建沙箱
  const sandbox: any = {
    window: {},
    console: { log: () => {}, error: () => {} }, // 可选：屏蔽 console
    // 如果脚本依赖其他全局，可在这里 mock（如 Date, Math 等已存在）
  };
  sandbox.window = sandbox; // 关键：让 window.xxx 落入沙箱

  // 2. 执行代码（new Function 比 eval 稍安全）
  const func = new Function('window', code);
  func(sandbox.window);

  return sandbox.cgiDataNew || sandbox.window?.cgiDataNew;
}

/**
 * 从 html 中提取 cgiDataNew 对象
 * @param html 文章的完整 html 内容
 * @return window.cgiDataNew 对象，解析失败时返回 null
 */
async function parseCgiDataNewOnServer(html: string): Promise<any> {
  const code = extractCgiScript(html);
  if (!code) {
    return Promise.resolve(null);
  }

  try {
    const data = await fetch(`${EXTERNAL_API_SERVICE}/api/tools/eval-js-code`, {
      method: 'POST',
      body: code,
    }).then(res => res.json());
    if (data && data.executionError === null) {
      return data.window.cgiDataNew;
    }
    return null;
  } catch (error) {
    console.error(error);
  }
  return null;
}

/**
 * 从 html 中提取 cgiDataNew 对象
 * @param html 文章的完整 html 内容
 * @return window.cgiDataNew 对象，解析失败时返回 null
 */
export async function parseCgiDataNew(html: string): Promise<any> {
  if (process.client && typeof document === 'object') {
    return parseCgiDataNewOnClient(html);
  } else {
    return parseCgiDataNewOnServer(html);
  }
}
