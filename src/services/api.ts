// Lightweight mock API for PresenSure (localStorage-backed)
// NOTE: Replace with real endpoints later.

export type Role = 'student' | 'faculty' | 'admin';

export interface Student {
  id: string; // unique student ID
  name: string;
  className?: string;
  faceImage?: string; // data URL
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  faceMatch: number; // 0-100
  voiceMatch: number; // 0-100
  status: 'Approved' | 'Pending' | 'Rejected';
}

const STORAGE_KEYS = {
  students: 'ps_students',
  attendance: 'ps_attendance',
};

function delay(ms = 600) {
  return new Promise((res) => setTimeout(res, ms));
}

function getToday() {
  const now = new Date();
  const d = now.toISOString().slice(0, 10);
  const t = now.toTimeString().split(' ')[0];
  return { date: d, time: t };
}

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seed() {
  const seeded = read<Student[]>(STORAGE_KEYS.students, []);
  if (seeded.length === 0) {
    const initial: Student[] = [
      { id: 'S1001', name: 'Ava Patel', className: 'CS101' },
      { id: 'S1002', name: 'Liam Chen', className: 'CS101' },
      { id: 'S1003', name: 'Noah Smith', className: 'CS102' },
    ];
    write(STORAGE_KEYS.students, initial);
  }
  const att = read<AttendanceRecord[]>(STORAGE_KEYS.attendance, []);
  if (att.length === 0) {
    const { date } = getToday();
    const sample: AttendanceRecord[] = [
      {
        id: uid('att'),
        studentId: 'S1001',
        studentName: 'Ava Patel',
        date,
        time: '09:01:12',
        faceMatch: 97,
        voiceMatch: 93,
        status: 'Approved',
      },
      {
        id: uid('att'),
        studentId: 'S1002',
        studentName: 'Liam Chen',
        date,
        time: '09:05:03',
        faceMatch: 92,
        voiceMatch: 90,
        status: 'Pending',
      },
    ];
    write(STORAGE_KEYS.attendance, sample);
  }
}
seed();

export async function login(role: Role, id: string, password: string) {
  await delay(400);
  if (!id || !password) throw new Error('Missing credentials');
  if (role === 'student') {
    const students = read<Student[]>(STORAGE_KEYS.students, []);
    const s = students.find((x) => x.id === id);
    if (!s) throw new Error('Student not found');
    return { role, user: { id: s.id, name: s.name } };
  }
  // For faculty/admin, accept any non-empty credentials for mock
  return { role, user: { id, name: role === 'faculty' ? 'Faculty' : 'Admin' } };
}

export function getPassphrase() {
  const colors = ['Orange', 'Blue', 'Green', 'Silver', 'Violet', 'Crimson'];
  const nouns = ['Sky', 'River', 'Forest', 'Cloud', 'Stone', 'Comet'];
  const num = Math.floor(Math.random() * 90) + 10;
  const phrase = `${colors[Math.floor(Math.random() * colors.length)]} ${num} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  return `Say: ${phrase}`;
}

export async function recordCheckIn(studentId: string, studentName: string) {
  await delay(600);
  const { date, time } = getToday();
  const faceMatch = 92 + Math.floor(Math.random() * 6);
  const voiceMatch = 90 + Math.floor(Math.random() * 8);
  const rec: AttendanceRecord = {
    id: uid('att'),
    studentId,
    studentName,
    date,
    time,
    faceMatch,
    voiceMatch,
    status: 'Pending',
  };
  const all = read<AttendanceRecord[]>(STORAGE_KEYS.attendance, []);
  all.unshift(rec);
  write(STORAGE_KEYS.attendance, all);
  return rec;
}

export async function getAttendance(query?: { date?: string; search?: string }) {
  await delay(300);
  let data = read<AttendanceRecord[]>(STORAGE_KEYS.attendance, []);
  if (query?.date) data = data.filter((r) => r.date === query.date);
  if (query?.search) {
    const s = query.search.toLowerCase();
    data = data.filter((r) => r.studentName.toLowerCase().includes(s) || r.studentId.toLowerCase().includes(s));
  }
  return data;
}

export async function setAttendanceStatus(id: string, status: AttendanceRecord['status']) {
  await delay(250);
  const data = read<AttendanceRecord[]>(STORAGE_KEYS.attendance, []);
  const idx = data.findIndex((r) => r.id === id);
  if (idx >= 0) {
    data[idx].status = status;
    write(STORAGE_KEYS.attendance, data);
    return data[idx];
  }
  throw new Error('Record not found');
}

export async function listStudents() {
  await delay(200);
  return read<Student[]>(STORAGE_KEYS.students, []);
}

export async function addStudent(input: Omit<Student, 'id'> & { id: string }) {
  await delay(300);
  const students = read<Student[]>(STORAGE_KEYS.students, []);
  if (students.some((s) => s.id === input.id)) throw new Error('ID already exists');
  students.push(input);
  write(STORAGE_KEYS.students, students);
  return input;
}

export async function updateStudent(input: Student) {
  await delay(300);
  const students = read<Student[]>(STORAGE_KEYS.students, []);
  const idx = students.findIndex((s) => s.id === input.id);
  if (idx >= 0) {
    students[idx] = input;
    write(STORAGE_KEYS.students, students);
    return input;
  }
  throw new Error('Student not found');
}

export async function deleteStudent(id: string) {
  await delay(250);
  const students = read<Student[]>(STORAGE_KEYS.students, []);
  const next = students.filter((s) => s.id !== id);
  write(STORAGE_KEYS.students, next);
  return true;
}

export async function getAnalytics() {
  await delay(300);
  const data = read<AttendanceRecord[]>(STORAGE_KEYS.attendance, []);
  const present = data.filter((r) => r.status === 'Approved').length;
  const pending = data.filter((r) => r.status === 'Pending').length;
  const rejected = data.filter((r) => r.status === 'Rejected').length;

  // Simple weekly trend (last 7 records by day)
  const byDate = new Map<string, number>();
  for (const r of data) byDate.set(r.date, (byDate.get(r.date) || 0) + 1);
  const line = Array.from(byDate.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, count]) => ({ date, count }));

  // Bar: percentage per student (mock based on ratio approved/all)
  const byStudent = new Map<string, { name: string; total: number; ok: number }>();
  for (const r of data) {
    const s = byStudent.get(r.studentId) || { name: r.studentName, total: 0, ok: 0 };
    s.total += 1;
    if (r.status === 'Approved') s.ok += 1;
    byStudent.set(r.studentId, s);
  }
  const bar = Array.from(byStudent.entries()).map(([id, v]) => ({ id, name: v.name, pct: Math.round((v.ok / v.total) * 100) }));

  return { pie: { present, pending, rejected }, line, bar };
}
