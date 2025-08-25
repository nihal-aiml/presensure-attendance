import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

const StudentLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && event === 'SIGNED_IN') {
          checkUserAndRedirect(session.user.id);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkUserAndRedirect(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserAndRedirect = async (userId: string) => {
    try {
      // Check if user has student role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'student')
        .maybeSingle();

      if (roleError) {
        console.error('Error checking user role:', roleError);
        throw new Error('Unable to verify student status');
      }

      if (!roleData) {
        throw new Error('This account is not registered as a student');
      }

      // Get user profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, student_number')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw new Error('Unable to load profile data');
      }

      // Success - redirect to check-in
      toast({ 
        title: "Welcome back!", 
        description: `Hello, ${profileData?.full_name || 'Student'}` 
      });
      
      navigate("/student/checkin", { 
        state: { 
          id: userId,
          name: profileData?.full_name || 'Student',
          studentNumber: profileData?.student_number || 'N/A'
        } 
      });

    } catch (error: any) {
      console.error('User verification error:', error);
      
      // Sign out the user and show error
      await supabase.auth.signOut();
      
      toast({
        title: "Access Denied",
        description: error.message || "Unable to verify your account. Please contact support.",
        variant: "destructive"
      });
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // The auth state change listener will handle the redirect
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = error.message || "Invalid credentials";
      
      if (error.message === "Invalid login credentials") {
        errorMessage = "Account not found or incorrect password. Please check your email and password, or register if you haven't yet.";
      }
      
      toast({ 
        title: "Login failed", 
        description: errorMessage,
        variant: "destructive"
      });
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
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center shadow-glow">
              <span className="h-5 w-5 rounded-sm bg-primary" />
            </div>
            <span className="font-display text-xl">PresenSure</span>
          </Link>
          <h1 className="text-2xl font-display">Student Login</h1>
          <p className="text-muted-foreground">Sign in to access check-in</p>
        </div>

        <Card className="shadow-elegant animate-fade-in">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Enter your credentials to access the attendance system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="Enter your email address"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required 
                />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Login & Start Check-In"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/student/register" className="text-primary hover:underline">
                Register here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default StudentLogin;