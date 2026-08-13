/* @orglist-plugin {"id":"example.markdown-format","name":"Markdown 编辑格式示例","version":"1.0.0","type":"format","hostApi":2} */
(function () {
  const host = window.OrglistPluginHost;
  if (!host || host.apiVersion !== 2) throw new Error("需要 Orglist 插件 API 2");

  host.register({
    manifest: {
      id: "example.markdown-format",
      name: "Markdown 编辑格式示例",
      version: "1.0.0",
      type: "format",
      hostApi: 2,
    },
    activate(api) {
      return {
        highlight(text) {
          return String(text).split("\n").map((line) => {
            const heading = line.match(/^(#{1,6})(\s+)(.*)$/);
            if (heading) return api.token("tokStars", heading[1]) + api.escapeHtml(heading[2]) + api.token("tokHeading", heading[3]);
            return api.escapeHtml(line).replace(/(`[^`\n]+`)/g, '<span class="tokOrgCode">$1</span>');
          }).join("\n");
        },
        validate(text) {
          return String(text).includes("\u0000") ? "文本中包含不允许的 NUL 字符。" : true;
        },
        normalize(text) {
          return String(text).replace(/\r\n?/g, "\n");
        },
      };
    },
  });
})();
