import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { login } from "@/services/api";

const FacultyLogin = () => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await login("faculty", id.trim(), password);
      toast({ title: "Welcome", description: `Logged in as Faculty` });
      navigate("/faculty/dashboard");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message || "Invalid credentials" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <Helmet>
        <title>Faculty Login | PresenSure</title>
        <meta name="description" content="Faculty login to view and manage attendance." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />
      </Helmet>
      <Card className="w-full max-w-md shadow-elegant animate-fade-in">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Faculty Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fid">Faculty ID</Label>
              <Input id="fid" value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. F2001" required />
            </div>
            <div>
              <Label htmlFor="fpwd">Password</Label>
              <Input id="fpwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default FacultyLogin;
