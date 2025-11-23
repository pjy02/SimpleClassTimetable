# 课程表 Web 应用 - 项目思路（project.md）

## 1. 项目简介

- 名称：SimpleClassTimetable
- 目标：在 Ubuntu 服务器上运行的轻量级课程表 Web 应用。
- 特点：
  - 无需数据库（使用本地 JSON 文件存储数据）。
  - 部署简单，依赖少。
  - 服务默认监听 7055 端口。
  - 访问 `http://服务器IP:7055/` 即进入课程表 UI 界面。
- 适用场景：
  - 个人课程管理（学生、老师）。
  - 小团队/实验室/培训班的课程安排展示。
  - 内网使用的简单课程公告板。

---

## 2. 功能需求设计

### 2.1 必选功能（第一版就实现）

1. 课程表展示  
   - 以「周视图」展示课程表：周一～周日列，时间段行。  
   - 当前周的课程高亮显示。  
   - 支持切换周数（例如：第 1 周 ~ 第 20 周）。

2. 课程管理  
   - 新增课程。  
   - 编辑课程（名称、教师、地点、时间等）。  
   - 删除课程。  
   - 支持按「列表形式」查看全部课程，以便管理。

3. 基础配置  
   - 设置学期名称（例如：`2025-春季学期`）。  
   - 设置学期第一周的起始日期（用于计算当前是第几周）。  
   - 显示选项（课表开始时间、结束时间、时间粒度，如每 30 分钟一格）。

4. 数据存储  
   - 所有数据保存在服务器本地 JSON 文件中：
     - `data/courses.json`：课程数据。
     - `data/settings.json`：配置数据。
   - 应用启动时自动加载，没有文件则自动创建默认文件。

### 2.2 可选/后续功能

1. 导入/导出  
   - 导出课程表为 JSON 文件（备份/迁移）。  
   - 导入 JSON 恢复配置。  
   - 可选 CSV 导入（便于从 Excel 导入）。

2. 打印与导出图片  
   - 提供「打印友好」视图，方便打印纸质课程表。  
   - 后续可考虑导出为 PNG/PDF（前端实现）。

3. 简单权限控制（可选，后续）  
   - 管理端可设置一个简单的密码（保存在配置文件中）。  
   - 浏览课表无需登录，修改课表需要输入管理密码。

4. 多用户 / 多课表（后续）  
   - 支持多个课表（比如不同班级），通过 URL 或下拉列表切换。

---

## 3. 技术栈选择

### 3.1 后端

- 语言：Python 3（Ubuntu 上安装和维护都比较方便）。
- Web 框架：Flask（轻量、简单，足够用于此项目）。
- 运行方式：
  - 开发环境：`python app.py` 直接运行。
  - 生产环境：建议 `gunicorn` + `systemd`，监听在 7055 端口。

### 3.2 前端

- 技术：
  - 原生 HTML + CSS + JavaScript（减少复杂度和打包步骤）。
  - 使用 CSS Grid / Flex 布局实现课程表网格。
  - 使用 Fetch API 调用后端接口（REST 风格）。
- UI 风格：
  - 清爽、响应式设计（在电脑和手机上都能看）。  
  - 课程块显示：课程名 + 地点 + 老师 + 时间。  
  - 不追求复杂动画，重点是可读性和易操作。

---

## 4. 端口与访问方式设计

- 监听端口：`7055`  
  - 默认配置：应用启动后监听 `0.0.0.0:7055`。  
  - 端口可以通过配置或环境变量覆盖，但默认就是 7055。

- 访问路径：
  - `GET /` 直接返回前端主界面（课程表 UI）。  
  - 使用单页应用结构：一个 `index.html` 搭配 JS。

---

## 5. 数据模型与存储方案（无数据库）

### 5.1 数据文件结构

- 根目录下的 `data/` 目录：
  - `data/courses.json`
  - `data/settings.json`
- 应用第一次启动时：
  - 如果 `data/` 不存在则自动创建。  
  - 如果文件不存在则写入空/默认内容。

### 5.2 课程数据模型（courses.json）

示例结构：

    [
      {
        "id": 1,
        "title": "高等数学",
        "teacher": "张老师",
        "location": "教学楼 A203",
        "weekday": 1,
        "start_time": "08:00",
        "end_time": "09:35",
        "weeks": [1, 2, 3, 4, 5, 6, 7, 8],
        "color": "#4caf50",
        "remark": "考勤严格"
      }
    ]

