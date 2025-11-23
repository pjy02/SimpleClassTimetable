import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from flask import Flask, jsonify, render_template, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
COURSES_FILE = DATA_DIR / "courses.json"
SETTINGS_FILE = DATA_DIR / "settings.json"

DEFAULT_SETTINGS: Dict[str, Any] = {
    "semester_name": "示例学期",
    "first_monday": datetime.now().strftime("%Y-%m-%d"),
    "day_start": "08:00",
    "day_end": "20:00",
    "slot_interval": 30,
}

DEFAULT_COURSES: List[Dict[str, Any]] = []

app = Flask(__name__)


def ensure_data_files() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    if not SETTINGS_FILE.exists():
        SETTINGS_FILE.write_text(json.dumps(DEFAULT_SETTINGS, ensure_ascii=False, indent=2), encoding="utf-8")
    if not COURSES_FILE.exists():
        COURSES_FILE.write_text(json.dumps(DEFAULT_COURSES, ensure_ascii=False, indent=2), encoding="utf-8")


# Ensure required data files exist when the module is imported (e.g., under gunicorn)
ensure_data_files()


def load_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, FileNotFoundError):
        return default


def save_json(path: Path, data: Any) -> None:
    temp_path = path.with_suffix(path.suffix + ".tmp")
    temp_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    temp_path.replace(path)


def parse_time(time_str: str) -> datetime:
    return datetime.strptime(time_str, "%H:%M")


def valid_time_range(start: str, end: str) -> bool:
    try:
        return parse_time(start) < parse_time(end)
    except ValueError:
        return False


def validate_course(payload: Dict[str, Any], is_update: bool = False) -> Dict[str, Any]:
    required_fields = ["title", "weekday", "start_time", "end_time", "weeks"]
    if not is_update:
        for field in required_fields:
            if field not in payload:
                raise ValueError(f"Missing field: {field}")
    data: Dict[str, Any] = {}
    data["title"] = str(payload.get("title", "")).strip()
    data["teacher"] = str(payload.get("teacher", "")).strip()
    data["location"] = str(payload.get("location", "")).strip()
    data["remark"] = str(payload.get("remark", "")).strip()
    weekday = int(payload.get("weekday", 0))
    if weekday < 1 or weekday > 7:
        raise ValueError("weekday must be between 1 and 7")
    data["weekday"] = weekday
    start_time = str(payload.get("start_time", ""))
    end_time = str(payload.get("end_time", ""))
    if not valid_time_range(start_time, end_time):
        raise ValueError("Invalid time range")
    data["start_time"] = start_time
    data["end_time"] = end_time
    weeks = payload.get("weeks", [])
    if not isinstance(weeks, list) or not weeks:
        raise ValueError("weeks must be a non-empty list")
    try:
        data["weeks"] = sorted({int(w) for w in weeks if int(w) > 0})
    except (TypeError, ValueError):
        raise ValueError("weeks must contain integers")
    data["color"] = str(payload.get("color", "#4f8cff")).strip() or "#4f8cff"
    return data


def validate_settings(payload: Dict[str, Any]) -> Dict[str, Any]:
    data: Dict[str, Any] = {}
    data["semester_name"] = str(payload.get("semester_name", "")).strip() or "示例学期"
    first_monday = str(payload.get("first_monday", ""))
    try:
        datetime.strptime(first_monday, "%Y-%m-%d")
    except ValueError:
        first_monday = datetime.now().strftime("%Y-%m-%d")
    data["first_monday"] = first_monday
    day_start = str(payload.get("day_start", "08:00"))
    day_end = str(payload.get("day_end", "20:00"))
    if not valid_time_range(day_start, day_end):
        raise ValueError("Invalid day time range")
    data["day_start"] = day_start
    data["day_end"] = day_end
    try:
        interval = int(payload.get("slot_interval", 30))
        if interval not in {15, 20, 30, 45, 60}:
            raise ValueError
    except ValueError:
        interval = 30
    data["slot_interval"] = interval
    return data


def compute_current_week(settings: Dict[str, Any]) -> int:
    first_monday_str = settings.get("first_monday")
    try:
        first_monday = datetime.strptime(first_monday_str, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return 1
    today = datetime.now().date()
    delta_days = (today - first_monday).days
    if delta_days < 0:
        return 1
    return delta_days // 7 + 1


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/settings", methods=["GET", "PUT"])
def settings_api():
    settings = load_json(SETTINGS_FILE, DEFAULT_SETTINGS)
    if request.method == "GET":
        return jsonify(settings)
    try:
        updated = validate_settings(request.get_json(force=True))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    save_json(SETTINGS_FILE, updated)
    return jsonify(updated)


@app.route("/api/current_week")
def current_week_api():
    settings = load_json(SETTINGS_FILE, DEFAULT_SETTINGS)
    return jsonify({"current_week": compute_current_week(settings)})


@app.route("/api/courses", methods=["GET", "POST"])
def courses_api():
    courses = load_json(COURSES_FILE, DEFAULT_COURSES)
    if request.method == "GET":
        return jsonify(courses)
    try:
        payload = validate_course(request.get_json(force=True))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    next_id = (max((c.get("id", 0) for c in courses), default=0) + 1) if courses else 1
    payload["id"] = next_id
    courses.append(payload)
    save_json(COURSES_FILE, courses)
    return jsonify(payload), 201


@app.route("/api/courses/<int:course_id>", methods=["PUT", "DELETE"])
def course_detail_api(course_id: int):
    courses = load_json(COURSES_FILE, DEFAULT_COURSES)
    course = next((c for c in courses if c.get("id") == course_id), None)
    if not course:
        return jsonify({"error": "Course not found"}), 404
    if request.method == "DELETE":
        courses = [c for c in courses if c.get("id") != course_id]
        save_json(COURSES_FILE, courses)
        return "", 204
    try:
        payload = validate_course(request.get_json(force=True), is_update=True)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    course.update(payload)
    save_json(COURSES_FILE, courses)
    return jsonify(course)


@app.route("/api/schedule")
def schedule_api():
    week = request.args.get("week", type=int, default=1)
    courses = load_json(COURSES_FILE, DEFAULT_COURSES)
    filtered = [c for c in courses if week in c.get("weeks", [])]
    return jsonify(filtered)


@app.route("/api/export")
def export_api():
    courses = load_json(COURSES_FILE, DEFAULT_COURSES)
    settings = load_json(SETTINGS_FILE, DEFAULT_SETTINGS)
    return jsonify({"courses": courses, "settings": settings})


@app.route("/api/import", methods=["POST"])
def import_api():
    try:
        payload = request.get_json(force=True)
        courses = payload.get("courses", [])
        settings = payload.get("settings", {})
        validated_settings = validate_settings(settings)
        validated_courses = [validate_course(c) | {"id": i + 1} for i, c in enumerate(courses)]
    except (ValueError, TypeError) as exc:
        return jsonify({"error": str(exc)}), 400
    save_json(SETTINGS_FILE, validated_settings)
    save_json(COURSES_FILE, validated_courses)
    return jsonify({"status": "ok", "courses": len(validated_courses)})


@app.route("/favicon.ico")
def favicon():
    return send_from_directory(str(BASE_DIR / "static"), "favicon.ico")


def main():
    ensure_data_files()
    port = int(os.environ.get("PORT", 7055))
    app.run(host="0.0.0.0", port=port, debug=False)


if __name__ == "__main__":
    main()
