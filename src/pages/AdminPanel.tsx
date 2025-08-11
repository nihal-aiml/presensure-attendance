import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { addStudent, deleteStudent, listStudents, getAttendance, type Student, type AttendanceRecord } from "@/services/api";

const AdminPanel = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [sid, setSid] = useState("");
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [faceImage, setFaceImage] = useState<string | undefined>(undefined);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [date, setDate] = useState<string>("");

  const refresh = async () => {
    setStudents(await listStudents());
    setAttendance(await getAttendance(date ? { date } : undefined));
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => { refresh(); }, [date]);

  const onFile = async (f: File | null) => {
    if (!f) return setFaceImage(undefined);
    const reader = new FileReader();
    reader.onload = () => setFaceImage(reader.result as string);
    reader.readAsDataURL(f);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!sid || !name) throw new Error('ID and Name required');
      await addStudent({ id: sid.trim(), name: name.trim(), className: className || undefined, faceImage });
      toast({ title: 'Student added' });
      setSid(""); setName(""); setClassName(""); setFaceImage(undefined);
      refresh();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add student' });
    }
  };

  const remove = async (id: string) => {
    await deleteStudent(id);
    toast({ title: 'Deleted' });
    refresh();
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <Helmet>
        <title>Admin Panel | PresenSure</title>
        <meta name="description" content="Manage students and view attendance history." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />
      </Helmet>
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display text-3xl mb-6">Admin Panel</h1>
        <Tabs defaultValue="students" className="space-y-6">
          <TabsList>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="history">Attendance History</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-6">
            <Card className="shadow-elegant">
              <CardHeader><CardTitle>Add New Student</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={add} className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sid">Student ID</Label>
                    <Input id="sid" value={sid} onChange={(e) => setSid(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="sname">Name</Label>
                    <Input id="sname" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="sclass">Class</Label>
                    <Input id="sclass" value={className} onChange={(e) => setClassName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="face">Face Image</Label>
                    <Input id="face" type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit" variant="hero">Add Student</Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-elegant">
              <CardHeader><CardTitle>Students</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>{s.id}</TableCell>
                        <TableCell className="flex items-center gap-2">
                          {s.faceImage && <img src={s.faceImage} alt={`${s.name} face`} loading="lazy" className="h-8 w-8 rounded-full object-cover"/>}
                          {s.name}
                        </TableCell>
                        <TableCell>{s.className || '-'}</TableCell>
                        <TableCell>
                          <Button variant="destructive" size="sm" onClick={() => remove(s.id)}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="shadow-elegant">
              <CardHeader><CardTitle>Attendance History</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div>
                    <Label htmlFor="dt">Date</Label>
                    <Input id="dt" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <Button variant="outline" onClick={() => setDate("")}>Clear</Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map(a => (
                        <TableRow key={a.id}>
                          <TableCell>{a.studentName}</TableCell>
                          <TableCell>{a.studentId}</TableCell>
                          <TableCell>{a.date}</TableCell>
                          <TableCell>{a.time}</TableCell>
                          <TableCell>{a.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default AdminPanel;