字段说明：

- `id`：课程唯一 ID（整数，自增）。  
- `title`：课程名称。  
- `teacher`：授课教师。  
- `location`：上课地点。  
- `weekday`：周几，1=周一, ..., 7=周日。  
- `start_time`：上课开始时间（`HH:MM`）。  
- `end_time`：下课时间（`HH:MM`）。  
- `weeks`：上课周次列表（整数数组）。  
- `color`：前端显示颜色（可选）。  
- `remark`：备注（可选）。

### 5.3 配置数据模型（settings.json）

示例结构：

    {
      "semester_name": "2025-春季学期",
      "first_week_monday": "2025-02-24",
      "day_start_time": "08:00",
      "day_end_time": "22:00",
      "slot_minutes": 30
    }

字段说明：

- `semester_name`：学期名称。  
- `first_week_monday`：第一周周一的日期（`YYYY-MM-DD`），用于计算当前周。  
- `day_start_time`：每天显示的最早时间（课程表从几点开始）。  
- `day_end_time`：每天显示的最晚时间。  
- `slot_minutes`：时间格子粒度（例如 30 表示每格 30 分钟）。

### 5.4 并发与数据安全

- 初期假设：同时修改课程数据的用户很少（1～2 人）。  
- 策略：
  - 读操作：从内存中读取，如文件更新则重新加载。  
  - 写操作：更新内存，再一次性写入 JSON 文件。  
  - 写入时可使用简单文件锁（例如锁文件）避免同时写入冲突。  
- 目标：设计简洁，易于理解、易维护。

---

## 6. 后端 API 设计

API 前缀：`/api`

### 6.1 课程相关接口

1. `GET /api/courses`  
   - 功能：获取所有课程列表。  
   - 返回：课程数组（`courses.json` 内容）。

2. `POST /api/courses`  
   - 功能：新增课程。  
   - 请求体：课程对象（不包含 `id`，后端自动分配）。  
   - 返回：新增后的完整课程对象。

3. `PUT /api/courses/<id>`  
   - 功能：更新指定课程。  
   - 请求体：更新后的课程对象。  
   - 返回：更新后的课程对象。

4. `DELETE /api/courses/<id>`  
   - 功能：删除指定课程。  
   - 返回：删除成功信息（例如 `{ "ok": true }`）。

5. `GET /api/schedule?week=<week_num>`  
   - 功能：按周获取课程表数据。  
   - 参数：`week` 为周次（整数）。  
   - 后端过滤 `weeks` 字段，只返回该周有课的课程数组。

### 6.2 配置相关接口

1. `GET /api/settings`  
   - 功能：获取当前配置。  

2. `PUT /api/settings`  
   - 功能：更新配置（例如学期名称、第一周日期、显示时间范围等）。  
   - 返回：更新后的配置对象。

### 6.3 辅助接口（可选）

1. `GET /api/current-week`  
   - 根据服务器当前日期和 `first_week_monday` 计算当前是第几周。  
   - 返回示例：`{ "week": 7 }`。

2. `GET /api/export`  
   - 返回整个数据（课程 + 配置）的 JSON 备份。

3. `POST /api/import`  
   - 上传 JSON 文件，替换现有数据（需要做好确认机制和校验）。

---

## 7. 前端 UI 设计思路

### 7.1 页面结构

单页应用，大致结构：

- 顶部栏（Header）  
  - 左：应用名称（例如“SimpleClassTimetable”）。  
  - 中：学期名称，下拉/按钮切换周次（上周 / 本周 / 下周）。  
  - 右：进入“管理模式”的按钮（例如“管理课程”）。

- 主区域（Main）  
  - Tab 1：课表视图
    - 使用 CSS Grid 实现 7 列（周一~周日）、多行（时间段）。  
    - 课程块在对应的星期和时间范围内合并显示。  
  - Tab 2：课程列表/管理视图  
    - 表格形式展示所有课程。  
    - 每行包含：课程名、教师、地点、周几、时间、周次、操作（编辑 / 删除）。  
    - 顶部有“新增课程”按钮，弹出表单。

- 底部（Footer）  
  - 简单版权/版本信息，例如：  
    `SimpleClassTimetable v0.1 | Powered by Flask`

### 7.2 交互细节

- 切换周次：  
  - 前端向 `/api/schedule?week=X` 请求数据，并重新渲染课程表。  

