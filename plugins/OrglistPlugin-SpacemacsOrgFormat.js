/* @orglist-plugin {"id":"orglist.spacemacs-org-format","name":"Spacemacs Org 编辑格式","version":"1.1.0","type":"format","hostApi":2} */
(function () {
  "use strict";

  const host = window.OrglistPluginHost;
  if (!host || host.apiVersion !== 2) {
    throw new Error("Spacemacs Org 编辑格式需要 Orglist 插件 API 2");
  }

  const pluginId = "orglist.spacemacs-org-format";
  const icons = ["◆", "●", "○", "✦", "◇", "▸", "▹", "·"];
  const indentCss = Array.from({ length: 12 }, (_, index) => {
    const indent = index + 1;
    return `.cm-editor .cm-line.cm-sm-org-indent-${indent}{padding-left:calc(12px + ${indent}ch)}`;
  }).join("\n");
  const styleText = `
    .sm-org-prefix {
      position: relative;
      display: inline-block;
      color: transparent !important;
      font-weight: 400;
      text-shadow: none;
    }
    .sm-org-prefix::after {
      content: attr(data-icon);
      position: absolute;
      right: 0;
      bottom: 0;
      width: 1ch;
      color: var(--sm-org-heading-color);
      font-weight: 900;
      text-align: center;
      text-shadow: 0 0 8px color-mix(in srgb, var(--sm-org-heading-color) 24%, transparent);
    }
    .sm-org-heading {
      color: var(--sm-org-heading-color);
      font-weight: 780;
    }
    .sm-org-heading .tokStatus { font-weight: 900; }
    .sm-org-heading .tokPriority { filter: saturate(1.18); }
    .sm-org-level-1 { --sm-org-heading-color: #4f97d7; }
    .sm-org-level-2 { --sm-org-heading-color: #2d9574; }
    .sm-org-level-3 { --sm-org-heading-color: #a45bad; }
    .sm-org-level-4 { --sm-org-heading-color: #b1951d; }
    .sm-org-level-5 { --sm-org-heading-color: #bc6ec5; }
    .sm-org-level-6 { --sm-org-heading-color: #2aa1ae; }
    .sm-org-level-7 { --sm-org-heading-color: #ce537a; }
    .sm-org-level-8 { --sm-org-heading-color: #6c9e4f; }
    .sm-org-level-deep { --sm-org-heading-color: #8b8792; }
    .sm-org-heading-line {
      background-image: linear-gradient(90deg, color-mix(in srgb, var(--sm-org-heading-color) 10%, transparent), transparent 45%);
      border-radius: 3px;
    }
    .sm-org-body-indent { display: inline-block; }
    .cm-editor .cm-line.cm-sm-org-heading {
      color: var(--sm-org-heading-color) !important;
      font-weight: 780;
      background-image: linear-gradient(90deg, color-mix(in srgb, var(--sm-org-heading-color) 10%, transparent), transparent 45%);
      border-radius: 3px;
    }
    .cm-format-heading-icon {
      display: inline-block;
      color: var(--sm-org-heading-color);
      font-weight: 900;
      text-align: right;
      text-shadow: 0 0 8px color-mix(in srgb, var(--sm-org-heading-color) 24%, transparent);
    }
    .sm-org-drawer { color: #8b8792; }
    .sm-org-keyword { color: #4f97d7; font-weight: 700; }
    .sm-org-block-boundary { color: #2d9574; font-weight: 750; }
    html[data-theme="dark"] .sm-org-level-1 { --sm-org-heading-color: #4f97d7; }
    html[data-theme="dark"] .sm-org-level-2 { --sm-org-heading-color: #2d9574; }
    html[data-theme="dark"] .sm-org-level-3 { --sm-org-heading-color: #67b11d; }
    html[data-theme="dark"] .sm-org-level-4 { --sm-org-heading-color: #b1951d; }
    html[data-theme="dark"] .sm-org-level-5 { --sm-org-heading-color: #bc6ec5; }
    html[data-theme="dark"] .sm-org-level-6 { --sm-org-heading-color: #2aa1ae; }
    html[data-theme="dark"] .sm-org-level-7 { --sm-org-heading-color: #ce537a; }
    html[data-theme="dark"] .sm-org-level-8 { --sm-org-heading-color: #9f8766; }
    html[data-theme="dark"] .sm-org-drawer { color: #9f8766; }
    @supports not (color: color-mix(in srgb, red, blue)) {
      .sm-org-prefix::after { text-shadow: none; }
      .sm-org-heading-line { background-image: none; }
      .cm-editor .cm-line.cm-sm-org-heading { background-image: none; }
      .cm-format-heading-icon { text-shadow: none; }
    }
    ${indentCss}
  `;

  function headingLevelClass(level) {
    return level <= 8 ? `sm-org-level-${level}` : "sm-org-level-deep";
  }

  function presentationFor(text) {
    let currentLevel = 0;
    return String(text ?? "").split("\n").map((line) => {
      const heading = line.match(/^(\*+)(\s+)(.*)$/);
      if (heading) {
        const level = heading[1].length;
        const levelClass = headingLevelClass(level);
        currentLevel = level;
        return {
          kind: "heading",
          level,
          levelClass,
          icon: icons[Math.min(level, icons.length) - 1],
          prefixLength: level,
          lineClass: `cm-sm-org-heading ${levelClass}`,
        };
      }
      const indent = currentLevel ? Math.min(12, currentLevel + 1) : 0;
      return { kind: "body", indent, lineClass: indent ? `cm-sm-org-indent-${indent}` : "" };
    });
  }

  host.register({
    manifest: {
      id: pluginId,
      name: "Spacemacs Org 编辑格式",
      version: "1.1.0",
      type: "format",
      hostApi: 2,
      platforms: ["windows", "android"],
      description: "Spacemacs 配色、层级缩进和不同标题图标，不修改 Org 原文",
    },

    activate(api) {
      const style = document.createElement("style");
      style.dataset.orglistPluginStyle = pluginId;
      style.textContent = styleText;
      document.head.appendChild(style);

      function highlightLine(line, model) {
        const heading = line.match(/^(\*+)(\s+)(.*)$/);
        if (heading) {
          const levelClass = model.levelClass;
          return `<span class="sm-org-heading-line ${levelClass}">` +
            `<span class="sm-org-prefix ${levelClass}" data-icon="${api.escapeHtml(model.icon)}">${api.escapeHtml(heading[1])}</span>` +
            api.escapeHtml(heading[2]) +
            `<span class="sm-org-heading ${levelClass}">${api.builtinOrgHighlight(heading[3])}</span></span>`;
        }

        let rendered;
        if (/^\s*:(?:PROPERTIES|LOGBOOK|END):\s*$/i.test(line) || /^\s*:[A-Z0-9_@#%+-]+:/.test(line)) {
          rendered = `<span class="sm-org-drawer">${api.builtinOrgHighlight(line)}</span>`;
        } else if (/^\s*#\+(?:BEGIN|END)_[A-Z0-9_+-]+/i.test(line)) {
          rendered = `<span class="sm-org-block-boundary">${api.builtinOrgHighlight(line)}</span>`;
        } else if (/^\s*#\+[A-Z0-9_+-]+:?/i.test(line)) {
          rendered = `<span class="sm-org-keyword">${api.builtinOrgHighlight(line)}</span>`;
        } else rendered = api.builtinOrgHighlight(line);
        return model.indent ? `<span class="sm-org-body-indent" style="padding-left:${model.indent}ch">${rendered}</span>` : rendered;
      }

      return {
        highlight(text) {
          const source = String(text ?? ""), presentation = presentationFor(source);
          return source.split("\n").map((line, index) => highlightLine(line, presentation[index])).join("\n");
        },
        presentation(text) {
          return presentationFor(text);
        },
        validate(text) {
          return String(text ?? "").includes("\u0000") ? "Org 文本中包含不允许的 NUL 字符。" : true;
        },
        normalize(text) {
          return String(text ?? "");
        },
        deactivate() {
          style.remove();
        },
      };
    },
  });
})();
