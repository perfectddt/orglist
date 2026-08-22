# Orglist 外部插件开发说明

Orglist 1.8.0 的插件由用户在“设置 → 插件”中导入，不在主程序中预置。插件文件和启用状态保存在当前应用的 IndexedDB。

> JavaScript 插件与主页面拥有相同权限，能读取当前 Org 内容、本地设置和平台桥接对象。只安装可信文件。Windows 与 Android 使用相同 API，但 `platform` 不同，且 Android 不提供 Windows 本地桥接服务。

## 插件清单

JavaScript 文件开头必须有一行 JSON 清单，并调用一次注册接口：

```js
/* @orglist-plugin {"id":"example.format","name":"示例格式","version":"1.0.0","type":"format","hostApi":2} */

window.OrglistPluginHost.register({
  manifest: {
    id: "example.format",
    name: "示例格式",
    version: "1.0.0",
    type: "format",
    hostApi: 2,
  },
  activate(api) {
    return {};
  },
});
```

`id` 只能包含小写字母、数字、点、下划线和连字符。`type` 支持：

- `editor`：替换编辑区交互层。
- `format`：定义彩色高亮、保存前校验和文本规范化。
- `theme`：定义整个页面的 CSS 或其他页面样式行为。
- `layout`：重新编排工作台区域，并创建一个或多个独立任务窗口。

## 编辑器插件

`activate(api)` 可返回：`getText`、`setText`、`getSelection`、`setSelection`、`replaceRange`、`focus`、`setEditorMode`、`deactivate`。

宿主 API 提供：`getText`、`setText`、`getEditorMode`、`createMount`、`hideNativeEditor`、`showNativeEditor`、`setMode`、`setMessage`、`setCursor`、`write`、`close`、`showHelp`，以及 `platform`。

离线高级 Vim 示例位于 `plugins/OrglistPlugin-AdvancedVim.js`。把该文件保存到设备后，再从设置页导入即可；主程序不会自动加载它。

Spacemacs 风格 Org 编辑格式位于 `plugins/OrglistPlugin-SpacemacsOrgFormat.js`。导入并启用后，在编辑器工具栏的“格式”下拉框中选择它；标题层级会显示不同颜色、缩进位置和符号，标题正文会随最近标题层级缩进，但文件中的星号与正文不会被改写。1.1.0 起同一呈现模型可同时用于内置轻量编辑器和高级 Vim 1.2.0。

蓝色页面主题位于 `plugins/OrglistPlugin-BlueOcean.css`。它同时定义浅色和深色两套蓝色变量，并调整侧栏、顶栏、按钮、卡片阴影、输入焦点和滚动条；直接导入并启用即可，不需要在其他下拉框中选择。