- 新增/编辑课程：  
  - 使用模态框（简单 div + CSS）弹出表单。  
  - 校验必填项（课程名、时间、星期等）。  

- 删除课程：  
  - 弹出确认提示（防止误删）。  

- 响应式设计：  
  - 大屏：显示完整网格课表。  
  - 小屏（手机）：可以使用按天折叠的列表形式展示课程，而不是完整网格。

---

## 8. 目录结构规划

推荐项目目录结构：

    project_root/
    ├─ app.py                  # Flask 入口文件
    ├─ requirements.txt        # Python 依赖
    ├─ data/
    │  ├─ courses.json
    │  └─ settings.json
    ├─ static/
    │  ├─ css/
    │  │  └─ style.css         # 页面样式
    │  ├─ js/
    │  │  └─ app.js            # 前端逻辑
    │  └─ assets/              # 图片等资源（如 logo）
    └─ templates/
       └─ index.html           # 前端主页面

说明：

- Flask 使用 `templates/index.html` 渲染 `/`。  
- `static/` 用于存放静态文件（CSS、JS、图片）。

---

## 9. 部署与运行方案（Ubuntu）

### 9.1 开发环境运行

1. 安装依赖（假设已有 Python3 和 pip）：

    pip install -r requirements.txt

2. 启动应用（直接使用 Flask 内置启动逻辑）：

    python app.py

3. 默认监听 `0.0.0.0:7055`，浏览器访问：

    http://服务器IP:7055/

### 9.2 生产环境部署（gunicorn + systemd）

1. 安装 gunicorn：

    pip install gunicorn

2. 测试运行：

    gunicorn -w 2 -b 0.0.0.0:7055 app:app

3. 创建 systemd 服务（示例，放在 `/etc/systemd/system/timetable.service`）：

    [Unit]
    Description=SimpleClassTimetable Service
    After=network.target

    [Service]
    WorkingDirectory=/path/to/project_root
    ExecStart=/usr/bin/gunicorn -w 2 -b 0.0.0.0:7055 app:app
    Restart=always
    User=www-data
    Group=www-data

    [Install]
    WantedBy=multi-user.target

4. 启动服务：

    sudo systemctl daemon-reload
    sudo systemctl enable timetable
    sudo systemctl start timetable

---

## 10. 安全与后续扩展

### 10.1 安全考虑

- 初期版本可部署在内网，无登录。  
- 若部署到公网，建议：
  - 增加简单密码保护（例如管理操作需要密码）。  
  - 使用 Nginx 做反向代理，配置 HTTPS。  
  - 考虑为修改操作做基础身份验证（如简易 Token）。

### 10.2 后续扩展方向

1. 多课表 / 多角色支持  
   - 一个应用管理多个班级或多个用户的课表（支持切换视图）。

2. 与现有系统对接  
   - 提供统一 API 供学校/实验室其他系统调用。

3. 提醒功能（需要额外组件）  
   - 与邮件或 IM（如企业微信、钉钉）对接，实现上课前提醒。

4. UI 进一步美化  
   - 引入轻量级 CSS 库（如 Bulma、Tailwind CDN 版），在不引入打包工具的前提下提升视觉效果。

---

## 11. 开发步骤建议（从 0 到能跑起来）

1. 初始化项目结构：
   - 创建 `app.py`、`templates/index.html`、`static/css/style.css`、`static/js/app.js`。  
   - 创建 `data/` 目录，预先放入空的 `courses.json` 和简单的 `settings.json`。

2. 在 `app.py` 中实现：
   - 基本 Flask 应用。  
   - 路由 `/` 返回 `index.html`。  
   - 课程 & 设置相关 API（从 JSON 文件读写）。  

3. 在前端实现基础功能：
   - 调用 `/api/schedule` 渲染周视图网格。  
   - 简单的课程列表页面。  

4. 实现新增/编辑/删除课程：
   - 完成对应的 API 调用。  
   - 前端表单和交互（模态框、列表刷新）。

5. 在 Ubuntu 上测试运行：
   - 使用 `python app.py` 或 `gunicorn` 启动。  
   - 确认 7055 端口访问正常，功能可用。

6. 逐步加入：
   - 导出/导入功能。  
   - 基础安全控制（管理密码）。  
   - 打印视图 / UI 优化。

---

（本文件可直接保存为 `project.md`，作为该课程表应用的总体设计与开发思路说明文档。）
