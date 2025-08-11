import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Helmet>
        <title>PresenSure – Smart, Secure Attendance</title>
        <meta name="description" content="PresenSure: Smart, secure face + voice attendance with liveness detection." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />
      </Helmet>
      <header className="container py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center shadow-glow" aria-hidden>
            <span className="h-5 w-5 rounded-sm bg-primary" />
          </div>
          <span className="font-display text-xl">PresenSure</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link to="/student/login" className="story-link">Student</Link>
          <Link to="/faculty/login" className="story-link">Faculty</Link>
          <Link to="/admin/login" className="story-link">Admin</Link>
        </nav>
      </header>

      <section className="container grid place-items-center py-20">
        <div className="max-w-3xl text-center animate-enter">
          <h1 className="font-display text-4xl md:text-5xl tracking-tight">Smart, Secure, and Reliable Attendance</h1>
          <p className="mt-4 text-muted-foreground text-lg">Face recognition with liveness and voice authentication. Remote self check-in for students, robust review tools for faculty.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/student/login"><Button variant="hero" className="h-12 px-6 hover-scale">Login as Student</Button></Link>
            <Link to="/faculty/login"><Button variant="outline" className="h-12 px-6 hover-scale">Login as Faculty/Admin</Button></Link>
          </div>
        </div>
      </section>

      <footer className="container py-10 border-t">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} PresenSure. All rights reserved.</p>
          <p>Built for secure face + voice attendance</p>
        </div>
      </footer>

      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-30" style={{ background: 'var(--gradient-primary)' }} />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full blur-3xl opacity-20" style={{ background: 'var(--gradient-primary)' }} />
      </div>
    </main>
  );
};

export default Index;