可配置工作台布局位于 `plugins/OrglistPlugin-ConfigurableWorkbench.js`。4.1.14 将使用模式下的“布局”入口改成与其他按钮相同的普通 click：使用模式禁止拖动并始终隐藏“⋮⋮”手柄，仅布局模式允许拖动；主程序“设置 → 插件”中还会在该插件旁显示备用“布局”按钮。4.1.13 曾让布局按钮在 pointerdown 时立即切换，不再依赖容易丢失或取消的 pointerup；拖动只走独立手柄，兼容 click 跨 DOM 重建去重。手机预览同时固定为 8765 端口，确保不同启动次数使用同一个 IndexedDB origin。4.1.12 修复布局按钮重建后后续 click 立即反向切换的问题。4.1.11 禁止导航等滚动容器接管布局按钮点击区的触摸。4.1.10 撤销布局按钮按下阶段的事件阻断，并让短按抬起直接切换模式，兼容 Android WebView 不生成后续 click 的情况，同时防止 pointerup 与 click 重复切换。4.1.9 将布局按钮点击区与独立“⋮⋮”拖动手柄彻底分离，按钮点击不再进入拖动逻辑或受点击抑制状态影响；手机使用模式隐藏手柄。4.1.8 修复布局按钮位于导航等较窄容器时，轻微触摸抖动被误判成拖动并吞掉点击的问题，同时让拖动后的点击抑制自动过期。4.1.7 为过小的布局节点保留至少 64×48px 触控区域，继续支持直接拖动并可靠区分点击与拖动。4.1.6 在布局面板的普通节点后新增“隐藏”复选框，可立即隐藏或恢复节点并保存状态；布局入口不允许隐藏。4.1.5 为窗口和容器新增 0–50 层级设置以及置底、下移、上移、置顶快捷按钮，层级持久保存，拖动和定位时仍临时置顶。4.1.4 修复按钮重新显示容器后文件列表等子窗口仍不显示的问题，容器的内容层不再被误隐藏。4.1.3 让手机端布局模式与使用模式共用同一套节点坐标、位置和尺寸，切换模式不再重新堆叠、跳位或改变浮窗大小；窄屏仍支持触摸拖动和缩放。4.1.2 修复手机窄屏布局模式可直接触摸拖动和缩放窗口。4.1.1 修复按钮重新显示目标时触发全画布高亮蒙版；4.1.0 新增节点显隐绑定：窗口与容器都有独立的“使用模式显示节点”属性，按钮可绑定任意窗口或容器，点击一次隐藏、再点一次显示，状态持久保存；按钮还可选择直角/圆角/胶囊/圆形，主题/蓝/绿/红/黄/中性/自定义颜色，实心/柔和/描边/无底色，以及字号、文字颜色和阴影。此前版本新增“主程序公开设置”动态表单，可直接修改默认图片文件夹等安全配置；宿主以后只需把新配置登记到公开设置注册表，工作台无需再为每个字段单独升级。4.1.2 继续把页面分成“布局模式”和“使用模式”，两种模式共用同一套 12 列坐标，布局所见即使用所得。布局模式不再常驻显示节点标题，鼠标划过节点会弹出注释（名称、内容类型、所在容器、位置与状态），注释只在布局模式出现；从节点任意处即可拖动，默认按半格微调、按住 Shift 吸附整格；双击节点直接打开编辑表单，锁定、浮动和折叠都集中在表单里，并可逐节点选择使用模式是否保留框线、是否显示内容（任务/日历、装饰文字图案等都可以单独隐藏）。名称旁新增“显示标题”开关；节点头部右侧的灰色“窗口内容”类别文字已彻底去掉。装饰文字节点输入自定义文字后自动用作节点标题；文字大小、加粗和文字颜色只在“装饰文字/图案”节点出现，而“内容缩放”对所有窗口都可用。中间主清单可以通过表单添加多个：第一个沿用原主清单区域，其余是独立主清单窗口，每个都带“应用当前筛选”按钮，可把当前的状态、优先级、标签、搜索语法、当前文件、智能清单视图、自定义清单查询等全部条件分别保存到各自窗口，应用后列表会真正按这些条件过滤显示（含正确识别“未完成/OPEN”状态，不会再整列表清空）；“未完成”的定义可在筛选条件里自定义（默认非 DONE/CNCL，可选仅 TODO/NEXT，或无 CLOSED 日期）；主清单的基础视图会跟随应用当前的智能清单视图，双向都能切换（含日历）；任务/日历窗口自己设好的基础视图（如四象限）不会被“应用当前筛选”覆盖。布局按钮加大，更容易点击，并且它的“浮动”开关能真正保存：关闭浮动后重新打开仍保持停靠，不会再变回浮动（此前加载时被强制设为浮动，现已修复）。在“设置 → 插件”里删除插件时，该插件保存的布局、历史等设置会一并清除。点击任务/条目时，如果“条目详情”窗口处于折叠状态会自动展开（无论点击的是任务窗口、四象限还是第一个主清单）。任务窗口的四象限视图在某个象限没有条目时，空栏高度会自动收缩，不再强行占满一半。可折叠浮窗把“折叠前/折叠后”当作两个窗口：展开与折叠各自独立的位置和大小；折叠宽高最小可到 0.1，且折叠高度拖动上限与加载一致（最多 15 行，重开不再变小）；折叠状态下隐藏原本内容，可设置“折叠显示文字”并选择横放或竖放（竖放文字自上而下排列）；布局模式冻结使用模式的折叠状态，展开/折叠切换只在使用模式发生，表单可勾选“当前处于折叠状态”。任务窗口新增“四象限”基础视图：仅当任务基础视图选择“四象限”时，表单会出现“重要判定”和“紧急判定”两个自定义规则，逐窗口保存，四象限沿用主清单的红/蓝/黄/绿配色，任务行带状态色和优先级标记，日历条目按状态着色。点击面板中的节点行或“定位”按钮会在整个画布中高亮并滚动到该节点。新增“按钮节点”、“装饰文字/图案”窗口（文字、横线、竖线、圆点、空白），智能清单窗口可勾选“一列列横排（图标在上）”。布局面板本身可拖动，位置会记住；面板顶部的“默认布局与历史”按钮展开“设为默认布局”与“布局历史”，可恢复、清空、导出为 JSON，也可导入 JSON 恢复。未勾选框线/内容的节点在使用模式隐藏边框和内容。任务窗口支持全部条目/未完成/今天/未来/已逾期/已完成/无日期/习惯/四象限及年、月、周、日日历视图；手机窄屏与桌面端一样按保存的节点坐标和尺寸显示，布局模式所见即使用模式所得。

## 编辑格式插件

`activate(api)` 返回对象可实现以下同步方法：

