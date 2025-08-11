import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { login } from "@/services/api";

const StudentLogin = () => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await login("student", id.trim(), password);
      toast({ title: "Welcome", description: `Hello, ${res.user.name}` });
      navigate("/student/checkin", { state: { id: res.user.id, name: res.user.name } });
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message || "Invalid credentials" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <Helmet>
        <title>Student Login | PresenSure</title>
        <meta name="description" content="Student login to PresenSure secure attendance." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />
      </Helmet>
      <Card className="w-full max-w-md shadow-elegant animate-fade-in">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Student Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="sid">Student ID</Label>
              <Input id="sid" value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. S1001" required />
            </div>
            <div>
              <Label htmlFor="pwd">Password</Label>
              <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Login & Start Check-In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default StudentLogin;
