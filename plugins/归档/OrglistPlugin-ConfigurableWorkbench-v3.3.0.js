/* @orglist-plugin {"id":"orglist.configurable-workbench","name":"空白画布工作台","version":"3.3.0","type":"layout","hostApi":2} */
(function () {
  "use strict";

  const host = window.OrglistPluginHost;
  if (!host || host.apiVersion !== 2) throw new Error("空白画布工作台需要 Orglist 插件 API 2");

  const pluginId = "orglist.configurable-workbench";
  const viewLabels = {
    all: "全部条目", open: "未完成", today: "今天", upcoming: "未来", overdue: "已逾期",
    completed: "已完成", "no-date": "无日期", habits: "习惯",
    "calendar-year": "年历", "calendar-month": "月历", "calendar-week": "周历", "calendar-day": "日历",
  };
  const coreKinds = {
    brand: { label: "品牌标题", region: "brand" }, open: { label: "打开文件", region: "openActions" },
    smart: { label: "智能清单", region: "smartLists" }, custom: { label: "自定义清单", region: "customLists" },
    files: { label: "文件列表", region: "fileLists" }, recent: { label: "最近打开", region: "recentFiles" },
    settings: { label: "设置按钮", region: "settingsButton", button: true }, search: { label: "搜索栏", region: "search" },
    searchHelp: { label: "搜索说明按钮", region: "searchHelpButton", button: true },
    theme: { label: "主题按钮", region: "themeButton", button: true }, batch: { label: "批量按钮", region: "batchButton", button: true },
    add: { label: "新增条目按钮", region: "addButton", button: true }, menu: { label: "导航菜单按钮", region: "menuButton", button: true },
    back: { label: "返回按钮", region: "backButton", button: true },
    viewHeader: { label: "主视图标题", region: "viewHeader" }, filters: { label: "筛选条件", region: "filterControls" },
    viewAux: { label: "主视图辅助控件", region: "viewAux" }, mainList: { label: "中间主清单", region: "mainList" },
    detail: { label: "条目详情", region: "detail" },
  };
  const contentKinds = { task: { label: "任务/日历窗口" }, layout: { label: "布局控制" }, ...coreKinds };
  const calendarViews = new Set(["calendar-year", "calendar-month", "calendar-week", "calendar-day"]);
  const defaults = {
    schema: 4,
    mode: "use",
    nodes: [
      { id: "container-navigation", kind: "container", title: "导航", parent: "root", x: 0, y: 0, w: 3, h: 12 },
      { id: "container-toolbar", kind: "container", title: "工具栏", parent: "root", x: 3, y: 0, w: 9, h: 1 },
      { id: "container-content", kind: "container", title: "内容工作区", parent: "root", x: 3, y: 1, w: 9, h: 11 },

      { id: "brand", kind: "window", content: "brand", title: "Org 清单", parent: "container-navigation", x: 0, y: 0, w: 12, h: 2 },
      { id: "open", kind: "window", content: "open", title: "打开文件", parent: "container-navigation", x: 0, y: 2, w: 12, h: 3 },
      { id: "smart", kind: "window", content: "smart", title: "智能清单", parent: "container-navigation", x: 0, y: 5, w: 12, h: 5 },
      { id: "custom", kind: "window", content: "custom", title: "自定义清单", parent: "container-navigation", x: 0, y: 10, w: 12, h: 4 },
      { id: "files", kind: "window", content: "files", title: "文件", parent: "container-navigation", x: 0, y: 14, w: 12, h: 5 },
      { id: "recent", kind: "window", content: "recent", title: "最近打开", parent: "container-navigation", x: 0, y: 19, w: 12, h: 4 },
      { id: "settings", kind: "window", content: "settings", title: "设置", parent: "container-navigation", x: 0, y: 23, w: 12, h: 2 },

      { id: "back", kind: "window", content: "back", title: "返回", parent: "container-toolbar", x: 0, y: 0, w: 1, h: 1 },
      { id: "search", kind: "window", content: "search", title: "搜索", parent: "container-toolbar", x: 1, y: 0, w: 7, h: 1 },
      { id: "search-help", kind: "window", content: "searchHelp", title: "搜索说明", parent: "container-toolbar", x: 8, y: 0, w: 1, h: 1 },
      { id: "theme", kind: "window", content: "theme", title: "主题", parent: "container-toolbar", x: 9, y: 0, w: 1, h: 1 },
      { id: "add", kind: "window", content: "add", title: "新增", parent: "container-toolbar", x: 11, y: 0, w: 1, h: 1 },
      { id: "batch", kind: "window", content: "batch", title: "批量", parent: "container-toolbar", x: 10, y: 0, w: 1, h: 1 },

      { id: "view-header", kind: "window", content: "viewHeader", title: "当前视图", parent: "container-content", x: 0, y: 0, w: 12, h: 3 },
      { id: "filters", kind: "window", content: "filters", title: "筛选条件", parent: "container-content", x: 0, y: 3, w: 12, h: 3 },
      { id: "view-aux", kind: "window", content: "viewAux", title: "视图控件", parent: "container-content", x: 0, y: 6, w: 12, h: 1 },
      { id: "main-list", kind: "window", content: "mainList", title: "中间主清单", parent: "container-content", x: 0, y: 7, w: 12, h: 9 },

      { id: "detail", kind: "window", content: "detail", title: "条目详情", parent: "root", x: 8, y: 2, w: 4, h: 9, floating: true, collapsible: true, autoCollapse: false, cw: 3, ch: 1 },
      { id: "layout", kind: "window", content: "layout", title: "布局", parent: "root", x: 11, y: 11, w: 1, h: 1, floating: true },
    ],
  };

  const css = `
    body.owb-blank .app{min-height:100vh}body.owb-blank #sidebar,body.owb-blank .workspace>.topbar,body.owb-blank .workspace>.content{display:none!important}body.owb-blank .workspace{display:flex;height:100vh;min-height:0;background:var(--bg)}
    .owb-root{flex:1;min-width:0;height:100vh;padding:10px;overflow:auto}.owb-canvas,.owb-container-body{position:relative}.owb-canvas{min-height:100%}.owb-container-body{flex:1;min-height:0;padding:7px;overflow:auto;background:color-mix(in srgb,var(--soft) 55%,transparent)}
    .owb-node{position:relative;display:flex;min-width:0;min-height:0;overflow:hidden;background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow)}.owb-node.floating{position:absolute;z-index:45;box-shadow:0 22px 60px rgba(0,0,0,.22)}.owb-node.dragging,.owb-node.resizing{z-index:60;border-color:var(--accent);opacity:.93}.owb-node.locked{border-color:color-mix(in srgb,var(--accent) 32%,var(--line))}
    .owb-locating .owb-node{opacity:.35;transition:opacity .18s}.owb-locating .owb-node.owb-node-highlight{opacity:1}.owb-node-highlight{outline:3px solid var(--accent)!important;outline-offset:3px;box-shadow:0 0 0 8px color-mix(in srgb,var(--accent) 20%,transparent),0 22px 60px rgba(0,0,0,.28)!important;z-index:80!important;animation:owb-pulse 1.2s ease 2}@keyframes owb-pulse{0%,100%{outline-color:var(--accent)}50%{outline-color:color-mix(in srgb,var(--accent) 45%,transparent)}}
    .owb-node-inner{display:flex;flex:1;min-width:0;min-height:0;flex-direction:column}.owb-node-head{display:flex;flex:0 0 auto;align-items:center;gap:6px;min-height:38px;padding:7px 8px 7px 11px;background:var(--soft);border-bottom:1px solid var(--line);cursor:grab;touch-action:none;user-select:none}.owb-node-head strong{flex:1;min-width:0;overflow:hidden;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.owb-node-kind{color:var(--muted2);font-size:7px;font-weight:800;white-space:nowrap}
    .owb-node-body{flex:1;min-width:0;min-height:0;overflow:auto}.owb-node.collapsed .owb-node-body{display:none}.owb-node.collapsed .owb-node-head{height:100%;border-bottom:0;cursor:pointer}.owb-resize{position:absolute;z-index:5;right:0;bottom:0;width:20px;height:20px;cursor:nwse-resize;touch-action:none}.owb-resize:after{position:absolute;right:4px;bottom:4px;width:8px;height:8px;border-right:2px solid var(--accent);border-bottom:2px solid var(--accent);content:""}.owb-node.locked .owb-resize{display:none}
    .owb-container>.owb-node-inner>.owb-node-head{background:color-mix(in srgb,var(--accentSoft) 64%,var(--soft))}.owb-container>.owb-node-inner>.owb-node-head strong{color:var(--accent)}
    .owb-task-list{height:100%;overflow:auto}.owb-task{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;width:100%;padding:9px 11px;color:var(--text);background:transparent;border:0;border-bottom:1px solid var(--line);text-align:left}.owb-task:hover{background:var(--accentSoft)}.owb-task-title{display:block;overflow:hidden;font-size:10px;font-weight:750;text-overflow:ellipsis;white-space:nowrap}.owb-task-meta{display:block;margin-top:3px;color:var(--muted);font-size:8px}.owb-task-date{align-self:center;color:var(--accent);font-size:8px;white-space:nowrap}.owb-empty{display:grid;place-items:center;min-height:100%;padding:18px;color:var(--muted2);font-size:9px;text-align:center}
    .owb-calendar{display:flex;height:100%;min-height:0;flex-direction:column}.owb-calendar-tools{display:flex;align-items:center;flex-wrap:wrap;gap:5px;padding:7px 8px;border-bottom:1px solid var(--line)}.owb-calendar-tools strong{margin-right:auto;font-size:10px}.owb-calendar-tools button{padding:5px 7px;color:var(--muted);background:var(--soft);border:1px solid var(--line);border-radius:6px;font-size:8px}.owb-calendar-tools button.active{color:#fff;background:var(--accent)}.owb-calendar-scroll{flex:1;min-height:0;overflow:auto;padding:8px}.owb-month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.owb-weekday{padding:4px;color:var(--muted2);font-size:7px;text-align:center}.owb-day-cell{min-height:76px;padding:5px;background:var(--soft);border:1px solid var(--line);border-radius:6px}.owb-day-cell.outside{opacity:.45}.owb-day-cell.today{border-color:var(--accent)}.owb-day-number{display:block;margin-bottom:4px;color:var(--muted);font-size:8px;font-weight:800}.owb-cal-task{display:block;width:100%;margin:2px 0;padding:3px 4px;overflow:hidden;color:var(--text);background:var(--panel);border:0;border-radius:4px;font-size:7px;text-align:left;text-overflow:ellipsis;white-space:nowrap}.owb-year-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.owb-month-card{min-height:90px;padding:9px;color:var(--text);background:var(--soft);border:1px solid var(--line);border-radius:8px;text-align:left}.owb-month-card strong,.owb-month-card span{display:block}.owb-month-card span{margin-top:8px;color:var(--muted);font-size:8px}.owb-week-grid{display:grid;grid-template-columns:repeat(7,minmax(120px,1fr));gap:6px;min-width:760px}.owb-week-day{min-height:220px;padding:7px;background:var(--soft);border:1px solid var(--line);border-radius:7px}.owb-day-view{display:grid;gap:5px}.owb-day-view h4{margin:0 0 5px;font-size:11px}
    .owb-core .sideSection{height:100%;padding:3px 5px 8px;overflow:auto;border:0}.owb-core .sideSection .label{margin:7px 6px 5px}.owb-core .customLists,.owb-core .files,.owb-core .history{max-height:none}.owb-core-brand #brandRegion{height:100%;padding:8px}.owb-core-open #openActions{display:grid;gap:7px;padding:9px}.owb-core-open #openActions .btn{margin:0}.owb-core-recent #recentRegion{height:100%;padding:3px 5px;overflow:auto}.owb-core-recent #recentRegion>.label{margin:7px 6px 5px}.owb-core-search .search{width:100%;min-width:0;height:100%;border-radius:7px}.owb-core-button .owb-node-body{display:grid;place-items:center;padding:6px}.owb-core-button .owb-node-body>button{max-width:100%;margin:0}.owb-core-settings #settings{width:100%;height:100%;margin:0}.owb-core-filters #filterRegion{height:100%;padding:7px;overflow:auto}.owb-core-filters .filters{grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:6px;margin:6px 0 0;padding:7px}.owb-core-viewHeader #viewHeaderRegion{height:100%;padding:9px}.owb-core-viewAux #viewAuxRegion{height:100%;padding:6px;overflow:auto}.owb-core-mainList #listHost{height:100%;overflow:auto;padding:8px}.owb-core-mainList .empty{min-height:100%}
    .owb-core-detail #detail{position:relative!important;z-index:auto!important;inset:auto!important;display:flex!important;flex:1 1 auto!important;width:100%!important;height:100%!important;min-height:0!important;transform:none!important;box-shadow:none!important;border:0!important}.owb-core-detail #detail.open{transform:none!important}.owb-core-detail .detailHead{min-height:48px;padding:0 10px}.owb-core-detail .detailScroll{padding:14px 15px 20px}.owb-core-detail .detailEmpty{min-height:100%;padding:18px}
    .owb-layout-body{display:grid;place-items:center;height:100%;padding:4px;text-align:center}.owb-layout-open{width:100%;height:100%;padding:6px;color:#fff;background:var(--accent);border:0;border-radius:8px;font-size:9px;font-weight:850;white-space:nowrap}
    .owb-config{position:fixed;z-index:90;right:16px;bottom:16px;display:none;width:min(470px,calc(100vw - 24px));max-height:calc(100vh - 32px);overflow:auto;padding:15px;color:var(--text);background:var(--panel);border:1px solid var(--line);border-radius:13px;box-shadow:0 24px 70px rgba(0,0,0,.28)}.owb-config.show{display:block}.owb-config-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.owb-config h3{margin:0;font-size:13px}.owb-config-close{width:28px;height:28px;color:var(--muted);background:var(--soft);border:0;border-radius:7px}.owb-hint{margin:6px 0 12px;color:var(--muted);font-size:8px;line-height:1.55}.owb-section-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:13px 0 7px}.owb-section-row h4{margin:0;font-size:10px}.owb-auto{padding:6px 8px;color:var(--accent);background:var(--accentSoft);border:0;border-radius:6px;font-size:8px;font-weight:800}.owb-node-config{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center;padding:7px 8px;background:var(--soft);border:1px solid var(--line);border-radius:7px}.owb-node-config+.owb-node-config{margin-top:5px}.owb-node-config strong,.owb-node-config small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.owb-node-config strong{font-size:9px}.owb-node-config small{color:var(--muted2);font-size:7px}.owb-config-actions{display:flex;gap:4px}.owb-edit,.owb-remove{padding:5px 7px;border:0;border-radius:6px;font-size:8px}.owb-edit{color:var(--accent);background:var(--accentSoft)}.owb-remove{color:var(--red);background:var(--redSoft)}
    .owb-form{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px;padding-top:10px;border-top:1px solid var(--line)}.owb-field{display:grid;gap:4px;color:var(--muted);font-size:8px}.owb-field.wide{grid-column:1/-1}.owb-field input,.owb-field select{width:100%;padding:7px 8px;color:var(--text);background:var(--soft);border:1px solid var(--line);border-radius:7px;outline:0}.owb-checks{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:6px}.owb-check{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:8px}.owb-check input{accent-color:var(--accent)}.owb-task-fields,.owb-float-fields{display:contents}.owb-form-actions{grid-column:1/-1;display:flex;gap:7px}.owb-form-actions button{flex:1;padding:8px;border:0;border-radius:7px;font-size:9px;font-weight:800}.owb-save,.owb-use-mode{color:#fff;background:var(--accent)}.owb-cancel,.owb-reset{color:var(--muted);background:var(--soft)}
    .owb-mode-use{grid-template-columns:repeat(3,minmax(70px,90px)) repeat(9,minmax(0,1fr))}.owb-mode-use .owb-container>.owb-node-inner>.owb-node-head,.owb-mode-use .owb-core:not(.owb-core-task)>.owb-node-inner>.owb-node-head,.owb-mode-use .owb-core-layout>.owb-node-inner>.owb-node-head{display:none}.owb-mode-use .owb-node:not(.floating){overflow:visible;background:transparent;border:0;border-radius:0;box-shadow:none}.owb-mode-use .owb-container-body{padding:0;overflow:auto;background:transparent}.owb-mode-use .owb-container>.owb-node-inner>.owb-node-body{overflow:visible}.owb-mode-use .owb-core-task>.owb-node-inner>.owb-node-head{min-height:30px;padding:5px 8px;cursor:default}.owb-mode-use .owb-node.collapsed>.owb-node-inner>.owb-node-head{display:flex;height:100%;padding:7px 10px;border:0;border-radius:10px;cursor:pointer}.owb-mode-use .owb-resize{display:none}.owb-mode-use .owb-core-button .owb-node-body{padding:0}.owb-mode-use .owb-core-button .owb-node-body>button{width:100%;height:100%}.owb-mode-use .owb-core-layout{z-index:55}.owb-mode-use .owb-core-layout>.owb-node-inner>.owb-node-body{display:block!important}
    .owb-mode-layout .owb-node{outline:1px dashed color-mix(in srgb,var(--accent) 62%,transparent);outline-offset:-2px}.owb-mode-layout .owb-node-head{min-height:30px;padding:5px 8px;background:color-mix(in srgb,var(--accentSoft) 68%,var(--soft));border-bottom:1px solid var(--line)}.owb-mode-layout .owb-node-head strong{font-size:9px}.owb-mode-layout .owb-window:not(.owb-core-layout)>.owb-node-inner>.owb-node-body{pointer-events:none;opacity:.7}.owb-mode-layout .owb-core-layout>.owb-node-inner>.owb-node-body{pointer-events:auto;opacity:1}.owb-mode-layout .owb-node.locked{outline-style:solid}.owb-mode-layout .owb-node.locked .owb-node-kind:after{content:" · 已锁"}.owb-mode-layout .owb-resize{display:block}.owb-mode-layout .owb-node.locked .owb-resize{display:none}
    @media(max-width:760px){.owb-root{padding:7px}.owb-canvas{display:flex;flex-direction:column;gap:8px}.owb-canvas>.owb-node:not(.floating){flex:0 0 auto;min-height:360px}.owb-mode-use>[data-owb-node="container-toolbar"]{min-height:108px!important}.owb-canvas>.owb-core-layout.floating{width:88px!important;height:46px!important}.owb-container-body{display:flex;flex-direction:column;gap:7px}.owb-mode-use [data-owb-node="container-toolbar"]>.owb-node-inner>.owb-node-body>.owb-container-body{align-content:flex-start;flex-direction:row;flex-wrap:wrap}.owb-container-body>.owb-node:not(.floating){flex:0 0 auto;min-height:180px}.owb-mode-use .owb-container-body>.owb-core-button:not(.floating){flex:1 1 100%;min-height:46px}.owb-mode-use [data-owb-node="container-toolbar"] .owb-core-search{flex:1 1 240px;min-height:46px}.owb-mode-use [data-owb-node="container-toolbar"] .owb-core-searchHelp{flex:0 0 88px;min-height:46px}.owb-mode-use [data-owb-node="container-toolbar"] :is(.owb-core-back,.owb-core-theme,.owb-core-batch,.owb-core-add,.owb-core-menu){flex:0 0 46px!important;width:46px!important;min-height:46px}.owb-container-body>.owb-core-smart,.owb-container-body>.owb-core-files,.owb-container-body>.owb-core-mainList{min-height:360px}.owb-container-body>.owb-core-detail{min-height:430px}.owb-node.floating{position:fixed!important;right:8px!important;bottom:8px!important;left:auto!important;top:auto!important;max-width:calc(100vw - 16px)}.owb-node.floating:not(.collapsed){width:calc(100vw - 16px)!important;height:min(72vh,620px)!important}.owb-node.floating.collapsed{width:min(180px,46vw)!important;height:46px!important}.owb-node.floating.owb-core-layout{width:88px!important;height:46px!important}.owb-resize{display:none!important}.owb-node-head{cursor:default}.owb-year-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.owb-month-grid{min-width:620px}.owb-form{grid-template-columns:1fr}.owb-field.wide,.owb-checks,.owb-form-actions{grid-column:1}.owb-checks{grid-template-columns:1fr}.owb-config{right:8px;bottom:8px;width:calc(100vw - 16px);max-height:calc(100vh - 16px)}}
    .owb-mode-use .owb-node.nolabel:not(.collapsed)>.owb-node-inner>.owb-node-head{display:none}.owb-mode-use .owb-node.label:not(.collapsed)>.owb-node-inner>.owb-node-head{display:flex;min-height:30px;padding:5px 8px;cursor:default}.owb-mode-use .owb-node:not(.floating).owb-frame{overflow:hidden;background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow)}.owb-mode-use .owb-container-body{padding:7px}
    .owb-config-actions .owb-locate{color:var(--muted);background:var(--soft)}.owb-node-config{cursor:pointer}.owb-node-config:hover{background:color-mix(in srgb,var(--accentSoft) 45%,var(--soft))}
    @media(max-width:760px){.owb-canvas,.owb-container-body{height:auto!important;min-height:0!important}.owb-canvas .owb-node:not(.floating),.owb-container-body>.owb-node:not(.floating){position:static!important;right:auto!important;bottom:auto!important;left:auto!important;top:auto!important;width:auto!important;height:auto!important}}
    .owb-mode-layout .owb-node:not(.collapsed)>.owb-node-inner>.owb-node-head{display:none}.owb-tooltip{position:fixed;z-index:95;display:none;max-width:240px;padding:8px 10px;color:var(--text);background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.18);font-size:8px;line-height:1.55;pointer-events:none}.owb-tooltip.show{display:block}.owb-tooltip strong{display:block;margin-bottom:3px;font-size:9px}.owb-tooltip span{display:block;color:var(--muted)}
    .owb-history-item{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:6px 8px;background:var(--soft);border:1px solid var(--line);border-radius:7px}.owb-history-item+.owb-history-item{margin-top:5px}.owb-history-item strong,.owb-history-item small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.owb-history-item strong{font-size:8px}.owb-history-item small{color:var(--muted2);font-size:7px}.owb-set-default,.owb-restore,.owb-clear-history{padding:5px 7px;border:0;border-radius:6px;font-size:8px}.owb-set-default,.owb-restore{color:var(--accent);background:var(--accentSoft)}.owb-clear-history{color:var(--muted);background:var(--soft)}
  `;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function clamp(value, min, max, fallback) { const number = Math.round(Number(value)); return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback; }
  function clampFloat(value, min, max, fallback) { const number = Number(value); return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback; }
  function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")); }
  function parseDate(value) { const [y, m, d] = String(value).split("-").map(Number); return new Date(y, m - 1, d, 12); }
  function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
  function addDays(value, days) { const date = parseDate(value); date.setDate(date.getDate() + days); return dateKey(date); }
  function addMonths(value, months) { const date = parseDate(value); date.setDate(1); date.setMonth(date.getMonth() + months); return dateKey(date); }
  function startWeek(value) { const date = parseDate(value); const offset = (date.getDay() + 6) % 7; date.setDate(date.getDate() - offset); return dateKey(date); }
  function isCalendar(view) { return calendarViews.has(view); }
  function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function normalizeNode(value, index, ids) {
    const kind = value?.kind === "container" ? "container" : "window";
    let id = String(value?.id || `node-${Date.now()}-${index}`); while (ids.has(id)) id += `-${index + 1}`; ids.add(id);
    const content = kind === "window" && Object.prototype.hasOwnProperty.call(contentKinds, value?.content) ? value.content : "task";
    const w = clampFloat(value?.w, 0.5, 12, kind === "container" ? 6 : 4);
    const node = { id, kind, content, title: String(value?.title || (kind === "container" ? "容器" : contentKinds[content].label)).slice(0, 32), parent: String(value?.parent || "root"), x: clampFloat(value?.x, 0, 12 - w, 0), y: clampFloat(value?.y, 0, 240, 0), w, h: clampFloat(value?.h, 0.5, 24, kind === "container" ? 8 : 4), floating: !!value?.floating, locked: !!value?.locked, collapsible: !!value?.floating && !!value?.collapsible, autoCollapse: !!value?.floating && !!value?.collapsible && !!value?.autoCollapse, collapsed: !!value?.floating && !!value?.collapsible && !!value?.collapsed, cw: clamp(value?.cw, 1, 12, 2), ch: clamp(value?.ch, 1, 8, 1), showFrame: !!value?.showFrame, showLabel: value && Object.prototype.hasOwnProperty.call(value, "showLabel") ? !!value.showLabel : content === "task" };
    if (content === "detail") { node.floating = true; node.collapsible = true; }
    if (content === "layout") { node.floating = true; node.collapsible = false; node.autoCollapse = false; node.collapsed = false; node.w = 1; node.h = 1; node.cw = 1; node.ch = 1; }
    if (content === "task") { node.view = Object.prototype.hasOwnProperty.call(viewLabels, value?.view) ? value.view : "all"; node.query = String(value?.query || "").slice(0, 180); node.limit = clamp(value?.limit, 1, 200, 20); node.calendarCursor = validDate(value?.calendarCursor) ? value.calendarCursor : ""; }
    return node;
  }

  function normalizeConfig(value) {
    let source = defaults.nodes;
    if (value && [3, 4].includes(Number(value.schema)) && Array.isArray(value.nodes)) source = value.nodes;
    else if (value && Array.isArray(value.panels)) {
      source = clone(defaults.nodes);
      const contentId = "container-content";
      value.panels.filter((panel) => !panel.type || panel.type === "task").forEach((panel, index) => source.push({ id: `migrated-${panel.id || index}`, kind: "window", content: "task", title: panel.title || "任务窗口", parent: contentId, x: (index % 3) * 4, y: 17 + Math.floor(index / 3) * 4, w: 4, h: 4, view: panel.view, query: panel.query, limit: panel.limit }));
    }
    const ids = new Set(); const uniqueContent = new Set();
    const nodes = source.slice(0, 48).map((node, index) => normalizeNode(node, index, ids)).filter((node) => {
      if (node.kind === "container" || node.content === "task") return true;
      if (uniqueContent.has(node.content)) return false; uniqueContent.add(node.content); return true;
    });
    const containers = new Set(nodes.filter((node) => node.kind === "container").map((node) => node.id));
    nodes.forEach((node) => { if (node.kind === "container" || !containers.has(node.parent)) node.parent = "root"; });
    ["detail", "layout"].forEach((content) => {
      if (!nodes.some((node) => node.content === content)) nodes.push(normalizeNode(defaults.nodes.find((node) => node.content === content), nodes.length, ids));
    });
    return { schema: 4, mode: value?.mode === "layout" ? "layout" : "use", nodes };
  }

  function nodeSize(node) { return node.floating && node.collapsible && node.collapsed ? { w: node.cw, h: node.ch } : { w: node.w, h: node.h }; }
  function nodeLabel(node) { return node.kind === "container" ? "容器" : contentKinds[node.content]?.label || "窗口"; }

  host.register({
    manifest: { id: pluginId, name: "空白画布工作台", version: "3.3.0", type: "layout", hostApi: 2, platforms: ["windows", "android"], description: "布局模式隐藏节点标题、悬停显示注释；布局浮窗可随时拖动；支持默认布局与布局历史" },
    activate(api) {
      let config = normalizeConfig(api.getSetting("config", defaults));
      let editingId = null; let lastSummary = { selected: "", detailOpen: false };
      api.addStyle(css); document.body.classList.add("owb-blank");
      const root = api.createMount("owb-root", "workspace"); root.innerHTML = '<div class="owb-canvas"></div>';
      const canvas = root.firstElementChild;
      const drawer = api.createMount("owb-config", document.body);
      const tooltip = api.createMount("owb-tooltip", document.body);
      const coreRegions = [...new Set(Object.values(coreKinds).map((item) => item.region))];
      const save = () => api.setSetting("config", { schema: 4, mode: config.mode, nodes: config.nodes });
      const findNode = (id) => config.nodes.find((node) => node.id === id);
      const childNodes = (parent) => config.nodes.filter((node) => node.parent === parent);
      const restoreRegions = () => coreRegions.forEach((region) => api.restoreRegion(region));
      const formatNum = (value) => Number.isInteger(value) ? String(value) : value.toFixed(1);
      const pushHistory = (label = "") => {
        const history = api.getSetting("layoutHistory", []);
        history.push({ time: new Date().toLocaleString("zh-CN", { hour12: false }), label: String(label || ""), nodes: clone(config.nodes) });
        if (history.length > 30) history.splice(0, history.length - 30);
        api.setSetting("layoutHistory", history);
      };
      function showTooltip(nodeId, event) {
        const node = findNode(nodeId); if (!node) return;
        const parentTitle = node.parent === "root" ? "根画布" : (findNode(node.parent)?.title || node.parent);
        const kindText = node.kind === "container" ? "容器" : (contentKinds[node.content]?.label || node.content);
        const flags = [node.locked ? "已锁" : "", node.collapsed ? "已折叠" : "", node.floating ? "浮动" : "停靠", node.showFrame ? "显示框线" : "", node.showLabel ? "显示标题" : ""].filter(Boolean);
        tooltip.innerHTML = `<strong>${api.escapeHtml(node.title)}</strong><span>${api.escapeHtml(kindText)}${node.content === "task" && node.view ? ` · ${api.escapeHtml(viewLabels[node.view])}` : ""}</span><span>位于 ${api.escapeHtml(parentTitle)} · X${formatNum(node.x + 1)} Y${formatNum(node.y + 1)} · ${formatNum(node.w)}×${formatNum(node.h)}</span>${node.content === "task" && node.query ? `<span>${api.escapeHtml(node.query)}</span>` : ""}${flags.length ? `<span>${api.escapeHtml(flags.join(" · "))}</span>` : ""}`;
        tooltip.classList.add("show");
        const pad = 14; const rect = tooltip.getBoundingClientRect();
        let left = event.clientX + pad; let top = event.clientY + pad;
        if (left + rect.width > window.innerWidth - 8) left = event.clientX - rect.width - pad;
        if (top + rect.height > window.innerHeight - 8) top = event.clientY - rect.height - pad;
        tooltip.style.left = `${Math.max(8, left)}px`; tooltip.style.top = `${Math.max(8, top)}px`;
      }
      function hideTooltip() { tooltip.classList.remove("show"); tooltip.innerHTML = ""; }
      canvas.addEventListener("pointerover", (event) => { const nodeElement = event.target.closest?.("[data-owb-node]"); if (!nodeElement) { hideTooltip(); return; } showTooltip(nodeElement.dataset.owbNode, event); });
      canvas.addEventListener("pointerout", (event) => { if (!event.relatedTarget || !(event.relatedTarget instanceof Element) || !event.relatedTarget.closest?.("[data-owb-node]")) hideTooltip(); });

      function freePosition(size, blockers) {
        for (let y = 0; y < 240; y += 1) for (let x = 0; x <= 12 - size.w; x += 1) {
          const candidate = { x, y, w: size.w, h: size.h };
          if (!blockers.some((other) => overlaps(candidate, { ...other, ...nodeSize(other) }))) return { x, y };
        }
        return { x: 0, y: blockers.reduce((bottom, item) => Math.max(bottom, item.y + nodeSize(item).h), 0) };
      }

      function firstFree(node, parent, ignoredId = "") {
        return freePosition(nodeSize(node), childNodes(parent).filter((other) => other.id !== ignoredId && !other.floating));
      }

      function taskDate(task) { return task.deadline ? `截止 ${task.deadline}` : task.scheduled ? `计划 ${task.scheduled}` : task.closed ? `完成 ${task.closed}` : ""; }
      function tasksOn(tasks, date) { return tasks.filter((task) => (task.calendarDates || [task.deadline, task.scheduled, task.orgDate, task.closed]).filter(Boolean).includes(date)); }
      function calendarTools(node, label) {
        return `<div class="owb-calendar-tools"><strong>${api.escapeHtml(label)}</strong><button data-cal-step="-1">‹</button><button data-cal-today>今天</button><button data-cal-step="1">›</button>${["year", "month", "week", "day"].map((mode) => `<button data-cal-mode="${mode}" class="${node.view === `calendar-${mode}` ? "active" : ""}">${{year:"年",month:"月",week:"周",day:"日"}[mode]}</button>`).join("")}</div>`;
      }

      function calendarMarkup(node, tasks) {
        const cursor = validDate(node.calendarCursor) ? node.calendarCursor : api.today();
        const date = parseDate(cursor); const year = date.getFullYear(); const month = date.getMonth();
        if (node.view === "calendar-year") {
          const cards = Array.from({ length: 12 }, (_, index) => { const prefix = `${year}-${String(index + 1).padStart(2, "0")}`; const count = tasks.filter((task) => task.calendarDates?.some((item) => item.startsWith(prefix))).length; return `<button class="owb-month-card" data-cal-month="${index + 1}"><strong>${index + 1} 月</strong><span>${count} 个条目</span></button>`; }).join("");
          return `<div class="owb-calendar">${calendarTools(node, `${year} 年`)}<div class="owb-calendar-scroll"><div class="owb-year-grid">${cards}</div></div></div>`;
        }
        if (node.view === "calendar-month") {
          const first = new Date(year, month, 1, 12); const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
          const weekdays = ["一", "二", "三", "四", "五", "六", "日"].map((item) => `<span class="owb-weekday">${item}</span>`).join("");
          const cells = Array.from({ length: 42 }, (_, index) => { const current = new Date(start); current.setDate(start.getDate() + index); const key = dateKey(current); const items = tasksOn(tasks, key); return `<div class="owb-day-cell ${current.getMonth() !== month ? "outside" : ""} ${key === api.today() ? "today" : ""}"><button class="owb-day-number" data-cal-date="${key}">${current.getDate()}</button>${items.slice(0, 3).map((task) => `<button class="owb-cal-task" data-owb-task="${api.escapeHtml(task.uid)}">${api.escapeHtml(task.title)}</button>`).join("")}${items.length > 3 ? `<span class="owb-task-meta">+${items.length - 3}</span>` : ""}</div>`; }).join("");
          return `<div class="owb-calendar">${calendarTools(node, `${year} 年 ${month + 1} 月`)}<div class="owb-calendar-scroll"><div class="owb-month-grid">${weekdays}${cells}</div></div></div>`;
        }
        if (node.view === "calendar-week") {
          const start = startWeek(cursor); const days = Array.from({ length: 7 }, (_, index) => { const key = addDays(start, index); const current = parseDate(key); const items = tasksOn(tasks, key); return `<section class="owb-week-day"><strong>${current.getMonth() + 1}/${current.getDate()} 周${["日","一","二","三","四","五","六"][current.getDay()]}</strong>${items.map((task) => `<button class="owb-cal-task" data-owb-task="${api.escapeHtml(task.uid)}">${task.time ? `${api.escapeHtml(task.time)} · ` : ""}${api.escapeHtml(task.title)}</button>`).join("") || '<div class="owb-empty">无条目</div>'}</section>`; }).join("");
          return `<div class="owb-calendar">${calendarTools(node, `${start} — ${addDays(start, 6)}`)}<div class="owb-calendar-scroll"><div class="owb-week-grid">${days}</div></div></div>`;
        }
        const items = tasksOn(tasks, cursor);
        return `<div class="owb-calendar">${calendarTools(node, `${cursor} · 周${["日","一","二","三","四","五","六"][parseDate(cursor).getDay()]}`)}<div class="owb-calendar-scroll"><div class="owb-day-view">${items.map((task) => `<button class="owb-task" data-owb-task="${api.escapeHtml(task.uid)}"><span><span class="owb-task-title">${api.escapeHtml(task.title)}</span><span class="owb-task-meta">${api.escapeHtml(task.status)} · ${api.escapeHtml(task.fileName)}</span></span><span class="owb-task-date">${api.escapeHtml(task.time || taskDate(task))}</span></button>`).join("") || '<div class="owb-empty">当天没有条目</div>'}</div></div></div>`;
      }

      function taskMarkup(node) {
        const calendar = isCalendar(node.view); const tasks = api.queryTasks({ view: calendar ? "all" : node.view, query: node.query, limit: calendar ? 200 : node.limit });
        if (calendar) return calendarMarkup(node, tasks);
        return tasks.length ? `<div class="owb-task-list">${tasks.map((task) => `<button class="owb-task" data-owb-task="${api.escapeHtml(task.uid)}"><span><span class="owb-task-title">${api.escapeHtml(task.title)}</span><span class="owb-task-meta">${api.escapeHtml(task.status)} · ${api.escapeHtml(task.fileName)}</span></span><span class="owb-task-date">${api.escapeHtml(taskDate(task))}</span></button>`).join("")}</div>` : '<div class="owb-empty">没有符合条件的条目</div>';
      }

      function nodeMarkup(node) {
        const children = node.kind === "container" ? childNodes(node.id).map(nodeMarkup).join("") : "";
        const body = node.kind === "container" ? `<div class="owb-container-body">${children}</div>` : node.content === "task" ? taskMarkup(node) : node.content === "layout" ? `<div class="owb-layout-body"><button class="owb-layout-open" type="button">${config.mode === "layout" ? "使用模式" : "布局"}</button></div>` : "";
        return `<section class="owb-node ${node.kind === "container" ? "owb-container" : "owb-window"} ${node.floating ? "floating" : "docked"} ${node.locked ? "locked" : ""} ${node.collapsed ? "collapsed" : ""} ${node.showFrame ? "owb-frame" : "owb-noframe"} ${node.showLabel ? "owb-label" : "owb-nolabel"} ${node.kind === "window" ? `owb-core-${node.content}` : ""}" data-owb-node="${api.escapeHtml(node.id)}"><div class="owb-node-inner"><header class="owb-node-head"><strong>${api.escapeHtml(node.title)}</strong><span class="owb-node-kind">${api.escapeHtml(nodeLabel(node))}</span></header><div class="owb-node-body">${body}</div></div><span class="owb-resize"></span></section>`;
      }

      function geometry(element, node) {
        const size = nodeSize(node); const nested = element.parentElement?.classList.contains("owb-container-body"); const row = nested ? 48 : 64; const gap = nested ? 8 : 10; const pad = nested ? 7 : 0;
        element.style.gridColumn = ""; element.style.gridRow = ""; element.style.position = "absolute"; element.style.left = ""; element.style.top = ""; element.style.width = ""; element.style.height = "";
        if (node.floating) { element.style.left = `calc(${node.x / 12 * 100}% + 4px)`; element.style.top = `${node.y * (row + gap)}px`; element.style.width = `calc(${size.w / 12 * 100}% - 8px)`; element.style.height = `${size.h * row + Math.max(0, size.h - 1) * gap}px`; }
        else if (node.x === 0 && size.w === 12) { element.style.left = `${pad}px`; element.style.top = `${pad + node.y * (row + gap)}px`; element.style.width = `calc(100% - ${pad * 2}px)`; element.style.height = `${size.h * row + Math.max(0, size.h - 1) * gap}px`; }
        else { element.style.left = `calc(${node.x / 12 * 100}% + ${pad + gap / 2}px)`; element.style.top = `${pad + node.y * (row + gap)}px`; element.style.width = `calc(${size.w / 12 * 100}% - ${gap}px)`; element.style.height = `${size.h * row + Math.max(0, size.h - 1) * gap}px`; }
      }

      function syncCanvasSize() {
        const rootBottom = Math.max(0, ...childNodes("root").filter((node) => !node.floating).map((node) => { const size = nodeSize(node); return node.y * 74 + size.h * 64 + Math.max(0, size.h - 1) * 10; }));
        canvas.style.height = `${rootBottom}px`;
        config.nodes.filter((node) => node.kind === "container").forEach((node) => {
          const body = [...canvas.querySelectorAll("[data-owb-node]")].find((item) => item.dataset.owbNode === node.id)?.querySelector(":scope>.owb-node-inner>.owb-node-body>.owb-container-body");
          if (!body) return;
          const bottom = Math.max(0, ...childNodes(node.id).filter((child) => !child.floating).map((child) => { const size = nodeSize(child); return 7 + child.y * 56 + size.h * 48 + Math.max(0, size.h - 1) * 8; }));
          body.style.minHeight = `${bottom}px`;
        });
      }

      function collision(candidate, node) {
        if (node.floating) return false;
        return childNodes(node.parent).some((other) => other.id !== node.id && !other.floating && overlaps(candidate, { ...other, ...nodeSize(other) }));
      }

      function pointerInteraction(event, node, element, mode) {
        const allowDrag = config.mode === "layout" || (config.mode === "use" && node.content === "layout");
        if (!allowDrag || node.locked || window.matchMedia?.("(max-width:760px)").matches) return;
        if (event.button !== undefined && event.button !== 0) return; event.preventDefault();
        hideTooltip();
        const parent = element.parentElement; const nested = parent.classList.contains("owb-container-body"); const rect = parent.getBoundingClientRect(); const gap = nested ? 8 : 10; const row = nested ? 48 : 64; const columnStep = rect.width / 12; const rowStep = row + gap; const step = event.shiftKey ? 1 : 0.5; const startSize = nodeSize(node); const start = { px: event.clientX, py: event.clientY, x: node.x, y: node.y, w: startSize.w, h: startSize.h }; let changed = false;
        element.classList.add(mode === "move" ? "dragging" : "resizing");
        const move = (next) => { if (next.pointerId !== event.pointerId) return; const dx = Math.round((next.clientX - start.px) / columnStep / step) * step; const dy = Math.round((next.clientY - start.py) / rowStep / step) * step; const candidate = { x: node.x, y: node.y, w: start.w, h: start.h };
          if (mode === "move") { candidate.x = Math.max(0, Math.min(12 - start.w, start.x + dx)); candidate.y = Math.max(0, Math.min(240, start.y + dy)); }
          else { candidate.w = Math.max(0.5, Math.min(12 - node.x, start.w + dx)); candidate.h = Math.max(0.5, Math.min(24, start.h + dy)); }
          if (!collision(candidate, node)) { node.x = candidate.x; node.y = candidate.y; if (node.floating && node.collapsible && node.collapsed) { node.cw = candidate.w; node.ch = candidate.h; } else { node.w = candidate.w; node.h = candidate.h; } geometry(element, node); syncCanvasSize(); changed = true; }
        };
        const finish = (next) => { if (next.pointerId !== event.pointerId) return; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish); element.classList.remove("dragging", "resizing"); if (changed) { element.dataset.suppressClick = "1"; save(); if (drawer.classList.contains("show")) renderDrawer(); } };
        window.addEventListener("pointermove", move, { passive: false }); window.addEventListener("pointerup", finish); window.addEventListener("pointercancel", finish);
      }

      function bindCalendar(element, node) {
        element.querySelectorAll("[data-cal-step]").forEach((button) => button.onclick = () => { const cursor = validDate(node.calendarCursor) ? node.calendarCursor : api.today(); const step = Number(button.dataset.calStep); node.calendarCursor = node.view === "calendar-year" ? addMonths(cursor, step * 12) : node.view === "calendar-month" ? addMonths(cursor, step) : addDays(cursor, step * (node.view === "calendar-week" ? 7 : 1)); save(); renderWorkspace(); });
        element.querySelectorAll("[data-cal-today]").forEach((button) => button.onclick = () => { node.calendarCursor = api.today(); save(); renderWorkspace(); });
        element.querySelectorAll("[data-cal-mode]").forEach((button) => button.onclick = () => { node.view = `calendar-${button.dataset.calMode}`; save(); renderWorkspace(); });
        element.querySelectorAll("[data-cal-month]").forEach((button) => button.onclick = () => { const year = parseDate(validDate(node.calendarCursor) ? node.calendarCursor : api.today()).getFullYear(); node.calendarCursor = `${year}-${String(button.dataset.calMonth).padStart(2, "0")}-01`; node.view = "calendar-month"; save(); renderWorkspace(); });
        element.querySelectorAll("[data-cal-date]").forEach((button) => button.onclick = () => { node.calendarCursor = button.dataset.calDate; node.view = "calendar-day"; save(); renderWorkspace(); });
      }

      function bindNode(element, node) {
        geometry(element, node); const header = element.querySelector(":scope>.owb-node-inner>.owb-node-head");
        header.onpointerdown = (event) => { if (node.collapsed) { node.collapsed = false; event.stopPropagation(); save(); renderWorkspace(); } };
        element.onpointerdown = (event) => { if (node.collapsed || event.target.closest(".owb-resize")) return; const owner = event.target.closest?.("[data-owb-node]"); if (owner && owner !== element) return; pointerInteraction(event, node, element, "move"); };
        element.querySelector(":scope>.owb-resize").onpointerdown = (event) => pointerInteraction(event, node, element, "resize");
        element.ondblclick = (event) => { if (config.mode !== "layout" || node.content === "layout") return; event.preventDefault(); event.stopPropagation(); editingId = node.id; drawer.classList.add("show"); renderDrawer(); };
        element.querySelector(".owb-layout-open")?.addEventListener("click", () => { if (element.dataset.suppressClick) { delete element.dataset.suppressClick; return; } const wasLayout = config.mode === "layout"; config.mode = wasLayout ? "use" : "layout"; if (wasLayout) pushHistory(); editingId = null; drawer.classList.toggle("show", config.mode === "layout"); save(); renderWorkspace(); renderDrawer(); });
        if (node.content === "task" && isCalendar(node.view)) bindCalendar(element, node);
      }

      function renderWorkspace() {
        hideTooltip(); restoreRegions(); canvas.className = `owb-canvas owb-mode-${config.mode}`; canvas.innerHTML = childNodes("root").map(nodeMarkup).join("");
        config.nodes.forEach((node) => { const element = [...canvas.querySelectorAll("[data-owb-node]")].find((item) => item.dataset.owbNode === node.id); if (!element) return; bindNode(element, node);
          if (node.kind === "window" && coreKinds[node.content]) { element.classList.add("owb-core"); if (coreKinds[node.content].button) element.classList.add("owb-core-button"); const body = element.querySelector(":scope>.owb-node-inner>.owb-node-body"); try { api.moveRegion(coreKinds[node.content].region, body); } catch (error) { body.innerHTML = `<div class="owb-empty">${api.escapeHtml(error?.message || String(error))}</div>`; } }
        });
        canvas.querySelectorAll("[data-owb-task]").forEach((button) => button.onclick = () => api.openTask(button.dataset.owbTask));
        syncCanvasSize();
      }

      function arrange() {
        const parents = ["root", ...config.nodes.filter((node) => node.kind === "container").map((node) => node.id)];
        parents.forEach((parent) => { const moving = childNodes(parent).filter((node) => !node.floating && !node.locked); const occupied = childNodes(parent).filter((node) => !node.floating && node.locked); const perRow = moving.length === 1 ? 1 : moving.length === 2 ? 2 : moving.length === 3 ? 3 : 4; const width = 12 / perRow; moving.forEach((node) => { node.w = width; const position = freePosition(nodeSize(node), occupied); node.x = position.x; node.y = position.y; occupied.push(node); }); });
        save(); renderWorkspace(); renderDrawer();
      }

      function nodeDescription(node) { const position = `${node.floating ? "浮动" : "停靠"} · X${formatNum(node.x + 1)} Y${formatNum(node.y + 1)} · ${formatNum(node.w)}×${formatNum(node.h)}`; return node.kind === "container" ? position : `${contentKinds[node.content]?.label || node.content}${node.content === "task" ? ` · ${viewLabels[node.view]}${node.query ? ` · ${node.query}` : ""}` : ""} · ${position}`; }

      let locateTimer = null;
      function locateNode(id) {
        const element = [...canvas.querySelectorAll("[data-owb-node]")].find((item) => item.dataset.owbNode === id);
        if (!element) return;
        canvas.classList.add("owb-locating");
        canvas.querySelectorAll(".owb-node-highlight").forEach((item) => item.classList.remove("owb-node-highlight"));
        element.classList.add("owb-node-highlight");
        element.scrollIntoView?.({ behavior: "smooth", block: "center", inline: "center" });
        clearTimeout(locateTimer);
        locateTimer = setTimeout(() => { canvas.classList.remove("owb-locating"); canvas.querySelectorAll(".owb-node-highlight").forEach((item) => item.classList.remove("owb-node-highlight")); }, 2200);
      }

      function renderDrawer() {
        const editing = findNode(editingId); if (editingId && !editing) editingId = null;
        const active = editing || null; const containers = config.nodes.filter((node) => node.kind === "container");
        const history = api.getSetting("layoutHistory", []);
        const list = config.nodes.map((node) => `<div class="owb-node-config" data-locate="${api.escapeHtml(node.id)}"><span><strong>${api.escapeHtml(node.title)}${node.locked ? " · 已锁" : ""}${node.collapsed ? " · 已折叠" : ""}</strong><small>${api.escapeHtml(nodeDescription(node))}${node.parent !== "root" ? ` · 位于 ${api.escapeHtml(findNode(node.parent)?.title || node.parent)}` : ""}</small></span><span class="owb-config-actions"><button class="owb-locate" data-locate="${api.escapeHtml(node.id)}">定位</button><button class="owb-edit" data-edit="${api.escapeHtml(node.id)}">编辑</button>${["detail", "layout"].includes(node.content) ? "" : `<button class="owb-remove" data-remove="${api.escapeHtml(node.id)}">删除</button>`}</span></div>`).join("");
        const historyItems = history.length ? history.map((entry, index) => `<div class="owb-history-item"><span><strong>${api.escapeHtml(entry.time)}${entry.label ? ` · ${api.escapeHtml(entry.label)}` : ""}</strong><small>${entry.nodes.length} 个节点</small></span><button class="owb-restore" data-history="${index}">恢复</button></div>`).join("") : '<div class="owb-empty">还没有布局历史</div>';
        drawer.innerHTML = `<div class="owb-config-head"><h3>空白画布布局</h3><span class="owb-config-actions"><button class="owb-reset" type="button">恢复原始布局</button><button class="owb-use-mode" type="button">使用模式</button><button class="owb-config-close" aria-label="关闭布局设置">×</button></span></div><p class="owb-hint">当前是布局模式：拖动或缩放未锁定节点（默认按半格微调，按住 Shift 吸附整格；从节点任意处拖动），双击任意节点直接打开它的编辑表单；鼠标划过节点会弹出注释，点击下方节点行可在画布中定位高亮。表单中可为每个节点选择使用模式是否保留框线与标题；布局浮窗在使用模式也可以随时拖动。完成后点击“使用模式”，页面只保留真正的功能内容。</p><div class="owb-section-row"><h4>节点</h4><button class="owb-auto" type="button">自动排列未锁定停靠项</button></div><div>${list}</div>
          <div class="owb-section-row"><h4>默认布局与历史</h4><span class="owb-config-actions"><button class="owb-set-default" type="button">设为默认布局</button><button class="owb-clear-history" type="button">清空历史</button></span></div><div class="owb-history">${historyItems}</div>
          <div class="owb-form"><label class="owb-field"><span>节点类型</span><select id="owbKind"><option value="window">窗口</option><option value="container">容器</option></select></label><label class="owb-field owb-content-field"><span>窗口内容</span><select id="owbContent">${Object.entries(contentKinds).map(([value, item]) => `<option value="${value}">${item.label}</option>`).join("")}</select></label><label class="owb-field"><span>名称</span><input id="owbTitle"></label><label class="owb-field owb-parent-field"><span>放入容器</span><select id="owbParent"><option value="root">根画布</option>${containers.map((node) => `<option value="${api.escapeHtml(node.id)}">${api.escapeHtml(node.title)}</option>`).join("")}</select></label>
          <label class="owb-field"><span>X（0.5–12.5）</span><input id="owbX" type="number" min="0.5" max="12.5" step="0.5"></label><label class="owb-field"><span>Y（0.5 起）</span><input id="owbY" type="number" min="0.5" max="241" step="0.5"></label><label class="owb-field"><span>展开宽度（0.5–12）</span><input id="owbW" type="number" min="0.5" max="12" step="0.5"></label><label class="owb-field"><span>展开高度</span><input id="owbH" type="number" min="0.5" max="24" step="0.5"></label>
          <div class="owb-checks"><label class="owb-check"><input id="owbFloating" type="checkbox">浮动（允许重叠）</label><label class="owb-check"><input id="owbLocked" type="checkbox">锁定位置</label><label class="owb-check"><input id="owbCollapsible" type="checkbox">启用折叠尺寸</label><label class="owb-check"><input id="owbAutoCollapse" type="checkbox">点击外部自动折叠</label><label class="owb-check"><input id="owbShowFrame" type="checkbox">显示框线（使用模式）</label><label class="owb-check"><input id="owbShowLabel" type="checkbox">显示标题说明（使用模式）</label></div><span class="owb-float-fields"><label class="owb-field"><span>折叠宽度</span><input id="owbCW" type="number" min="1" max="12"></label><label class="owb-field"><span>折叠高度</span><input id="owbCH" type="number" min="1" max="8"></label></span>
          <span class="owb-task-fields"><label class="owb-field"><span>任务基础视图</span><select id="owbView">${Object.entries(viewLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label><label class="owb-field"><span>最多显示</span><input id="owbLimit" type="number" min="1" max="200"></label><label class="owb-field wide"><span>附加搜索条件</span><input id="owbQuery" placeholder="例如：status:TODO tag:工作"></label></span>
          <div class="owb-form-actions"><button class="owb-cancel" id="owbCancel" ${active ? "" : "hidden"}>取消修改</button><button class="owb-save" id="owbSave">${active ? "保存修改" : "添加节点"}</button></div></div>`;
        const $ = (selector) => drawer.querySelector(selector); $(".owb-config-close").onclick = () => drawer.classList.remove("show"); $(".owb-use-mode").onclick = () => { if (config.mode === "layout") pushHistory(); config.mode = "use"; editingId = null; drawer.classList.remove("show"); save(); renderWorkspace(); }; $(".owb-reset").onclick = () => { const savedDefault = api.getSetting("defaultLayout", null); const target = savedDefault ? savedDefault.nodes : defaults.nodes; if (!window.confirm(`恢复为${savedDefault ? "你保存的默认布局" : "未启用插件时的默认侧栏、顶栏和主清单排布"}？当前布局位置会被替换。`)) return; config = normalizeConfig({ schema: 4, mode: "layout", nodes: target }); editingId = null; save(); renderWorkspace(); renderDrawer(); }; $(".owb-auto").onclick = arrange;
        $(".owb-set-default").onclick = () => { api.setSetting("defaultLayout", { nodes: clone(config.nodes) }); api.setNotice("已把当前布局保存为默认布局。"); renderDrawer(); };
        $(".owb-clear-history").onclick = () => { api.setSetting("layoutHistory", []); renderDrawer(); };
        drawer.querySelectorAll(".owb-restore").forEach((button) => button.onclick = (event) => { event.stopPropagation(); const entry = history[Number(button.dataset.history)]; if (!entry) return; config = normalizeConfig({ schema: 4, mode: "layout", nodes: entry.nodes }); editingId = null; save(); renderWorkspace(); renderDrawer(); api.setNotice(`已恢复 ${entry.time} 的布局。`); });
        const kind = $("#owbKind"), content = $("#owbContent"), floating = $("#owbFloating"), collapsible = $("#owbCollapsible");
        kind.value = active?.kind || "window"; kind.disabled = !!active; content.value = active?.content || "task"; $("#owbTitle").value = active?.title || ""; $("#owbParent").value = active?.parent || "root"; $("#owbX").value = String((active?.x ?? 0) + 1); $("#owbY").value = String((active?.y ?? 0) + 1); $("#owbW").value = String(active?.w || 4); $("#owbH").value = String(active?.h || 4); floating.checked = !!active?.floating; $("#owbLocked").checked = !!active?.locked; collapsible.checked = !!active?.collapsible; $("#owbAutoCollapse").checked = !!active?.autoCollapse; $("#owbCW").value = String(active?.cw || 2); $("#owbCH").value = String(active?.ch || 1); $("#owbView").value = active?.view || "all"; $("#owbLimit").value = String(active?.limit || 20); $("#owbQuery").value = active?.query || ""; $("#owbShowFrame").checked = !!active?.showFrame; $("#owbShowLabel").checked = active ? !!active.showLabel : content.value === "task";
        const sync = () => { const windowMode = kind.value === "window"; $(".owb-content-field").style.display = windowMode ? "grid" : "none"; $(".owb-parent-field").style.display = windowMode ? "grid" : "none"; drawer.querySelectorAll(".owb-task-fields").forEach((item) => item.style.display = windowMode && content.value === "task" ? "contents" : "none"); drawer.querySelectorAll(".owb-float-fields").forEach((item) => item.style.display = floating.checked && collapsible.checked ? "contents" : "none"); $("#owbCollapsible").disabled = !floating.checked; $("#owbAutoCollapse").disabled = !floating.checked || !collapsible.checked; $("#owbShowFrame").disabled = floating.checked; };
        sync(); kind.onchange = sync; content.onchange = () => { if (!$("#owbTitle").value.trim()) $("#owbTitle").value = contentKinds[content.value].label; if (!active) $("#owbShowLabel").checked = content.value === "task"; sync(); }; floating.onchange = sync; collapsible.onchange = sync;
        drawer.querySelectorAll(".owb-node-config[data-locate]").forEach((row) => row.onclick = (event) => { if (event.target.closest("button")) return; locateNode(row.dataset.locate); });
        drawer.querySelectorAll(".owb-locate").forEach((button) => button.onclick = (event) => { event.stopPropagation(); locateNode(button.dataset.locate); });
        drawer.querySelectorAll("[data-edit]").forEach((button) => button.onclick = (event) => { event.stopPropagation(); locateNode(button.dataset.edit); editingId = button.dataset.edit; renderDrawer(); });
        drawer.querySelectorAll("[data-remove]").forEach((button) => button.onclick = (event) => { event.stopPropagation(); const removed = findNode(button.dataset.remove); if (!removed) return; if (removed.kind === "container") config.nodes.forEach((node) => { if (node.parent === removed.id) node.parent = "root"; }); config.nodes = config.nodes.filter((node) => node.id !== removed.id); editingId = null; save(); renderWorkspace(); renderDrawer(); });
        $("#owbCancel").onclick = () => { editingId = null; renderDrawer(); };
        $("#owbSave").onclick = () => { const nodeKind = kind.value; const nodeContent = nodeKind === "window" ? content.value : ""; if (nodeContent !== "task" && config.nodes.some((node) => node.content === nodeContent && node.id !== editingId)) { api.setNotice(`“${contentKinds[nodeContent].label}”只能添加一个。`); return; } if (!editingId && config.nodes.length >= 48) { api.setNotice("最多创建 48 个节点。"); return; }
          const existing = findNode(editingId); const parent = nodeKind === "container" ? "root" : $("#owbParent").value; const values = { kind: nodeKind, content: nodeContent, title: ($("#owbTitle").value.trim() || (nodeKind === "container" ? "容器" : contentKinds[nodeContent].label)).slice(0, 32), parent, x: clampFloat(Number($("#owbX").value) - 1, 0, 11.5, 0), y: clampFloat(Number($("#owbY").value) - 1, 0, 240, 0), w: clampFloat($("#owbW").value, 0.5, 12, 4), h: clampFloat($("#owbH").value, 0.5, 24, 4), floating: floating.checked, locked: $("#owbLocked").checked, collapsible: floating.checked && collapsible.checked, autoCollapse: floating.checked && collapsible.checked && $("#owbAutoCollapse").checked, cw: clamp($("#owbCW").value, 1, 12, 2), ch: clamp($("#owbCH").value, 1, 8, 1), showFrame: floating.checked || $("#owbShowFrame").checked, showLabel: $("#owbShowLabel").checked };
          values.x = Math.min(values.x, 12 - values.w); if (nodeContent === "detail") { values.floating = true; values.collapsible = true; }
          if (nodeContent === "task") { values.view = $("#owbView").value; values.limit = clamp($("#owbLimit").value, 1, 200, 20); values.query = $("#owbQuery").value.trim().slice(0, 180); values.calendarCursor = existing?.calendarCursor || api.today(); }
          if (existing) Object.assign(existing, values); else { const node = { id: `node-${Date.now()}`, collapsed: false, ...values }; if (!node.floating) { const position = firstFree(node, parent); node.x = position.x; node.y = position.y; } config.nodes.push(node); }
          editingId = null; save(); renderWorkspace(); renderDrawer(); };
      }

      const outsideCollapse = (event) => { if (config.mode !== "use") return; const owner = event.target.closest?.("[data-owb-node]")?.dataset?.owbNode; const closing = config.nodes.filter((node) => node.floating && node.collapsible && node.autoCollapse && !node.collapsed && node.id !== owner); if (closing.length) { closing.forEach((node) => { node.collapsed = true; const element = [...canvas.querySelectorAll("[data-owb-node]")].find((item) => item.dataset.owbNode === node.id); if (element) { element.classList.add("collapsed"); geometry(element, node); } }); syncCanvasSize(); save(); if (drawer.classList.contains("show")) renderDrawer(); } };
      document.addEventListener("pointerdown", outsideCollapse);
      api.onUpdate((summary) => { lastSummary = summary; renderWorkspace(); });
      renderWorkspace(); renderDrawer();
      return { deactivate() { clearTimeout(locateTimer); document.removeEventListener("pointerdown", outsideCollapse); restoreRegions(); document.body.classList.remove("owb-blank"); } };
    },
  });
})();
