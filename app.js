// ── Supabase 클라이언트 ───────────────────────────────────────
const SUPABASE_URL = 'https://ppzljvtnukptmeozvudv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwemxqdnRudWtwdG1lb3p2dWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NzU5MTUsImV4cCI6MjA5NzI1MTkxNX0.ctU5jdDow0RcyqGDzpBpCvvAe0a4_l9jQCdZQSdRFrE';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── 상태 ─────────────────────────────────────────────────────
let todos = [];
let currentFilter = 'all';
let dragSrcId = null;

// ── DOM 참조 ─────────────────────────────────────────────────
const input        = document.getElementById('todoInput');
const prioritySel  = document.getElementById('prioritySelect');
const addBtn       = document.getElementById('addBtn');
const todoList     = document.getElementById('todoList');
const remainCount  = document.getElementById('remainCount');
const clearDoneBtn = document.getElementById('clearDoneBtn');
const emptyState   = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');

// ── 로딩 표시 ─────────────────────────────────────────────────
function setLoading(on) {
  loadingState.hidden = !on;
  todoList.hidden = on;
  if (on) emptyState.hidden = true;
}

// ── 에러 알림 ─────────────────────────────────────────────────
function showError(msg) {
  console.error(msg);
  alert(`오류: ${msg}\n잠시 후 다시 시도해주세요.`);
}

// ── DB 레이어 ─────────────────────────────────────────────────
async function loadTodos() {
  setLoading(true);
  const { data, error } = await db
    .from('todos')
    .select('*')
    .order('sort_order', { ascending: true });

  setLoading(false);
  if (error) { showError(error.message); return; }
  todos = data;
  render();
}

async function dbInsert(text, priority) {
  const minOrder = todos.length === 0 ? 0 : Math.min(...todos.map(t => t.sort_order)) - 1;
  const { data, error } = await db
    .from('todos')
    .insert({ text, done: false, priority, sort_order: minOrder })
    .select()
    .single();

  if (error) { showError(error.message); return null; }
  return data;
}

async function dbUpdate(id, changes) {
  const { error } = await db.from('todos').update(changes).eq('id', id);
  if (error) showError(error.message);
  return !error;
}

async function dbDelete(id) {
  const { error } = await db.from('todos').delete().eq('id', id);
  if (error) showError(error.message);
  return !error;
}

async function dbDeleteMany(ids) {
  const { error } = await db.from('todos').delete().in('id', ids);
  if (error) showError(error.message);
  return !error;
}

async function dbSaveOrder(orderedTodos) {
  const rows = orderedTodos.map((t, i) => ({ ...t, sort_order: i }));
  const { error } = await db.from('todos').upsert(rows);
  if (error) showError(error.message);
}

// ── 렌더 (동기) ───────────────────────────────────────────────
function render() {
  const filtered = todos.filter(t => {
    if (currentFilter === 'all')  return true;
    if (currentFilter === 'done') return t.done;
    return t.priority === currentFilter && !t.done;
  });

  todoList.innerHTML = '';
  filtered.forEach(todo => todoList.appendChild(createItem(todo)));

  remainCount.textContent = `${todos.filter(t => !t.done).length}개 남음`;
  emptyState.hidden = filtered.length > 0;
}

// ── 아이템 DOM 생성 ───────────────────────────────────────────
function createItem(todo) {
  const li = document.createElement('li');
  li.className = `todo-item priority-${todo.priority}${todo.done ? ' done' : ''}`;
  li.dataset.id = String(todo.id);
  li.draggable = true;

  const handle = document.createElement('span');
  handle.className = 'drag-handle material-icons-round';
  handle.textContent = 'drag_indicator';
  handle.title = '드래그로 순서 변경';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.className = 'todo-checkbox';
  cb.checked = todo.done;
  cb.setAttribute('aria-label', todo.text);
  cb.addEventListener('change', () => toggleDone(todo.id));

  const span = document.createElement('span');
  span.className = 'todo-text';
  span.textContent = todo.text;

  const sel = document.createElement('select');
  sel.className = `item-priority-select sel-${todo.priority}`;
  sel.setAttribute('aria-label', '우선순위');
  [['high','🔴 높음'], ['medium','🟡 중간'], ['low','🟢 낮음']].forEach(([val, label]) => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    if (val === todo.priority) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', e => changePriority(todo.id, e.target.value));

  const delBtn = document.createElement('button');
  delBtn.className = 'icon-btn';
  delBtn.title = '삭제';
  delBtn.setAttribute('aria-label', '삭제');
  delBtn.innerHTML = '<span class="material-icons-round">delete</span>';
  delBtn.addEventListener('click', () => deleteTodo(todo.id));

  li.append(handle, cb, span, sel, delBtn);

  li.addEventListener('dragstart', onDragStart);
  li.addEventListener('dragover',  onDragOver);
  li.addEventListener('dragleave', onDragLeave);
  li.addEventListener('drop',      onDrop);
  li.addEventListener('dragend',   onDragEnd);

  return li;
}

// ── CRUD (비동기) ──────────────────────────────────────────────
async function addTodo() {
  const text = input.value.trim();
  if (!text) { input.focus(); return; }

  addBtn.disabled = true;
  const row = await dbInsert(text, prioritySel.value);
  addBtn.disabled = false;

  if (!row) return;
  input.value = '';
  input.focus();
  todos.unshift(row);
  render();
}

async function toggleDone(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  const done = !todo.done;
  todos = todos.map(t => t.id === id ? { ...t, done } : t);
  render();
  await dbUpdate(id, { done });
}

async function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  render();
  await dbDelete(id);
}

async function changePriority(id, priority) {
  todos = todos.map(t => t.id === id ? { ...t, priority } : t);
  render();
  await dbUpdate(id, { priority });
}

// ── 드래그 앤 드롭 ────────────────────────────────────────────
function onDragStart(e) {
  dragSrcId = this.dataset.id;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragSrcId);
  requestAnimationFrame(() => this.classList.add('dragging'));
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (this.dataset.id !== dragSrcId) {
    document.querySelectorAll('.todo-item').forEach(el => el.classList.remove('drag-over'));
    this.classList.add('drag-over');
  }
}

function onDragLeave() {
  this.classList.remove('drag-over');
}

function onDrop(e) {
  e.stopPropagation();
  const targetId = this.dataset.id;
  if (!dragSrcId || dragSrcId === targetId) return;

  const srcIdx = todos.findIndex(t => String(t.id) === dragSrcId);
  const dstIdx = todos.findIndex(t => String(t.id) === targetId);
  if (srcIdx === -1 || dstIdx === -1) return;

  const [moved] = todos.splice(srcIdx, 1);
  todos.splice(dstIdx, 0, moved);
  render();
  dbSaveOrder(todos); // 순서를 DB에 비동기로 반영
}

function onDragEnd() {
  document.querySelectorAll('.todo-item').forEach(el => {
    el.classList.remove('dragging', 'drag-over');
  });
  dragSrcId = null;
}

// ── 필터 칩 ──────────────────────────────────────────────────
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.filter;
    render();
  });
});

// ── 이벤트 바인딩 ─────────────────────────────────────────────
addBtn.addEventListener('click', addTodo);
input.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });

clearDoneBtn.addEventListener('click', async () => {
  const doneIds = todos.filter(t => t.done).map(t => t.id);
  if (!doneIds.length) return;
  todos = todos.filter(t => !t.done);
  render();
  await dbDeleteMany(doneIds);
});

// ── 초기 로드 ─────────────────────────────────────────────────
loadTodos();
