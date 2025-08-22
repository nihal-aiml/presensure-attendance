import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { getAnalytics, getAttendance, setAttendanceStatus, type AttendanceRecord } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
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
    try {
      // Fetch attendance records from Supabase
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately for student names
      const studentIds = attendanceData?.map(record => record.student_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, student_number')
        .in('id', studentIds);

      // Create a map for quick lookup
      const profilesMap = new Map(profilesData?.map(profile => [profile.id, profile]) || []);

      // Filter based on search if provided
      let filteredData = attendanceData || [];
      if (search) {
        filteredData = attendanceData?.filter(record => {
          const profile = profilesMap.get(record.student_id);
          const fullName = profile?.full_name?.toLowerCase() || '';
          const studentNumber = profile?.student_number?.toLowerCase() || '';
          const searchLower = search.toLowerCase();
          return fullName.includes(searchLower) || 
                 studentNumber.includes(searchLower) ||
                 record.student_id.toLowerCase().includes(searchLower);
        }) || [];
      }

      // Transform data to match expected format
      const transformedData: AttendanceRecord[] = filteredData.map(record => {
        const profile = profilesMap.get(record.student_id);
        return {
          id: record.id,
          studentId: record.student_id,
          studentName: profile?.full_name || 'Unknown Student',
          date: new Date(record.attended_at).toLocaleDateString(),
          time: new Date(record.attended_at).toLocaleTimeString(),
          faceMatch: record.face_match || 0,
          voiceMatch: record.voice_match || 0,
          status: (record.status === 'approved' ? 'Approved' : 
                  record.status === 'rejected' ? 'Rejected' : 'Pending') as AttendanceRecord['status']
        };
      });

      setAttendance(transformedData);

      // Get analytics (keeping mock for now)
      const a = await getAnalytics();
      setAnalytics(a);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch attendance records.',
        variant: 'destructive'
      });
    }
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
    try {
      const { error } = await supabase
        .from('attendance')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'Approved' });
      refresh();
    } catch (error) {
      console.error('Error approving attendance:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to approve attendance.',
        variant: 'destructive'
      });
    }
  };

  const reject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('attendance')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'Rejected' });
      refresh();
    } catch (error) {
      console.error('Error rejecting attendance:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to reject attendance.',
        variant: 'destructive'
      });
    }
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