- `highlight(text, context)`：返回高亮层 HTML。输入来自当前编辑器。
- `validate(text, context)`：返回 `true` 表示通过；返回字符串、`false` 或 `{ok:false,message}` 会阻止应用/写回。
- `normalize(text, context)`：在应用/写回前返回规范化文本。
- `presentation(text, context)`：返回逐行呈现模型，供高级编辑器复用。标题行可返回 `kind`、`icon`、`prefixLength`、`levelClass`、`lineClass`；正文行可返回 `indent` 与 `lineClass`。
- `deactivate()`：停用时清理资源。

`api.escapeHtml(text)` 用于转义不可信文本，`api.token(className, text)` 可生成高亮片段，`api.builtinOrgHighlight(text)` 可复用内置 Org 高亮。高级编辑器通过宿主的 `getFormatPresentation(text)` 获取同一逐行模型，因此不应在编辑器插件中写死某个格式插件。格式插件只改变编辑阶段的显示与保存前处理；Orglist 的任务读取模型仍以 Org 文件为核心。

## 页面样式插件

最轻量的方式是直接导入 `.css` 文件。Orglist 会把它作为页面样式插件保存并注入主样式之后。也可使用 `type:"theme"` 的 JavaScript 插件：

```js
activate(api) {
  const remove = api.addStyle(":root { --accent:#7c3aed; }");
  return { deactivate: remove };
}
```

主题 API 提供 `addStyle(css)`、`removeStyles()`、`platform`。多个页面样式可以同时启用，后启用/后导入的规则通常具有更高 CSS 层叠优先级。

## 工作台布局插件

`type:"layout"` 插件用于改变区域关系，而不只是覆盖颜色。宿主在插件停用时会自动删除插件创建的样式和挂载节点，并把通过 `moveRegion` 移动的区域放回原处。同一区域同一时间只能由一个布局插件移动；其他布局插件仍可创建自己的附加窗口。

可访问的标准区域为：`app`、`navigation`（或 `sidebar`）、`workspace`、`toolbar`、`search`、`content`、`main`、`list`、`detail`、`filters`；可拆分区域包括 `brand`、`openActions`、`smartLists`、`customLists`、`fileLists`、`recentFiles`、`filterControls`、`viewHeader`、`viewAux`、`mainList`，以及 `settingsButton`、`addButton`、`themeButton`、`batchButton`、`searchHelpButton`、`menuButton`、`backButton`。

布局 API 提供：

- `getRegion(name)`：取得标准区域元素，供可信插件编排界面。
- `createMount(className, parent, before)`：创建由宿主跟踪、停用时自动删除的插件窗口。
- `moveRegion(name, target, position)`、`restoreRegion(name)`：移动并复原搜索栏等标准区域。
- `queryTasks(options)`：取得只读任务快照。支持 `view`、`query`、`status`、`priority`、`tags`、`fileId`、`sort`、`limit`；`view` 可为 `all`、`open`、`today`、`upcoming`、`overdue`、`completed`、`no-date`、`habits`。快照包含 `calendarDates` 与 `time`，可用于插件自己的年/月/周/日日历窗口。
- `onUpdate(listener)`：文件、筛选、选中项或主题变化后刷新插件窗口。
- `openTask(uid)`：选中任务并打开详情；`setDetailOpen(open)` 可让布局插件关闭或重新显示宿主详情。
- `listSettings()`：列出宿主公开的非敏感设置及其类型、选项和当前值；`getAppSetting(id)`、`setAppSetting(id, value)` 用于读取和修改。
- `onSettingsChange(listener)`：主设置页或其他插件修改公开设置后收到通知。密码、令牌和平台桥接私密信息不会进入公开设置注册表。
- `addStyle(css)`、`getSetting(key, fallback)`、`setSetting(key, value)`、`setNotice(message)`、`platform`。

`getSetting` / `setSetting` 是当前插件自己的私有存储；`getAppSetting` / `setAppSetting` 才是受宿主管理的主程序设置。插件虽然与主页面同域，技术上能直接碰 `localStorage`，但键名和数据结构属于内部实现，不应依赖。

最小示例：

```js
activate(api) {
  const panel = api.createMount("my-panel", "main", "list");
  const render = () => {
    const tasks = api.queryTasks({ view: "today", priority: ["A", "B"], limit: 10 });
    panel.textContent = `今天的重要任务：${tasks.length}`;
  };
  render();
  api.onUpdate(render);
  return {};
}
```

布局 JavaScript 仍与主页面处于同一运行环境，因此自动清理是生命周期保障，不是安全沙箱；只导入可信插件。

## 平台区别

- Windows 本地版：插件可通过普通文件选择器导入；页面本身连接 Windows 桥接服务时，可信插件也能看到对应的页面对象。
- Android WebView：使用系统文件选择器导入，插件继续保存在 WebView 的 IndexedDB。请不要依赖 Windows 路径、进程或“用其他应用打开”接口。
- 插件应优先使用宿主 API，并根据 `api.platform === "android"` 或 `"windows"` 做小范围差异处理。
