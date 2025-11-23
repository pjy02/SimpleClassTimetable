const state = {
  settings: null,
  currentWeek: 1,
  selectedWeek: 1,
  courses: [],
};

const weekdayMap = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  if (!res.ok) {
    const message = (await res.json().catch(() => ({}))).error || res.statusText;
    throw new Error(message);
  }
  return res.json();
}

function timeToMinutes(str) {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}

function buildTimeSlots(start, end, interval) {
  const slots = [];
  let current = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  while (current < endMinutes) {
    const h = String(Math.floor(current / 60)).padStart(2, "0");
    const m = String(current % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
    current += interval;
  }
  return slots;
}

function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function renderTimetable(courses) {
  const container = document.getElementById("timetable");
  clearChildren(container);
  if (!state.settings) return;
  const { day_start, day_end, slot_interval } = state.settings;
  const slots = buildTimeSlots(day_start, day_end, slot_interval);
  const slotHeight = 40;
  const totalHeight = slots.length * slotHeight;

  const header = document.createElement("div");
  header.className = "grid header";
  header.style.gridTemplateColumns = `80px repeat(7, 1fr)`;
  const timeTitle = document.createElement("div");
  timeTitle.textContent = "时间";
  header.appendChild(timeTitle);
  for (let i = 1; i <= 7; i++) {
    const d = document.createElement("div");
    d.textContent = weekdayMap[i];
    header.appendChild(d);
  }
  container.appendChild(header);

  const body = document.createElement("div");
  body.className = "grid";
  body.style.gridTemplateColumns = `80px repeat(7, 1fr)`;

  const timeCol = document.createElement("div");
  timeCol.className = "time-column";
  slots.forEach((slot) => {
    const cell = document.createElement("div");
    cell.className = "time-cell";
    cell.textContent = slot;
    timeCol.appendChild(cell);
  });
  body.appendChild(timeCol);

  for (let day = 1; day <= 7; day++) {
    const dayCol = document.createElement("div");
    dayCol.className = "day-column";
    dayCol.style.height = `${totalHeight}px`;
    slots.forEach(() => {
      const slotCell = document.createElement("div");
      slotCell.className = "slot-cell";
      dayCol.appendChild(slotCell);
    });

    const dayCourses = courses.filter((c) => c.weekday === day);
    dayCourses.forEach((course) => {
      const startMin = timeToMinutes(course.start_time);
      const endMin = timeToMinutes(course.end_time);
      const offset = startMin - timeToMinutes(day_start);
      const duration = Math.max(endMin - startMin, slot_interval);
      const block = document.createElement("div");
      block.className = "course-block";
      block.style.top = `${(offset / slot_interval) * slotHeight}px`;
      block.style.height = `${(duration / slot_interval) * slotHeight}px`;
      block.style.background = course.color || "#4f8cff";
      block.innerHTML = `
        <h4>${course.title}</h4>
        <p class="meta">${course.location || "-"} ｜ ${course.teacher || ""}</p>
        <p class="meta">${course.start_time} - ${course.end_time}</p>
        ${course.remark ? `<p class="remark">${course.remark}</p>` : ""}
      `;
      dayCol.appendChild(block);
    });

    body.appendChild(dayCol);
  }

  container.appendChild(body);
}

function renderCourseTable(courses) {
  const tbody = document.getElementById("course-rows");
  clearChildren(tbody);
  const template = document.getElementById("course-row-template");
  courses.forEach((course) => {
    const row = template.content.firstElementChild.cloneNode(true);
    row.querySelector(".title").textContent = course.title;
    row.querySelector(".teacher").textContent = course.teacher || "-";
    row.querySelector(".location").textContent = course.location || "-";
    row.querySelector(".weekday").textContent = weekdayMap[course.weekday];
    row.querySelector(".time").textContent = `${course.start_time} - ${course.end_time}`;
    row.querySelector(".weeks").textContent = course.weeks.join(", ");
    row.querySelectorAll("button").forEach((btn) => {
      btn.dataset.id = course.id;
    });
    tbody.appendChild(row);
  });
}

function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

function resetCourseForm() {
  document.getElementById("course-id").value = "";
  document.getElementById("course-title").value = "";
  document.getElementById("course-teacher").value = "";
  document.getElementById("course-location").value = "";
  document.getElementById("course-weekday").value = "";
  document.getElementById("course-start").value = "08:00";
  document.getElementById("course-end").value = "09:35";
  document.getElementById("course-weeks").value = "";
  document.getElementById("course-color").value = "#4f8cff";
  document.getElementById("course-remark").value = "";
}

function fillCourseForm(course) {
  document.getElementById("course-id").value = course.id;
  document.getElementById("course-title").value = course.title;
  document.getElementById("course-teacher").value = course.teacher || "";
  document.getElementById("course-location").value = course.location || "";
  document.getElementById("course-weekday").value = course.weekday;
  document.getElementById("course-start").value = course.start_time;
  document.getElementById("course-end").value = course.end_time;
  document.getElementById("course-weeks").value = course.weeks.join(",");
  document.getElementById("course-color").value = course.color || "#4f8cff";
  document.getElementById("course-remark").value = course.remark || "";
}

async function loadSettings() {
  state.settings = await fetchJSON("/api/settings");
  document.getElementById("semester-name").textContent = state.settings.semester_name;
  document.getElementById("semester-input").value = state.settings.semester_name;
  document.getElementById("first-monday").value = state.settings.first_monday;
  document.getElementById("day-start").value = state.settings.day_start;
  document.getElementById("day-end").value = state.settings.day_end;
  document.getElementById("slot-interval").value = state.settings.slot_interval;
  document.getElementById("time-range").textContent = `${state.settings.day_start} - ${state.settings.day_end} ｜ ${state.settings.slot_interval} 分钟一格`;
}

async function loadCurrentWeek() {
  const { current_week } = await fetchJSON("/api/current_week");
  state.currentWeek = current_week;
  const label = document.getElementById("current-week");
  label.textContent = `当前周：第 ${current_week} 周`;
  label.style.display = "inline-block";
  if (!state.selectedWeek || state.selectedWeek === 1) {
    state.selectedWeek = current_week;
    document.getElementById("week-number").value = current_week;
  }
}

async function loadCourses() {
  state.courses = await fetchJSON("/api/courses");
  renderCourseTable(state.courses);
}

async function loadSchedule() {
  const week = state.selectedWeek || 1;
  const data = await fetchJSON(`/api/schedule?week=${week}`);
  renderTimetable(data);
}

function parseWeeks(text) {
  return text
    .split(",")
    .map((w) => parseInt(w.trim(), 10))
    .filter((w) => !isNaN(w) && w > 0);
}

async function submitCourse(event) {
  event.preventDefault();
  const payload = {
    title: document.getElementById("course-title").value.trim(),
    teacher: document.getElementById("course-teacher").value.trim(),
    location: document.getElementById("course-location").value.trim(),
    weekday: Number(document.getElementById("course-weekday").value),
    start_time: document.getElementById("course-start").value,
    end_time: document.getElementById("course-end").value,
    weeks: parseWeeks(document.getElementById("course-weeks").value),
    color: document.getElementById("course-color").value,
    remark: document.getElementById("course-remark").value.trim(),
  };
  const courseId = document.getElementById("course-id").value;
  try {
    if (courseId) {
      await fetchJSON(`/api/courses/${courseId}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await fetchJSON("/api/courses", { method: "POST", body: JSON.stringify(payload) });
    }
    await loadCourses();
    await loadSchedule();
    closeModal("course-modal");
  } catch (err) {
    alert(`保存失败: ${err.message}`);
  }
}

async function deleteCourse(id) {
  if (!confirm("确定要删除该课程吗？")) return;
  try {
    await fetchJSON(`/api/courses/${id}`, { method: "DELETE" });
    await loadCourses();
    await loadSchedule();
  } catch (err) {
    alert(`删除失败: ${err.message}`);
  }
}

async function submitSettings(event) {
  event.preventDefault();
  const payload = {
    semester_name: document.getElementById("semester-input").value.trim(),
    first_monday: document.getElementById("first-monday").value,
    day_start: document.getElementById("day-start").value,
    day_end: document.getElementById("day-end").value,
    slot_interval: Number(document.getElementById("slot-interval").value),
  };
  try {
    await fetchJSON("/api/settings", { method: "PUT", body: JSON.stringify(payload) });
    await loadSettings();
    await loadCurrentWeek();
    await loadSchedule();
    closeModal("settings-modal");
  } catch (err) {
    alert(`保存设置失败: ${err.message}`);
  }
}

function handleCourseTableClick(event) {
  const action = event.target.dataset.action;
  if (!action) return;
  const id = event.target.dataset.id;
  const course = state.courses.find((c) => String(c.id) === id);
  if (!course) return;
  if (action === "edit") {
    fillCourseForm(course);
    document.getElementById("course-modal-title").textContent = "编辑课程";
    openModal("course-modal");
  } else if (action === "delete") {
    deleteCourse(id);
  }
}

async function exportData() {
  try {
    const data = await fetchJSON("/api/export");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timetable-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(`导出失败: ${err.message}`);
  }
}

async function importData(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await fetchJSON("/api/import", { method: "POST", body: JSON.stringify(data) });
    await loadSettings();
    await loadCurrentWeek();
    await loadCourses();
    await loadSchedule();
  } catch (err) {
    alert(`导入失败: ${err.message}`);
  }
}

function bindEvents() {
  document.getElementById("add-course").addEventListener("click", () => {
    resetCourseForm();
    document.getElementById("course-modal-title").textContent = "新增课程";
    openModal("course-modal");
  });
  document.getElementById("cancel-course").addEventListener("click", () => closeModal("course-modal"));
  document.getElementById("close-course-modal").addEventListener("click", () => closeModal("course-modal"));
  document.getElementById("course-form").addEventListener("submit", submitCourse);

  document.getElementById("open-settings").addEventListener("click", () => openModal("settings-modal"));
  document.getElementById("cancel-settings").addEventListener("click", () => closeModal("settings-modal"));
  document.getElementById("close-settings-modal").addEventListener("click", () => closeModal("settings-modal"));
  document.getElementById("settings-form").addEventListener("submit", submitSettings);

  document.getElementById("prev-week").addEventListener("click", () => {
    const input = document.getElementById("week-number");
    const val = Math.max(1, Number(input.value) - 1);
    input.value = val;
    state.selectedWeek = val;
    loadSchedule();
  });
  document.getElementById("next-week").addEventListener("click", () => {
    const input = document.getElementById("week-number");
    const val = Number(input.value) + 1;
    input.value = val;
    state.selectedWeek = val;
    loadSchedule();
  });
  document.getElementById("week-number").addEventListener("change", (e) => {
    const val = Math.max(1, Number(e.target.value) || 1);
    e.target.value = val;
    state.selectedWeek = val;
    loadSchedule();
  });

  document.getElementById("course-rows").addEventListener("click", handleCourseTableClick);
  document.getElementById("export-data").addEventListener("click", exportData);
  document.getElementById("import-file").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importData(file);
    e.target.value = "";
  });
}

async function bootstrap() {
  bindEvents();
  await loadSettings();
  await loadCurrentWeek();
  await loadCourses();
  state.selectedWeek = state.currentWeek;
  document.getElementById("week-number").value = state.currentWeek;
  await loadSchedule();
}

document.addEventListener("DOMContentLoaded", bootstrap);
