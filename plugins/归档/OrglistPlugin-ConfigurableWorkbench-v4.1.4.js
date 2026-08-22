/* @orglist-plugin {"id":"orglist.configurable-workbench","name":"空白画布工作台","version":"4.1.4","type":"layout","hostApi":2} */
(function () {
  "use strict";

  const host = window.OrglistPluginHost;
  if (!host || host.apiVersion !== 2) throw new Error("空白画布工作台需要 Orglist 插件 API 2");

  const pluginId = "orglist.configurable-workbench";
  const viewLabels = {
    all: "全部条目", open: "未完成", today: "今天", upcoming: "未来", overdue: "已逾期",
    completed: "已完成", "no-date": "无日期", habits: "习惯", countdown: "倒计时", statistics: "统计", quadrant: "四象限",
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
  const contentKinds = { task: { label: "任务/日历窗口" }, layout: { label: "布局控制" }, button: { label: "按钮节点" }, decor: { label: "装饰文字/图案" }, ...coreKinds };
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
    :where(.owb-canvas) button{font:inherit;color:inherit;background:transparent;border:0;padding:0;text-align:inherit;cursor:pointer}
    body.owb-blank .app{min-height:100vh}body.owb-blank #sidebar,body.owb-blank .workspace>.topbar,body.owb-blank .workspace>.content{display:none!important}body.owb-blank .workspace{display:flex;height:100vh;min-height:0;background:var(--bg)}
    .owb-root{flex:1;min-width:0;height:100vh;padding:10px;overflow:auto}.owb-canvas,.owb-container-body{position:relative}.owb-canvas{min-height:100%}.owb-container-body{flex:1;min-height:0;padding:7px;overflow:auto;background:color-mix(in srgb,var(--soft) 55%,transparent)}
    .owb-node{position:relative;display:flex;min-width:0;min-height:0;overflow:hidden;background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow)}.owb-node.floating{position:absolute;z-index:45;box-shadow:0 22px 60px rgba(0,0,0,.22)}.owb-node.dragging,.owb-node.resizing{z-index:60;border-color:var(--accent);opacity:.93}.owb-node.locked{border-color:color-mix(in srgb,var(--accent) 32%,var(--line))}
    .owb-locating .owb-node{opacity:.35;transition:opacity .18s}.owb-locating .owb-node.owb-node-highlight{opacity:1}.owb-node-highlight{outline:3px solid var(--accent)!important;outline-offset:3px;box-shadow:0 0 0 8px color-mix(in srgb,var(--accent) 20%,transparent),0 22px 60px rgba(0,0,0,.28)!important;z-index:80!important;animation:owb-pulse 1.2s ease 2}@keyframes owb-pulse{0%,100%{outline-color:var(--accent)}50%{outline-color:color-mix(in srgb,var(--accent) 45%,transparent)}}
    .owb-node-inner{display:flex;flex:1;min-width:0;min-height:0;flex-direction:column}.owb-node-head{display:flex;flex:0 0 auto;align-items:center;gap:6px;min-height:38px;padding:7px 8px 7px 11px;background:var(--soft);border-bottom:1px solid var(--line);cursor:grab;touch-action:none;user-select:none}.owb-node-head strong{flex:1;min-width:0;overflow:hidden;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.owb-node-kind{color:var(--muted2);font-size:7px;font-weight:800;white-space:nowrap}
    .owb-node-body{flex:1;min-width:0;min-height:0;overflow:auto}.owb-node.collapsed .owb-node-body{display:none}.owb-node.collapsed .owb-node-head{height:100%;border-bottom:0;cursor:pointer}.owb-resize{position:absolute;z-index:5;right:0;bottom:0;width:20px;height:20px;cursor:nwse-resize;touch-action:none}.owb-resize:after{position:absolute;right:4px;bottom:4px;width:8px;height:8px;border-right:2px solid var(--accent);border-bottom:2px solid var(--accent);content:""}.owb-node.locked .owb-resize{display:none}
    .owb-container>.owb-node-inner>.owb-node-head{background:color-mix(in srgb,var(--accentSoft) 64%,var(--soft))}.owb-container>.owb-node-inner>.owb-node-head strong{color:var(--accent)}
    .owb-task-list{height:100%;overflow:auto}.owb-task{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;width:100%;padding:9px 11px;color:var(--text);background:transparent;border:0;border-bottom:1px solid var(--line);text-align:left}.owb-task:hover{background:var(--accentSoft)}.owb-task-title{display:block;overflow:hidden;font-size:10px;font-weight:750;text-overflow:ellipsis;white-space:nowrap}.owb-task-meta{display:block;margin-top:3px;color:var(--muted);font-size:8px}.owb-task-date{align-self:center;color:var(--accent);font-size:8px;white-space:nowrap}.owb-empty{display:grid;place-items:center;min-height:100%;padding:18px;color:var(--muted2);font-size:9px;text-align:center}
    .owb-countdown-list .owb-task{min-height:54px}.owb-countdown-list.compact .owb-task{min-height:42px;padding-top:6px;padding-bottom:6px}.owb-countdown-list.compact .owb-task-meta{display:none}.owb-countdown-badge,.owb-countdown-list .owb-task-date{padding:4px 6px;color:var(--blue);background:var(--blueSoft);border-radius:6px;font-size:9px;font-weight:850}.owb-task[data-countdown-tone="today"] .owb-countdown-badge,.owb-countdown-list .owb-task[data-countdown-tone="today"] .owb-task-date{color:#fff;background:var(--accent)}.owb-task[data-countdown-tone="urgent"] .owb-countdown-badge,.owb-task[data-countdown-tone="expired"] .owb-countdown-badge,.owb-countdown-list .owb-task[data-countdown-tone="urgent"] .owb-task-date,.owb-countdown-list .owb-task[data-countdown-tone="expired"] .owb-task-date{color:var(--red);background:var(--redSoft)}
    .owb-statistics{height:100%;overflow:auto;padding:8px}.owb-stat-tools{display:flex;align-items:center;gap:5px;margin-bottom:8px}.owb-stat-tools strong{margin-right:auto;font-size:10px}.owb-stat-tools button,.owb-stat-tools select,.owb-stat-category-type{padding:5px 7px;color:var(--muted);background:var(--soft);border:1px solid var(--line);border-radius:6px;font-size:8px}.owb-stat-tools button.active{color:#fff;background:var(--accent)}.owb-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.owb-stat-card{min-width:0;padding:9px;background:var(--soft);border:1px solid var(--line);border-radius:8px}.owb-stat-card span,.owb-stat-card small{display:block}.owb-stat-card span{font-size:18px;font-weight:900}.owb-stat-card small{margin-top:2px;color:var(--muted);font-size:7px;line-height:1.45}.owb-stat-section{margin-top:8px;padding:9px;background:var(--soft);border:1px solid var(--line);border-radius:8px}.owb-stat-section h4{margin:0 0 8px;font-size:9px}.owb-stat-section-head{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:8px}.owb-stat-section-head h4{margin:0}.owb-stat-trend{display:flex;align-items:flex-end;gap:4px;height:96px;overflow-x:auto}.owb-stat-column{display:flex;flex:1 0 18px;height:100%;min-width:18px;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px}.owb-stat-bar{width:70%;min-height:2px;background:var(--accent);border-radius:4px 4px 1px 1px}.owb-stat-label,.owb-stat-number{color:var(--muted2);font-size:6px}.owb-stat-categories{display:grid;gap:5px}.owb-stat-category{display:grid;grid-template-columns:minmax(54px,100px) 1fr 28px;align-items:center;gap:6px;font-size:7px}.owb-stat-category>span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.owb-stat-track{height:6px;background:var(--panel);border-radius:99px;overflow:hidden}.owb-stat-fill{display:block;height:100%;background:var(--green);border-radius:99px}.owb-stat-note{margin-top:7px;color:var(--muted2);font-size:7px;line-height:1.45}
    .owb-stat-heatmap{display:grid;grid-template-columns:repeat(53,minmax(4px,1fr));gap:2px;min-width:320px}.owb-stat-heat{aspect-ratio:1;background:var(--line);border-radius:2px}.owb-stat-heat.l1{background:color-mix(in srgb,var(--green) 28%,var(--soft))}.owb-stat-heat.l2{background:color-mix(in srgb,var(--green) 50%,var(--soft))}.owb-stat-heat.l3{background:color-mix(in srgb,var(--green) 72%,var(--soft))}.owb-stat-heat.l4{background:var(--green)}
    .owb-calendar{display:flex;height:100%;min-height:0;flex-direction:column}.owb-calendar-tools{display:flex;align-items:center;flex-wrap:wrap;gap:5px;padding:7px 8px;border-bottom:1px solid var(--line)}.owb-calendar-tools strong{margin-right:auto;font-size:10px}.owb-calendar-tools button{padding:5px 7px;color:var(--muted);background:var(--soft);border:1px solid var(--line);border-radius:6px;font-size:8px}.owb-calendar-tools button.active{color:#fff;background:var(--accent)}.owb-calendar-scroll{flex:1;min-height:0;overflow:auto;padding:8px}.owb-month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.owb-weekday{padding:4px;color:var(--muted2);font-size:7px;text-align:center}.owb-day-cell{min-height:76px;padding:5px;background:var(--soft);border:1px solid var(--line);border-radius:6px}.owb-day-cell.outside{opacity:.45}.owb-day-cell.today{border-color:var(--accent)}.owb-day-number{display:block;margin-bottom:4px;color:var(--muted);font-size:8px;font-weight:800}.owb-cal-task{display:block;width:100%;margin:2px 0;padding:3px 4px;overflow:hidden;color:var(--text);background:var(--panel);border:0;border-radius:4px;font-size:7px;text-align:left;text-overflow:ellipsis;white-space:nowrap}.owb-year-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.owb-month-card{min-height:90px;padding:9px;color:var(--text);background:var(--soft);border:1px solid var(--line);border-radius:8px;text-align:left}.owb-month-card strong,.owb-month-card span{display:block}.owb-month-card span{margin-top:8px;color:var(--muted);font-size:8px}.owb-week-grid{display:grid;grid-template-columns:repeat(7,minmax(120px,1fr));gap:6px;min-width:760px}.owb-week-day{min-height:220px;padding:7px;background:var(--soft);border:1px solid var(--line);border-radius:7px}.owb-day-view{display:grid;gap:5px}.owb-day-view h4{margin:0 0 5px;font-size:11px}
    .owb-core .sideSection{height:100%;padding:3px 5px 8px;overflow:auto;border:0}.owb-core .sideSection .label{margin:7px 6px 5px}.owb-core .customLists,.owb-core .files,.owb-core .history{max-height:none}.owb-core-brand #brandRegion{height:100%;padding:8px}.owb-core-open #openActions{display:grid;gap:7px;padding:9px}.owb-core-open #openActions .btn{margin:0}.owb-core-recent #recentRegion{height:100%;padding:3px 5px;overflow:auto}.owb-core-recent #recentRegion>.label{margin:7px 6px 5px}.owb-core-search .search{width:100%;min-width:0;height:100%;border-radius:7px}.owb-core-button .owb-node-body{display:grid;place-items:center;padding:6px}.owb-core-button .owb-node-body>button{max-width:100%;margin:0}.owb-core-settings #settings{width:100%;height:100%;margin:0}.owb-core-filters #filterRegion{height:100%;padding:7px;overflow:auto}.owb-core-filters .filters{grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:6px;margin:6px 0 0;padding:7px}.owb-core-viewHeader #viewHeaderRegion{height:100%;padding:9px}.owb-core-viewAux #viewAuxRegion{height:100%;padding:6px;overflow:auto}.owb-core-mainList #listHost{height:100%;overflow:auto;padding:8px}.owb-core-mainList .empty{min-height:100%}
    .owb-core-detail #detail{position:relative!important;z-index:auto!important;inset:auto!important;display:flex!important;flex:1 1 auto!important;width:100%!important;height:100%!important;min-height:0!important;transform:none!important;box-shadow:none!important;border:0!important}.owb-core-detail #detail.open{transform:none!important}.owb-core-detail .detailHead{min-height:48px;padding:0 10px}.owb-core-detail .detailScroll{padding:14px 15px 20px}.owb-core-detail .detailEmpty{min-height:100%;padding:18px}
    .owb-layout-body{display:grid;place-items:center;height:100%;padding:4px;text-align:center}.owb-layout-open{width:100%;height:100%;padding:6px;color:#fff;background:var(--accent);border:0;border-radius:8px;font-size:9px;font-weight:850;white-space:nowrap}
    .owb-config{position:fixed;z-index:90;right:16px;bottom:16px;display:none;width:min(470px,calc(100vw - 24px));max-height:calc(100vh - 32px);overflow:auto;padding:15px;color:var(--text);background:var(--panel);border:1px solid var(--line);border-radius:13px;box-shadow:0 24px 70px rgba(0,0,0,.28)}.owb-config.show{display:block}.owb-config-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.owb-config h3{margin:0;font-size:13px}.owb-config-close{width:28px;height:28px;color:var(--muted);background:var(--soft);border:0;border-radius:7px}.owb-hint{margin:6px 0 12px;color:var(--muted);font-size:8px;line-height:1.55}.owb-section-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:13px 0 7px}.owb-section-row h4{margin:0;font-size:10px}.owb-auto{padding:6px 8px;color:var(--accent);background:var(--accentSoft);border:0;border-radius:6px;font-size:8px;font-weight:800}.owb-node-config{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center;padding:7px 8px;background:var(--soft);border:1px solid var(--line);border-radius:7px}.owb-node-config+.owb-node-config{margin-top:5px}.owb-node-config strong,.owb-node-config small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.owb-node-config strong{font-size:9px}.owb-node-config small{color:var(--muted2);font-size:7px}.owb-config-actions{display:flex;gap:4px}.owb-edit,.owb-remove{padding:5px 7px;border:0;border-radius:6px;font-size:8px}.owb-edit{color:var(--accent);background:var(--accentSoft)}.owb-remove{color:var(--red);background:var(--redSoft)}
    .owb-form{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px;padding-top:10px;border-top:1px solid var(--line)}.owb-field{display:grid;gap:4px;color:var(--muted);font-size:8px}.owb-field.wide{grid-column:1/-1}.owb-field input,.owb-field select{width:100%;padding:7px 8px;color:var(--text);background:var(--soft);border:1px solid var(--line);border-radius:7px;outline:0}.owb-checks{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:6px}.owb-check{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:8px}.owb-check input{accent-color:var(--accent)}.owb-task-fields,.owb-float-fields{display:contents}.owb-form-actions{grid-column:1/-1;display:flex;gap:7px}.owb-form-actions button{flex:1;padding:8px;border:0;border-radius:7px;font-size:9px;font-weight:800}.owb-save,.owb-use-mode{color:#fff;background:var(--accent)}.owb-cancel,.owb-reset{color:var(--muted);background:var(--soft)}
    .owb-app-settings{display:grid;gap:8px}.owb-app-setting-group{padding:9px;background:var(--soft);border:1px solid var(--line);border-radius:8px}.owb-app-setting-group h5{margin:0 0 7px;font-size:9px}.owb-app-setting-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.owb-app-setting{display:grid;gap:4px;color:var(--muted);font-size:8px}.owb-app-setting input,.owb-app-setting select{width:100%;padding:7px 8px;color:var(--text);background:var(--panel);border:1px solid var(--line);border-radius:7px;outline:0}.owb-app-setting small{color:var(--muted2);line-height:1.45}.owb-app-setting-wide{grid-column:1/-1}
    .owb-mode-use{grid-template-columns:repeat(3,minmax(70px,90px)) repeat(9,minmax(0,1fr))}.owb-mode-use .owb-container>.owb-node-inner>.owb-node-head,.owb-mode-use .owb-core:not(.owb-core-task)>.owb-node-inner>.owb-node-head,.owb-mode-use .owb-core-layout>.owb-node-inner>.owb-node-head{display:none}.owb-mode-use .owb-node:not(.floating){overflow:visible;background:transparent;border:0;border-radius:0;box-shadow:none}.owb-mode-use .owb-container-body{padding:0;overflow:auto;background:transparent}.owb-mode-use .owb-container>.owb-node-inner>.owb-node-body{overflow:visible}.owb-mode-use .owb-core-task>.owb-node-inner>.owb-node-head{min-height:30px;padding:5px 8px;cursor:default}.owb-mode-use .owb-node.collapsed>.owb-node-inner>.owb-node-head{display:flex;height:100%;padding:7px 10px;border:0;border-radius:10px;cursor:pointer}.owb-mode-use .owb-resize{display:none}.owb-mode-use .owb-core-button .owb-node-body{padding:0}.owb-mode-use .owb-core-button .owb-node-body>button{width:100%;height:100%}.owb-mode-use .owb-core-layout{z-index:55}.owb-mode-use .owb-core-layout>.owb-node-inner>.owb-node-body{display:block!important}
    .owb-mode-layout .owb-node{outline:1px dashed color-mix(in srgb,var(--accent) 62%,transparent);outline-offset:-2px;touch-action:none}.owb-mode-layout .owb-node-head{min-height:30px;padding:5px 8px;background:color-mix(in srgb,var(--accentSoft) 68%,var(--soft));border-bottom:1px solid var(--line)}.owb-mode-layout .owb-node-head strong{font-size:9px}.owb-mode-layout .owb-window:not(.owb-core-layout)>.owb-node-inner>.owb-node-body{pointer-events:none;opacity:.7}.owb-mode-layout .owb-core-layout>.owb-node-inner>.owb-node-body{pointer-events:auto;opacity:1}.owb-mode-layout .owb-node.locked{outline-style:solid}.owb-mode-layout .owb-node.locked .owb-node-kind:after{content:" · 已锁"}.owb-mode-layout .owb-resize{display:block}.owb-mode-layout .owb-node.locked .owb-resize{display:none}
    @media(max-width:760px){.owb-root{padding:7px}.owb-mode-use .owb-node-head{cursor:default}.owb-year-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.owb-month-grid{min-width:620px}.owb-form{grid-template-columns:1fr}.owb-field.wide,.owb-checks,.owb-form-actions{grid-column:1}.owb-checks{grid-template-columns:1fr}.owb-config{right:8px;bottom:8px;width:calc(100vw - 16px);max-height:calc(100vh - 16px)}}
    .owb-mode-use .owb-node.nolabel:not(.collapsed)>.owb-node-inner>.owb-node-head{display:none}.owb-mode-use .owb-node.label:not(.collapsed)>.owb-node-inner>.owb-node-head{display:flex;min-height:30px;padding:5px 8px;cursor:default}.owb-mode-use .owb-node:not(.floating).owb-frame{overflow:hidden;background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow)}.owb-mode-use .owb-container-body{padding:7px}
    .owb-config-actions .owb-locate{color:var(--muted);background:var(--soft)}.owb-node-config{cursor:pointer}.owb-node-config:hover{background:color-mix(in srgb,var(--accentSoft) 45%,var(--soft))}
    .owb-mode-layout .owb-node:not(.collapsed)>.owb-node-inner>.owb-node-head{display:none}.owb-tooltip{position:fixed;z-index:95;display:none;max-width:240px;padding:8px 10px;color:var(--text);background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.18);font-size:8px;line-height:1.55;pointer-events:none}.owb-tooltip.show{display:block}.owb-tooltip strong{display:block;margin-bottom:3px;font-size:9px}.owb-tooltip span{display:block;color:var(--muted)}
    .owb-history-item{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:6px 8px;background:var(--soft);border:1px solid var(--line);border-radius:7px}.owb-history-item+.owb-history-item{margin-top:5px}.owb-history-item strong,.owb-history-item small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.owb-history-item strong{font-size:8px}.owb-history-item small{color:var(--muted2);font-size:7px}.owb-set-default,.owb-restore,.owb-clear-history{padding:5px 7px;border:0;border-radius:6px;font-size:8px}.owb-set-default,.owb-restore{color:var(--accent);background:var(--accentSoft)}.owb-clear-history{color:var(--muted);background:var(--soft)}
    .owb-history-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:8px;padding:7px 9px;color:var(--accent);background:var(--accentSoft);border:0;border-radius:7px;font-size:9px;font-weight:800}.owb-history-toggle .owb-caret{font-size:8px;opacity:.75}.owb-history-box{margin-top:7px}.owb-history-box[hidden]{display:none}.owb-config-head{cursor:grab}
    .owb-mode-use .owb-node.owb-label:not(.collapsed)>.owb-node-inner>.owb-node-head{display:none}.owb-mode-use .owb-node.owb-hidden{display:none!important}.owb-mode-layout .owb-node.owb-hidden{opacity:.42}.owb-mode-layout .owb-node.owb-hidden:after{position:absolute;z-index:8;right:5px;bottom:5px;padding:2px 5px;color:var(--muted);background:var(--soft);border:1px solid var(--line);border-radius:5px;font-size:7px;content:"使用模式隐藏";pointer-events:none}.owb-button-body{display:grid;place-items:center;height:100%;padding:6px}.owb-node-button{--owb-button-color:var(--accent);--owb-button-soft:var(--accentSoft);--owb-button-text:#fff;width:100%;height:100%;padding:8px 10px;color:var(--owb-button-text);background:var(--owb-button-color);border:1px solid transparent;border-radius:8px;box-shadow:none;font-size:var(--owb-button-font-size,10px);font-weight:800;overflow:hidden;text-align:center;text-overflow:ellipsis;white-space:nowrap;transition:filter .15s,transform .15s,box-shadow .15s}.owb-node-button:hover{filter:brightness(1.06)}.owb-node-button:active{transform:translateY(1px)}.owb-button-shape-square{border-radius:2px}.owb-button-shape-rounded{border-radius:8px}.owb-button-shape-pill{border-radius:999px}.owb-button-shape-circle{width:min(100%,64px)!important;height:auto!important;max-height:100%;aspect-ratio:1;border-radius:50%;white-space:normal}.owb-button-fill-soft{color:var(--owb-button-color);background:var(--owb-button-soft);border-color:color-mix(in srgb,var(--owb-button-color) 28%,transparent)}.owb-button-fill-outline{color:var(--owb-button-color);background:transparent;border-color:var(--owb-button-color)}.owb-button-fill-ghost{color:var(--owb-button-color);background:transparent}.owb-button-shadow-soft{box-shadow:0 4px 12px color-mix(in srgb,var(--owb-button-color) 22%,transparent)}.owb-button-shadow-strong{box-shadow:0 8px 22px color-mix(in srgb,var(--owb-button-color) 38%,transparent)}.owb-node-button[aria-pressed="false"]{filter:saturate(.65);opacity:.78}
    .owb-decor{display:grid;place-items:center;height:100%;min-height:0;overflow:hidden;color:var(--muted);font-size:10px;text-align:center;white-space:pre-wrap}.owb-decor-blank{place-items:stretch}.owb-decor-line-h{display:block;align-self:center;width:100%;height:1px;background:var(--line)}.owb-decor-line-v{display:block;justify-self:center;width:1px;height:100%;background:var(--line)}.owb-decor-dots{display:flex;align-items:center;justify-content:center;gap:7px}.owb-decor-dots i{width:6px;height:6px;border-radius:50%;background:var(--muted2)}
    .owb-smart-vertical #nav{display:flex;flex-direction:row;align-items:stretch;gap:5px;padding:6px}.owb-smart-vertical .navItem{flex:1 1 0;flex-direction:column;gap:3px;min-height:50px;padding:7px 4px;text-align:center}.owb-smart-vertical .navIcon{flex:0 0 auto}.owb-smart-vertical .navName{flex:0 0 auto;width:100%;font-size:10px}.owb-smart-vertical .count{font-size:8px}
    .owb-export-history,.owb-import-history{padding:5px 7px;border:0;border-radius:6px;font-size:8px;color:var(--accent);background:var(--accentSoft)}
    .owb-mode-use .owb-node.owb-hide-content>.owb-node-inner>.owb-node-body{display:none!important}.owb-node-body{font-size:var(--owb-font-size, inherit)}.owb-node .owb-node-body{zoom:var(--owb-zoom, 1)}.owb-node.owb-bold .owb-node-body *{font-weight:700!important}
    .owb-quadrant{display:grid;grid-template-columns:1fr 1fr;align-content:start;gap:6px;height:100%;min-height:0;padding:6px}.owb-quadrant-cell{display:flex;flex-direction:column;min-height:0;overflow:auto;padding:7px;background:var(--soft);border:1px solid var(--line);border-radius:8px}.owb-quadrant-cell h4{margin:0 0 6px;color:var(--muted);font-size:9px}.owb-quadrant-cell .owb-task{padding:6px 7px;font-size:9px}.owb-quadrant-cell .owb-empty{min-height:40px;padding:8px;font-size:8px}
    .owb-quadrant-cell.q1{background:var(--redSoft);border-color:color-mix(in srgb,var(--red) 45%,transparent)}.owb-quadrant-cell.q1 h4{color:var(--red)}.owb-quadrant-cell.q2{background:var(--blueSoft);border-color:color-mix(in srgb,var(--blue) 45%,transparent)}.owb-quadrant-cell.q2 h4{color:var(--blue)}.owb-quadrant-cell.q3{background:var(--yellowSoft);border-color:color-mix(in srgb,var(--yellow) 45%,transparent)}.owb-quadrant-cell.q3 h4{color:var(--yellow)}.owb-quadrant-cell.q4{background:var(--greenSoft);border-color:color-mix(in srgb,var(--green) 45%,transparent)}.owb-quadrant-cell.q4 h4{color:var(--green)}
    .owb-task{border-left:3px solid transparent}.owb-task[data-status="DONE"],.owb-task[data-status="CNCL"]{opacity:.62}.owb-task[data-status="DONE"] .owb-task-title{text-decoration:line-through}.owb-task[data-status="TODO"]{border-left-color:var(--accent)}.owb-task[data-status="NEXT"]{border-left-color:var(--blue)}.owb-task[data-status="DONE"]{border-left-color:var(--green)}.owb-task[data-status="CNCL"]{border-left-color:var(--muted2)}
    .owb-prio{display:inline-block;margin-right:5px;padding:1px 4px;border-radius:4px;font-size:7px;font-weight:850}.owb-prio-a{color:#fff;background:var(--red)}.owb-prio-b{color:#fff;background:var(--blue)}.owb-prio-c{color:var(--muted);background:var(--soft)}
    .owb-cal-task{position:relative;padding-left:12px}.owb-cal-task:before{position:absolute;left:2px;top:50%;width:5px;height:5px;margin-top:-2.5px;border-radius:50%;background:var(--muted2);content:""}.owb-cal-task[data-status="TODO"]:before{background:var(--accent)}.owb-cal-task[data-status="NEXT"]:before{background:var(--blue)}.owb-cal-task[data-status="DONE"]:before{background:var(--green)}.owb-cal-task[data-status="CNCL"]:before{background:var(--muted2)}
    .owb-node-body{color:var(--owb-text-color, inherit)}.owb-node .owb-node-body .owb-task-title,.owb-node .owb-node-body .owb-decor,.owb-node .owb-node-body .owb-empty{color:var(--owb-text-color, inherit)}
    .owb-cal-task[data-status="TODO"]{background:var(--accentSoft);color:var(--accent)}.owb-cal-task[data-status="NEXT"]{background:var(--blueSoft);color:var(--blue)}.owb-cal-task[data-status="DONE"]{background:var(--greenSoft);color:var(--green);text-decoration:line-through}.owb-cal-task[data-status="CNCL"]{background:var(--soft);color:var(--muted2);text-decoration:line-through}
    .owb-mode-use .owb-node.owb-no-title:not(.collapsed)>.owb-node-inner>.owb-node-head{display:none}.owb-mode-use .owb-node.owb-show-title:not(.collapsed)>.owb-node-inner>.owb-node-head{display:flex;min-height:30px;padding:5px 8px;cursor:default}.owb-mode-use .owb-node.owb-show-title:not(.collapsed)>.owb-node-inner>.owb-node-head strong{font-size:10px}
    .owb-filter-bar{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px 8px;background:var(--soft);border-bottom:1px solid var(--line)}.owb-apply-filters{flex:0 0 auto;padding:4px 8px;color:var(--accent);background:var(--accentSoft);border:0;border-radius:6px;font-size:8px;font-weight:800}.owb-filter-state{min-width:0;overflow:hidden;color:var(--muted);font-size:7px;text-overflow:ellipsis;white-space:nowrap}
    .owb-node.collapsed .owb-collapsed-text{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.owb-node.collapsed.owb-collapsed-vertical>.owb-node-inner>.owb-node-head{justify-content:center}.owb-node.collapsed.owb-collapsed-vertical .owb-collapsed-text{flex:0 0 auto;writing-mode:vertical-rl;letter-spacing:2px;max-height:100%}
    .owb-layout-open{min-width:52px;min-height:40px;font-size:11px;padding:9px 10px}
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
    const node = { id, kind, content, title: String(value?.title || (kind === "container" ? "容器" : contentKinds[content].label)).slice(0, 32), parent: String(value?.parent || "root"), x: clampFloat(value?.x, 0, 12 - w, 0), y: clampFloat(value?.y, 0, 240, 0), w, h: clampFloat(value?.h, 0.5, 24, kind === "container" ? 8 : 4), floating: !!value?.floating, locked: !!value?.locked, collapsible: !!value?.floating && !!value?.collapsible, autoCollapse: !!value?.floating && !!value?.collapsible && !!value?.autoCollapse, collapsed: !!value?.floating && !!value?.collapsible && !!value?.collapsed, cw: clampFloat(value?.cw, 0.1, 12, 2), ch: clampFloat(value?.ch, 0.1, 15, 1), cx: clampFloat(value?.cx, 0, 11.5, clampFloat(value?.x, 0, 11.5, 0)), cy: clampFloat(value?.cy, 0, 240, clampFloat(value?.y, 0, 240, 0)), visible: value?.visible === undefined ? true : !!value.visible, showFrame: !!value?.showFrame, showLabel: value && Object.prototype.hasOwnProperty.call(value, "showLabel") ? !!value.showLabel : content === "task" };
    node.showContent = value?.showContent === undefined ? true : !!value.showContent;
    node.fontSize = Number(value?.fontSize) > 0 ? Math.max(6, Math.min(24, Number(value?.fontSize))) : 0;
    node.zoom = Number(value?.zoom) > 0 ? Math.max(0.5, Math.min(2, Number(value?.zoom))) : 1;
    node.bold = !!value?.bold;
    node.textColor = /^#[0-9a-f]{6}$/i.test(String(value?.textColor || "")) ? String(value.textColor) : "";
    node.showTitle = !!value?.showTitle;
    node.collapseText = String(value?.collapseText || "").slice(0, 24);
    node.collapseVertical = !!value?.collapseVertical;
    if (content === "detail") { node.floating = true; node.collapsible = true; }
    if (content === "layout") { node.collapsible = false; node.autoCollapse = false; node.collapsed = false; }
    if (content === "button") { node.text = String(value?.text || "按钮").slice(0, 24); node.target = String(value?.target || "").slice(0, 64); node.buttonShape = ["square", "rounded", "pill", "circle"].includes(value?.buttonShape) ? value.buttonShape : "rounded"; node.buttonColor = ["accent", "blue", "green", "red", "yellow", "neutral", "custom"].includes(value?.buttonColor) ? value.buttonColor : "accent"; node.buttonFill = ["solid", "soft", "outline", "ghost"].includes(value?.buttonFill) ? value.buttonFill : "solid"; node.buttonFontSize = clampFloat(value?.buttonFontSize, 8, 24, 10); node.buttonShadow = ["none", "soft", "strong"].includes(value?.buttonShadow) ? value.buttonShadow : "none"; node.buttonCustomColor = /^#[0-9a-f]{6}$/i.test(String(value?.buttonCustomColor || "")) ? String(value.buttonCustomColor) : "#5b6cf9"; node.buttonTextColor = /^#[0-9a-f]{6}$/i.test(String(value?.buttonTextColor || "")) ? String(value.buttonTextColor) : "#ffffff"; }
    if (content === "decor") { node.decor = ["text", "line-h", "line-v", "dots", "blank"].includes(value?.decor) ? value.decor : "text"; node.text = String(value?.text || "").slice(0, 48); }
    if (content === "smart") { node.vertical = !!value?.vertical; }
    if (content === "task" || content === "mainList") { node.view = Object.prototype.hasOwnProperty.call(viewLabels, value?.view) ? value.view : "all"; node.query = String(value?.query || "").slice(0, 180); node.limit = clamp(value?.limit, 1, 200, 20); node.calendarCursor = validDate(value?.calendarCursor) ? value.calendarCursor : ""; node.statisticsPeriod = ["week", "month", "year"].includes(value?.statisticsPeriod) ? value.statisticsPeriod : "week"; node.statisticsCategory = ["file", "tag", "priority", "heading"].includes(value?.statisticsCategory) ? value.statisticsCategory : "file"; node.filters = value?.filters && typeof value.filters === "object" ? value.filters : {}; node.filterButton = !!value?.filterButton; node.quadrantRules = { important: ["A", "AB", "ANY", "TAG"].includes(value?.quadrantRules?.important) ? value.quadrantRules.important : "A", urgent: ["0", "3", "7", "14", "OVERDUE", "TAG"].includes(value?.quadrantRules?.urgent) ? value.quadrantRules.urgent : "3" }; node.openRule = ["done", "status", "closed"].includes(value?.openRule) ? value.openRule : "done"; }
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
      if (node.kind === "container" || ["task", "button", "decor", "mainList"].includes(node.content)) return true;
      if (uniqueContent.has(node.content)) return false; uniqueContent.add(node.content); return true;
    });
    const containers = new Set(nodes.filter((node) => node.kind === "container").map((node) => node.id));
    nodes.forEach((node) => { if (node.kind === "container" || !containers.has(node.parent)) node.parent = "root"; });
    nodes.filter((node) => node.content === "button" && node.target).forEach((node) => { let parent = node.parent; while (parent !== "root") { if (parent === node.target) { node.target = ""; break; } parent = nodes.find((item) => item.id === parent)?.parent || "root"; } });
    ["detail", "layout"].forEach((content) => {
      if (!nodes.some((node) => node.content === content)) nodes.push(normalizeNode(defaults.nodes.find((node) => node.content === content), nodes.length, ids));
    });
    return { schema: 4, mode: value?.mode === "layout" ? "layout" : "use", nodes };
  }

  function nodeSize(node) { return node.floating && node.collapsible && node.collapsed ? { w: node.cw, h: node.ch } : { w: node.w, h: node.h }; }
  function nodeRect(node) { const size = nodeSize(node); return node.collapsed ? { x: node.cx, y: node.cy, ...size } : { x: node.x, y: node.y, ...size }; }
  function nodeLabel(node) { return node.kind === "container" ? "容器" : node.content === "decor" ? "" : contentKinds[node.content]?.label || "窗口"; }

  host.register({
    manifest: { id: pluginId, name: "空白画布工作台", version: "4.1.4", type: "layout", hostApi: 2, platforms: ["windows", "android"], description: "修复按钮重新显示容器后文件列表等子窗口仍被隐藏的问题" },
    activate(api) {
      let config = normalizeConfig(api.getSetting("config", defaults));
      let editingId = null; let lastSummary = { selected: "", detailOpen: false, view: "" };
      api.addStyle(css); document.body.classList.add("owb-blank");
      const root = api.createMount("owb-root", "workspace"); root.innerHTML = '<div class="owb-canvas"></div>';
      const canvas = root.firstElementChild;
      const drawer = api.createMount("owb-config", document.body);
      const tooltip = api.createMount("owb-tooltip", document.body);
      const coreRegions = [...new Set(Object.values(coreKinds).map((item) => item.region))];
      const save = () => api.setSetting("config", { schema: 4, mode: config.mode, nodes: config.nodes });
      const findNode = (id) => config.nodes.find((node) => node.id === id);
      const childNodes = (parent) => config.nodes.filter((node) => node.parent === parent);
      const parentChainContains = (parent, target) => { let current = parent; while (current !== "root") { if (current === target) return true; current = findNode(current)?.parent || "root"; } return false; };
      const restoreRegions = () => coreRegions.forEach((region) => api.restoreRegion(region));
      const formatNum = (value) => Number.isInteger(value) ? String(value) : value.toFixed(1);
      const pushHistory = (label = "") => {
        const history = api.getSetting("layoutHistory", []);
        history.push({ time: new Date().toLocaleString("zh-CN", { hour12: false }), label: String(label || ""), nodes: clone(config.nodes) });
        if (history.length > 30) history.splice(0, history.length - 30);
        api.setSetting("layoutHistory", history);
      };
      const exportHistory = () => {
        const payload = { app: "orglist.configurable-workbench", version: "4.1.4", exportedAt: new Date().toISOString(), defaultLayout: api.getSetting("defaultLayout", null), layoutHistory: api.getSetting("layoutHistory", []), config: { schema: 4, mode: config.mode, nodes: config.nodes } };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = `orglist-workbench-layout-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        api.setNotice(`已导出布局历史（${payload.layoutHistory.length} 条）。`);
      };
      const importHistory = () => {
        const input = document.createElement("input");
        input.type = "file"; input.accept = "application/json,.json";
        input.onchange = async () => {
          const file = input.files?.[0]; if (!file) return;
          try {
            const data = JSON.parse(await file.text());
            const history = Array.isArray(data.layoutHistory) ? data.layoutHistory.filter((entry) => entry && Array.isArray(entry.nodes)) : [];
            api.setSetting("layoutHistory", history);
            const hasDefault = data.defaultLayout && Array.isArray(data.defaultLayout.nodes);
            if (hasDefault) api.setSetting("defaultLayout", { nodes: data.defaultLayout.nodes });
            renderDrawer();
            api.setNotice(`已导入布局历史（${history.length} 条）${hasDefault ? "与默认布局" : ""}。`);
          } catch (error) { api.setNotice(`导入失败：${error?.message || String(error)}`); }
        };
        input.click();
      };
      function showTooltip(nodeId, event) {
        const node = findNode(nodeId); if (!node) return;
        const parentTitle = node.parent === "root" ? "根画布" : (findNode(node.parent)?.title || node.parent);
        const kindText = node.kind === "container" ? "容器" : (contentKinds[node.content]?.label || node.content);
        const flags = [node.locked ? "已锁" : "", node.collapsed ? "已折叠" : "", node.floating ? "浮动" : "停靠", node.showFrame ? "显示框线" : ""].filter(Boolean);
        tooltip.innerHTML = `<strong>${api.escapeHtml(node.content === "decor" && node.text ? node.text : node.title)}</strong>${node.content === "decor" && node.text ? "" : `<span>${api.escapeHtml(kindText)}${node.content === "task" && node.view ? ` · ${api.escapeHtml(viewLabels[node.view])}` : ""}</span>`}<span>位于 ${api.escapeHtml(parentTitle)} · X${formatNum(nodeRect(node).x + 1)} Y${formatNum(nodeRect(node).y + 1)} · ${formatNum(nodeRect(node).w)}×${formatNum(nodeRect(node).h)}</span>${node.content === "task" && node.query ? `<span>${api.escapeHtml(node.query)}</span>` : ""}${node.content === "button" && node.target ? `<span>点击切换显隐：${api.escapeHtml(findNode(node.target)?.title || node.target)}</span>` : ""}${flags.length ? `<span>${api.escapeHtml(flags.join(" · "))}</span>` : ""}`;
        tooltip.classList.add("show");
        const pad = 14; const rect = tooltip.getBoundingClientRect();
        let left = event.clientX + pad; let top = event.clientY + pad;
        if (left + rect.width > window.innerWidth - 8) left = event.clientX - rect.width - pad;
        if (top + rect.height > window.innerHeight - 8) top = event.clientY - rect.height - pad;
        tooltip.style.left = `${Math.max(8, left)}px`; tooltip.style.top = `${Math.max(8, top)}px`;
      }
      function hideTooltip() { tooltip.classList.remove("show"); tooltip.innerHTML = ""; }
      canvas.addEventListener("pointerover", (event) => { if (config.mode !== "layout") { hideTooltip(); return; } const nodeElement = event.target.closest?.("[data-owb-node]"); if (!nodeElement) { hideTooltip(); return; } showTooltip(nodeElement.dataset.owbNode, event); });
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
      function countdownTone(task) { if (!task.countdownDate) return ""; const difference = Math.round((parseDate(task.countdownDate) - parseDate(api.today())) / 86400000); const soonDays = Number(api.getAppSetting?.("countdown.soonDays", "7")) || 7; return difference < 0 ? "expired" : difference === 0 ? "today" : difference <= 3 ? "urgent" : difference <= soonDays ? "soon" : "normal"; }
      function taskTailMarkup(task) { return task.countdownVisible && task.countdownText ? `<span class="owb-task-date owb-countdown-badge">${api.escapeHtml(task.countdownText)}</span>` : `<span class="owb-task-date">${api.escapeHtml(taskDate(task))}</span>`; }
      function countdownMarkup(tasks) {
        const compact = api.getAppSetting?.("countdown.compact", "false") === "true";
        return tasks.length ? `<div class="owb-task-list owb-countdown-list ${compact ? "compact" : ""}">${tasks.map((task) => `<button class="owb-task" data-owb-task="${api.escapeHtml(task.uid)}" data-status="${api.escapeHtml(task.status)}" data-countdown-tone="${countdownTone(task)}"><span><span class="owb-task-title">${task.countdownPinned ? "★ " : ""}${api.escapeHtml(task.title)}</span><span class="owb-task-meta">${task.priority ? `<b class="owb-prio owb-prio-${api.escapeHtml(String(task.priority).toLowerCase())}">${api.escapeHtml(task.priority)}</b>` : ""}${api.escapeHtml(task.fileName)} · ${api.escapeHtml(task.countdownDate || "")}${task.countdownTime ? ` ${api.escapeHtml(task.countdownTime)}` : ""}</span></span><span class="owb-task-date">${api.escapeHtml(task.countdownText || task.countdownDate || "")}</span></button>`).join("")}</div>` : '<div class="owb-empty">没有倒计时项目</div>';
      }
      function statisticBounds(period) { const current = parseDate(api.today()), start = new Date(current), end = new Date(current); if (period === "week") { const day = (current.getDay() + 6) % 7; start.setDate(current.getDate() - day); end.setDate(start.getDate() + 6); } else if (period === "month") { start.setDate(1); end.setMonth(current.getMonth() + 1, 0); } else { start.setMonth(0, 1); end.setMonth(11, 31); } return { start: dateKey(start), end: dateKey(end) }; }
      function statisticCategories(tasks, type) { const counts = new Map(), add = (name) => counts.set(name, (counts.get(name) || 0) + 1); tasks.forEach((task) => { if (type === "file") add(task.fileName); else if (type === "priority") add(task.priority ? `优先级 ${task.priority}` : "无优先级"); else if (type === "heading") add(task.parentPath?.[0] || "顶层条目"); else (task.tags?.length ? task.tags : ["无标签"]).forEach(add); }); return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN")).slice(0, 12); }
      function viewState() { return typeof api.getViewState === "function" ? api.getViewState() : {}; }
      function statisticsMarkup(node) {
        const bar = node.content === "mainList" || node.filterButton ? filterBarMarkup(node) : "";
        if (api.getAppSetting?.("statistics.enabled", "true") === "false") return bar + '<div class="owb-empty">统计中心已在主程序设置中关闭</div>';
        const period = ["week", "month", "year"].includes(node.statisticsPeriod) ? node.statisticsPeriod : "week", bounds = statisticBounds(period), options = taskQueryOptions(node, "all"); options.limit = 5000; const all = api.queryTasks(options), completed = all.filter((task) => task.status !== "CNCL" && task.closed >= bounds.start && task.closed <= bounds.end), planned = all.filter((task) => { const date = task.deadline || task.scheduled; return date >= bounds.start && date <= bounds.end; }), plannedDone = planned.filter((task) => task.status !== "CNCL" && task.closed >= bounds.start && task.closed <= bounds.end), dated = completed.filter((task) => task.deadline || task.scheduled), onTime = dated.filter((task) => task.closed <= (task.deadline || task.scheduled)), overdue = all.filter((task) => !task.done && (task.deadline || task.scheduled) && (task.deadline || task.scheduled) < api.today()), entries = [];
        if (period === "year") for (let month = 1; month <= 12; month += 1) { const prefix = `${bounds.start.slice(0, 4)}-${String(month).padStart(2, "0")}`; entries.push({ label: `${month}月`, count: completed.filter((task) => task.closed.startsWith(prefix)).length }); } else for (let date = bounds.start; date <= bounds.end; date = addDays(date, 1)) entries.push({ label: period === "week" ? "一二三四五六日"[entries.length] : date.slice(8), count: completed.filter((task) => task.closed === date).length });
        const max = Math.max(1, ...entries.map((item) => item.count)), categoryType = ["file", "tag", "priority", "heading"].includes(node.statisticsCategory) ? node.statisticsCategory : "file", categories = statisticCategories(completed, categoryType), categoryMax = Math.max(1, ...categories.map((item) => item[1]));
        const habitDates = all.filter((task) => task.habit).flatMap((task) => task.habitDates || []).filter((date) => date >= bounds.start && date <= bounds.end);
        const completion = api.getAppSetting?.("statistics.completion", "true") !== "false" ? `<div class="owb-stat-grid"><div class="owb-stat-card"><span>${completed.length}</span><small>完成任务</small></div><div class="owb-stat-card"><span>${planned.length ? Math.round(plannedDone.length / planned.length * 100) : 0}%</span><small>计划完成率 · 现存计划口径</small></div><div class="owb-stat-card"><span>${dated.length ? Math.round(onTime.length / dated.length * 100) : 0}%</span><small>按期完成率</small></div><div class="owb-stat-card"><span>${overdue.length}</span><small>当前逾期</small></div></div>` : "";
        const trend = api.getAppSetting?.("statistics.trend", "true") !== "false" ? `<section class="owb-stat-section"><h4>完成趋势</h4><div class="owb-stat-trend">${entries.map((item) => `<span class="owb-stat-column"><span class="owb-stat-number">${item.count || ""}</span><span class="owb-stat-bar" style="height:${Math.max(2, item.count / max * 70)}px"></span><span class="owb-stat-label">${item.label}</span></span>`).join("")}</div></section>` : "";
        const category = api.getAppSetting?.("statistics.categories", "true") !== "false" ? `<section class="owb-stat-section"><div class="owb-stat-section-head"><h4>完成分类</h4><select class="owb-stat-category-type" data-stat-category-type><option value="file">文件</option><option value="tag">标签</option><option value="priority">优先级</option><option value="heading">顶级标题</option></select></div><div class="owb-stat-categories">${categories.map(([name,count]) => `<div class="owb-stat-category"><span>${api.escapeHtml(name)}</span><span class="owb-stat-track"><span class="owb-stat-fill" style="width:${count / categoryMax * 100}%"></span></span><span>${count}</span></div>`).join("") || '<div class="owb-empty">当前周期没有完成记录</div>'}</div></section>` : "";
        const habits = api.getAppSetting?.("statistics.habits", "true") !== "false" ? `<section class="owb-stat-section"><h4>习惯签到</h4><div class="owb-stat-card"><span>${habitDates.length}</span><small>周期内 ${all.filter((task) => task.habit).length} 个习惯的 LOGBOOK 完成记录</small></div></section>` : "";
        const year = api.today().slice(0, 4), heatCounts = new Map(); all.filter((task) => task.status !== "CNCL" && task.closed?.startsWith(year)).forEach((task) => heatCounts.set(task.closed, (heatCounts.get(task.closed) || 0) + 1));
        const heatmap = api.getAppSetting?.("statistics.heatmap", "true") !== "false" ? `<section class="owb-stat-section"><h4>${year} 年完成热力图</h4><div class="owb-stat-heatmap">${Array.from({ length: 366 }, (_, index) => addDays(`${year}-01-01`, index)).filter((date) => date.startsWith(year)).map((date) => { const count = heatCounts.get(date) || 0; return `<span class="owb-stat-heat l${count ? Math.min(4, Math.ceil(count / 2)) : 0}" title="${date}：${count} 个"></span>`; }).join("")}</div></section>` : "";
        return bar + `<div class="owb-statistics"><div class="owb-stat-tools"><strong>${bounds.start} — ${bounds.end}</strong>${[["week","周"],["month","月"],["year","年"]].map(([value,label]) => `<button data-stat-period="${value}" class="${period === value ? "active" : ""}">${label}</button>`).join("")}</div>${completion}${trend}${category}${habits}${heatmap}<div class="owb-stat-note">取消任务不计入完成数；统计继承该窗口已应用的文件、状态、优先级、标签、日期范围和搜索条件，并读取完整数据。</div></div>`;
      }
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
          const cells = Array.from({ length: 42 }, (_, index) => { const current = new Date(start); current.setDate(start.getDate() + index); const key = dateKey(current); const items = tasksOn(tasks, key); return `<div class="owb-day-cell ${current.getMonth() !== month ? "outside" : ""} ${key === api.today() ? "today" : ""}"><button class="owb-day-number" data-cal-date="${key}">${current.getDate()}</button>${items.slice(0, 3).map((task) => `<button class="owb-cal-task" data-owb-task="${api.escapeHtml(task.uid)}" data-status="${api.escapeHtml(task.status)}" title="${api.escapeHtml(task.countdownVisible ? task.countdownText : "")}">${api.escapeHtml(task.title)}${task.countdownVisible ? ` · ${api.escapeHtml(task.countdownText)}` : ""}</button>`).join("")}${items.length > 3 ? `<span class="owb-task-meta">+${items.length - 3}</span>` : ""}</div>`; }).join("");
          return `<div class="owb-calendar">${calendarTools(node, `${year} 年 ${month + 1} 月`)}<div class="owb-calendar-scroll"><div class="owb-month-grid">${weekdays}${cells}</div></div></div>`;
        }
        if (node.view === "calendar-week") {
          const start = startWeek(cursor); const days = Array.from({ length: 7 }, (_, index) => { const key = addDays(start, index); const current = parseDate(key); const items = tasksOn(tasks, key); return `<section class="owb-week-day"><strong>${current.getMonth() + 1}/${current.getDate()} 周${["日","一","二","三","四","五","六"][current.getDay()]}</strong>${items.map((task) => `<button class="owb-cal-task" data-owb-task="${api.escapeHtml(task.uid)}" data-status="${api.escapeHtml(task.status)}">${task.time ? `${api.escapeHtml(task.time)} · ` : ""}${api.escapeHtml(task.title)}${task.countdownVisible ? ` · ${api.escapeHtml(task.countdownText)}` : ""}</button>`).join("") || '<div class="owb-empty">无条目</div>'}</section>`; }).join("");
          return `<div class="owb-calendar">${calendarTools(node, `${start} — ${addDays(start, 6)}`)}<div class="owb-calendar-scroll"><div class="owb-week-grid">${days}</div></div></div>`;
        }
        const items = tasksOn(tasks, cursor);
        return `<div class="owb-calendar">${calendarTools(node, `${cursor} · 周${["日","一","二","三","四","五","六"][parseDate(cursor).getDay()]}`)}<div class="owb-calendar-scroll"><div class="owb-day-view">${items.map((task) => `<button class="owb-task" data-owb-task="${api.escapeHtml(task.uid)}" data-status="${api.escapeHtml(task.status)}" data-countdown-tone="${countdownTone(task)}"><span><span class="owb-task-title">${api.escapeHtml(task.title)}</span><span class="owb-task-meta">${task.priority ? `<b class="owb-prio owb-prio-${api.escapeHtml(String(task.priority).toLowerCase())}">${api.escapeHtml(task.priority)}</b>` : ""}${api.escapeHtml(task.status)} · ${api.escapeHtml(task.fileName)}</span></span>${task.countdownVisible ? taskTailMarkup(task) : `<span class="owb-task-date">${api.escapeHtml(task.time || taskDate(task))}</span>`}</button>`).join("") || '<div class="owb-empty">当天没有条目</div>'}</div></div></div>`;
      }

      function taskImportant(task, rules) { const important = (rules || {}).important || "A"; if (important === "AB") return task.priority === "A" || task.priority === "B"; if (important === "ANY") return !!task.priority; if (important === "TAG") return task.tags.includes("重要"); return task.priority === "A"; }
      function taskUrgent(task, rules) { const urgent = (rules || {}).urgent || "3"; if (urgent === "TAG") return task.tags.includes("紧急"); if (urgent === "OVERDUE") { const actionDate = task.deadline || task.scheduled; return !!actionDate && actionDate < api.today(); } const days = Number(urgent); if (Number.isFinite(days)) { const actionDate = task.deadline || task.scheduled; return !!actionDate && actionDate <= addDays(api.today(), days); } return false; }
      function quadrantMarkup(node, tasks) {
        const open = tasks.filter((task) => !task.done);
        const groups = [
          { key: "q1", title: "重要且紧急", items: open.filter((task) => taskImportant(task, node.quadrantRules) && taskUrgent(task, node.quadrantRules)) },
          { key: "q2", title: "重要不紧急", items: open.filter((task) => taskImportant(task, node.quadrantRules) && !taskUrgent(task, node.quadrantRules)) },
          { key: "q3", title: "紧急不重要", items: open.filter((task) => !taskImportant(task, node.quadrantRules) && taskUrgent(task, node.quadrantRules)) },
          { key: "q4", title: "不重要不紧急", items: open.filter((task) => !taskImportant(task, node.quadrantRules) && !taskUrgent(task, node.quadrantRules)) },
        ];
        return `<div class="owb-quadrant">${groups.map((group) => `<section class="owb-quadrant-cell ${group.key}"><h4>${group.title}</h4>${group.items.length ? group.items.map((task) => `<button class="owb-task" data-owb-task="${api.escapeHtml(task.uid)}" data-status="${api.escapeHtml(task.status)}" data-countdown-tone="${countdownTone(task)}"><span><span class="owb-task-title">${api.escapeHtml(task.title)}</span><span class="owb-task-meta">${task.priority ? `<b class="owb-prio owb-prio-${api.escapeHtml(String(task.priority).toLowerCase())}">${api.escapeHtml(task.priority)}</b>` : ""}${api.escapeHtml(task.status)} · ${api.escapeHtml(taskDate(task))}</span></span>${task.countdownVisible ? taskTailMarkup(task) : ""}</button>`).join("") : '<div class="owb-empty">无</div>'}</section>`).join("")}</div>`;
      }

      function openRulePredicate(rule) {
        if (rule === "status") return (task) => ["TODO", "NEXT"].includes(task.status);
        if (rule === "closed") return (task) => !task.closed;
        return (task) => !task.done;
      }
      function taskQueryOptions(node, view) {
        const calendar = isCalendar(view); const quadrant = view === "quadrant"; const wide = calendar || quadrant || view === "countdown";
        const queryView = calendar || quadrant || (view === "open" && node.openRule !== "done") ? "all" : view;
        const options = { view: queryView, query: node.query || "", limit: wide ? 200 : node.limit };
        const filters = node.filters || {};
        if (filters.status === "OPEN") options.completed = false;
        if (filters.status && filters.status !== "ALL" && filters.status !== "OPEN") options.status = [String(filters.status)];
        if (filters.priority && filters.priority !== "ALL") options.priority = [String(filters.priority)];
        if (filters.tag && filters.tag !== "ALL") options.tags = [String(filters.tag)];
        if (filters.fileId) options.fileId = filters.fileId;
        if (filters.customQuery) options.query = [options.query, String(filters.customQuery)].filter(Boolean).join(" ");
        if (filters.search) options.query = [options.query, String(filters.search)].filter(Boolean).join(" ");
        if (filters.dateField) options.dateField = filters.dateField;
        if (filters.dateFrom) options.dateFrom = filters.dateFrom;
        if (filters.dateTo) options.dateTo = filters.dateTo;
        if (filters.sort) options.sort = filters.sort;
        return options;
      }
      function captureCurrentFilters(node) {
        const current = viewState();
        const status = String(current.status || document.querySelector("#statusFilter")?.value || "ALL");
        const priority = String(current.priority || document.querySelector("#priorityFilter")?.value || "ALL");
        const tag = String(current.tag || document.querySelector("#tagFilter")?.value || "ALL");
        const search = String(current.search ?? document.querySelector("#search")?.value ?? "").trim();
        let appView = String(current.view || document.querySelector("#nav [data-view].active")?.dataset?.view || lastSummary.view || "");
        if (appView === "calendar") { const mode = document.querySelector("#calendarControls [data-calendar-mode].active")?.dataset?.calendarMode || "month"; appView = `calendar-${mode}`; }
        let customQuery = "";
        const activeCustom = String(current.customActive || document.querySelector("#customLists .customItem.active")?.dataset?.customItem || "");
        if (activeCustom) { try { const customs = JSON.parse(localStorage.getItem("org-task-custom-lists-v1") || "[]"); customQuery = String((customs.find((item) => String(item.id) === activeCustom) || {}).query || "").trim(); } catch (_) {} }
        node.filters = { status, priority, tag, search, view: appView, fileId: String(current.fileId || document.querySelector("#files [data-file].active")?.dataset?.file || ""), customQuery: customQuery && customQuery !== search ? customQuery : "",
          sort: String(current.sort || "date"), dateField: String(current.dateField || "date"), dateFrom: String(current.dateFrom || ""), dateTo: String(current.dateTo || "") };
        if (node.content === "mainList" && viewLabels[appView]) node.view = appView;
      }
      function filterBarMarkup(node) {
        const filters = node.filters || {};
        const parts = [];
        if (filters.view && viewLabels[filters.view]) parts.push(viewLabels[filters.view]);
        if (filters.status && filters.status !== "ALL") parts.push(filters.status === "OPEN" ? "未完成" : filters.status === "NONE" ? "未设状态" : filters.status);
        if (filters.priority && filters.priority !== "ALL") parts.push(`优先级 ${filters.priority}`);
        if (filters.tag && filters.tag !== "ALL") parts.push(`#${filters.tag}`);
        if (filters.dateFrom || filters.dateTo) parts.push(`${filters.dateFrom || "不限"} 至 ${filters.dateTo || "不限"}`);
        if (filters.search) parts.push(`搜索 ${filters.search}`);
        return `<div class="owb-filter-bar"><button class="owb-apply-filters" data-apply-filters="${api.escapeHtml(node.id)}">应用当前筛选</button>${parts.length ? `<span class="owb-filter-state">${api.escapeHtml(parts.join(" · "))}</span>` : ""}</div>`;
      }
      function taskMarkup(node) {
        if (node.view === "statistics") return statisticsMarkup(node);
        let tasks = api.queryTasks(taskQueryOptions(node, node.view));
        const filters = node.filters || {};
        if (node.view === "open" || filters.status === "OPEN") tasks = tasks.filter(openRulePredicate(node.openRule));
        if (node.view === "countdown") tasks = tasks.sort((a, b) => Number(b.countdownPinned) - Number(a.countdownPinned) || String(a.countdownDate).localeCompare(String(b.countdownDate))).slice(0, node.limit);
        const bar = node.content === "mainList" || node.filterButton ? filterBarMarkup(node) : "";
        if (isCalendar(node.view)) return bar + calendarMarkup(node, tasks);
        if (node.view === "quadrant") return bar + quadrantMarkup(node, tasks);
        if (node.view === "countdown") return bar + countdownMarkup(tasks);
        return bar + (tasks.length ? `<div class="owb-task-list">${tasks.map((task) => `<button class="owb-task" data-owb-task="${api.escapeHtml(task.uid)}" data-status="${api.escapeHtml(task.status)}" data-countdown-tone="${countdownTone(task)}"><span><span class="owb-task-title">${api.escapeHtml(task.title)}</span><span class="owb-task-meta">${task.priority ? `<b class="owb-prio owb-prio-${api.escapeHtml(String(task.priority).toLowerCase())}">${api.escapeHtml(task.priority)}</b>` : ""}${api.escapeHtml(task.status)} · ${api.escapeHtml(task.fileName)}</span></span>${taskTailMarkup(task)}</button>`).join("")}</div>` : '<div class="owb-empty">没有符合条件的条目</div>');
      }

      function nodeMarkup(node) {
        const children = node.kind === "container" ? childNodes(node.id).map(nodeMarkup).join("") : "";
        const target = node.content === "button" ? findNode(node.target) : null;
        const body = node.kind === "container" ? `<div class="owb-container-body">${children}</div>` : node.content === "task" || (node.content === "mainList" && node.id !== firstMainListId) ? taskMarkup(node) : node.content === "mainList" ? "" : node.content === "layout" ? `<div class="owb-layout-body"><button class="owb-layout-open" type="button">${config.mode === "layout" ? "使用模式" : "布局"}</button></div>` : node.content === "button" ? `<div class="owb-button-body"><button class="owb-node-button owb-button-shape-${node.buttonShape} owb-button-fill-${node.buttonFill} owb-button-shadow-${node.buttonShadow}" data-owb-target="${api.escapeHtml(node.target)}" aria-pressed="${target ? String(target.visible) : "false"}" style="${buttonStyle(node)}">${api.escapeHtml(node.text || "按钮")}</button></div>` : node.content === "decor" ? decorMarkup(node) : "";
        return `<section class="owb-node ${node.kind === "container" ? "owb-container" : "owb-window"} ${node.visible ? "" : "owb-hidden"} ${node.floating ? "floating" : "docked"} ${node.locked ? "locked" : ""} ${node.collapsed ? "collapsed" : ""} ${node.showFrame ? "owb-frame" : "owb-noframe"} ${node.showTitle ? "owb-show-title" : "owb-no-title"} ${node.kind === "window" && !node.showContent ? "owb-hide-content" : ""} ${node.bold ? "owb-bold" : ""} ${node.collapsed && node.collapseVertical ? "owb-collapsed-vertical" : ""} ${node.content === "smart" && node.vertical ? "owb-smart-vertical" : ""} ${node.kind === "window" ? `owb-core-${node.content}` : ""}" data-owb-node="${api.escapeHtml(node.id)}" style="${node.fontSize ? `--owb-font-size:${node.fontSize}px;` : ""}${node.zoom && node.zoom !== 1 ? `--owb-zoom:${node.zoom};` : ""}${node.textColor ? `--owb-text-color:${node.textColor};` : ""}"><div class="owb-node-inner"><header class="owb-node-head"><strong${node.collapsed ? ' class="owb-collapsed-text"' : ""}>${api.escapeHtml(node.collapsed && node.collapseText ? node.collapseText : node.title)}</strong></header><div class="owb-node-body">${body}</div></div><span class="owb-resize"></span></section>`;
      }

      function buttonStyle(node) {
        const palettes = { accent: ["var(--accent)", "var(--accentSoft)"], blue: ["var(--blue)", "var(--blueSoft)"], green: ["var(--green)", "var(--greenSoft)"], red: ["var(--red)", "var(--redSoft)"], yellow: ["var(--yellow)", "var(--yellowSoft)"], neutral: ["var(--muted)", "var(--soft)"] };
        const colors = node.buttonColor === "custom" ? [node.buttonCustomColor, `color-mix(in srgb,${node.buttonCustomColor} 16%,transparent)`] : (palettes[node.buttonColor] || palettes.accent);
        return `--owb-button-color:${colors[0]};--owb-button-soft:${colors[1]};--owb-button-text:${node.buttonTextColor};--owb-button-font-size:${node.buttonFontSize}px;`;
      }

      function decorMarkup(node) {
        const kind = node.decor || "text";
        if (kind === "blank") return '<div class="owb-decor owb-decor-blank"></div>';
        if (kind === "line-h") return '<div class="owb-decor owb-decor-line-h"></div>';
        if (kind === "line-v") return '<div class="owb-decor owb-decor-line-v"></div>';
        if (kind === "dots") return '<div class="owb-decor owb-decor-dots"><i></i><i></i><i></i></div>';
        return `<div class="owb-decor owb-decor-text">${api.escapeHtml(node.text || "")}</div>`;
      }

      function geometry(element, node) {
        const rect = nodeRect(node); const size = { w: rect.w, h: rect.h }; const nested = element.parentElement?.classList.contains("owb-container-body"); const row = nested ? 48 : 64; const gap = nested ? 8 : 10; const pad = nested ? 7 : 0;
        element.style.gridColumn = ""; element.style.gridRow = ""; element.style.position = "absolute"; element.style.left = ""; element.style.top = ""; element.style.width = ""; element.style.height = "";
        if (node.floating) { element.style.left = `calc(${rect.x / 12 * 100}% + 4px)`; element.style.top = `${rect.y * (row + gap)}px`; element.style.width = `calc(${size.w / 12 * 100}% - 8px)`; element.style.height = `${size.h * row + Math.max(0, size.h - 1) * gap}px`; }
        else if (rect.x === 0 && size.w === 12) { element.style.left = `${pad}px`; element.style.top = `${pad + rect.y * (row + gap)}px`; element.style.width = `calc(100% - ${pad * 2}px)`; element.style.height = `${size.h * row + Math.max(0, size.h - 1) * gap}px`; }
        else { element.style.left = `calc(${rect.x / 12 * 100}% + ${pad + gap / 2}px)`; element.style.top = `${pad + rect.y * (row + gap)}px`; element.style.width = `calc(${size.w / 12 * 100}% - ${gap}px)`; element.style.height = `${size.h * row + Math.max(0, size.h - 1) * gap}px`; }
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
        if (!allowDrag || node.locked || (config.mode !== "layout" && window.matchMedia?.("(max-width:760px)").matches)) return;
        if (event.button !== undefined && event.button !== 0) return; event.preventDefault();
        hideTooltip();
        const parent = element.parentElement; const nested = parent.classList.contains("owb-container-body"); const rect = parent.getBoundingClientRect(); const gap = nested ? 8 : 10; const row = nested ? 48 : 64; const columnStep = rect.width / 12; const rowStep = row + gap; const step = event.shiftKey ? 1 : 0.5; const startRect = nodeRect(node); const start = { px: event.clientX, py: event.clientY, x: startRect.x, y: startRect.y, w: startRect.w, h: startRect.h }; let changed = false;
        element.classList.add(mode === "move" ? "dragging" : "resizing");
        const move = (next) => { if (next.pointerId !== event.pointerId) return; const dx = Math.round((next.clientX - start.px) / columnStep / step) * step; const dy = Math.round((next.clientY - start.py) / rowStep / step) * step; const candidate = { x: start.x, y: start.y, w: start.w, h: start.h };
          if (mode === "move") { candidate.x = Math.max(0, Math.min(12 - start.w, start.x + dx)); candidate.y = Math.max(0, Math.min(240, start.y + dy)); }
          else { const minStep = node.floating && node.collapsible && node.collapsed ? 0.1 : 0.5; const maxH = node.floating && node.collapsible && node.collapsed ? 15 : 24; candidate.w = Math.max(minStep, Math.min(12 - candidate.x, start.w + dx)); candidate.h = Math.max(minStep, Math.min(maxH, start.h + dy)); }
          if (!collision(candidate, node)) { if (node.floating && node.collapsible && node.collapsed) { node.cx = candidate.x; node.cy = candidate.y; node.cw = candidate.w; node.ch = candidate.h; } else { node.x = candidate.x; node.y = candidate.y; node.w = candidate.w; node.h = candidate.h; } geometry(element, node); syncCanvasSize(); changed = true; }
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
        header.onpointerdown = (event) => { if (config.mode === "use" && node.collapsed) { node.collapsed = false; event.stopPropagation(); save(); renderWorkspace(); } };
        element.onpointerdown = (event) => { if (event.target.closest(".owb-resize")) return; const owner = event.target.closest?.("[data-owb-node]"); if (owner && owner !== element) return; pointerInteraction(event, node, element, "move"); };
        element.querySelector(":scope>.owb-resize").onpointerdown = (event) => pointerInteraction(event, node, element, "resize");
        element.ondblclick = (event) => { if (config.mode !== "layout" || node.content === "layout") return; event.preventDefault(); event.stopPropagation(); editingId = node.id; drawer.classList.add("show"); renderDrawer(); };
        element.querySelector(".owb-layout-open")?.addEventListener("click", () => { if (element.dataset.suppressClick) { delete element.dataset.suppressClick; return; } const wasLayout = config.mode === "layout"; config.mode = wasLayout ? "use" : "layout"; if (wasLayout) pushHistory(); editingId = null; drawer.classList.toggle("show", config.mode === "layout"); save(); renderWorkspace(); renderDrawer(); });
        if (["task", "mainList"].includes(node.content) && isCalendar(node.view)) bindCalendar(element, node);
        if (["task", "mainList"].includes(node.content) && node.view === "statistics") {
          element.querySelectorAll("[data-stat-period]").forEach((button) => button.onclick = () => { node.statisticsPeriod = button.dataset.statPeriod; save(); renderWorkspace(); });
          const category = element.querySelector("[data-stat-category-type]"); if (category) { category.value = node.statisticsCategory || "file"; category.onchange = () => { node.statisticsCategory = category.value; save(); renderWorkspace(); }; }
        }
      }

      function renderWorkspace() {
        hideTooltip(); restoreRegions(); canvas.className = `owb-canvas owb-mode-${config.mode}`; firstMainListId = config.nodes.find((node) => node.content === "mainList")?.id || ""; canvas.innerHTML = childNodes("root").map(nodeMarkup).join("");
        config.nodes.forEach((node) => { const element = [...canvas.querySelectorAll("[data-owb-node]")].find((item) => item.dataset.owbNode === node.id); if (!element) return; bindNode(element, node);
          if (node.content === "mainList" && node.id !== firstMainListId) { element.classList.add("owb-core", "owb-core-mainList"); }
          else if (node.kind === "window" && coreKinds[node.content]) { element.classList.add("owb-core"); if (coreKinds[node.content].button) element.classList.add("owb-core-button"); const body = element.querySelector(":scope>.owb-node-inner>.owb-node-body"); try { api.moveRegion(coreKinds[node.content].region, body); } catch (error) { body.innerHTML = `<div class="owb-empty">${api.escapeHtml(error?.message || String(error))}</div>`; } }
        });
        canvas.querySelectorAll("[data-owb-task]").forEach((button) => button.onclick = () => api.openTask(button.dataset.owbTask));
        canvas.querySelectorAll("[data-owb-target]").forEach((button) => button.onclick = () => toggleTarget(button.dataset.owbTarget));
        canvas.querySelectorAll("[data-apply-filters]").forEach((button) => button.onclick = () => {
          const node = findNode(button.dataset.applyFilters); if (!node) return;
          captureCurrentFilters(node); save(); renderWorkspace(); api.setNotice("已把当前筛选完整应用到该窗口。");
        });
        syncCanvasSize();
      }

      function arrange() {
        const parents = ["root", ...config.nodes.filter((node) => node.kind === "container").map((node) => node.id)];
        parents.forEach((parent) => { const moving = childNodes(parent).filter((node) => !node.floating && !node.locked); const occupied = childNodes(parent).filter((node) => !node.floating && node.locked); const perRow = moving.length === 1 ? 1 : moving.length === 2 ? 2 : moving.length === 3 ? 3 : 4; const width = 12 / perRow; moving.forEach((node) => { node.w = width; const position = freePosition(nodeSize(node), occupied); node.x = position.x; node.y = position.y; occupied.push(node); }); });
        save(); renderWorkspace(); renderDrawer();
      }

      function nodeDescription(node) { const rect = nodeRect(node); const position = `${node.floating ? "浮动" : "停靠"} · X${formatNum(rect.x + 1)} Y${formatNum(rect.y + 1)} · ${formatNum(rect.w)}×${formatNum(rect.h)}${node.visible ? "" : " · 已隐藏"}${node.collapsed ? " · 已折叠" : ""}`; const label = node.content === "task" ? `${viewLabels[node.view]}${node.query ? ` · ${node.query}` : ""} · ` : ""; return node.kind === "container" ? position : `${label}${position}`; }

      let locateTimer = null; let firstMainListId = "";
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

      function toggleTarget(id) {
        const target = findNode(id); if (!target) return;
        target.visible = !target.visible;
        save(); renderWorkspace();
        if (drawer.classList.contains("show")) renderDrawer();
      }

      function appSettingsMarkup() {
        if (typeof api.listSettings !== "function") return '<div class="owb-empty">当前主程序版本没有公开配置接口</div>';
        const groups = new Map(); api.listSettings().forEach((setting) => {
          const items = groups.get(setting.group || "其他") || []; items.push(setting); groups.set(setting.group || "其他", items);
        });
        return `<div class="owb-app-settings">${[...groups].map(([group, items]) => `<section class="owb-app-setting-group"><h5>${api.escapeHtml(group)}</h5><div class="owb-app-setting-grid">${items.map((setting) => {
          const control = setting.type === "select" ? `<select data-app-setting="${api.escapeHtml(setting.id)}">${(setting.options || []).map((option) => `<option value="${api.escapeHtml(option.value)}"${String(option.value) === String(setting.value) ? " selected" : ""}>${api.escapeHtml(option.label)}</option>`).join("")}</select>` : `<input data-app-setting="${api.escapeHtml(setting.id)}" value="${api.escapeHtml(setting.value ?? "")}" placeholder="${api.escapeHtml(setting.placeholder || "")}">`;
          return `<label class="owb-app-setting ${setting.description ? "owb-app-setting-wide" : ""}"><span>${api.escapeHtml(setting.label)}</span>${control}${setting.description ? `<small>${api.escapeHtml(setting.description)}</small>` : ""}</label>`;
        }).join("")}</div></section>`).join("")}</div>`;
      }

      function bindAppSettings() {
        drawer.querySelectorAll("[data-app-setting]").forEach((control) => control.onchange = () => {
          try { api.setAppSetting(control.dataset.appSetting, control.value); api.setNotice(`已更新：${control.closest("label")?.querySelector("span")?.textContent || control.dataset.appSetting}`); }
          catch (error) { api.setNotice(`配置保存失败：${error?.message || String(error)}`); }
        });
      }

      function renderDrawer() {
        const editing = findNode(editingId); if (editingId && !editing) editingId = null;
        const active = editing || null; const containers = config.nodes.filter((node) => node.kind === "container");
        const history = api.getSetting("layoutHistory", []);
        const list = config.nodes.map((node) => `<div class="owb-node-config" data-locate="${api.escapeHtml(node.id)}"><span><strong>${api.escapeHtml(node.title)}${node.visible ? "" : " · 已隐藏"}${node.locked ? " · 已锁" : ""}${node.collapsed ? " · 已折叠" : ""}</strong><small>${api.escapeHtml(nodeDescription(node))}${node.parent !== "root" ? ` · 位于 ${api.escapeHtml(findNode(node.parent)?.title || node.parent)}` : ""}</small></span><span class="owb-config-actions"><button class="owb-locate" data-locate="${api.escapeHtml(node.id)}">定位</button><button class="owb-edit" data-edit="${api.escapeHtml(node.id)}">编辑</button>${["detail", "layout"].includes(node.content) ? "" : `<button class="owb-remove" data-remove="${api.escapeHtml(node.id)}">删除</button>`}</span></div>`).join("");
        const historyItems = history.length ? history.map((entry, index) => `<div class="owb-history-item"><span><strong>${api.escapeHtml(entry.time)}${entry.label ? ` · ${api.escapeHtml(entry.label)}` : ""}</strong><small>${entry.nodes.length} 个节点</small></span><button class="owb-restore" data-history="${index}">恢复</button></div>`).join("") : '<div class="owb-empty">还没有布局历史</div>';
        drawer.innerHTML = `<div class="owb-config-head"><h3>空白画布布局</h3><span class="owb-config-actions"><button class="owb-reset" type="button">恢复原始布局</button><button class="owb-use-mode" type="button">使用模式</button><button class="owb-config-close" aria-label="关闭布局设置">×</button></span></div><button class="owb-history-toggle" type="button">默认布局与历史 <span class="owb-caret">▸</span></button><div class="owb-history-box" hidden><div class="owb-section-row"><h4>默认布局与历史</h4><span class="owb-config-actions"><button class="owb-set-default" type="button">设为默认布局</button><button class="owb-export-history" type="button">导出</button><button class="owb-import-history" type="button">导入</button><button class="owb-clear-history" type="button">清空历史</button></span></div><div class="owb-history">${historyItems}</div></div><button class="owb-history-toggle owb-app-settings-toggle" type="button">主程序公开设置 <span class="owb-caret">▸</span></button><div class="owb-app-settings-box" hidden>${appSettingsMarkup()}</div><p class="owb-hint">当前是布局模式：拖动或缩放未锁定节点（默认按半格微调，按住 Shift 吸附整格；从节点任意处拖动），双击任意节点直接打开它的编辑表单；鼠标划过节点会弹出注释（仅布局模式），点击下方节点行可在画布中定位高亮；面板标题栏可拖动位置。主程序公开设置由宿主动态提供，新增公开配置不需要再修改本插件。完成后点击“使用模式”，页面只保留真正的功能内容。</p><div class="owb-section-row"><h4>节点</h4><button class="owb-auto" type="button">自动排列未锁定停靠项</button></div><div>${list}</div>
          <div class="owb-form"><label class="owb-field"><span>节点类型</span><select id="owbKind"><option value="window">窗口</option><option value="container">容器</option></select></label><label class="owb-field owb-content-field"><span>窗口内容</span><select id="owbContent">${Object.entries(contentKinds).map(([value, item]) => `<option value="${value}">${item.label}</option>`).join("")}</select></label><label class="owb-field"><span>名称</span><input id="owbTitle"></label><label class="owb-check owb-title-check"><input id="owbShowTitle" type="checkbox">显示标题</label><label class="owb-field owb-parent-field"><span>放入容器</span><select id="owbParent"><option value="root">根画布</option>${containers.map((node) => `<option value="${api.escapeHtml(node.id)}">${api.escapeHtml(node.title)}</option>`).join("")}</select></label>
          <label class="owb-field"><span>X（0.5–12.5）</span><input id="owbX" type="number" min="0.5" max="12.5" step="0.5"></label><label class="owb-field"><span>Y（0.5 起）</span><input id="owbY" type="number" min="0.5" max="241" step="0.5"></label><label class="owb-field"><span>展开宽度（0.5–12）</span><input id="owbW" type="number" min="0.5" max="12" step="0.5"></label><label class="owb-field"><span>展开高度</span><input id="owbH" type="number" min="0.5" max="24" step="0.5"></label>
          <div class="owb-checks"><label class="owb-check"><input id="owbVisible" type="checkbox">使用模式显示节点</label><label class="owb-check"><input id="owbFloating" type="checkbox">浮动（允许重叠）</label><label class="owb-check"><input id="owbLocked" type="checkbox">锁定位置</label><label class="owb-check"><input id="owbCollapsible" type="checkbox">启用折叠</label><label class="owb-check owb-collapsed-check"><input id="owbCollapsed" type="checkbox">当前处于折叠状态</label><label class="owb-check"><input id="owbAutoCollapse" type="checkbox">点击外部自动折叠</label><label class="owb-check"><input id="owbShowFrame" type="checkbox">显示框线（使用模式）</label><label class="owb-check owb-content-check"><input id="owbShowContent" type="checkbox">使用模式显示内容</label><label class="owb-check owb-smart-check"><input id="owbVertical" type="checkbox">智能清单一列列横排（图标在上）</label></div><span class="owb-float-fields"><label class="owb-field"><span>折叠 X（0.5–12.5）</span><input id="owbCX" type="number" min="0.5" max="12.5" step="0.5"></label><label class="owb-field"><span>折叠 Y（0.5 起）</span><input id="owbCY" type="number" min="0.5" max="241" step="0.5"></label><label class="owb-field"><span>折叠宽度</span><input id="owbCW" type="number" min="0.1" max="12" step="0.1"></label><label class="owb-field"><span>折叠高度</span><input id="owbCH" type="number" min="0.1" max="15" step="0.1"></label><label class="owb-field"><span>折叠显示文字</span><input id="owbCollapseText" maxlength="24"></label><label class="owb-field"><span>折叠文字方向</span><select id="owbCollapseDir"><option value="h">横放</option><option value="v">竖放</option></select></label></span>
          <span class="owb-task-fields"><label class="owb-field"><span>任务基础视图</span><select id="owbView">${Object.entries(viewLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label><label class="owb-field"><span>最多显示</span><input id="owbLimit" type="number" min="1" max="200"></label><label class="owb-field wide"><span>附加搜索条件</span><input id="owbQuery" placeholder="例如：status:TODO tag:工作"></label><label class="owb-check"><input id="owbFilterButton" type="checkbox">显示应用当前筛选按钮</label><label class=owb-field><span>未完成的定义</span><select id=owbOpenRule><option value=done>非 DONE/CNCL（默认）</option><option value=status>仅 TODO 与 NEXT</option><option value=closed>无 CLOSED 日期</option></select></label></span><span class="owb-quadrant-fields"><label class="owb-field"><span>重要判定</span><select id="owbQuadImportant"><option value="A">仅 A 优先级</option><option value="AB">A 或 B 优先级</option><option value="ANY">任意优先级</option><option value="TAG">带“重要”标签</option></select></label><label class="owb-field"><span>紧急判定</span><select id="owbQuadUrgent"><option value="0">当天</option><option value="3">3 天内</option><option value="7">7 天内</option><option value="14">14 天内</option><option value="OVERDUE">仅已逾期</option><option value="TAG">带“紧急”标签</option></select></label></span>
          <span class="owb-button-fields"><label class="owb-field wide"><span>按钮文字</span><input id="owbButtonText" maxlength="24"></label><label class="owb-field wide"><span>绑定窗口或容器（点击切换显示/隐藏）</span><select id="owbButtonTarget"><option value="">（无）</option>${config.nodes.filter((node) => node.id !== active?.id).map((node) => `<option value="${api.escapeHtml(node.id)}">${api.escapeHtml(node.title)}（${node.kind === "container" ? "容器" : "窗口"}）</option>`).join("")}</select></label><label class="owb-field"><span>形状</span><select id="owbButtonShape"><option value="square">直角</option><option value="rounded">圆角</option><option value="pill">胶囊</option><option value="circle">圆形</option></select></label><label class="owb-field"><span>颜色</span><select id="owbButtonColor"><option value="accent">主题色</option><option value="blue">蓝色</option><option value="green">绿色</option><option value="red">红色</option><option value="yellow">黄色</option><option value="neutral">中性色</option><option value="custom">自定义</option></select></label><label class="owb-field"><span>填充方式</span><select id="owbButtonFill"><option value="solid">实心</option><option value="soft">柔和底色</option><option value="outline">描边</option><option value="ghost">无底色</option></select></label><label class="owb-field"><span>阴影</span><select id="owbButtonShadow"><option value="none">无</option><option value="soft">柔和</option><option value="strong">明显</option></select></label><label class="owb-field"><span>字号（px）</span><input id="owbButtonFontSize" type="number" min="8" max="24"></label><label class="owb-field owb-button-custom-color"><span>自定义颜色</span><input id="owbButtonCustomColor" type="color"></label><label class="owb-field"><span>实心文字颜色</span><input id="owbButtonTextColor" type="color"></label></span>
          <span class="owb-zoom-fields"><label class="owb-field"><span>内容缩放（%）</span><input id="owbZoom" type="number" min="50" max="200" step="5"></label></span><span class="owb-style-fields"><label class="owb-field"><span>文字大小（px）</span><input id="owbFontSize" type="number" min="6" max="24"></label><label class="owb-field"><span>文字颜色</span><input id="owbTextColor" type="color" value="#000000"></label><label class="owb-check"><input id="owbBold" type="checkbox">内容加粗</label></span><span class="owb-decor-fields"><label class="owb-field"><span>图案类型</span><select id="owbDecorKind"><option value="text">文字</option><option value="line-h">横线</option><option value="line-v">竖线</option><option value="dots">圆点</option><option value="blank">空白</option></select></label><label class="owb-field"><span>显示文字</span><input id="owbDecorText" maxlength="48"></label></span>
          <div class="owb-form-actions"><button class="owb-cancel" id="owbCancel" ${active ? "" : "hidden"}>取消修改</button><button class="owb-save" id="owbSave">${active ? "保存修改" : "添加节点"}</button></div></div>`;
        const $ = (selector) => drawer.querySelector(selector); $(".owb-config-close").onclick = () => drawer.classList.remove("show"); $(".owb-use-mode").onclick = () => { if (config.mode === "layout") pushHistory(); config.mode = "use"; editingId = null; drawer.classList.remove("show"); save(); renderWorkspace(); }; $(".owb-reset").onclick = () => { const savedDefault = api.getSetting("defaultLayout", null); const target = savedDefault ? savedDefault.nodes : defaults.nodes; if (!window.confirm(`恢复为${savedDefault ? "你保存的默认布局" : "未启用插件时的默认侧栏、顶栏和主清单排布"}？当前布局位置会被替换。`)) return; config = normalizeConfig({ schema: 4, mode: "layout", nodes: target }); editingId = null; save(); renderWorkspace(); renderDrawer(); }; $(".owb-auto").onclick = arrange;
        $(".owb-set-default").onclick = () => { api.setSetting("defaultLayout", { nodes: clone(config.nodes) }); api.setNotice("已把当前布局保存为默认布局。"); renderDrawer(); };
        $(".owb-clear-history").onclick = () => { api.setSetting("layoutHistory", []); renderDrawer(); };
        $(".owb-export-history").onclick = exportHistory; $(".owb-import-history").onclick = importHistory;
        drawer.querySelectorAll(".owb-restore").forEach((button) => button.onclick = (event) => { event.stopPropagation(); const entry = history[Number(button.dataset.history)]; if (!entry) return; config = normalizeConfig({ schema: 4, mode: "layout", nodes: entry.nodes }); editingId = null; save(); renderWorkspace(); renderDrawer(); api.setNotice(`已恢复 ${entry.time} 的布局。`); });
        const historyToggle = $(".owb-history-toggle"), historyBox = $(".owb-history-box");
        historyToggle.onclick = () => { const show = historyBox.hidden; historyBox.hidden = !show; historyToggle.classList.toggle("open", show); historyToggle.querySelector(".owb-caret").textContent = show ? "▾" : "▸"; };
        const appSettingsToggle = $(".owb-app-settings-toggle"), appSettingsBox = $(".owb-app-settings-box");
        appSettingsToggle.onclick = () => { const show = appSettingsBox.hidden; appSettingsBox.hidden = !show; appSettingsToggle.classList.toggle("open", show); appSettingsToggle.querySelector(".owb-caret").textContent = show ? "▾" : "▸"; };
        bindAppSettings();
        drawer.querySelector(".owb-config-head").onpointerdown = (event) => {
          if (event.button !== undefined && event.button !== 0) return;
          if (event.target.closest("button") || window.matchMedia?.("(max-width:760px)").matches) return;
          event.preventDefault();
          const rect = drawer.getBoundingClientRect();
          drawer.style.right = ""; drawer.style.bottom = "";
          drawer.style.left = `${rect.left}px`; drawer.style.top = `${rect.top}px`;
          const start = { px: event.clientX, py: event.clientY, left: rect.left, top: rect.top, w: rect.width, h: rect.height };
          const move = (next) => { if (next.pointerId !== event.pointerId) return; const left = Math.max(4, Math.min(window.innerWidth - start.w - 4, start.left + next.clientX - start.px)); const top = Math.max(4, Math.min(window.innerHeight - start.h - 4, start.top + next.clientY - start.py)); drawer.style.left = `${left}px`; drawer.style.top = `${top}px`; };
          const finish = (next) => { if (next.pointerId !== event.pointerId) return; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish); api.setSetting("panelPos", { left: Number.parseFloat(drawer.style.left), top: Number.parseFloat(drawer.style.top) }); };
          window.addEventListener("pointermove", move, { passive: false }); window.addEventListener("pointerup", finish); window.addEventListener("pointercancel", finish);
        };
        const kind = $("#owbKind"), content = $("#owbContent"), floating = $("#owbFloating"), collapsible = $("#owbCollapsible");
        kind.value = active?.kind || "window"; kind.disabled = !!active; content.value = active?.content || "task"; $("#owbTitle").value = active?.title || ""; $("#owbParent").value = active?.parent || "root"; $("#owbX").value = String((active?.x ?? 0) + 1); $("#owbY").value = String((active?.y ?? 0) + 1); $("#owbW").value = String(active?.w || 4); $("#owbH").value = String(active?.h || 4); $("#owbVisible").checked = active ? active.visible !== false : true; floating.checked = !!active?.floating; $("#owbLocked").checked = !!active?.locked; collapsible.checked = !!active?.collapsible; $("#owbAutoCollapse").checked = !!active?.autoCollapse; $("#owbCX").value = String((active?.cx ?? active?.x ?? 0) + 1); $("#owbCY").value = String((active?.cy ?? active?.y ?? 0) + 1); $("#owbCW").value = String(active?.cw || 2); $("#owbCH").value = String(active?.ch || 1); $("#owbCollapseText").value = active?.collapseText || ""; $("#owbCollapseDir").value = active?.collapseVertical ? "v" : "h"; $("#owbView").value = active?.view || "all"; $("#owbLimit").value = String(active?.limit || 20); $("#owbFilterButton").checked = !!active?.filterButton; $("#owbOpenRule").value = active?.openRule || "done"; $("#owbQuadImportant").value = active?.quadrantRules?.important || "A"; $("#owbQuadUrgent").value = active?.quadrantRules?.urgent || "3"; $("#owbQuery").value = active?.query || ""; $("#owbShowFrame").checked = !!active?.showFrame; $("#owbShowContent").checked = active ? !!active.showContent : true; $("#owbShowTitle").checked = !!active?.showTitle; $("#owbFontSize").value = active?.fontSize ? String(active.fontSize) : ""; $("#owbZoom").value = active?.zoom && active.zoom !== 1 ? String(Math.round(active.zoom * 100)) : ""; $("#owbBold").checked = !!active?.bold; $("#owbTextColor").value = active?.textColor || "#000000"; $("#owbCollapsed").checked = !!active?.collapsed; $("#owbVertical").checked = !!active?.vertical; $("#owbButtonText").value = active?.text || ""; $("#owbButtonTarget").value = active?.target || ""; $("#owbButtonShape").value = active?.buttonShape || "rounded"; $("#owbButtonColor").value = active?.buttonColor || "accent"; $("#owbButtonFill").value = active?.buttonFill || "solid"; $("#owbButtonShadow").value = active?.buttonShadow || "none"; $("#owbButtonFontSize").value = String(active?.buttonFontSize || 10); $("#owbButtonCustomColor").value = active?.buttonCustomColor || "#5b6cf9"; $("#owbButtonTextColor").value = active?.buttonTextColor || "#ffffff"; $("#owbDecorKind").value = active?.decor || "text"; $("#owbDecorText").value = active?.text || "";
        const sync = () => { const windowMode = kind.value === "window"; $(".owb-content-field").style.display = windowMode ? "grid" : "none"; $(".owb-parent-field").style.display = windowMode ? "grid" : "none"; drawer.querySelectorAll(".owb-task-fields").forEach((item) => item.style.display = windowMode && ["task","mainList"].includes(content.value) ? "contents" : "none"); drawer.querySelectorAll(".owb-button-fields").forEach((item) => item.style.display = windowMode && content.value === "button" ? "contents" : "none"); drawer.querySelectorAll(".owb-button-custom-color").forEach((item) => item.style.display = windowMode && content.value === "button" && $("#owbButtonColor").value === "custom" ? "grid" : "none"); drawer.querySelectorAll(".owb-decor-fields").forEach((item) => item.style.display = windowMode && content.value === "decor" ? "contents" : "none"); drawer.querySelectorAll(".owb-smart-check").forEach((item) => item.style.display = windowMode && content.value === "smart" ? "flex" : "none"); drawer.querySelectorAll(".owb-collapsed-check").forEach((item) => item.style.display = floating.checked && collapsible.checked ? "flex" : "none"); drawer.querySelectorAll(".owb-content-check").forEach((item) => item.style.display = windowMode ? "flex" : "none"); drawer.querySelectorAll(".owb-zoom-fields").forEach((item) => item.style.display = windowMode ? "contents" : "none"); drawer.querySelectorAll(".owb-style-fields").forEach((item) => item.style.display = windowMode && content.value === "decor" ? "contents" : "none"); drawer.querySelectorAll(".owb-quadrant-fields").forEach((item) => item.style.display = windowMode && ["task","mainList"].includes(content.value) && $("#owbView").value === "quadrant" ? "contents" : "none"); drawer.querySelectorAll(".owb-float-fields").forEach((item) => item.style.display = floating.checked && collapsible.checked ? "contents" : "none"); $("#owbCollapsible").disabled = !floating.checked; $("#owbCollapsed").disabled = !floating.checked || !collapsible.checked; $("#owbAutoCollapse").disabled = !floating.checked || !collapsible.checked; $("#owbShowFrame").disabled = floating.checked; };
        sync(); kind.onchange = sync; $("#owbView").onchange = sync; $("#owbButtonColor").onchange = sync; content.onchange = () => { if (!$("#owbTitle").value.trim()) $("#owbTitle").value = contentKinds[content.value].label; sync(); }; floating.onchange = sync; collapsible.onchange = sync;
        $("#owbDecorText").addEventListener("input", () => { if (!$("#owbTitle").value.trim() || $("#owbTitle").value === contentKinds.decor.label) $("#owbTitle").value = $("#owbDecorText").value.slice(0, 32); });
        drawer.querySelectorAll(".owb-node-config[data-locate]").forEach((row) => row.onclick = (event) => { if (event.target.closest("button")) return; locateNode(row.dataset.locate); });
        drawer.querySelectorAll(".owb-locate").forEach((button) => button.onclick = (event) => { event.stopPropagation(); locateNode(button.dataset.locate); });
        drawer.querySelectorAll("[data-edit]").forEach((button) => button.onclick = (event) => { event.stopPropagation(); locateNode(button.dataset.edit); editingId = button.dataset.edit; renderDrawer(); });
        drawer.querySelectorAll("[data-remove]").forEach((button) => button.onclick = (event) => { event.stopPropagation(); const removed = findNode(button.dataset.remove); if (!removed) return; if (removed.kind === "container") config.nodes.forEach((node) => { if (node.parent === removed.id) node.parent = "root"; }); config.nodes = config.nodes.filter((node) => node.id !== removed.id); editingId = null; save(); renderWorkspace(); renderDrawer(); });
        $("#owbCancel").onclick = () => { editingId = null; renderDrawer(); };
        $("#owbSave").onclick = () => { const nodeKind = kind.value; const nodeContent = nodeKind === "window" ? content.value : ""; if (!["task", "button", "decor", "mainList"].includes(nodeContent) && config.nodes.some((node) => node.content === nodeContent && node.id !== editingId)) { api.setNotice(`“${contentKinds[nodeContent].label}”只能添加一个。`); return; } if (!editingId && config.nodes.length >= 48) { api.setNotice("最多创建 48 个节点。"); return; }
          const existing = findNode(editingId); const parent = nodeKind === "container" ? "root" : $("#owbParent").value; const values = { kind: nodeKind, content: nodeContent, title: ($("#owbTitle").value.trim() || (nodeKind === "container" ? "容器" : contentKinds[nodeContent].label)).slice(0, 32), parent, x: clampFloat(Number($("#owbX").value) - 1, 0, 11.5, 0), y: clampFloat(Number($("#owbY").value) - 1, 0, 240, 0), w: clampFloat($("#owbW").value, 0.5, 12, 4), h: clampFloat($("#owbH").value, 0.5, 24, 4), visible: $("#owbVisible").checked, floating: floating.checked, locked: $("#owbLocked").checked, collapsible: floating.checked && collapsible.checked, autoCollapse: floating.checked && collapsible.checked && $("#owbAutoCollapse").checked, collapsed: floating.checked && collapsible.checked && $("#owbCollapsed").checked, cw: clampFloat($("#owbCW").value, 0.1, 12, 2), ch: clampFloat($("#owbCH").value, 0.1, 15, 1), collapseText: ($("#owbCollapseText").value.trim() || "").slice(0, 24), collapseVertical: $("#owbCollapseDir").value === "v", cx: floating.checked && collapsible.checked ? clampFloat(Number($("#owbCX").value) - 1, 0, 11.5, 0) : (existing?.cx ?? clampFloat(Number($("#owbX").value) - 1, 0, 11.5, 0)), cy: floating.checked && collapsible.checked ? clampFloat(Number($("#owbCY").value) - 1, 0, 240, 0) : (existing?.cy ?? clampFloat(Number($("#owbY").value) - 1, 0, 240, 0)), showTitle: $("#owbShowTitle").checked, showFrame: floating.checked || $("#owbShowFrame").checked };
          values.x = Math.min(values.x, 12 - values.w); if (nodeContent === "detail") { values.floating = true; values.collapsible = true; }
          if (nodeContent === "task" || nodeContent === "mainList") { values.view = $("#owbView").value; values.limit = clamp($("#owbLimit").value, 1, 200, 20); values.query = $("#owbQuery").value.trim().slice(0, 180); values.calendarCursor = existing?.calendarCursor || api.today(); values.statisticsPeriod = existing?.statisticsPeriod || api.getAppSetting?.("statistics.period", "week") || "week"; values.statisticsCategory = existing?.statisticsCategory || "file"; values.filterButton = $("#owbFilterButton").checked; values.openRule = ["done","status","closed"].includes($("#owbOpenRule").value) ? $("#owbOpenRule").value : "done"; values.quadrantRules = { important: $("#owbQuadImportant").value, urgent: $("#owbQuadUrgent").value }; }
          if (nodeContent === "button") { values.text = ($("#owbButtonText").value.trim() || "按钮").slice(0, 24); values.target = $("#owbButtonTarget").value; if (values.target && parentChainContains(parent, values.target)) { api.setNotice("按钮不能绑定自身所在的容器或祖先容器，否则隐藏后将无法再次显示。"); return; } values.buttonShape = $("#owbButtonShape").value; values.buttonColor = $("#owbButtonColor").value; values.buttonFill = $("#owbButtonFill").value; values.buttonShadow = $("#owbButtonShadow").value; values.buttonFontSize = clampFloat($("#owbButtonFontSize").value, 8, 24, 10); values.buttonCustomColor = $("#owbButtonCustomColor").value; values.buttonTextColor = $("#owbButtonTextColor").value; }
          if (nodeContent === "decor") { values.decor = $("#owbDecorKind").value; values.text = $("#owbDecorText").value.slice(0, 48); if (values.text && (!existing || existing.title === contentKinds.decor.label)) values.title = values.text.slice(0, 32); }
          if (nodeContent === "smart") { values.vertical = $("#owbVertical").checked; }
          if (nodeKind === "window") { values.showContent = $("#owbShowContent").checked; values.zoom = Number($("#owbZoom").value) > 0 ? clampFloat(Number($("#owbZoom").value) / 100, 0.5, 2, 1) : 1; if (nodeContent === "decor") { values.fontSize = Number($("#owbFontSize").value) > 0 ? clampFloat($("#owbFontSize").value, 6, 24, 0) : 0; values.bold = $("#owbBold").checked; values.textColor = /^#[0-9a-f]{6}$/i.test($("#owbTextColor").value) ? $("#owbTextColor").value : ""; } } else values.showContent = true;
          if (existing) Object.assign(existing, values); else { const node = { id: `node-${Date.now()}`, collapsed: false, ...values }; if (!node.floating) { const position = firstFree(node, parent); node.x = position.x; node.y = position.y; } config.nodes.push(node); }
          editingId = null; save(); renderWorkspace(); renderDrawer(); };
      }

      const outsideCollapse = (event) => { if (config.mode !== "use") return; const owner = event.target.closest?.("[data-owb-node]")?.dataset?.owbNode; const closing = config.nodes.filter((node) => node.floating && node.collapsible && node.autoCollapse && !node.collapsed && node.id !== owner); if (closing.length) { closing.forEach((node) => { node.collapsed = true; const element = [...canvas.querySelectorAll("[data-owb-node]")].find((item) => item.dataset.owbNode === node.id); if (element) { element.classList.add("collapsed"); geometry(element, node); } }); syncCanvasSize(); save(); if (drawer.classList.contains("show")) renderDrawer(); } };
      document.addEventListener("pointerdown", outsideCollapse);
      api.onUpdate((summary) => { lastSummary = summary; const detailNode = config.nodes.find((node) => node.content === "detail"); if (summary.selected && detailNode && detailNode.collapsed) { detailNode.collapsed = false; save(); } renderWorkspace(); });
      api.onSettingsChange?.(() => { if (drawer.classList.contains("show")) renderDrawer(); });
      renderWorkspace(); renderDrawer();
      const countdownTimer = setInterval(() => { if (config.nodes.some((node) => ["task", "mainList"].includes(node.content) && (node.view === "countdown" || node.view === "all"))) renderWorkspace(); }, 60000);
      const panelPos = api.getSetting("panelPos", null);
      if (panelPos && !window.matchMedia?.("(max-width:760px)").matches) {
        drawer.style.left = `${Number(panelPos.left) || 16}px`; drawer.style.top = `${Number(panelPos.top) || 16}px`;
        drawer.style.right = ""; drawer.style.bottom = "";
      }
      return { deactivate() { clearTimeout(locateTimer); clearInterval(countdownTimer); document.removeEventListener("pointerdown", outsideCollapse); restoreRegions(); document.body.classList.remove("owb-blank"); } };
    },
  });
})();
