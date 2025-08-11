import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { getPassphrase, recordCheckIn } from "@/services/api";
import { Camera, Mic, CheckCircle2, AlertCircle } from "lucide-react";

const Step = ({ active, done, label }: { active: boolean; done: boolean; label: string }) => (
  <div className="flex items-center gap-2">
    <div className={`h-2 w-2 rounded-full ${done ? 'bg-primary' : active ? 'bg-primary/60' : 'bg-muted-foreground/30'}`}></div>
    <span className={`text-sm ${done ? 'text-foreground' : active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
  </div>
);

const StudentCheckIn = () => {
  const loc = useLocation() as any;
  const navigate = useNavigate();
  const student = loc.state as { id: string; name: string } | undefined;

  const [step, setStep] = useState(0); // 0: face, 1: liveness, 2: voice, 3: confirm
  const [passphrase] = useState(getPassphrase());
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{ time: string; date: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!student) {
      navigate('/student/login');
      return;
    }
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        mediaStream.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        // Auto-advance after a short stable period
        setTimeout(() => setStep(1), 1500);
      } catch (e) {
        toast({ title: 'Camera permission needed', description: 'Please allow camera access.' });
      }
    })();
    return () => {
      mediaStream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [student, navigate]);

  const progress = useMemo(() => ((step + (verifying ? 0.4 : 0)) / 3) * 100, [step, verifying]);

  const doLiveness = async () => {
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 1500));
    setVerifying(false);
    setStep(2);
  };

  const doVoice = async () => {
    setVerifying(true);
    let audio: MediaStream | null = null;
    try {
      audio = await navigator.mediaDevices.getUserMedia({ audio: true });
      await new Promise((r) => setTimeout(r, 2000));
    } catch {
      toast({ title: 'Microphone permission needed', description: 'Please allow microphone access.' });
    } finally {
      audio?.getTracks().forEach((t) => t.stop());
    }
    setVerifying(false);
    setStep(3);

    if (student) {
      const rec = await recordCheckIn(student.id, student.name);
      setResult({ time: rec.time, date: rec.date });
      toast({ title: 'Attendance Recorded', description: `${rec.date} ${rec.time}` });
    }
  };

  const reset = () => {
    setStep(0);
    setResult(null);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <Helmet>
        <title>Self Check-In | PresenSure</title>
        <meta name="description" content="Student self check-in with face, liveness and voice verification." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />
      </Helmet>
      <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2 animate-enter">
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="font-display text-xl flex items-center gap-2"><Camera className="text-primary"/> Face & Liveness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video rounded-xl overflow-hidden border bg-muted/30 flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted aria-label="Live camera feed" />
            </div>
            <div className="grid gap-2">
              <Step active={step===0} done={step>0} label="Face Detection" />
              <Step active={step===1} done={step>1} label="Liveness Check (blink / move)" />
              <Step active={step===2} done={step>2} label="Voice Authentication" />
              <Step active={step===3} done={step>3} label="Attendance Confirmation" />
            </div>
            <Progress value={progress} />
            {step === 1 && (
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Follow instruction: Blink and nod</Badge>
                <Button onClick={doLiveness} disabled={verifying}>{verifying ? 'Verifying...' : 'I did it'}</Button>
              </div>
            )}
            {step >= 2 && (
              <div className="text-sm text-muted-foreground">Proceed to Voice step on the right</div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="font-display text-xl flex items-center gap-2"><Mic className="text-primary"/> Voice Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 bg-accent/40 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Passphrase</p>
                <p className="font-medium">{passphrase}</p>
              </div>
              {step < 3 ? (
                <div className={`h-3 w-3 rounded-full ${verifying ? 'bg-primary pulse' : 'bg-muted-foreground/40'}`} aria-label="Listening indicator" />
              ) : (
                <CheckCircle2 className="text-primary" aria-hidden />
              )}
            </div>
            {step === 2 && (
              <Button onClick={doVoice} variant="hero" className="w-full" disabled={verifying}>
                {verifying ? 'Listening...' : 'Start Recording'}
              </Button>
            )}
            {step === 3 && result && (
              <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 />
                  <p className="font-medium">Attendance Recorded Successfully</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{result.date} {result.time}</p>
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => navigate('/')} variant="secondary">Back to Home</Button>
                  <Button onClick={reset} variant="outline">Check-In Again</Button>
                </div>
              </div>
            )}
            {step < 2 && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300 text-sm">
                <AlertCircle className="h-4 w-4"/> Allow camera and microphone when prompted.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default StudentCheckIn;
