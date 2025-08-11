import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { getAnalytics, getAttendance, setAttendanceStatus, type AttendanceRecord } from "@/services/api";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, Legend } from "recharts";

const colors = {
  present: "#0A74DA",
  pending: "#FDBA74",
  rejected: "#EF4444",
};

const FacultyDashboard = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [analytics, setAnalytics] = useState<any>(null);

  const refresh = async () => {
    const data = await getAttendance({ search });
    setAttendance(data);
    const a = await getAnalytics();
    setAnalytics(a);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => refresh(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const pieData = useMemo(() => analytics ? [
    { name: 'Present', value: analytics.pie.present, color: colors.present },
    { name: 'Pending', value: analytics.pie.pending, color: colors.pending },
    { name: 'Rejected', value: analytics.pie.rejected, color: colors.rejected },
  ] : [], [analytics]);

  const approve = async (id: string) => {
    await setAttendanceStatus(id, 'Approved');
    toast({ title: 'Approved' });
    refresh();
  };
  const reject = async (id: string) => {
    await setAttendanceStatus(id, 'Rejected');
    toast({ title: 'Rejected' });
    refresh();
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <Helmet>
        <title>Faculty Dashboard | PresenSure</title>
        <meta name="description" content="Review and manage attendance with analytics." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />
      </Helmet>

      <div className="max-w-6xl mx-auto grid gap-6">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">Attendance Dashboard</h1>
            <p className="text-muted-foreground">Search, review, and approve attendances.</p>
          </div>
          <div className="w-64">
            <Input placeholder="Search by name or ID" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </header>

        <section className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="text-lg">Live Attendance</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Face %</TableHead>
                    <TableHead>Voice %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.studentName}</TableCell>
                      <TableCell>{r.studentId}</TableCell>
                      <TableCell>{r.date}</TableCell>
                      <TableCell>{r.time}</TableCell>
                      <TableCell>{r.faceMatch}%</TableCell>
                      <TableCell>{r.voiceMatch}%</TableCell>
                      <TableCell>
                        {r.status === 'Approved' && <Badge>Approved</Badge>}
                        {r.status === 'Pending' && <Badge variant="secondary">Pending</Badge>}
                        {r.status === 'Rejected' && <Badge variant="destructive">Rejected</Badge>}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => approve(r.id)}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => reject(r.id)}>Reject</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="text-lg">Analytics</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={70} innerRadius={45}>
                      {pieData.map((e, i) => (<Cell key={i} fill={e.color} />))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.line || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke={colors.present} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.bar || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide={false} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="pct" fill={colors.present} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
};

export default FacultyDashboard;
