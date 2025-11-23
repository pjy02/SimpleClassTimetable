# SimpleClassTimetable

轻量级的课程表 Web 应用，基于 Flask 与原生 HTML/CSS/JS，无需数据库，数据保存在项目根目录下的 `data/` 文件夹中。

## 功能概览

- 学期与时间段设置：首周周一日期、每日开始/结束时间、时间粒度、学期名称。
- 周视图课表：按周次切换，按时间/星期排列课程块，展示地点、教师与备注。
- 课程管理：新增、编辑、删除课程，支持按列表管理全部课程。
- 数据导入导出：一键导出/导入 JSON 备份。

## 快速开始

1. 安装依赖（需要 Python 3）：

   ```bash
   pip install -r requirements.txt
   ```

2. 运行开发服务器（默认监听 `0.0.0.0:7055`）：

   ```bash
   python app.py
   ```

   如需自定义端口，设置环境变量 `PORT`。

3. 浏览器访问 `http://localhost:7055/`，即可看到课表界面。

## 数据存储

- `data/settings.json`：学期名称、首周周一日期（用于计算当前周次）、每日时间段与粒度。
- `data/courses.json`：课程信息，包含课程名、教师、地点、周几、时间、周次列表、颜色与备注。

应用启动时会自动创建缺失的 `data/` 目录与默认 JSON 文件。

## API 简述

- `GET /api/settings` / `PUT /api/settings`：读取或更新设置。
- `GET /api/current_week`：根据首周日期计算当前周次。
- `GET /api/courses` / `POST /api/courses`：列出或新增课程。
- `PUT /api/courses/<id>` / `DELETE /api/courses/<id>`：更新或删除课程。
- `GET /api/schedule?week=1`：按周次过滤课程供课表视图使用。
- `GET /api/export` / `POST /api/import`：导出或导入完整数据。

## 部署建议

生产环境推荐使用 gunicorn 启动：

```bash
gunicorn -w 2 -b 0.0.0.0:7055 app:app
```

可搭配 systemd 管理进程，并通过 Nginx/HTTPS 做反向代理。内网部署默认无需登录，若暴露公网请在反向代理层添加访问控制或身份验证。
